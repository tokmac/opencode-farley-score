/** Farley Score Coach — built-in exercises and validation.
 *  Node.js version — no Python dependency.
 */

const EXERCISES = [
  {
    id: "trivial-tautology",
    name: "Trivial Tautology",
    difficulty: "beginner",
    properties: ["N", "T"],
    antiPattern: "Trivial Tautology",
    description: "Assertions that are always true regardless of any code",
    code: `def test_true_is_true(self):
    self.assertTrue(True)

def test_one_equals_one(self):
    self.assertEqual(1, 1)`,
    question: "What is wrong with these tests? Which Farley properties do they violate?",
    hint: "Would these tests still pass if you deleted ALL production code?",
    answer: [
      "trivial tautology",
      "always pass",
      "production code deleted",
      "necessary",
      "first",
      "tdd",
    ],
    explanation: "A test that passes even when all production code is deleted provides zero value. It is logically equivalent to 'x = 5; assert x == 5'.",
  },
  {
    id: "mock-tautology",
    name: "Mock Tautology",
    difficulty: "intermediate",
    properties: ["N", "M"],
    antiPattern: "Mock Tautology",
    description: "Configures a mock return value, then asserts the mock returns it",
    code: `def test_mock_returns_configured_value(self):
    mock_calc = MagicMock()
    mock_calc.add.return_value = 42
    result = mock_calc.add(1, 2)
    self.assertEqual(result, 42)`,
    question: "What's wrong with this test? Would it pass if you deleted the Calculator class?",
    hint: "Is the test testing the Calculator, or the mock framework?",
    answer: [
      "mock tautology",
      "mock framework",
      "not real code",
      "necessary",
      "maintainable",
      "production code",
    ],
    explanation: "Mock tautologies are logically equivalent to 'mock returns what I told it to return'. The test passes because of how mocks work, not because your code is correct.",
  },
  {
    id: "mock-only",
    name: "Mock-Only Test",
    difficulty: "intermediate",
    properties: ["N", "T"],
    antiPattern: "Mock-Only Test",
    description: "Every object is a mock; no real class is instantiated",
    code: `def test_mock_only_no_real_code(self):
    mock_service = MagicMock()
    mock_service.register.return_value = {"username": "test"}
    result = mock_service.register("test", "test@test.com")
    self.assertEqual(result["username"], "test")
    mock_service.register.assert_called_once()`,
    question: "What's the fundamental problem with this test?",
    hint: "Look at the imports - is UserService ever instantiated?",
    answer: [
      "mock-only",
      "no real class",
      "necessary",
      "first",
      "tdd",
      "real service",
    ],
    explanation: "When every object in a test is a mock, the test only exercises the mocking framework. The real class under test is never used.",
  },
  {
    id: "mega-test",
    name: "Mega-Test",
    difficulty: "beginner",
    properties: ["G", "U"],
    antiPattern: "Mega-Test",
    description: "Too many unrelated assertions in one test",
    code: `def test_all_operations(self):
    calc = Calculator()
    self.assertEqual(calc.add(1, 1), 2)
    self.assertEqual(calc.subtract(5, 3), 2)
    self.assertEqual(calc.multiply(3, 4), 12)
    self.assertEqual(calc.divide(10, 2), 5.0)
    self.assertEqual(len(calc.history()), 4)
    calc.clear_history()
    self.assertEqual(len(calc.history()), 0)`,
    question: "What happens when this test fails? Which properties does it violate?",
    hint: "If multiply fails, does the test name tell you what broke?",
    answer: [
      "mega-test",
      "too many assertions",
      "granular",
      "understandable",
      "single behavior",
      "separate tests",
    ],
    explanation: "When a test has 6 assertions, a failure on line 5 means lines 1-4 passed but you can't tell which behavior failed without reading the whole test.",
  },
  {
    id: "shared-state",
    name: "Shared Mutable State",
    difficulty: "intermediate",
    properties: ["R", "A"],
    antiPattern: "Shared Mutable State",
    description: "Tests share mutable state, making order-dependent",
    code: `shared_calc = Calculator()

def test_shared_state_add(self):
    result = self.shared_calc.add(1, 1)
    self.assertEqual(result, 2)

def test_shared_state_history(self):
    # This test depends on test_shared_state_add running first!
    self.assertGreater(len(self.shared_calc.history()), 0)`,
    question: "Why is this dangerous? What happens if you run the tests in a different order?",
    hint: "What if test_shared_state_history runs BEFORE test_shared_state_add?",
    answer: [
      "shared state",
      "order-dependent",
      "atomic",
      "repeatable",
      "isolated",
      "fresh instance",
    ],
    explanation: "Shared mutable state means tests can only pass in a specific order. Running them in parallel or in a different order will cause failures.",
  },
  {
    id: "sleep",
    name: "Time Sleep",
    difficulty: "beginner",
    properties: ["F", "R"],
    antiPattern: "Time Sleep",
    description: "Using sleep makes tests slow and non-deterministic",
    code: `def test_add_with_delay(self):
    calc = Calculator()
    time.sleep(0.5)
    result = calc.add(10, 20)
    self.assertEqual(result, 30)`,
    question: "Why is time.sleep() a problem in tests?",
    hint: "Think about how long this test takes to run, and whether it always passes",
    answer: [
      "sleep",
      "slow",
      "fast",
      "repeatable",
      "unnecessary delay",
      "dependency injection",
    ],
    explanation: "A test that sleeps 0.5 seconds is 500x slower than a pure computation test. Over 1000 tests, that's 8 minutes of wasted time.",
  },
  {
    id: "implementation-coupling",
    name: "Implementation Coupling",
    difficulty: "advanced",
    properties: ["M"],
    antiPattern: "Implementation Coupling",
    description: "Tests access private state or internal structure",
    code: `def test_history_internal_structure(self):
    calc = Calculator()
    calc.add(1, 2)
    self.assertEqual(calc._history[0], ("add", 1, 2, 3))
    self.assertEqual(len(calc._history), 1)`,
    question: "Why is testing a private field (_history) a bad idea?",
    hint: "What happens if you refactor history to use a list of dicts instead of tuples?",
    answer: [
      "private field",
      "implementation",
      "maintainable",
      "refactoring",
      "public behavior",
      "brittle",
    ],
    explanation: "When tests access private state, any refactoring of internal structure breaks tests even if external behavior is unchanged. This makes tests brittle.",
  },
  {
    id: "over-specified",
    name: "Over-Specified Interactions",
    difficulty: "advanced",
    properties: ["M"],
    antiPattern: "Over-Specified Interactions",
    description: "Testing exact call order and counts rather than behavior",
    code: `def test_register_calls_everything_in_order(self):
    db = MagicMock()
    email_sender = MagicMock()
    service = UserService(db, email_sender)
    service.register("charlie", "charlie@example.com")
    self.assertEqual(db.save.call_count, 1)
    self.assertEqual(email_sender.send.call_count, 1)
    db.save.assert_called_before(email_sender.send)`,
    question: "What's wrong with verifying exact call order and counts?",
    hint: "Would this test break if you moved the email sending to a background task?",
    answer: [
      "over-specified",
      "call order",
      "maintainable",
      "behavior",
      "outcomes",
      "refactoring",
    ],
    explanation: "Verifying exact call counts and ordering means tests break when you refactor internal flow, even if the user-facing behavior is identical.",
  },
  {
    id: "framework-test",
    name: "Framework Test",
    difficulty: "beginner",
    properties: ["N"],
    antiPattern: "Framework Test",
    description: "Testing language/framework behavior, not application code",
    code: `def test_python_addition(self):
    self.assertEqual(2 + 2, 4)

def test_python_string_methods(self):
    self.assertEqual("hello".upper(), "HELLO")`,
    question: "What do these tests actually verify? Are they testing YOUR code?",
    hint: "Would these tests pass even if your entire project was deleted?",
    answer: [
      "framework",
      "language",
      "necessary",
      "no value",
      "built-in",
      "application code",
    ],
    explanation: "Testing that Python's built-in '+' works or that 'upper()' capitalizes strings verifies the language, not your application.",
  },
  {
    id: "cryptic-name",
    name: "Cryptic Test Name",
    difficulty: "beginner",
    properties: ["U"],
    antiPattern: "Cryptic Name",
    description: "Test name doesn't describe behavior",
    code: `def test_it_works(self):
    db = MagicMock()
    db.find_all.return_value = [
        {"username": "a", "active": True},
        {"username": "b", "active": False},
    ]
    email_sender = MagicMock()
    service = UserService(db, email_sender)
    result = service.find_active_users()
    self.assertEqual(len(result), 2)`,
    question: "What's wrong with the name 'test_it_works'? What would be a better name?",
    hint: "If this test fails, what behavior broke? Can you tell from the name?",
    answer: [
      "cryptic",
      "understandable",
      "behavior",
      "specification",
      "test name",
      "what broke",
    ],
    explanation: "When a test fails, the name is the first thing you see. 'test_it_works' tells you nothing. 'test_should_return_active_users_only' tells you exactly what behavior broke.",
  },
];

