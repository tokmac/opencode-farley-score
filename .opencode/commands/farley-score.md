---
description: "Evaluate test quality using Dave Farley's 8 Properties of Good Tests"
---

Use the farley_score tool to analyze the test files in the target path.

Target: $ARGUMENTS (default: "tests/")

After the tool returns results, provide a detailed report with:
1. The overall Farley Index and rating
2. Per-property breakdown with scores
3. Identification of the weakest properties
4. Specific recommendations for improvement
5. Any detected anti-patterns (tautologies, mock issues, etc.)
