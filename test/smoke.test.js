/** Smoke test for the Farley Score plugin.
 *  Run: node test/smoke.test.js
 */

import { analyze } from "../.opencode/plugins/farley-score/lib/analyze.js";
import { fullPipeline } from "../.opencode/plugins/farley-score/lib/scoring.js";
import { listExercises, getExercise, validateAnswer } from "../.opencode/plugins/farley-score/lib/coach.js";
import { sigmoid } from "../.opencode/plugins/farley-score/lib/core.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`ASSERTION FAILED: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertClose(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`ASSERTION FAILED: ${message}\n  Expected: ${expected} (±${tolerance})\n  Actual: ${actual}`);
  }
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error.message}`);
    failed++;
  }
}

console.log("\n=== Farley Score Smoke Tests ===\n");

// --- Scoring Tests ---

test("sigmoid midpoint=0.5, steepness=8 at x=0.5 → 0.5", () => {
  assertClose(sigmoid(0.5, 0.5, 8), 0.5, 0.001, "sigmoid(0.5, 0.5, 8) should be ~0.5");
});

test("full_pipeline with no signals → all 5.0", () => {
  const result = fullPipeline({
    properties: {
      U: { neg_count: 0, pos_count: 0, total_methods: 10 },
      M: { neg_count: 0, pos_count: 0, total_methods: 10 },
      R: { neg_count: 0, pos_count: 0, total_methods: 10 },
      A: { neg_count: 0, pos_count: 0, total_methods: 10 },
      N: { neg_count: 0, pos_count: 0, total_methods: 10 },
      G: { neg_count: 0, pos_count: 0, total_methods: 10 },
      F: { neg_count: 0, pos_count: 0, total_methods: 10 },
      T: { neg_count: 0, pos_count: 0, total_methods: 10 },
    },
  });
  assertEqual(result.farley_index, 5.0, "No signals → Farley Index should be 5.0");
  assertEqual(result.rating, "Fair", "No signals → Rating should be Fair");
});

test("full_pipeline with perfect signals → high score", () => {
  const result = fullPipeline({
    properties: {
      U: { neg_count: 0, pos_count: 10, total_methods: 10 },
      M: { neg_count: 0, pos_count: 10, total_methods: 10 },
      R: { neg_count: 0, pos_count: 10, total_methods: 10 },
      A: { neg_count: 0, pos_count: 10, total_methods: 10 },
      N: { neg_count: 0, pos_count: 10, total_methods: 10 },
      G: { neg_count: 0, pos_count: 10, total_methods: 10 },
      F: { neg_count: 0, pos_count: 10, total_methods: 10 },
      T: { neg_count: 0, pos_count: 10, total_methods: 10 },
    },
  });
  assert(result.farley_index > 8.0, "Perfect signals → Farley Index should be > 8.0");
  assert(result.rating === "Excellent" || result.rating === "Exemplary", "Perfect signals → Rating should be Excellent or Exemplary");
});

test("full_pipeline with all bad signals → low score", () => {
  const result = fullPipeline({
    properties: {
      U: { neg_count: 10, pos_count: 0, total_methods: 10 },
      M: { neg_count: 10, pos_count: 0, total_methods: 10 },
      R: { neg_count: 10, pos_count: 0, total_methods: 10 },
      A: { neg_count: 10, pos_count: 0, total_methods: 10 },
      N: { neg_count: 10, pos_count: 0, total_methods: 10 },
      G: { neg_count: 10, pos_count: 0, total_methods: 10 },
      F: { neg_count: 10, pos_count: 0, total_methods: 10 },
      T: { neg_count: 10, pos_count: 0, total_methods: 10 },
    },
  });
  assert(result.farley_index < 3.0, "All bad signals → Farley Index should be < 3.0");
  assertEqual(result.rating, "Critical", "All bad signals → Rating should be Critical");
});

// --- Analyzer Tests ---

test("analyze sample tests → 2 files, 21 methods", () => {
  const target = path.resolve(__dirname, "../examples/sample-project/tests");
  const result = analyze(target);
  assertEqual(result.files_analyzed, 2, "Should analyze 2 files");
  assertEqual(result.test_methods, 21, "Should find 21 test methods");
  assert(result.farley_index > 0, "Farley Index should be > 0");
  assert(result.rating, "Should have a rating");
});

test("analyze single file → test_calculator.py", () => {
  const target = path.resolve(__dirname, "../examples/sample-project/tests/test_calculator.py");
  const result = analyze(target);
  assertEqual(result.files_analyzed, 1, "Should analyze 1 file");
  assertEqual(result.test_methods, 13, "Should find 13 test methods");
});

test("analyze non-existent target → error", () => {
  const result = analyze("/non/existent/path");
  assert(result.error, "Should return error for non-existent path");
});

test("analyze directory with no tests → error", () => {
  const result = analyze(path.resolve(__dirname, "../examples/sample-project/src"));
  assert(result.error, "Should return error for directory with no test files");
});

// --- Coach Tests ---

test("listExercises → 10 exercises", () => {
  const exercises = listExercises();
  assertEqual(exercises.length, 10, "Should list 10 exercises");
});

test("listExercises beginner → 5 exercises", () => {
  const exercises = listExercises("beginner");
  assertEqual(exercises.length, 5, "Should list 5 beginner exercises");
});

test("getExercise trivial-tautology → correct properties", () => {
  const ex = getExercise("trivial-tautology");
  assertEqual(ex.name, "Trivial Tautology", "Should have correct name");
  assertEqual(ex.difficulty, "beginner", "Should be beginner");
  assertEqual(ex.properties.length, 2, "Should affect 2 properties");
});

test("validateAnswer correct → good score", () => {
  const result = validateAnswer("trivial-tautology", "tautology necessary always pass");
  assert(result.score > 0, "Should match some concepts");
  assert(result.feedback.includes("Good") || result.feedback.includes("Partially"), "Should give positive feedback");
});

test("validateAnswer wrong → low score", () => {
  const result = validateAnswer("trivial-tautology", "I think the test is fine");
  assertEqual(result.score, 0, "Should score 0 for wrong answer");
  assert(result.feedback.includes("Not quite"), "Should give corrective feedback");
});

// --- Summary ---

console.log("\n=== Results ===");
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);

if (failed > 0) {
  console.log("\n❌ Some tests failed!");
  process.exit(1);
} else {
  console.log("\n✅ All tests passed!");
  process.exit(0);
}
