/**
 * Hazen-Williams friction-loss formula (US units).
 *
 *   PF/ft = 4.52 · |Q|^1.85 / (C^1.85 · d^4.87)    [psi/ft]
 *
 *   Q in gpm, d (inside diameter) in inches, PF in psi.
 *
 * For a pipe of total length L_total (pipe + fitting equiv length):
 *   PF = (PF/ft) · L_total
 *
 * Elevation pressure (positive when flow goes up):
 *   PE = 0.433 · (elev_end - elev_beg)   [psi]
 */

export const HAZEN_WILLIAMS_EXPONENT = 1.85;
export const ELEVATION_FT_TO_PSI = 0.433;

/** Friction-loss gradient, psi per foot. */
export function frictionLossPerFt(flowGpm: number, cValue: number, insideDiameterIn: number): number {
  const Q = Math.abs(flowGpm);
  if (Q === 0) return 0;
  return (
    (4.52 * Math.pow(Q, HAZEN_WILLIAMS_EXPONENT)) /
    (Math.pow(cValue, HAZEN_WILLIAMS_EXPONENT) * Math.pow(insideDiameterIn, 4.87))
  );
}

/** Signed friction-loss pressure drop across a pipe (psi). */
export function frictionLoss(
  flowGpm: number,
  cValue: number,
  insideDiameterIn: number,
  totalLengthFt: number,
): number {
  const grad = frictionLossPerFt(flowGpm, cValue, insideDiameterIn);
  return Math.sign(flowGpm) * grad * totalLengthFt;
}

/**
 * Solve for the signed flow Q across a pipe given the signed driving pressure
 * head ΔP_friction (psi) — inverse of frictionLoss.
 *
 *   Q = sgn(ΔP) · (|ΔP| / (R · L))^(1/1.85)
 *   where R = 4.52 / (C^1.85 · d^4.87)  [psi/ft per gpm^1.85]
 */
export function flowFromFrictionDrop(
  drivingPsi: number,
  cValue: number,
  insideDiameterIn: number,
  totalLengthFt: number,
): number {
  if (totalLengthFt === 0) return 0;
  const R = 4.52 / (Math.pow(cValue, HAZEN_WILLIAMS_EXPONENT) * Math.pow(insideDiameterIn, 4.87));
  const absDp = Math.abs(drivingPsi);
  if (absDp === 0) return 0;
  const Q = Math.pow(absDp / (R * totalLengthFt), 1 / HAZEN_WILLIAMS_EXPONENT);
  return Math.sign(drivingPsi) * Q;
}

/**
 * Partial derivative ∂Q / ∂(ΔP) for Newton-Raphson Jacobians.
 * For Q = sign(ΔP) · ((|ΔP|) / (R·L))^(1/n) with n = 1.85,
 *   |dQ/dΔP| = (1/n) · |ΔP|^((1/n) - 1) · 1/(R·L)^(1/n)
 * Returned value is always >= 0 (slope magnitude).
 */
export function dFlow_dPressure(
  drivingPsi: number,
  cValue: number,
  insideDiameterIn: number,
  totalLengthFt: number,
): number {
  if (totalLengthFt === 0) return Number.POSITIVE_INFINITY;
  const R = 4.52 / (Math.pow(cValue, HAZEN_WILLIAMS_EXPONENT) * Math.pow(insideDiameterIn, 4.87));
  const absDp = Math.abs(drivingPsi);
  if (absDp < 1e-9) {
    // Limit as ΔP → 0 is infinity for n > 1; regularize with a tiny epsilon.
    return dFlow_dPressure(1e-6, cValue, insideDiameterIn, totalLengthFt);
  }
  const RL = R * totalLengthFt;
  const n = HAZEN_WILLIAMS_EXPONENT;
  return (1 / n) * Math.pow(absDp, 1 / n - 1) * Math.pow(1 / RL, 1 / n);
}

/** Pipe water volume (gallons) given inside dia (in) and total pipe length (ft). */
export function pipeVolumeGal(insideDiameterIn: number, lengthFt: number): number {
  const areaIn2 = Math.PI * 0.25 * insideDiameterIn * insideDiameterIn;
  const volIn3 = areaIn2 * (lengthFt * 12);
  return volIn3 / 231; // 231 in³ per US gallon
}

/** Velocity (ft/s) for a given flow (gpm) and inside dia (in). */
export function velocityFps(flowGpm: number, insideDiameterIn: number): number {
  // V = Q / A. 1 gpm = 0.002228 ft³/s. A (ft²) = π/4 · (d_in/12)²
  const Qft3s = Math.abs(flowGpm) * 0.002228009;
  const dFt = insideDiameterIn / 12;
  const A = Math.PI * 0.25 * dFt * dFt;
  return A > 0 ? Qft3s / A : 0;
}

/** Velocity pressure (psi). Pv = 0.001123 · V² where V in ft/s — approximation. */
export function velocityPressurePsi(velocityFps: number): number {
  return 0.001123 * velocityFps * velocityFps;
}
