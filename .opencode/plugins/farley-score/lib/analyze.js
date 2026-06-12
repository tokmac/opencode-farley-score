/** Analyze test files and produce a Farley Score report.
 *  Node.js version — no Python dependency.
 */

import fs from "fs";
import path from "path";
import { fullPipeline, PROPERTY_CODES } from "./scoring.js";

// Test file patterns per language
const TEST_PATTERNS = {
  python: {
    file_patterns: [/^test_.*\.py$/, /^.*_test\.py$/],
    test_method: /^\s*def\s+(test_[a-zA-Z0-9_]+)/m,
    assertion: /\bassert(?:Equal|True|False|IsNotNone|IsNone|Raises|In|NotIn|Is|IsNot|AlmostEqual|CountEqual|Greater|Less|Regex|Warns)?\b/g,
    mock: /\b(MagicMock|Mock|mock|patch|create_autospec)\b/g,
    sleep: /\btime\.sleep\(|Thread\.sleep\(/g,
    io: /\b(open|read|write|File|Path|os\.path|requests\.get|urllib)\b/g,
    reflection: /\b(getattr|setattr|hasattr|getDeclaredField|setAccessible)\b/g,
    random: /\brandom\.|datetime\.now\(|time\.time\(/g,
    tautology: /assertTrue\s*\(\s*True\s*\)|assertEquals\s*\(\s*1\s*,\s*1\s*\)|assertTrue\s*\(\s*true\s*\)/g,
    nested: /\bclass\s+Test\w*\b/g,
    parameterized: /\bparametrize\b|@pytest\.mark\.parameterize/g,
  },
  java: {
    file_patterns: [/^.*Test\.java$/, /^.*Tests\.java$/],
    test_method: /^\s*@Test\b/m,
    assertion: /\bassert(?:Equals|True|False|NotNull|Null|That|Throws|DoesNotThrow|All|IterableEquals|LinesMatch)?\b/g,
    mock: /\b(mock|Mock|Mockito|when|verify|spy)\b/g,
    sleep: /\bThread\.sleep\(/g,
    io: /\b(new\s+File|FileReader|FileWriter|BufferedReader|BufferedWriter|InputStream|OutputStream|Scanner|Paths)\b/g,
    reflection: /\bgetDeclaredField|setAccessible|getClass|Class\.forName\b/g,
    random: /\bRandom|Math\.random|System\.currentTimeMillis|LocalDate\.now|new\s+Date\b/g,
    tautology: /assertTrue\s*\(\s*true\s*\)|assertEquals\s*\(\s*1\s*,\s*1\s*\)|assertTrue\s*\(\s*True\s*\)/g,
    nested: /\bclass\s+\w+Test\b|@Nested\b/g,
    parameterized: /@ParameterizedTest\b/g,
  },
  javascript: {
    file_patterns: [/^.*\.test\.(js|ts|jsx|tsx)$/, /^.*\.spec\.(js|ts|jsx|tsx)$/],
    test_method: /\b(it|test)\s*\(/g,
    assertion: /\b(expect|assert)\b/g,
    mock: /\b(jest\.mock|mock|spyOn|fn|vi\.mock|vi\.fn)\b/g,
    sleep: /\bsetTimeout|setInterval|sleep\(/g,
    io: /\b(fs\.|readFile|writeFile|fetch|axios|http|request)\b/g,
    reflection: /\bReflect|Object\.getOwnProperty|getPrototypeOf\b/g,
    random: /\bMath\.random|Date\.now|new\s+Date\b/g,
    tautology: /expect\s*\(\s*true\s*\)\.toBe\s*\(\s*true\s*\)|expect\s*\(\s*1\s*\)\.toBe\s*\(\s*1\s*\)/g,
    nested: /\bdescribe\s*\(/g,
    parameterized: /\bit\.each|test\.each|describe\.each\b/g,
  },
  csharp: {
    file_patterns: [/^.*Tests?\.cs$/],
    test_method: /^\s*\[Test\]|^\s*\[Fact\]|^\s*\[Theory\]/m,
    assertion: /\bAssert\.(?:Equal|True|False|NotNull|Null|That|Throws|DoesNotThrow|All|Contains|InRange|IsType|AssignableFrom)\b/g,
    mock: /\b(mock|Mock|Moq|Substitute|It\.IsAny|Verify|Received)\b/g,
    sleep: /\bThread\.Sleep\(|Task\.Delay\(/g,
    io: /\b(new\s+File|FileStream|StreamReader|StreamWriter|HttpClient|WebRequest)\b/g,
    reflection: /\bGetType|typeof|Activator\.CreateInstance|GetField|GetProperty\b/g,
    random: /\bRandom|DateTime\.Now|DateTimeOffset\.Now|Guid\.NewGuid\b/g,
    tautology: /Assert\.True\s*\(\s*true\s*\)|Assert\.Equal\s*\(\s*1\s*,\s*1\s*\)/g,
    nested: /\bclass\s+\w+Test\b/g,
    parameterized: /\[Theory\]/g,
  },
  go: {
    file_patterns: [/^.*_test\.go$/],
    test_method: /^\s*func\s+Test\w+/m,
    assertion: /\b(assert|require|Equal|NotEqual|True|False|Nil|NotNil|NoError|Error|Contains|Len|Empty|NotEmpty)\b/g,
    mock: /\b(mock|Mock|gomock|EXPECT|Return)\b/g,
    sleep: /\btime\.Sleep\(/g,
    io: /\b(os\.Open|ioutil\.Read|http\.Get|http\.Post|json\.Marshal|json\.Unmarshal)\b/g,
    reflection: /\breflect\.|unsafe\.|reflect\.ValueOf\b/g,
    random: /\brand\.|time\.Now\(\)\b/g,
    tautology: /\bassert\.True\s*\(\s*t\s*,\s*true\s*\)|assert\.Equal\s*\(\s*t\s*,\s*1\s*,\s*1\s*\)/g,
    nested: /\bt\.Run\(/g,
    parameterized: /\bt\.Run\(/g,
  },
};

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".py") return "python";
  if (ext === ".java") return "java";
  if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) return "javascript";
  if (ext === ".cs") return "csharp";
  if (ext === ".go") return "go";
  return null;
}

function countMatches(content, regex) {
  if (!regex.global) {
    const globalRegex = new RegExp(regex.source, regex.flags + "g");
    const matches = content.match(globalRegex);
    return matches ? matches.length : 0;
  }
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

function findTestFiles(targetDir) {
  const testFiles = [];
  const skipDirs = new Set([".git", "node_modules", "__pycache__", "venv", ".env", "dist", "build", ".opencode", ".claude"]);

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          walk(fullPath);
        }
      } else {
        const lang = detectLanguage(fullPath);
        if (lang) {
          const patterns = TEST_PATTERNS[lang].file_patterns;
          if (patterns.some((p) => p.test(entry.name))) {
            testFiles.push({ filePath: fullPath, lang });
          }
        }
      }
    }
  }

  walk(targetDir);
  return testFiles;
}

function analyzeFile(filePath, lang) {
  let content;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  const patterns = TEST_PATTERNS[lang];

  const testMethods = countMatches(content, patterns.test_method);
  const assertions = countMatches(content, patterns.assertion);
  const mockCount = countMatches(content, patterns.mock);
  const sleepCount = countMatches(content, patterns.sleep);
  const ioCount = countMatches(content, patterns.io);
  const reflectionCount = countMatches(content, patterns.reflection);
  const randomCount = countMatches(content, patterns.random);
  const tautologyCount = countMatches(content, patterns.tautology);
  const parameterizedCount = countMatches(content, patterns.parameterized);

  const negSignals = Object.fromEntries(PROPERTY_CODES.map((p) => [p, 0]));
  const posSignals = Object.fromEntries(PROPERTY_CODES.map((p) => [p, 0]));

  if (testMethods > 0) {
    const testNames = [];
    let match;
    const nameRegex = new RegExp(patterns.test_method.source, "gm");
    while ((match = nameRegex.exec(content)) !== null) {
      testNames.push(match[1] || match[0]);
    }

    const shortNames = testNames.filter((n) => n.length < 10).length;
    const longNames = testNames.filter((n) => n.length > 15).length;

    negSignals.U += shortNames;
    posSignals.U += longNames + parameterizedCount;

    negSignals.M += reflectionCount + (mockCount > testMethods ? mockCount : 0);
    posSignals.M += Math.max(0, testMethods - reflectionCount - (mockCount > testMethods ? mockCount : 0));

    negSignals.R += sleepCount + randomCount + ioCount;
    posSignals.R += Math.max(0, testMethods - sleepCount - randomCount - ioCount);

    if (content.includes("setUp") || content.includes("setUpClass") || content.includes("beforeEach") || content.includes("beforeAll") || content.includes("@Before")) {
      negSignals.A += 1;
    }
    posSignals.A += Math.max(0, testMethods - negSignals.A);

    negSignals.N += tautologyCount;
    posSignals.N += Math.max(0, testMethods - tautologyCount);

    const avgAssertions = assertions / testMethods;
    if (avgAssertions > 3) {
      negSignals.G += Math.floor(avgAssertions - 3);
    }
    posSignals.G += Math.max(0, testMethods - negSignals.G);

    negSignals.F += sleepCount + ioCount;
    posSignals.F += Math.max(0, testMethods - sleepCount - ioCount);

    posSignals.T += Math.floor(testMethods / 2);
  }

  return {
    file: filePath,
    lang,
    testMethods,
    assertions,
    signals: { neg: negSignals, pos: posSignals },
  };
}

function analyze(target) {
  if (!fs.existsSync(target)) {
    return { error: `Target not found: ${target}` };
  }

  const testFiles = fs.statSync(target).isDirectory()
    ? findTestFiles(target)
    : [{ filePath: target, lang: detectLanguage(target) }];

  if (testFiles.length === 0) {
    return { error: "No test files found" };
  }

  const fileResults = [];
  let totalMethods = 0;

  for (const { filePath, lang } of testFiles) {
    if (!lang) continue;
    const result = analyzeFile(filePath, lang);
    if (result) {
      fileResults.push(result);
      totalMethods += result.testMethods;
    }
  }

  if (fileResults.length === 0) {
    return { error: "Could not analyze any test files" };
  }

  const properties = {};
  for (const prop of PROPERTY_CODES) {
    const negCount = fileResults.reduce((sum, r) => sum + r.signals.neg[prop], 0);
    const posCount = fileResults.reduce((sum, r) => sum + r.signals.pos[prop], 0);
    properties[prop] = {
      neg_count: negCount,
      pos_count: posCount,
      total_methods: totalMethods,
    };
  }

  const result = fullPipeline({ properties, static_weight: 0.6 });

  return {
    target,
    files_analyzed: fileResults.length,
    test_methods: totalMethods,
    farley_index: result.farley_index,
    rating: result.rating,
    property_scores: result.static_scores,
    file_breakdown: fileResults.map((r) => ({
      file: r.file,
      lang: r.lang,
      test_methods: r.testMethods,
      assertions: r.assertions,
    })),
  };
}

export { analyze, findTestFiles, analyzeFile };
