import type { CodeAnalysis } from "../analyzers/code-analyzer.js";
import type { ProjectContext } from "../analyzers/project-analyzer.js";

export type TestType = "unit" | "integration" | "e2e";

const UNIT_INSTRUCTIONS = `You are a senior QA engineer. Generate comprehensive, deterministic unit tests.

RULES:
- Each exported function/method/class gets its own describe block
- Test the happy path, edge cases, and error handling
- Mock external dependencies — never make real network or database calls
- Use the AAA pattern (Arrange, Act, Assert)
- Use descriptive test names: "should [expected behavior] when [condition]"
- Test boundary values where applicable
- Verify error messages and error types, not just that an error was thrown`;

const INTEGRATION_INSTRUCTIONS = `You are a senior QA engineer. Generate autonomous, deterministic integration tests.

RULES:
- Each test is self-contained — creates its own test data
- If a test deletes a resource, it creates it first
- If a test updates a resource, it creates it first
- Clean up test data in afterEach or afterAll
- Test real request/response cycles with actual status codes
- Validate response bodies, headers, and error responses
- Cover success paths (2xx), client errors (4xx), and server errors (5xx)
- Test authentication and authorization scenarios if applicable`;

const E2E_INSTRUCTIONS = `You are a senior QA engineer. Generate deterministic Playwright end-to-end tests.

RULES:
- Prefer getByRole(), getByText(), getByTestId() over CSS selectors
- AVOID arbitrary waitFor/setTimeout — use web-first assertions instead
- Use expect(locator).toBeVisible(), toHaveText(), etc.
- Each test is independent — never rely on test execution order
- Handle loading states explicitly before asserting content
- Use page.goto() with full URLs
- Test user-facing behaviors, not implementation details
- Include accessibility-relevant checks where applicable`;

export function buildTestPrompt(
  analysis: CodeAnalysis,
  project: ProjectContext | null,
  testType: TestType,
  sourceCode: string,
): string {
  const sections: string[] = [];

  sections.push(getInstructions(testType));

  if (project) {
    sections.push(formatProjectContext(project, testType));
  }

  sections.push(formatCodeAnalysis(analysis));
  sections.push(`## Source Code\n\n\`\`\`${analysis.language}\n${sourceCode}\n\`\`\``);
  sections.push(formatTask(analysis, project, testType));

  return sections.join("\n\n");
}

function getInstructions(testType: TestType): string {
  switch (testType) {
    case "unit": return UNIT_INSTRUCTIONS;
    case "integration": return INTEGRATION_INSTRUCTIONS;
    case "e2e": return E2E_INSTRUCTIONS;
  }
}

function formatProjectContext(project: ProjectContext, testType: TestType): string {
  const lines = ["## Project Context", ""];
  lines.push(`- **Project:** ${project.name}`);
  lines.push(`- **Language:** ${project.language}`);
  if (project.framework) lines.push(`- **Framework:** ${project.framework}`);

  if (testType === "e2e" && project.e2eFramework) {
    lines.push(`- **E2E Framework:** ${project.e2eFramework}`);
  } else if (project.testFramework) {
    lines.push(`- **Test Framework:** ${project.testFramework}`);
  }

  return lines.join("\n");
}

function formatCodeAnalysis(analysis: CodeAnalysis): string {
  const lines = ["## Code Analysis", ""];
  lines.push(`- **File:** \`${analysis.filePath}\``);
  lines.push(`- **Language:** ${analysis.language}`);
  lines.push(`- **Lines of code:** ${analysis.linesOfCode}`);

  if (analysis.frameworks.length > 0) {
    lines.push(`- **Detected frameworks:** ${analysis.frameworks.join(", ")}`);
  }

  if (analysis.imports.length > 0) {
    lines.push("", "### Imports");
    for (const imp of analysis.imports) {
      const specs = imp.specifiers.length > 0 ? ` (${imp.specifiers.join(", ")})` : "";
      lines.push(`- \`${imp.source}\`${specs}`);
    }
  }

  if (analysis.exports.length > 0) {
    lines.push("", "### Exports");
    for (const exp of analysis.exports) {
      lines.push(`- \`${exp}\``);
    }
  }

  if (analysis.functions.length > 0) {
    lines.push("", "### Functions");
    for (const fn of analysis.functions) {
      const asyncLabel = fn.isAsync ? "async " : "";
      const exportedLabel = fn.isExported ? " *(exported)*" : "";
      lines.push(`- \`${asyncLabel}${fn.name}(${fn.params})\`${exportedLabel}`);
    }
  }

  if (analysis.classes.length > 0) {
    lines.push("", "### Classes");
    for (const cls of analysis.classes) {
      const exportedLabel = cls.isExported ? " *(exported)*" : "";
      const methods = cls.methods.length > 0 ? cls.methods.join(", ") : "(none)";
      lines.push(`- \`${cls.name}\`${exportedLabel} — methods: ${methods}`);
    }
  }

  return lines.join("\n");
}

function formatTask(analysis: CodeAnalysis, project: ProjectContext | null, testType: TestType): string {
  const testFw = project?.testFramework || "vitest";
  const e2eFw = project?.e2eFramework || "Playwright";

  const lines = ["## Task", ""];

  switch (testType) {
    case "unit": {
      lines.push(`Generate unit tests using **${testFw}** for all exported functions and classes in this file.`);
      lines.push("Mock all external dependencies (database, HTTP, file system, etc.).");
      const exportedFns = analysis.functions.filter(f => f.isExported);
      if (exportedFns.length > 0) {
        lines.push(`\nFunctions to test: ${exportedFns.map(f => f.name).join(", ")}`);
      }
      const exportedClasses = analysis.classes.filter(c => c.isExported);
      if (exportedClasses.length > 0) {
        lines.push(`Classes to test: ${exportedClasses.map(c => c.name).join(", ")}`);
      }
      break;
    }
    case "integration":
      lines.push(`Generate integration tests using **${testFw}** with **supertest** (or equivalent).`);
      lines.push("Test actual HTTP request/response cycles against the API endpoints in this file.");
      break;
    case "e2e":
      lines.push(`Generate end-to-end tests using **${e2eFw}**.`);
      lines.push("Test user-facing workflows and page interactions.");
      break;
  }

  lines.push("\nReturn only the test code, ready to be saved as a test file.");

  return lines.join("\n");
}
