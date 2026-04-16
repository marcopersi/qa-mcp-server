import { describe, it, expect } from "vitest";
import { buildTestPrompt, type TestType } from "../src/utils/prompt-builder.js";
import type { CodeAnalysis } from "../src/analyzers/code-analyzer.js";
import type { ProjectContext } from "../src/analyzers/project-analyzer.js";

const sampleAnalysis: CodeAnalysis = {
  filePath: "src/service.ts",
  language: "typescript",
  imports: [{ source: "express", specifiers: ["Router"] }],
  exports: ["getUsers"],
  functions: [{ name: "getUsers", isAsync: true, isExported: true, params: "req: Request" }],
  classes: [],
  frameworks: ["Express"],
  linesOfCode: 10,
};

const sampleProject: ProjectContext = {
  name: "my-api",
  language: "typescript",
  framework: "Express",
  testFramework: "vitest",
  e2eFramework: "Playwright",
  dependencies: ["express"],
  devDependencies: ["vitest", "@playwright/test"],
};

describe("buildTestPrompt", () => {
  it("should include unit test instructions for testType=unit", () => {
    const result = buildTestPrompt(sampleAnalysis, sampleProject, "unit", "// source");
    expect(result).toContain("unit tests");
    expect(result).toContain("AAA pattern");
    expect(result).toContain("vitest");
  });

  it("should include integration test instructions for testType=integration", () => {
    const result = buildTestPrompt(sampleAnalysis, sampleProject, "integration", "// source");
    expect(result).toContain("integration tests");
    expect(result).toContain("self-contained");
    expect(result).toContain("supertest");
  });

  it("should include e2e test instructions for testType=e2e", () => {
    const result = buildTestPrompt(sampleAnalysis, sampleProject, "e2e", "// source");
    expect(result).toContain("Playwright");
    expect(result).toContain("getByRole");
  });

  it("should include project context when provided", () => {
    const result = buildTestPrompt(sampleAnalysis, sampleProject, "unit", "// source");
    expect(result).toContain("## Project Context");
    expect(result).toContain("my-api");
    expect(result).toContain("Express");
  });

  it("should omit project context when null", () => {
    const result = buildTestPrompt(sampleAnalysis, null, "unit", "// source");
    expect(result).not.toContain("## Project Context");
  });

  it("should include code analysis section", () => {
    const result = buildTestPrompt(sampleAnalysis, null, "unit", "// source");
    expect(result).toContain("## Code Analysis");
    expect(result).toContain("src/service.ts");
    expect(result).toContain("Express");
    expect(result).toContain("getUsers");
  });

  it("should include the source code", () => {
    const code = "export function hello() { return 'world'; }";
    const result = buildTestPrompt(sampleAnalysis, null, "unit", code);
    expect(result).toContain("## Source Code");
    expect(result).toContain(code);
  });

  it("should list exported functions in the task section for unit tests", () => {
    const result = buildTestPrompt(sampleAnalysis, sampleProject, "unit", "// source");
    expect(result).toContain("Functions to test: getUsers");
  });

  it("should use correct e2e framework name in task section", () => {
    const result = buildTestPrompt(sampleAnalysis, sampleProject, "e2e", "// source");
    expect(result).toContain("end-to-end tests using **Playwright**");
  });
});
