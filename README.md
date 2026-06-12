# Farley Score Plugin for OpenCode

Test quality assessment using Dave Farley's 8 Properties of Good Tests, now available as an OpenCode plugin.

## Features

- **Farley Score Tool** — Analyze your test suite and get a Farley Index (0-10)
- **Farley Coach Tool** — Interactive Socratic coaching with built-in exercises
- **5 Languages** — Python, Java, JavaScript/TypeScript, C#, Go
- **Auto-discovery** — Finds test files automatically
- **Signal Detection** — Detects anti-patterns: tautologies, mocks, sleep, I/O, reflection
- **Pure JavaScript** — No external dependencies

## Installation

Place this directory in your OpenCode plugins directory:

```bash
# Project-level (recommended)
cp -r .opencode/plugins/farley-score /path/to/your/project/.opencode/plugins/

# Or global
cp -r .opencode/plugins/farley-score ~/.config/opencode/plugins/
```

The plugin auto-loads on OpenCode startup.

## Usage

### Commands (Slash Commands)

OpenCode supports commands similar to Claude Code's slash commands:

#### `/farley-score [target]`

Run a full test quality analysis:
```
> /farley-score tests/
> /farley-score src/test/java/
> /farley-score test_calculator.py
```

#### `/farley-score-coach [topic]`

Interactive coaching mode:
```
> /farley-score-coach
> /farley-score-coach trivial-tautology
> /farley-score-coach mock-tautology
```

### Tools (Auto-Invoked)

OpenCode will automatically invoke the tools based on context:

```
> Analyze my tests in tests/
> I want to learn about test quality
> What's wrong with this test?
```

### Example Conversations

**Analysis with command:**
```
> /farley-score tests/
OpenCode: [Runs analysis via command]
Result: Farley Index 7.2 (Good)
  - Understandable: 5.0
  - Maintainable: 4.3
  - Repeatable: 8.7
  ...
```

**Coaching with command:**
```
> /farley-score-coach trivial-tautology
OpenCode: [Runs coaching via command]
Result: Exercise: Trivial Tautology (beginner)
  Code: def test_true_is_true(self): self.assertTrue(True)
  Question: What is wrong with these tests?
  Hint: Would they still pass if you deleted ALL production code?

You: It's a tautology that provides no value
OpenCode: Validates your answer...
  Feedback: Good! You identified the key issues.
  Score: 2/3
  Explanation: A test that passes even when all production code is deleted...
```

## The 8 Properties

| Code | Property | Weight | Description |
|------|----------|--------|-------------|
| U | Understandable | 1.5x | Tests read like specifications |
| M | Maintainable | 1.5x | Tests verify behavior, not implementation |
| R | Repeatable | 1.25x | Same result every time, anywhere |
| A | Atomic | 1.0x | Isolated, no shared state |
| N | Necessary | 1.0x | Every test adds unique value |
| G | Granular | 1.0x | Single outcome per test |
| F | Fast | 0.75x | Pure computation, no I/O |
| T | First (TDD) | 1.0x | Written before implementation |

## Exercises

| Exercise | Difficulty | Properties | Anti-Pattern |
|----------|-----------|------------|-------------|
| trivial-tautology | beginner | N, T | Trivial Tautology |
| mock-tautology | intermediate | N, M | Mock Tautology |
| mock-only | intermediate | N, T | Mock-Only Test |
| mega-test | beginner | G, U | Mega-Test |
| shared-state | intermediate | R, A | Shared Mutable State |
| sleep | beginner | F, R | Time Sleep |
| implementation-coupling | advanced | M | Implementation Coupling |
| over-specified | advanced | M | Over-Specified Interactions |
| framework-test | beginner | N | Framework Test |
| cryptic-name | beginner | U | Cryptic Test Name |

## Rating Scale

| Farley Index | Rating |
|-------------|--------|
| 9.0 - 10.0 | Exemplary |
| 7.5 - 8.9 | Excellent |
| 6.0 - 7.4 | Good |
| 4.5 - 5.9 | Fair |
| 3.0 - 4.4 | Poor |
| 0.0 - 2.9 | Critical |

## Plugin Structure

```
.opencode/
├── commands/
│   ├── farley-score.md          # Slash command: /farley-score
│   └── farley-score-coach.md    # Slash command: /farley-score-coach
└── plugins/
    └── farley-score/
        ├── index.js             # Plugin entry point (exports tools)
        ├── package.json         # Plugin metadata (type: module)
        └── lib/                 # Pure JavaScript backend
            ├── core.js          # Math primitives
            ├── scoring.js       # Farley Index calculation
            ├── analyze.js       # Test file analyzer
            └── coach.js         # Coaching exercises
```

## Examples

The `examples/` directory contains a sample project with deliberately mixed-quality tests:
- `examples/sample-project/tests/test_calculator.py` — 13 tests (3 good + 10 bad)
- `examples/sample-project/tests/test_user_service.py` — 8 tests (4 good + 4 bad)

These are used by the coaching exercises and serve as reference material.

## Attribution

- **Dave Farley** — 8 Properties of Good Tests
- **Andrea Laforgia** — Farley Score methodology and signal detection
- **Bernard McCarty** — Plugin implementation

## License

MIT

---

**Note:** This is the OpenCode plugin. For the Claude Code plugin, see the [farley_score_plugin](https://github.com/bernardSolar/farley_score_plugin) repository.
