/**
 * NFPA-13 density/area curves (Figure 19.2.3.1.1 / 19.3.3.1.1, depending on edition).
 * For each hazard class, gives the minimum design density (gpm/ft²) as a
 * function of the design area (ft²). Linear interpolation between tabulated points.
 */

import { HazardClass } from '../core/models';

type Curve = ReadonlyArray<{ areaFt2: number; densityGpmFt2: number }>;

const CURVES: Record<HazardClass, Curve> = {
  // Light Hazard: 0.10 gpm/ft² over 1500 ft²; density rises with smaller area.
  light: [
    { areaFt2: 1500, densityGpmFt2: 0.10 },
    { areaFt2: 3000, densityGpmFt2: 0.10 },
  ],
  // Ordinary Hazard Group 1: 0.15 over 1500 ft².
  'ord-1': [
    { areaFt2: 1500, densityGpmFt2: 0.15 },
    { areaFt2: 3000, densityGpmFt2: 0.15 },
  ],
  // Ordinary Hazard Group 2: 0.20 over 1500 ft².
  'ord-2': [
    { areaFt2: 1500, densityGpmFt2: 0.20 },
    { areaFt2: 3000, densityGpmFt2: 0.20 },
  ],
  // Extra Hazard Group 1: 0.30 over 2500 ft².
  'eh-1': [
    { areaFt2: 2500, densityGpmFt2: 0.30 },
    { areaFt2: 4000, densityGpmFt2: 0.30 },
  ],
  // Extra Hazard Group 2: 0.40 over 2500 ft².
  'eh-2': [
    { areaFt2: 2500, densityGpmFt2: 0.40 },
    { areaFt2: 4000, densityGpmFt2: 0.40 },
  ],
};

export function minDesignDensity(hazard: HazardClass, designAreaFt2: number): number {
  const curve = CURVES[hazard];
  if (designAreaFt2 <= curve[0].areaFt2) return curve[0].densityGpmFt2;
  if (designAreaFt2 >= curve[curve.length - 1].areaFt2) return curve[curve.length - 1].densityGpmFt2;
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i];
    const b = curve[i + 1];
    if (designAreaFt2 >= a.areaFt2 && designAreaFt2 <= b.areaFt2) {
      const t = (designAreaFt2 - a.areaFt2) / (b.areaFt2 - a.areaFt2);
      return a.densityGpmFt2 + t * (b.densityGpmFt2 - a.densityGpmFt2);
    }
  }
  return curve[curve.length - 1].densityGpmFt2;
}
