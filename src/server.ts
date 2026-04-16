#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { analyzeCode } from "./analyzers/code-analyzer.js";
import { analyzeProject } from "./analyzers/project-analyzer.js";
import { buildTestPrompt, type TestType } from "./utils/prompt-builder.js";

const server = new McpServer({
  name: "qa-mcp-server",
  version: "1.0.0",
});

// ── Tools ────────────────────────────────────────────────────────────────────

server.tool(
  "analyze_code",
  "Analyzes source code structure: imports, exports, functions, classes, and framework usage. Returns structured JSON.",
  {
    filePath: z.string().describe("Path to the source file"),
    sourceCode: z.string().describe("The source code content"),
  },
  async ({ filePath, sourceCode }) => {
    const analysis = analyzeCode(filePath, sourceCode);
    return { content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }] };
  },
);

server.tool(
  "detect_project_context",
  "Detects project framework, test tools, and language from package.json content.",
  {
    packageJson: z.string().describe("Content of the project's package.json file"),
  },
  async ({ packageJson }) => {
    const context = analyzeProject(packageJson);
    return { content: [{ type: "text", text: JSON.stringify(context, null, 2) }] };
  },
);

server.tool(
  "generate_test_context",
  "Generates enriched context and instructions for test generation. The host LLM uses this output to write actual test code.",
  {
    filePath: z.string().describe("Path to the source file"),
    sourceCode: z.string().describe("The source code to generate tests for"),
    testType: z.enum(["unit", "integration", "e2e"]).describe("Type of tests to generate"),
    packageJson: z.string().optional().describe("Content of package.json for richer project context"),
  },
  async ({ filePath, sourceCode, testType, packageJson }) => {
    const analysis = analyzeCode(filePath, sourceCode);
    const project = packageJson ? analyzeProject(packageJson) : null;
    const prompt = buildTestPrompt(analysis, project, testType as TestType, sourceCode);
    return { content: [{ type: "text", text: prompt }] };
  },
);

// ── Prompts ──────────────────────────────────────────────────────────────────

const promptArgsSchema = {
  filePath: z.string().describe("Path to the source file"),
  sourceCode: z.string().describe("The source code to generate tests for"),
  packageJson: z.string().optional().describe("Content of package.json for richer project context"),
};

function makePromptHandler(testType: TestType) {
  return async (args: { filePath: string; sourceCode: string; packageJson?: string }) => {
    const { filePath, sourceCode, packageJson } = args;
    const analysis = analyzeCode(filePath, sourceCode);
    const project = packageJson ? analyzeProject(packageJson) : null;
    const prompt = buildTestPrompt(analysis, project, testType, sourceCode);
    return {
      messages: [{
        role: "user" as const,
        content: { type: "text" as const, text: prompt },
      }],
    };
  };
}

server.registerPrompt(
  "generate-unit-tests",
  {
    description: "Enriched prompt for unit test generation with code analysis and project context",
    argsSchema: promptArgsSchema,
  },
  makePromptHandler("unit"),
);

server.registerPrompt(
  "generate-integration-tests",
  {
    description: "Enriched prompt for integration test generation with code analysis and project context",
    argsSchema: promptArgsSchema,
  },
  makePromptHandler("integration"),
);

server.registerPrompt(
  "generate-e2e-tests",
  {
    description: "Enriched prompt for Playwright e2e test generation with code analysis and project context",
    argsSchema: promptArgsSchema,
  },
  makePromptHandler("e2e"),
);

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();