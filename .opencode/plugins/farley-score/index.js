import { analyze } from "./lib/analyze.js";
import { listExercises, getExercise, validateAnswer } from "./lib/coach.js";

export const FarleyScorePlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    tool: {
      farley_score: {
        description: `Analyze test quality using Dave Farley's 8 Properties of Good Tests.

Discovers test files, detects quality signals (assertions, mocks, sleep, I/O, reflection, tautologies), and produces a Farley Index (0-10) with per-property breakdown.

Supported languages: Python, Java, JavaScript/TypeScript, C#, Go.

Args:
  target: Path to test files or directory (e.g., "tests/", "src/test/java/", "test_calculator.py")`,
        args: {
          target: {
            type: "string",
            description: "Path to test files or directory. Examples: 'tests/', 'src/test/java/', 'test_calculator.py'"
          }
        },
        async execute(args, context) {
          const { directory } = context;
          const target = args.target || "tests/";
          const targetPath = target.startsWith("/") || target.includes(":")
            ? target
            : `${directory}/${target}`;

          try {
            const result = analyze(targetPath);
            if (result.error) {
              return { error: result.error };
            }
            return result;
          } catch (error) {
            return {
              error: `Analysis failed: ${error.message}`,
              target: targetPath
            };
          }
        }
      },

      farley_coach: {
        description: `Interactive test quality coaching using Dave Farley's 8 Properties.

Provides Socratic exercises to learn test quality design. Includes built-in practice tests with deliberate anti-patterns.

Modes:
  - list: Show all available exercises
  - exercise: Get a specific exercise by ID
  - validate: Check user's answer against the exercise

Args:
  mode: "list" | "exercise" | "validate"
  exercise_id: Exercise ID (for exercise/validate modes)
  answer: User's answer text (for validate mode)
  difficulty: Filter by difficulty level (beginner, intermediate, advanced)`,
        args: {
          mode: {
            type: "string",
            description: "Mode: 'list', 'exercise', or 'validate'"
          },
          exercise_id: {
            type: "string",
            description: "Exercise ID (e.g., 'trivial-tautology', 'mock-tautology', 'mega-test')"
          },
          answer: {
            type: "string",
            description: "User's answer text (for validate mode)"
          },
          difficulty: {
            type: "string",
            description: "Filter by difficulty: 'beginner', 'intermediate', or 'advanced'"
          }
        },
        async execute(args, context) {
          const mode = args.mode || "list";

          try {
            if (mode === "list") {
              const exercises = listExercises(args.difficulty);
              return {
                mode: "list",
                exercises,
                message: `Available exercises: ${exercises.length}\n\nSay something like: "Show me exercise ${exercises[0]?.id || 'trivial-tautology'}" to start learning.`
              };
            } else if (mode === "exercise") {
              const exerciseId = args.exercise_id || "trivial-tautology";
              const result = getExercise(exerciseId);
              if (!result) {
                return { error: "Exercise not found" };
              }
              return {
                mode: "exercise",
                exercise: result,
                message: `Exercise: ${result.name} (${result.difficulty})\n\nAffected properties: ${result.properties.join(", ")}\n\n${result.description}\n\nCode:\n\`\`\`\n${result.code}\n\`\`\`\n\nQuestion: ${result.question}\n\nHint: ${result.hint}\n\nWhat do you think?`
              };
            } else if (mode === "validate") {
              if (!args.exercise_id || !args.answer) {
                return {
                  error: "validate mode requires exercise_id and answer"
                };
              }
              const result = validateAnswer(args.exercise_id, args.answer);
              return {
                mode: "validate",
                result,
                message: `Feedback: ${result.feedback}\n\nScore: ${result.score}/${result.max_score}\n\nExplanation: ${result.explanation}\n\nMatched concepts: ${result.matched_concepts.join(", ")}`
              };
            } else {
              return {
                error: `Unknown mode: ${mode}. Use 'list', 'exercise', or 'validate'.`
              };
            }
          } catch (error) {
            return {
              error: `Coach failed: ${error.message}`,
              mode
            };
          }
        }
      }
    }
  };
};
