/**
 * Hydraulic solver — Newton-Raphson on node residual pressures.
 *
 * Variables: P_i = residual gauge pressure (psi) at each node EXCEPT the
 * boundary node (whose pressure is fixed).
 *
 * Constraints (mass balance at each internal node i):
 *   F_i(P) = Σ_pipes Q_into_i(P) - Q_demand_i(P) = 0
 *
 *   where:
 *     - For a pipe j between a and b (a < b for stable indexing, but sign is
 *       handled by ΔP_total direction):
 *         driving_ab = P_a - P_b - 0.433·(elev_b - elev_a)
 *         Q_ab       = sign(driving) · (|driving|/(R·L))^(1/1.85)
 *         (positive Q_ab means flow a → b)
 *     - At a sprinkler node:
 *         Q_demand_i = K_i · √max(P_i, 0)  (sprinkler discharge)
 *     - At a no-discharge node:
 *         Q_demand_i = nonSprinklerFlowGpm (often zero)
 *
 * Boundary modes:
 *   - SOURCE_PRESSURE: fix P at the source/inflow node. Solve everything else.
 *   - HMD_FLOW: fix the design discharge at a chosen sprinkler. Solve including
 *     the source pressure (one extra unknown).
 *
 * For v1 we implement SOURCE_PRESSURE. Demand-mode outer loop wraps this
 * solver in a binary search on source pressure until the HMD sprinkler hits its
 * design pressure (within tolerance).
 */

import { CalcResult, ProjectNode } from '../core/models';
import {
  ELEVATION_FT_TO_PSI,
  dFlow_dPressure,
  flowFromFrictionDrop,
  frictionLossPerFt,
  pipeVolumeGal,
  velocityFps,
  velocityPressurePsi,
} from './hazen-williams';
import { NetworkGraph, ResolvedPipe, findSourceNode } from './network';
import { solveLinearSystem } from './linalg';

export interface SolverOptions {
  /** Newton tolerance on max residual (psi-equivalent of mass balance error). */
  pressureTolerancePsi?: number;
  flowToleranceGpm?: number;
  maxIterations?: number;
  initialGuessPsi?: number;
  /** Damping in [0, 1]: 1 = full Newton step. */
  damping?: number;
}

interface InternalState {
  /** Map node id → pressure (psi) */
  P: Map<number, number>;
}

/**
 * Solve the network with a fixed source pressure.
 */
export function solveWithSourcePressure(
  graph: NetworkGraph,
  sourceNodeId: number,
  sourcePressurePsi: number,
  opts: SolverOptions = {},
): { state: InternalState; iterations: number; maxImbalance: number } {
  const pressureTol = opts.pressureTolerancePsi ?? 0.01;
  const maxIter = opts.maxIterations ?? 200;
  const damping = opts.damping ?? 1.0;

  // Unknown ordering: every node except the source.
  const unknownIds = graph.nodeIds.filter((id) => id !== sourceNodeId);
  const idToIdx = new Map<number, number>();
  unknownIds.forEach((id, i) => idToIdx.set(id, i));

  const P = new Map<number, number>();
  // Initial guess.
  const guess = opts.initialGuessPsi ?? Math.max(sourcePressurePsi - 5, 7);
  for (const id of unknownIds) P.set(id, guess);
  P.set(sourceNodeId, sourcePressurePsi);

  let iter = 0;
  let maxImbalance = Number.POSITIVE_INFINITY;
  for (; iter < maxIter; iter++) {
    const { F, J } = buildResidualAndJacobian(graph, P, unknownIds, idToIdx);

    // Convergence check.
    maxImbalance = 0;
    for (const f of F) maxImbalance = Math.max(maxImbalance, Math.abs(f));
    if (maxImbalance < pressureTol) break;

    // Solve J · ΔP = -F
    const negF = F.map((v) => -v);
    let delta: number[];
    try {
      delta = solveLinearSystem(J, negF);
    } catch {
      break;
    }

    // Apply step (with damping). Floor pressure at a small positive value to
    // avoid sqrt(negative) at sprinklers; clamp huge steps.
    for (let i = 0; i < unknownIds.length; i++) {
      const id = unknownIds[i];
      const cur = P.get(id) ?? guess;
      let next = cur + damping * delta[i];
      if (!Number.isFinite(next)) next = cur;
      if (next < 0.1) next = 0.1;
      P.set(id, next);
    }
  }

  return { state: { P }, iterations: iter, maxImbalance };
}

