/** Domain-specific scoring logic for the Farley Index.
 *  Builds on core.js math primitives. Contains all constants and formulas
 *  specified in farley-properties-and-scoring.md.
 */

import { sigmoid, p90, mean, locWeightedMean } from "./core.js";

// --- Constants ---

const PROPERTY_CODES = ["U", "M", "R", "A", "N", "G", "F", "T"];

const WEIGHTS = {
  U: 1.5,
  M: 1.5,
  R: 1.25,
  A: 1.0,
  N: 1.0,
  G: 1.0,
  F: 0.75,
  T: 1.0,
};

const WEIGHT_SUM = 9.0;

const RATING_SCALE = [
  [9.0, "Exemplary"],
  [7.5, "Excellent"],
  [6.0, "Good"],
  [4.5, "Fair"],
  [3.0, "Poor"],
  [0.0, "Critical"],
];

const DEFAULT_SIGMOID_PARAMS = {
  U: { neg_midpoint: 0.30, neg_steepness: 8.0, pos_midpoint: 0.50, pos_steepness: 8.0, neg_weight: 0.5, pos_weight: 0.5 },
  M: { neg_midpoint: 0.25, neg_steepness: 8.0, pos_midpoint: 0.40, pos_steepness: 8.0, neg_weight: 0.5, pos_weight: 0.5 },
  R: { neg_midpoint: 0.15, neg_steepness: 10.0, pos_midpoint: 0.30, pos_steepness: 10.0, neg_weight: 0.5, pos_weight: 0.5 },
  A: { neg_midpoint: 0.20, neg_steepness: 8.0, pos_midpoint: 0.40, pos_steepness: 8.0, neg_weight: 0.5, pos_weight: 0.5 },
  N: { neg_midpoint: 0.20, neg_steepness: 8.0, pos_midpoint: 0.50, pos_steepness: 8.0, neg_weight: 0.5, pos_weight: 0.5 },
  G: { neg_midpoint: 0.25, neg_steepness: 8.0, pos_midpoint: 0.40, pos_steepness: 8.0, neg_weight: 0.5, pos_weight: 0.5 },
  F: { neg_midpoint: 0.10, neg_steepness: 10.0, pos_midpoint: 0.30, pos_steepness: 10.0, neg_weight: 0.5, pos_weight: 0.5 },
  T: { neg_midpoint: 0.30, neg_steepness: 6.0, pos_midpoint: 0.50, pos_steepness: 6.0, neg_weight: 0.5, pos_weight: 0.5 },
};

// --- Functions ---

function normalizeProperty(prop, negCount, posCount, totalMethods, params) {
  const p = params || DEFAULT_SIGMOID_PARAMS[prop];
  if (totalMethods === 0) return 5.0;
  if (negCount === 0 && posCount === 0) return 5.0;

  const negDensity = negCount / totalMethods;
  const posDensity = posCount / totalMethods;

  const negComponent = (1.0 - sigmoid(negDensity, p.neg_midpoint, p.neg_steepness)) * 10.0;
  const posComponent = sigmoid(posDensity, p.pos_midpoint, p.pos_steepness) * 10.0;

  return p.neg_weight * negComponent + p.pos_weight * posComponent;
}

function blendScores(staticScore, llmScore, staticWeight = 0.6) {
  return staticWeight * staticScore + (1.0 - staticWeight) * llmScore;
}

function computeFarleyIndex(propertyScores) {
  const weightedSum = PROPERTY_CODES.reduce(
    (sum, prop) => sum + propertyScores[prop] * WEIGHTS[prop],
    0
  );
  return weightedSum / WEIGHT_SUM;
}

function getRating(farleyIndex) {
  for (const [threshold, rating] of RATING_SCALE) {
    if (farleyIndex >= threshold) return rating;
  }
  return "Critical";
}

function aggregateFile(methodScores) {
  if (!methodScores || methodScores.length === 0) {
    return Object.fromEntries(PROPERTY_CODES.map((p) => [p, 5.0]));
  }

  const result = {};
  for (const prop of PROPERTY_CODES) {
    const scores = methodScores
      .filter((m) => m[prop] !== undefined)
      .map((m) => m[prop]);
    result[prop] = scores.length > 0 ? mean(scores) : 5.0;
  }
  return result;
}

function aggregateFileSplit(methodNegScores, methodPosScores) {
  const result = {};
  for (const prop of PROPERTY_CODES) {
    const negVals = methodNegScores
      .filter((m) => m[prop] !== undefined)
      .map((m) => m[prop]);
    const posVals = methodPosScores
      .filter((m) => m[prop] !== undefined)
      .map((m) => m[prop]);
    const negAgg = negVals.length > 0 ? p90(negVals) : 0.0;
    const posAgg = posVals.length > 0 ? mean(posVals) : 0.0;
    result[prop] = { neg: negAgg, pos: posAgg };
  }
  return result;
}

function aggregateSuite(fileScores, fileLocs) {
  const result = {};
  for (const prop of PROPERTY_CODES) {
    const scores = fileScores.map((f) => f[prop]);
    result[prop] = locWeightedMean(scores, fileLocs);
  }
  return result;
}

function fullPipeline(data) {
  const staticWeight = data.static_weight !== undefined ? data.static_weight : 0.6;
  const properties = data.properties || {};
  const llmScores = data.llm_scores;

  const staticScores = {};
  for (const prop of PROPERTY_CODES) {
    const propData = properties[prop] || {};
    staticScores[prop] = normalizeProperty(
      prop,
      propData.neg_count || 0,
      propData.pos_count || 0,
      propData.total_methods || 0
    );
  }

  let blendedScores = null;
  let finalScores;
  if (llmScores) {
    blendedScores = {};
    for (const prop of PROPERTY_CODES) {
      blendedScores[prop] = blendScores(
        staticScores[prop],
        llmScores[prop] !== undefined ? llmScores[prop] : staticScores[prop],
        staticWeight
      );
    }
    finalScores = blendedScores;
  } else {
    finalScores = staticScores;
  }

  const farleyIndex = computeFarleyIndex(finalScores);
  const rating = getRating(farleyIndex);

  const result = {
    static_scores: staticScores,
    farley_index: Math.round(farleyIndex * 100) / 100,
    rating: rating,
  };
  if (blendedScores !== null) {
    result.blended_scores = blendedScores;
  }
  return result;
}

export {
  PROPERTY_CODES,
  WEIGHTS,
  WEIGHT_SUM,
  RATING_SCALE,
  DEFAULT_SIGMOID_PARAMS,
  normalizeProperty,
  blendScores,
  computeFarleyIndex,
  getRating,
  aggregateFile,
  aggregateFileSplit,
  aggregateSuite,
  fullPipeline,
};
