/**
 * Small dense linear algebra — Gauss-Jordan with partial pivoting.
 * Adequate for sprinkler networks (~ ≤ 200 unknowns).
 */

export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  // Augment.
  const M: number[][] = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    // Partial pivot.
    let pivot = i;
    let max = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      const v = Math.abs(M[k][i]);
      if (v > max) {
        max = v;
        pivot = k;
      }
    }
    if (max < 1e-12) {
      throw new Error(`Singular matrix at row ${i}`);
    }
    if (pivot !== i) {
      const tmp = M[i];
      M[i] = M[pivot];
      M[pivot] = tmp;
    }
    // Normalize pivot row.
    const piv = M[i][i];
    for (let j = i; j <= n; j++) M[i][j] /= piv;
    // Eliminate.
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = M[k][i];
      if (factor === 0) continue;
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }
  return M.map((row) => row[n]);
}
