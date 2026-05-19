/**
 * Beit Hayot fixture — encodes the input data from the reference Elite PDF
 * (reference/beit-hayot-elite-reference.pdf). Used to validate the calc engine
 * against Elite's published outputs (≤1% tolerance target).
 *
 * Source: report pages 3-6 (nodes + pipes). Pre-computed Total Length values
 * are baked into `fittingDataLengthFt` to bypass fitting-code expansion (which
 * differs slightly between NFPA editions and Elite). The pipe lengths split as
 * (nominalLengthFt, fittingDataLengthFt) match the report exactly:
 *   total_length = nominal + fitting_data
 */

import { ProjectNode, ProjectPipe, PumpCurvePoint } from '../../core/models';

// Sprinkler areas per node (from report p. 12-13 "Flowing Area" column).
// Most nodes use 130 ft²; node 11 uses 120, node 16 uses 95.
const AREA_OVERRIDES: Record<number, string> = {
  11: '120',
  16: '95',
};

function sprinkler(id: number, elev: number, k = 5.6): ProjectNode {
  return {
    id,
    description: 'sprinkler',
    kFactor: k,
    elevationFt: elev,
    areaGroup: AREA_OVERRIDES[id] ?? '130',
  };
}

function junction(id: number, elev: number): ProjectNode {
  return { id, description: 'no-discharge', kFactor: 0, elevationFt: elev };
}

export const beitHayotNodes: ProjectNode[] = [
  // Sprinkler nodes 1-20 (all K=5.6, elevation 10.5 except node 16 at 13.0).
  sprinkler(1, 10.5),
  sprinkler(2, 10.5),
  sprinkler(3, 10.5),
  sprinkler(4, 10.5),
  sprinkler(5, 10.5),
  sprinkler(6, 10.5),
  sprinkler(7, 10.5),
  sprinkler(8, 10.5),
  sprinkler(9, 10.5),
  sprinkler(10, 10.5),
  sprinkler(11, 10.5),
  sprinkler(12, 10.5),
  sprinkler(13, 10.5),
  sprinkler(14, 10.5),
  sprinkler(15, 10.5),
  sprinkler(16, 13.0),
  sprinkler(17, 10.5),
  sprinkler(18, 10.5),
  sprinkler(19, 10.5),
  sprinkler(20, 10.5),
  // Junction nodes on cross-mains.
  junction(30, 10.5),
  junction(31, 10.5),
  junction(32, 10.5),
  junction(40, 10.5),
  junction(41, 10.5),
  junction(42, 10.5),
  junction(43, 10.5),
  junction(44, 10.5),
  junction(45, 10.5),
  // Riser / valves.
  junction(50, 7.0),
  junction(60, 4.0),
  junction(70, 0.0),
  // Source / inflow.
  junction(100, 0.0),
];

/**
 * Pipes — (begNode, endNode, material, nominalDia, fittingCode, nominalLen, totalLen).
 * fittingDataLengthFt is set to (totalLen - nominalLen) to match the report's
 * "Total Length" column exactly.
 */
function pipe(
  beg: number,
  end: number,
  diameter: number,
  fitting: string | undefined,
  nomLen: number,
  totalLen: number,
  material: ProjectPipe['materialKey'] = 'schd-10-steel-dry',
): ProjectPipe {
  return {
    begNode: beg,
    endNode: end,
    materialKey: material,
    nominalDiameterIn: diameter,
    fittingCode: fitting,
    fittingDataLengthFt: totalLen - nomLen,
    nominalLengthFt: nomLen,
  };
}

export const beitHayotPipes: ProjectPipe[] = [
  pipe(1, 2, 1.5, undefined, 13.10, 13.10),
  pipe(2, 3, 1.5, undefined, 13.10, 13.10),
  pipe(3, 40, 2.0, 'E', 12.00, 15.50),
  pipe(4, 40, 1.5, 'E', 1.10, 3.90),
  pipe(5, 30, 1.5, 'E', 2.40, 5.20),
  pipe(6, 30, 1.5, 'E', 8.00, 10.80),
  pipe(7, 30, 1.5, undefined, 5.00, 5.00),
  pipe(7, 31, 2.0, 'E', 11.50, 15.00),
  pipe(8, 31, 1.5, 'E', 8.00, 10.80),
  pipe(9, 41, 2.0, 'E', 11.00, 14.50),
  pipe(9, 31, 2.0, undefined, 1.50, 1.50),
  pipe(10, 41, 1.5, 'E', 1.20, 4.00),
  pipe(11, 42, 1.5, 'E', 1.10, 3.90),
  pipe(12, 13, 1.5, '2E', 12.50, 18.10),
  pipe(13, 32, 1.5, 'E', 1.60, 4.40),
  pipe(14, 32, 1.5, 'E', 8.20, 11.00),
  pipe(15, 16, 2.0, undefined, 13.10, 13.10),
  pipe(15, 32, 2.0, undefined, 12.20, 12.20),
  pipe(16, 44, 2.0, 'E', 1.10, 4.60),
  pipe(17, 18, 1.5, 'E', 13.10, 15.90),
  pipe(18, 19, 1.5, undefined, 13.10, 13.10),
  pipe(19, 20, 2.0, undefined, 13.10, 13.10),
  pipe(20, 45, 2.0, 'E', 1.10, 4.60),
  pipe(40, 41, 2.0, undefined, 9.80, 9.80),
  pipe(41, 42, 3.0, undefined, 8.40, 8.40),
  pipe(42, 43, 3.0, 'E', 7.00, 11.90),
  pipe(43, 44, 3.0, 'E', 1.70, 6.60),
  pipe(43, 50, 4.0, '6E', 132.00, 174.60),
  pipe(44, 45, 2.0, undefined, 9.30, 9.30),
  pipe(50, 60, 4.0, 'BC', 3.00, 27.10),
  pipe(60, 70, 4.0, '4E', 75.00, 127.00, 'sched-10-wet-steel'),
  // 70 → 100 is the pump in Elite's report; "Boost Ignored" means no pressure
  // boost is applied. We model it as a tiny zero-loss pipe so the source node
  // (100) is connected to node 70 with no pressure drop and Q passes through.
  pipe(70, 100, 4.0, undefined, 0.01, 0.01, 'sched-10-wet-steel'),
];

export const beitHayotPumpCurve: PumpCurvePoint[] = [
  { flowGpm: 430, pressurePsi: 0 },
  { flowGpm: 310, pressurePsi: 80 },
  { flowGpm: 200, pressurePsi: 120 },
  { flowGpm: 0, pressurePsi: 0 },
  { flowGpm: 0, pressurePsi: 0 },
];

/** Expected outputs (from report pages 13-14). */
export const beitHayotExpected = {
  totalSprinklerFlowGpm: 410.96,
  inflowResidualPsi: 36.17,
  hmd: { nodeId: 6, residualPsi: 12.12, flowGpm: 19.49 },
  maxVelocityFps: 9.25,
  maxVelocityPipe: { beg: 50, end: 60 },
  averageDensityGpmFt2: 0.211,
  averageAreaPerSprinkler: 97.5,
  averageSprinklerFlowGpm: 20.55,
};
