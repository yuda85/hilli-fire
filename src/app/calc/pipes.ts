/**
 * Pipe material catalog — inside diameter (in) and Hazen-Williams C-value
 * keyed by (materialKey, nominalDiameterIn). Inside diameters match the
 * Elite Software Fire reference (SCHD 10: 1.5"→1.682, 2"→2.157, 3"→3.260, 4"→4.260).
 *
 * C-values:
 *   - Wet steel:     120 (matches Beit Hayot "SCHED 10 WET STEEL")
 *   - Dry steel:     100 (matches Beit Hayot "SCHD 10 STEEL, DRY")
 *   - CPVC:          150
 *   - Copper Type L: 150
 */

import { PipeMaterialKey } from '../core/models';

interface PipeSpec {
  insideDiameterIn: number;
  cValue: number;
}

const SCHD_10_INSIDE: Record<string, number> = {
  '1': 1.097,
  '1.25': 1.442,
  '1.5': 1.682,
  '2': 2.157,
  '2.5': 2.635,
  '3': 3.260,
  '4': 4.260,
  '5': 5.295,
  '6': 6.357,
  '8': 8.249,
};

const SCHD_40_INSIDE: Record<string, number> = {
  '1': 1.049,
  '1.25': 1.380,
  '1.5': 1.610,
  '2': 2.067,
  '2.5': 2.469,
  '3': 3.068,
  '4': 4.026,
  '5': 5.047,
  '6': 6.065,
  '8': 7.981,
};

const CPVC_INSIDE: Record<string, number> = {
  '0.75': 0.874,
  '1': 1.101,
  '1.25': 1.394,
  '1.5': 1.598,
  '2': 1.990,
  '2.5': 2.450,
  '3': 2.954,
};

const COPPER_TYPE_L_INSIDE: Record<string, number> = {
  '0.75': 0.785,
  '1': 1.025,
  '1.25': 1.265,
  '1.5': 1.505,
  '2': 1.985,
  '2.5': 2.465,
  '3': 2.945,
  '4': 3.905,
};

const C_VALUES: Record<PipeMaterialKey, number> = {
  'schd-10-steel-dry': 100,
  'sched-10-wet-steel': 120,
  'schd-40-steel-wet': 120,
  'schd-40-steel-dry': 100,
  cpvc: 150,
  'copper-type-l': 150,
};

const TABLES: Record<PipeMaterialKey, Record<string, number>> = {
  'schd-10-steel-dry': SCHD_10_INSIDE,
  'sched-10-wet-steel': SCHD_10_INSIDE,
  'schd-40-steel-wet': SCHD_40_INSIDE,
  'schd-40-steel-dry': SCHD_40_INSIDE,
  cpvc: CPVC_INSIDE,
  'copper-type-l': COPPER_TYPE_L_INSIDE,
};

export function resolvePipe(materialKey: PipeMaterialKey, nominalIn: number): PipeSpec {
  const key = nominalIn.toString();
  const table = TABLES[materialKey];
  const inside = table?.[key];
  if (inside == null) {
    throw new Error(`Unknown pipe spec for ${materialKey} @ ${nominalIn}"`);
  }
  return { insideDiameterIn: inside, cValue: C_VALUES[materialKey] };
}

export function pipeInsideDiameter(materialKey: PipeMaterialKey, nominalIn: number): number {
  return resolvePipe(materialKey, nominalIn).insideDiameterIn;
}

export function pipeCValue(materialKey: PipeMaterialKey): number {
  return C_VALUES[materialKey];
}