function listExercises(difficulty) {
  let exercises = EXERCISES.map((e) => ({
    id: e.id,
    name: e.name,
    difficulty: e.difficulty,
    properties: e.properties,
    antiPattern: e.antiPattern,
  }));
  if (difficulty) {
    exercises = exercises.filter((e) => e.difficulty === difficulty);
  }
  return exercises;
}

function getExercise(exerciseId) {
  const exercise = EXERCISES.find((e) => e.id === exerciseId);
  if (!exercise) return null;
  return {
    id: exercise.id,
    name: exercise.name,
    difficulty: exercise.difficulty,
    properties: exercise.properties,
    antiPattern: exercise.antiPattern,
    description: exercise.description,
    code: exercise.code,
    question: exercise.question,
    hint: exercise.hint,
  };
}

function validateAnswer(exerciseId, userAnswer) {
  const exercise = EXERCISES.find((e) => e.id === exerciseId);
  if (!exercise) {
    return { error: "Exercise not found" };
  }

  const userLower = userAnswer.toLowerCase();
  const answerTerms = exercise.answer;

  const matched = answerTerms.filter((term) => userLower.includes(term));
  const score = matched.length;
  const maxScore = answerTerms.length;

  let feedback;
  if (score >= maxScore * 0.5) {
    feedback = "Good! You identified the key issues.";
  } else if (score > 0) {
    feedback = "Partially correct. You identified some issues but missed others.";
  } else {
    feedback = "Not quite. Think about the hint and try again.";
  }

  return {
    exercise_id: exerciseId,
    user_answer: userAnswer,
    score,
    max_score: maxScore,
    feedback,
    matched_concepts: matched,
    explanation: exercise.explanation,
  };
}

export { listExercises, getExercise, validateAnswer, EXERCISES };
