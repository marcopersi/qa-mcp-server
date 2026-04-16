import { describe, it, expect } from "vitest";
import { analyzeProject } from "../src/analyzers/project-analyzer.js";

describe("analyzeProject", () => {
  it("should detect Express framework", () => {
    const pkg = JSON.stringify({
      name: "my-api",
      dependencies: { express: "^4.18.0" },
    });
    const result = analyzeProject(pkg);
    expect(result.framework).toBe("Express");
  });

  it("should detect Next.js over React (framework priority)", () => {
    const pkg = JSON.stringify({
      name: "my-app",
      dependencies: { next: "^14.0.0", react: "^18.0.0" },
    });
    const result = analyzeProject(pkg);
    expect(result.framework).toBe("Next.js");
  });

  it("should detect vitest as test framework", () => {
    const pkg = JSON.stringify({
      name: "proj",
      devDependencies: { vitest: "^1.0.0" },
    });
    const result = analyzeProject(pkg);
    expect(result.testFramework).toBe("vitest");
  });

  it("should detect Playwright as e2e framework", () => {
    const pkg = JSON.stringify({
      name: "proj",
      devDependencies: { "@playwright/test": "^1.40.0" },
    });
    const result = analyzeProject(pkg);
    expect(result.e2eFramework).toBe("Playwright");
  });

  it("should detect TypeScript when typescript is a dependency", () => {
    const pkg = JSON.stringify({
      name: "proj",
      devDependencies: { typescript: "^5.0.0" },
    });
    const result = analyzeProject(pkg);
    expect(result.language).toBe("typescript");
  });

  it("should default to JavaScript when no typescript dep", () => {
    const pkg = JSON.stringify({
      name: "plain",
      dependencies: { express: "^4.0.0" },
    });
    const result = analyzeProject(pkg);
    expect(result.language).toBe("javascript");
  });

  it("should return dependency arrays", () => {
    const pkg = JSON.stringify({
      name: "proj",
      dependencies: { express: "^4.0.0", zod: "^3.0.0" },
      devDependencies: { vitest: "^1.0.0" },
    });
    const result = analyzeProject(pkg);
    expect(result.dependencies).toEqual(["express", "zod"]);
    expect(result.devDependencies).toEqual(["vitest"]);
  });

  it("should handle invalid JSON gracefully", () => {
    const result = analyzeProject("not-json{{{");
    expect(result.name).toBe("unknown");
    expect(result.framework).toBeNull();
  });

  it("should handle empty package.json", () => {
    const result = analyzeProject("{}");
    expect(result.name).toBe("unknown");
    expect(result.dependencies).toEqual([]);
    expect(result.framework).toBeNull();
  });
});