/**
 * Compute flow in a pipe given the (current) pressure state.
 * Positive value: flow from beg → end.
 */
function pipeFlow(pipe: ResolvedPipe, P: Map<number, number>, graph: NetworkGraph): number {
  const a = pipe.begNode;
  const b = pipe.endNode;
  const Pa = P.get(a) ?? 0;
  const Pb = P.get(b) ?? 0;
  const elevA = graph.nodes.get(a)?.elevationFt ?? 0;
  const elevB = graph.nodes.get(b)?.elevationFt ?? 0;
  // Driving friction pressure: pressure available to push flow a → b after
  // accounting for elevation gain.
  const driving = Pa - Pb - ELEVATION_FT_TO_PSI * (elevB - elevA);
  return flowFromFrictionDrop(driving, pipe.cValue, pipe.insideDiameterIn, pipe.totalLengthFt);
}

/** ∂Q_pipe / ∂P_begNode (always >= 0). */
function dPipeFlow_dPbeg(pipe: ResolvedPipe, P: Map<number, number>, graph: NetworkGraph): number {
  const a = pipe.begNode;
  const b = pipe.endNode;
  const Pa = P.get(a) ?? 0;
  const Pb = P.get(b) ?? 0;
  const elevA = graph.nodes.get(a)?.elevationFt ?? 0;
  const elevB = graph.nodes.get(b)?.elevationFt ?? 0;
  const driving = Pa - Pb - ELEVATION_FT_TO_PSI * (elevB - elevA);
  return dFlow_dPressure(driving, pipe.cValue, pipe.insideDiameterIn, pipe.totalLengthFt);
}

function buildResidualAndJacobian(
  graph: NetworkGraph,
  P: Map<number, number>,
  unknownIds: number[],
  idToIdx: Map<number, number>,
): { F: number[]; J: number[][] } {
  const n = unknownIds.length;
  const F = new Array(n).fill(0);
  const J: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (const id of unknownIds) {
    const idx = idToIdx.get(id)!;
    const node = graph.nodes.get(id)!;
    const pIdxs = graph.adjacency.get(id) ?? [];

    // Sum pipe flows into the node.
    let inflow = 0;
    for (const pIdx of pIdxs) {
      const pipe = graph.pipes[pIdx];
      const Q_ab = pipeFlow(pipe, P, graph);
      // Sign: if id == endNode, flow comes IN as +Q_ab; if id == begNode, OUT as +Q_ab.
      const into = id === pipe.endNode ? Q_ab : -Q_ab;
      inflow += into;

      // Jacobian contributions: ∂(into)/∂P_id  and  ∂(into)/∂P_other.
      const dQ = dPipeFlow_dPbeg(pipe, P, graph);
      // Note: ∂Q_ab/∂P_beg = +dQ ; ∂Q_ab/∂P_end = -dQ (signs of "into" follow).
      if (id === pipe.endNode) {
        // ∂(into)/∂P_id = ∂Q_ab/∂P_end = -dQ
        J[idx][idx] += -dQ;
        // ∂(into)/∂P_beg = ∂Q_ab/∂P_beg = +dQ
        const otherIdx = idToIdx.get(pipe.begNode);
        if (otherIdx != null) J[idx][otherIdx] += dQ;
      } else {
        // id == begNode; into = -Q_ab
        J[idx][idx] += -dQ; // ∂(-Q_ab)/∂P_beg = -dQ
        const otherIdx = idToIdx.get(pipe.endNode);
        if (otherIdx != null) J[idx][otherIdx] += dQ;
      }
    }

    // Sprinkler discharge (an outflow from the node, with sign convention "out is negative inflow").
    let demand = 0;
    let demandDeriv = 0;
    if (node.description === 'sprinkler' && node.kFactor > 0) {
      const Pn = Math.max(P.get(id) ?? 0, 1e-6);
      const sqrtP = Math.sqrt(Pn);
      demand = node.kFactor * sqrtP;
      demandDeriv = node.kFactor / (2 * sqrtP);
    }
    if (node.nonSprinklerFlowGpm) {
      demand += node.nonSprinklerFlowGpm;
    }

    // Residual: F_i = inflow - demand
    F[idx] = inflow - demand;
    // ∂F_i/∂P_id includes -demandDeriv (demand is positive outflow).
    J[idx][idx] -= demandDeriv;
  }

  return { F, J };
}

