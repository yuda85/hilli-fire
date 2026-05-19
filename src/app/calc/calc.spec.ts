import { describe, it, expect } from 'vitest';

import { runCalculation } from './index';
import {
  beitHayotNodes,
  beitHayotPipes,
  beitHayotPumpCurve,
  beitHayotExpected,
} from './__fixtures__/beit-hayot';
import { Project } from '../core/models';

function makeBeitHayotProject(): Project {
  return {
    id: 'fixture',
    orgId: 'fixture',
    title: 'BEIT HAYOT',
    designedBy: 'RONEN ALON EICHENBAUM',
    date: '2026-03-11',
    client: { name: 'BEIT HAYOT ARIEL UNIVERSITY', address: 'Ramat HaGolan St 65', city: "Ari'el", phone: '' },
    hazardClass: 'ord-1',
    sprinklerSystemType: 'dry',
    designAreaFt2: 1950,
    maxAreaPerSprinklerFt2: 130,
    defaultKFactor: 5.6,
    defaultPipeMaterial: 'schd-10-steel-dry',
    hoseStream: { insideGpm: 0, outsideGpm: 0, inRackGpm: 0 },
    waterSupply: {
      source: '',
      hydrantId: '',
      testDate: '',
      hydrantElevFt: 0,
      staticPsi: 0,
      testFlowGpm: 0,
      testResidualPsi: 0,
    },
    calc: { mode: 'demand', hmdMinResidualPsi: 7, minDesiredDensityGpmFt2: 0.15 },
    nodes: beitHayotNodes,
    pipes: beitHayotPipes,
    pumpCurve: beitHayotPumpCurve,
    displayUnits: 'us',
    createdAt: 0,
    updatedAt: 0,
    createdBy: 'test',
  };
}

/** Approximate-equality within a percentage tolerance. */
function approxEqual(actual: number, expected: number, tolPct: number, label: string): void {
  const pct = expected !== 0 ? Math.abs((actual - expected) / expected) * 100 : Math.abs(actual);
  expect(
    pct <= tolPct,
    `${label}: actual=${actual.toFixed(4)} expected=${expected.toFixed(4)} (${pct.toFixed(2)}% off, tol ${tolPct}%)`,
  ).toBe(true);
}

describe('Beit Hayot hydraulic calculation', () => {
  const project = makeBeitHayotProject();
  const result = runCalculation(project);

  it('identifies HMD = node 6', () => {
    expect(result.hmdNodeId).toBe(beitHayotExpected.hmd.nodeId);
  });

  it('HMD residual pressure ≈ 12.12 psi', () => {
    approxEqual(result.hmdResidualPsi, beitHayotExpected.hmd.residualPsi, 2, 'HMD residual psi');
  });

  it('HMD flow ≈ 19.49 gpm', () => {
    approxEqual(result.hmdFlowGpm, beitHayotExpected.hmd.flowGpm, 2, 'HMD flow gpm');
  });

  it('total sprinkler flow ≈ 410.96 gpm', () => {
    approxEqual(
      result.totalSprinklerFlowGpm,
      beitHayotExpected.totalSprinklerFlowGpm,
      2,
      'Total sprinkler flow',
    );
  });

  it('inflow residual pressure ≈ 36.17 psi', () => {
    approxEqual(result.inflowResidualPsi, beitHayotExpected.inflowResidualPsi, 3, 'Inflow residual psi');
  });

  it('max velocity ≈ 9.25 ft/s', () => {
    approxEqual(result.maxVelocityFps, beitHayotExpected.maxVelocityFps, 3, 'Max velocity');
  });

  it('average sprinkler flow ≈ 20.55 gpm', () => {
    approxEqual(
      result.averageSprinklerFlowGpm,
      beitHayotExpected.averageSprinklerFlowGpm,
      3,
      'Average sprinkler flow',
    );
  });
});
