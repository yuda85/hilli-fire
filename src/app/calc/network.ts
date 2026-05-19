/**
 * Network builder — turns a Project's nodes/pipes into a solver-ready graph
 * with pipe lengths, C-values, and inside diameters resolved.
 *
 * Sign convention: pipe is stored with (begNode, endNode). Q > 0 means flow
 * from beg → end.
 */

import { ProjectNode, ProjectPipe } from '../core/models';
import { resolvePipe } from './pipes';
import { computeFittingLength } from './fittings';

export interface ResolvedPipe {
  begNode: number;
  endNode: number;
  insideDiameterIn: number;
  nominalDiameterIn: number;
  cValue: number;
  pipeLengthFt: number;
  fittingLengthFt: number;
  totalLengthFt: number;
  fittingCode?: string;
}

export interface NetworkGraph {
  nodes: Map<number, ProjectNode>;
  pipes: ResolvedPipe[];
  // Adjacency: for each node id, list of indices into `pipes` connected to it.
  adjacency: Map<number, number[]>;
  /** node ids sorted ascending */
  nodeIds: number[];
}

export function buildNetwork(nodes: ProjectNode[], pipes: ProjectPipe[]): NetworkGraph {
  const nodeMap = new Map<number, ProjectNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const resolved: ResolvedPipe[] = pipes.map((p) => {
    const spec = resolvePipe(p.materialKey, p.nominalDiameterIn);
    const fittingFromCode = computeFittingLength(p.fittingCode, p.nominalDiameterIn, spec.cValue);
    const fittingLengthFt = (p.fittingDataLengthFt ?? 0) > 0 ? (p.fittingDataLengthFt as number) : fittingFromCode;
    const pipeLengthFt = p.nominalLengthFt;
    return {
      begNode: p.begNode,
      endNode: p.endNode,
      insideDiameterIn: spec.insideDiameterIn,
      nominalDiameterIn: p.nominalDiameterIn,
      cValue: spec.cValue,
      pipeLengthFt,
      fittingLengthFt,
      totalLengthFt: pipeLengthFt + fittingLengthFt,
      fittingCode: p.fittingCode,
    };
  });

  const adjacency = new Map<number, number[]>();
  resolved.forEach((p, idx) => {
    if (!adjacency.has(p.begNode)) adjacency.set(p.begNode, []);
    if (!adjacency.has(p.endNode)) adjacency.set(p.endNode, []);
    adjacency.get(p.begNode)!.push(idx);
    adjacency.get(p.endNode)!.push(idx);
  });

  return {
    nodes: nodeMap,
    pipes: resolved,
    adjacency,
    nodeIds: [...nodeMap.keys()].sort((a, b) => a - b),
  };
}

/**
 * Identify the source / inflow node — the one with no sprinkler discharge that
 * sits at the "top" of the graph (typically highest node id in the Elite
 * convention; for Beit Hayot, node 100). Heuristic for v1: any "no-discharge"
 * node with the maximum id.
 */
export function findSourceNode(graph: NetworkGraph): number | null {
  let best: number | null = null;
  for (const [id, node] of graph.nodes) {
    if (node.description === 'no-discharge') {
      if (best == null || id > best) best = id;
    }
  }
  return best;
}