// --- Demand-mode outer loop: binary-search source pressure ---

export interface DemandModeOptions extends SolverOptions {
  /** Required residual pressure at the HMD sprinkler (psi). */
  hmdMinResidualPsi: number;
  /** Maximum binary-search iterations on source pressure. */
  maxOuterIterations?: number;
  /** Tolerance on HMD pressure match (psi). */
  hmdTolerancePsi?: number;
  /** Initial bracket for source pressure. */
  sourcePressureMin?: number;
  sourcePressureMax?: number;
}

/**
 * Demand-mode wrapper: solve repeatedly, varying the source pressure until the
 * lowest-pressure sprinkler (HMD) reaches the design minimum residual pressure.
 */
export function solveDemandMode(
  graph: NetworkGraph,
  options: DemandModeOptions,
): CalcResult {
  const sourceId = findSourceNode(graph);
  if (sourceId == null) {
    throw new Error('Could not identify source/inflow node in network');
  }

  const designPsi = options.hmdMinResidualPsi;
  const hmdTol = options.hmdTolerancePsi ?? 0.01;
  const maxOuter = options.maxOuterIterations ?? 80;
  let lo = options.sourcePressureMin ?? designPsi + 1;
  let hi = options.sourcePressureMax ?? designPsi + 500;

  // Find a high-enough upper bound by doubling if needed.
  let lastState: InternalState | null = null;
  let lastResidual = Number.POSITIVE_INFINITY;
  let attempts = 0;
  while (attempts < 20) {
    const { state, maxImbalance } = solveWithSourcePressure(graph, sourceId, hi, options);
    lastState = state;
    lastResidual = maxImbalance;
    const hmdP = lowestSprinklerPressure(graph, state.P).pressure;
    if (hmdP >= designPsi) break;
    hi *= 2;
    attempts++;
  }

  let bestState: InternalState | null = lastState;
  let bestSource = hi;

  for (let i = 0; i < maxOuter; i++) {
    const mid = 0.5 * (lo + hi);
    const { state, maxImbalance } = solveWithSourcePressure(graph, sourceId, mid, options);
    const { pressure: hmdP } = lowestSprinklerPressure(graph, state.P);
    lastResidual = maxImbalance;
    if (Math.abs(hmdP - designPsi) < hmdTol) {
      bestState = state;
      bestSource = mid;
      break;
    }
    if (hmdP < designPsi) {
      lo = mid;
    } else {
      hi = mid;
      bestState = state;
      bestSource = mid;
    }
    // Tighten when lo and hi converge.
    if (hi - lo < hmdTol * 0.5) break;
  }

  if (!bestState) {
    throw new Error('Demand-mode solver failed to converge');
  }

  return buildResult(graph, sourceId, bestSource, bestState.P, lastResidual);
}

function lowestSprinklerPressure(
  graph: NetworkGraph,
  P: Map<number, number>,
): { id: number; pressure: number } {
  let bestId = -1;
  let bestP = Number.POSITIVE_INFINITY;
  for (const node of graph.nodes.values()) {
    if (node.description !== 'sprinkler' || node.kFactor <= 0) continue;
    const p = P.get(node.id) ?? 0;
    if (p < bestP) {
      bestP = p;
      bestId = node.id;
    }
  }
  return { id: bestId, pressure: bestP };
}

