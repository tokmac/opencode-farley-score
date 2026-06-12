/** Pure math primitives for Farley Index calculation.
 * No external dependencies — uses only JavaScript Math.
 */

function sigmoid(x, midpoint, steepness) {
  const z = -steepness * (x - midpoint);
  if (z > 500) return 0.0;
  if (z < -500) return 1.0;
  return 1.0 / (1.0 + Math.exp(z));
}

function p90(values) {
  if (!values || values.length === 0) return 0.0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const idx = 0.9 * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
}

function mean(values) {
  if (!values || values.length === 0) return 0.0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function locWeightedMean(scores, locs) {
  if (!scores || !locs || scores.length === 0 || locs.length === 0) return 0.0;
  const totalLoc = locs.reduce((a, b) => a + b, 0);
  if (totalLoc === 0) return 0.0;
  return scores.reduce((sum, s, i) => sum + s * locs[i], 0) / totalLoc;
}

export { sigmoid, p90, mean, locWeightedMean };
