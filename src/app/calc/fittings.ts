/**
 * Fittings — NFPA-13 (Table 23.4.4.3) equivalent-length values, tabulated for
 * C = 120. For other C values, multiply by (C_actual / 120)^1.85.
 *
 * Supported fitting codes:
 *   E    — 90° standard elbow
 *   LE   — 90° long-turn elbow
 *   45E  — 45° elbow
 *   T    — tee, run (through-flow)
 *   BT   — tee, branch
 *   GV   — gate valve
 *   BV   — butterfly valve
 *   BC   — backflow check valve / check
 *
 * A leading integer multiplies: "6E" = 6 elbows, "2E" = 2 elbows.
 */

const N = 1.85;

/** Base table (assumes C = 120). Diameter → fitting equivalent length in feet. */
const BASE: Record<string, Record<number, number>> = {
  E: { 1: 2, 1.25: 3, 1.5: 4, 2: 5, 2.5: 6, 3: 7, 3.5: 8, 4: 10, 5: 12, 6: 14, 8: 18 },
  LE: { 1: 1, 1.25: 2, 1.5: 2, 2: 3, 2.5: 4, 3: 5, 3.5: 5, 4: 6, 5: 8, 6: 9, 8: 13 },
  '45E': { 1: 1, 1.25: 1, 1.5: 2, 2: 2, 2.5: 3, 3: 3, 3.5: 3, 4: 4, 5: 5, 6: 7, 8: 9 },
  T: { 1: 0, 1.25: 0, 1.5: 0, 2: 0, 2.5: 0, 3: 0, 3.5: 0, 4: 0, 5: 0, 6: 0, 8: 0 },
  BT: { 1: 5, 1.25: 6, 1.5: 8, 2: 10, 2.5: 12, 3: 15, 3.5: 17, 4: 20, 5: 25, 6: 30, 8: 35 },
  GV: { 1: 0, 1.25: 0, 1.5: 0, 2: 1, 2.5: 1, 3: 1, 3.5: 1, 4: 2, 5: 2, 6: 3, 8: 4 },
  BV: { 1: 0, 1.25: 0, 1.5: 0, 2: 6, 2.5: 7, 3: 10, 3.5: 0, 4: 12, 5: 9, 6: 10, 8: 12 },
  BC: { 1: 5, 1.25: 7, 1.5: 9, 2: 11, 2.5: 14, 3: 16, 3.5: 19, 4: 22, 5: 27, 6: 32, 8: 45 },
};

interface ParsedFitting {
  count: number;
  code: string;
}

/** Parse codes like "6E", "2E", "BC", "4E" into (count, code) pairs. */
export function parseFittingCode(raw: string): ParsedFitting[] {
  const tokens = raw.trim().split(/[,\s+]+/).filter(Boolean);
  const result: ParsedFitting[] = [];
  for (const t of tokens) {
    const m = /^(\d+)?([A-Za-z45]+)$/.exec(t);
    if (!m) continue;
    const count = m[1] ? parseInt(m[1], 10) : 1;
    const code = m[2].toUpperCase();
    result.push({ count, code });
  }
  return result;
}

/**
 * Compute total equivalent fitting length (ft) for the given fitting code,
 * nominal diameter, and pipe C-value.
 */
export function computeFittingLength(
  fittingCode: string | undefined,
  nominalDiameterIn: number,
  cValue: number,
): number {
  if (!fittingCode) return 0;
  const parsed = parseFittingCode(fittingCode);
  let baseTotal = 0;
  for (const { count, code } of parsed) {
    const tab = BASE[code];
    if (!tab) continue;
    const val = tab[nominalDiameterIn] ?? 0;
    baseTotal += count * val;
  }
  if (baseTotal === 0) return 0;
  const correction = Math.pow(cValue / 120, N);
  return baseTotal * correction;
}