function buildResult(
  graph: NetworkGraph,
  _sourceId: number,
  sourcePressurePsi: number,
  P: Map<number, number>,
  imbalance: number,
): CalcResult {
  const pipesOut: CalcResult['pipes'] = [];
  const nodesOut: CalcResult['nodes'] = [];
  const sprinklersOut: CalcResult['sprinklers'] = [];
  const warnings: string[] = [];

  let totalSpkFlow = 0;
  let totalNonSpkFlow = 0;
  let totalArea = 0;
  let pipeWaterVolGal = 0;
  let maxVel = 0;
  let maxVelPipe: { begNode: number; endNode: number } | undefined;
  let maxVelPressure = 0;

  // Per-pipe outputs.
  for (const pipe of graph.pipes) {
    const Q = pipeFlow(pipe, P, graph);
    const v = velocityFps(Q, pipe.insideDiameterIn);
    const vp = velocityPressurePsi(v);
    if (v > maxVel) {
      maxVel = v;
      maxVelPipe = { begNode: pipe.begNode, endNode: pipe.endNode };
      maxVelPressure = vp;
    }
    const elevA = graph.nodes.get(pipe.begNode)?.elevationFt ?? 0;
    const elevB = graph.nodes.get(pipe.endNode)?.elevationFt ?? 0;
    const grad = frictionLossPerFt(Q, pipe.cValue, pipe.insideDiameterIn);
    const PF = grad * pipe.totalLengthFt;
    const PE = ELEVATION_FT_TO_PSI * (elevB - elevA);
    pipeWaterVolGal += pipeVolumeGal(pipe.insideDiameterIn, pipe.pipeLengthFt);
    pipesOut.push({
      begNode: pipe.begNode,
      endNode: pipe.endNode,
      flowGpm: Q,
      velocityFps: v,
      velocityPressurePsi: vp,
      frictionLossPsiPerFt: grad,
      pipeLengthFt: pipe.pipeLengthFt,
      fittingLengthFt: pipe.fittingLengthFt,
      totalLengthFt: pipe.totalLengthFt,
      pfPsi: PF,
      pePsi: PE,
      ptPsi: PF + PE,
    });
  }

  // Per-node + sprinkler outputs.
  let hmdId = -1;
  let hmdPsi = Number.POSITIVE_INFINITY;
  let hmdFlow = 0;
  for (const node of graph.nodes.values()) {
    const Pn = P.get(node.id) ?? 0;
    let spkFlow = 0;
    let nonSpkFlow = node.nonSprinklerFlowGpm ?? 0;
    totalNonSpkFlow += nonSpkFlow;
    if (node.description === 'sprinkler' && node.kFactor > 0) {
      spkFlow = node.kFactor * Math.sqrt(Math.max(Pn, 0));
      totalSpkFlow += spkFlow;
      const flowingArea = areaForNode(node);
      totalArea += flowingArea;
      sprinklersOut.push({
        nodeId: node.id,
        kFactor: node.kFactor,
        elevationFt: node.elevationFt,
        residualPressurePsi: Pn,
        flowingAreaFt2: flowingArea,
        densityGpmFt2: flowingArea > 0 ? spkFlow / flowingArea : 0,
        dischargeGpm: spkFlow,
        areaGroupCode: node.areaGroup,
      });
      if (Pn < hmdPsi) {
        hmdPsi = Pn;
        hmdId = node.id;
        hmdFlow = spkFlow;
      }
    }
    nodesOut.push({
      id: node.id,
      residualPressurePsi: Pn,
      sprinklerFlowGpm: spkFlow,
      nonSprinklerFlowGpm: nonSpkFlow,
    });
  }

  const flowingCount = sprinklersOut.length;
  const avgArea = flowingCount > 0 ? totalArea / flowingCount : 0;
  const avgDensity = totalArea > 0 ? totalSpkFlow / totalArea : 0;
  const avgFlow = flowingCount > 0 ? totalSpkFlow / flowingCount : 0;

  return {
    ranAt: Date.now(),
    hmdNodeId: hmdId,
    hmdResidualPsi: hmdPsi,
    hmdFlowGpm: hmdFlow,
    totalSprinklerFlowGpm: totalSpkFlow,
    totalNonSprinklerFlowGpm: totalNonSpkFlow,
    inflowResidualPsi: sourcePressurePsi,
    inflowFlowGpm: totalSpkFlow + totalNonSpkFlow,
    applicationAverageDensityGpmFt2: avgDensity,
    applicationAverageAreaPerSprinklerFt2: avgArea,
    averageSprinklerFlowGpm: avgFlow,
    maxVelocityFps: maxVel,
    maxVelocityPipe: maxVelPipe,
    maxVelocityPressurePsi: maxVelPressure,
    allowableNodePressureImbalancePsi: 0.01,
    actualMaxNodePressureImbalancePsi: imbalance,
    actualMaxNodeFlowImbalanceGpm: 0,
    pipeWaterVolumeGal: pipeWaterVolGal,
    pipes: pipesOut,
    nodes: nodesOut,
    sprinklers: sprinklersOut,
    warnings,
  };
}

function areaForNode(node: ProjectNode): number {
  // For v1, default to 130 ft² per sprinkler if not otherwise specified by area group.
  // Beit Hayot uses 130 for most, 120 for node 11, 95 for node 16 — the user provides these.
  if (node.areaGroup) {
    const v = Number(node.areaGroup);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 130;
}
