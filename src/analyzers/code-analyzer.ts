export interface ImportInfo {
  source: string;
  specifiers: string[];
}

export interface FunctionInfo {
  name: string;
  isAsync: boolean;
  isExported: boolean;
  params: string;
}

export interface ClassInfo {
  name: string;
  isExported: boolean;
  methods: string[];
}

export interface CodeAnalysis {
  filePath: string;
  language: "typescript" | "javascript";
  imports: ImportInfo[];
  exports: string[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  frameworks: string[];
  linesOfCode: number;
}

export function analyzeCode(filePath: string, sourceCode: string): CodeAnalysis {
  const language = /\.tsx?$/.test(filePath) ? "typescript" as const : "javascript" as const;

  return {
    filePath,
    language,
    imports: extractImports(sourceCode),
    exports: extractExports(sourceCode),
    functions: extractFunctions(sourceCode),
    classes: extractClasses(sourceCode),
    frameworks: detectFrameworks(sourceCode),
    linesOfCode: sourceCode.split("\n").filter(l => l.trim().length > 0).length,
  };
}

function extractImports(code: string): ImportInfo[] {
  const results: ImportInfo[] = [];

  const esRegex = /import\s+(?:type\s+)?(?:(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = esRegex.exec(code)) !== null) {
    const defaultName = match[1];
    const named = match[2];
    const source = match[3];
    const specifiers: string[] = [];
    if (defaultName) specifiers.push(defaultName);
    if (named) {
      specifiers.push(
        ...named.split(",").map(s => s.replace(/\s+as\s+\w+/, "").trim()).filter(Boolean)
      );
    }
    results.push({ source, specifiers });
  }

  const cjsRegex = /(?:const|let|var)\s+(?:(\w+)|\{([^}]*)\})\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = cjsRegex.exec(code)) !== null) {
    const specifiers = match[1]
      ? [match[1]]
      : (match[2] || "").split(",").map(s => s.trim()).filter(Boolean);
    results.push({ source: match[3], specifiers });
  }

  return results;
}

function extractExports(code: string): string[] {
  const exports: string[] = [];

  const namedRegex = /export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g;
  let match;
  while ((match = namedRegex.exec(code)) !== null) {
    exports.push(match[1]);
  }

  if (/export\s+default\s/.test(code)) {
    exports.push("default");
  }

  const reExportRegex = /export\s+\{([^}]+)\}/g;
  while ((match = reExportRegex.exec(code)) !== null) {
    exports.push(
      ...match[1].split(",").map(s => s.replace(/\s+as\s+\w+/, "").trim()).filter(Boolean)
    );
  }

  if (/module\.exports\s*=/.test(code)) {
    exports.push("default (CommonJS)");
  }

  return [...new Set(exports)];
}

function extractFunctions(code: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];

  const fnRegex = /(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
  let match;
  while ((match = fnRegex.exec(code)) !== null) {
    functions.push({
      name: match[3],
      isAsync: !!match[2],
      isExported: !!match[1],
      params: match[4].trim(),
    });
  }

  const arrowRegex = /(export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(async\s+)?(?:\([^)]*\)|[^=])\s*=>/g;
  let match2: RegExpExecArray | null;
  while ((match2 = arrowRegex.exec(code)) !== null) {
    const m = match2;
    if (!functions.some(f => f.name === m[2])) {
      functions.push({
        name: m[2],
        isAsync: !!m[3],
        isExported: !!m[1],
        params: "",
      });
    }
  }

  return functions;
}

function extractClasses(code: string): ClassInfo[] {
  const classes: ClassInfo[] = [];

  const classRegex = /(export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{/g;
  let match;
  while ((match = classRegex.exec(code)) !== null) {
    const className = match[2];
    const isExported = !!match[1];
    const classStart = match.index + match[0].length;
    const methods = extractMethodNames(code, classStart);
    classes.push({ name: className, isExported, methods });
  }

  return classes;
}

function extractMethodNames(code: string, startIndex: number): string[] {
  const methods: string[] = [];
  let depth = 1;
  let i = startIndex;
  let lineBuffer = "";

  while (i < code.length && depth > 0) {
    const ch = code[i];
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 1) {
      lineBuffer += ch;
      if (ch === "\n") {
        const methodMatch = lineBuffer.match(/(?:async\s+)?(\w+)\s*\(/);
        if (methodMatch && methodMatch[1] !== "constructor" && !lineBuffer.trimStart().startsWith("//")) {
          methods.push(methodMatch[1]);
        }
        lineBuffer = "";
      }
    }
    i++;
  }

  return methods;
}

function detectFrameworks(code: string): string[] {
  const frameworks: string[] = [];

  const patterns: [string, RegExp][] = [
    ["React", /from\s+['"]react['"]/],
    ["Next.js", /from\s+['"]next\//],
    ["Express", /from\s+['"]express['"]/],
    ["Fastify", /from\s+['"]fastify['"]/],
    ["NestJS", /from\s+['"]@nestjs\//],
    ["Hono", /from\s+['"]hono['"]/],
    ["Vue", /from\s+['"]vue['"]/],
    ["Angular", /from\s+['"]@angular\//],
    ["Svelte", /from\s+['"]svelte['"]/],
    ["Koa", /from\s+['"]koa['"]/],
    ["Prisma", /from\s+['"]@prisma\/client['"]/],
    ["Drizzle", /from\s+['"]drizzle-orm['"]/],
    ["Mongoose", /from\s+['"]mongoose['"]/],
    ["TypeORM", /from\s+['"]typeorm['"]/],
    ["tRPC", /from\s+['"]@trpc\//],
    ["Zod", /from\s+['"]zod['"]/],
  ];

  for (const [name, pattern] of patterns) {
    if (pattern.test(code)) {
      frameworks.push(name);
    }
  }

  return frameworks;
}
