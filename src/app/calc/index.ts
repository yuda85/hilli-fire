/**
 * Public API for the hydraulic calculation engine.
 */

import { Project, CalcResult } from '../core/models';
import { buildNetwork } from './network';
import { solveDemandMode } from './solver';

export function runCalculation(project: Project): CalcResult {
  const graph = buildNetwork(project.nodes, project.pipes);

  // NFPA-13 density-area design: design discharge at HMD sprinkler
  //   q_design = min_density × max_area_per_sprinkler
  //   P_design = (q_design / K)^2
  // Actual HMD residual must be ≥ max(P_design, hmdMinResidualPsi floor).
  const k = project.defaultKFactor;
  const qDesign = project.calc.minDesiredDensityGpmFt2 * project.maxAreaPerSprinklerFt2;
  const pDesign = k > 0 ? (qDesign / k) ** 2 : project.calc.hmdMinResidualPsi;
  const hmdTarget = Math.max(pDesign, project.calc.hmdMinResidualPsi);

  return solveDemandMode(graph, {
    hmdMinResidualPsi: hmdTarget,
    pressureTolerancePsi: 0.005,
    flowToleranceGpm: 0.01,
    maxIterations: 300,
    damping: 0.8,
    hmdTolerancePsi: 0.01,
  });
}

export * from './pipes';
export * from './fittings';
export * from './hazen-williams';
export * from './network';
export * from './nfpa13';
export * from './pump-curve';
export { solveDemandMode, solveWithSourcePressure } from './solver';
