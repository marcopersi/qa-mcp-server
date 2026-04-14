export interface ProjectContext {
  name: string;
  language: "typescript" | "javascript";
  framework: string | null;
  testFramework: string | null;
  e2eFramework: string | null;
  dependencies: string[];
  devDependencies: string[];
}

export function analyzeProject(packageJsonContent: string): ProjectContext {
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(packageJsonContent);
  } catch {
    return {
      name: "unknown",
      language: "javascript",
      framework: null,
      testFramework: null,
      e2eFramework: null,
      dependencies: [],
      devDependencies: [],
    };
  }

  const deps = Object.keys((pkg.dependencies as Record<string, string>) || {});
  const devDeps = Object.keys((pkg.devDependencies as Record<string, string>) || {});
  const allDeps = [...deps, ...devDeps];

  return {
    name: (pkg.name as string) || "unknown",
    language: allDeps.includes("typescript") ? "typescript" : "javascript",
    framework: detectMainFramework(deps),
    testFramework: detectTestFramework(allDeps),
    e2eFramework: detectE2EFramework(allDeps),
    dependencies: deps,
    devDependencies: devDeps,
  };
}

function detectMainFramework(deps: string[]): string | null {
  const frameworks: [string, string][] = [
    ["next", "Next.js"],
    ["nuxt", "Nuxt"],
    ["@nestjs/core", "NestJS"],
    ["express", "Express"],
    ["fastify", "Fastify"],
    ["hono", "Hono"],
    ["koa", "Koa"],
    ["react", "React"],
    ["vue", "Vue"],
    ["svelte", "Svelte"],
    ["@angular/core", "Angular"],
  ];

  for (const [dep, name] of frameworks) {
    if (deps.includes(dep)) return name;
  }
  return null;
}

function detectTestFramework(allDeps: string[]): string | null {
  const frameworks: [string, string][] = [
    ["vitest", "vitest"],
    ["jest", "jest"],
    ["@jest/core", "jest"],
    ["mocha", "mocha"],
    ["ava", "ava"],
    ["tap", "tap"],
  ];

  for (const [dep, name] of frameworks) {
    if (allDeps.includes(dep)) return name;
  }
  return null;
}

function detectE2EFramework(allDeps: string[]): string | null {
  const frameworks: [string, string][] = [
    ["@playwright/test", "Playwright"],
    ["playwright", "Playwright"],
    ["cypress", "Cypress"],
    ["puppeteer", "Puppeteer"],
    ["testcafe", "TestCafe"],
  ];

  for (const [dep, name] of frameworks) {
    if (allDeps.includes(dep)) return name;
  }
  return null;
}
