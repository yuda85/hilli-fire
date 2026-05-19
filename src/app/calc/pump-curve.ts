/**
 * Pump curve handling — interpolation between user-entered (flow, pressure)
 * points. Used to plot the supply-side curve on the supply/demand graph.
 */

import { PumpCurvePoint } from '../core/models';

export function activePumpPoints(points: PumpCurvePoint[]): PumpCurvePoint[] {
  return points.filter((p) => p.flowGpm > 0 || p.pressurePsi > 0);
}

/** Interpolate pump pressure (psi) at a given flow (gpm) using a piecewise-linear curve. */
export function pumpPressureAt(points: PumpCurvePoint[], flowGpm: number): number {
  const pts = activePumpPoints(points).slice().sort((a, b) => a.flowGpm - b.flowGpm);
  if (pts.length === 0) return 0;
  if (flowGpm <= pts[0].flowGpm) return pts[0].pressurePsi;
  if (flowGpm >= pts[pts.length - 1].flowGpm) return pts[pts.length - 1].pressurePsi;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (flowGpm >= a.flowGpm && flowGpm <= b.flowGpm) {
      const t = (flowGpm - a.flowGpm) / (b.flowGpm - a.flowGpm);
      return a.pressurePsi + t * (b.pressurePsi - a.pressurePsi);
    }
  }
  return pts[pts.length - 1].pressurePsi;
}
