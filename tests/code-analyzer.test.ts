import { describe, it, expect } from "vitest";
import { analyzeCode } from "../src/analyzers/code-analyzer.js";

describe("analyzeCode", () => {
  it("should detect TypeScript language from .ts extension", () => {
    const result = analyzeCode("app.ts", "const x = 1;");
    expect(result.language).toBe("typescript");
  });

  it("should detect JavaScript language from .js extension", () => {
    const result = analyzeCode("app.js", "const x = 1;");
    expect(result.language).toBe("javascript");
  });

  it("should extract ES module imports", () => {
    const code = `import { Router } from "express";\nimport React from "react";`;
    const result = analyzeCode("app.ts", code);
    expect(result.imports).toEqual([
      { source: "express", specifiers: ["Router"] },
      { source: "react", specifiers: ["React"] },
    ]);
  });

  it("should extract CommonJS require imports", () => {
    const code = `const express = require("express");\nconst { join } = require("path");`;
    const result = analyzeCode("app.js", code);
    expect(result.imports).toEqual([
      { source: "express", specifiers: ["express"] },
      { source: "path", specifiers: ["join"] },
    ]);
  });

  it("should extract exported functions", () => {
    const code = `export async function getUsers(req: Request) {\n  return [];\n}\nfunction internal() {}`;
    const result = analyzeCode("api.ts", code);
    expect(result.functions).toHaveLength(2);
    expect(result.functions[0]).toEqual({
      name: "getUsers",
      isAsync: true,
      isExported: true,
      params: "req: Request",
    });
    expect(result.functions[1]).toMatchObject({ name: "internal", isExported: false });
  });

  it("should extract named exports", () => {
    const code = `export const FOO = 1;\nexport function bar() {}\nexport default class Baz {}`;
    const result = analyzeCode("mod.ts", code);
    expect(result.exports).toContain("FOO");
    expect(result.exports).toContain("bar");
    expect(result.exports).toContain("default");
  });

  it("should extract classes with methods", () => {
    const code = `export class UserService {\n  async findAll() { return []; }\n  create(data: any) { return data; }\n}`;
    const result = analyzeCode("service.ts", code);
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].name).toBe("UserService");
    expect(result.classes[0].isExported).toBe(true);
    expect(result.classes[0].methods).toContain("findAll");
    expect(result.classes[0].methods).toContain("create");
  });

  it("should detect frameworks from imports", () => {
    const code = `import express from "express";\nimport { PrismaClient } from "@prisma/client";`;
    const result = analyzeCode("app.ts", code);
    expect(result.frameworks).toContain("Express");
    expect(result.frameworks).toContain("Prisma");
  });

  it("should count non-empty lines of code", () => {
    const code = `const a = 1;\n\n\nconst b = 2;\n`;
    const result = analyzeCode("file.ts", code);
    expect(result.linesOfCode).toBe(2);
  });

  it("should handle empty source code", () => {
    const result = analyzeCode("empty.ts", "");
    expect(result.imports).toEqual([]);
    expect(result.exports).toEqual([]);
    expect(result.functions).toEqual([]);
    expect(result.classes).toEqual([]);
    expect(result.frameworks).toEqual([]);
    expect(result.linesOfCode).toBe(0);
  });
});
