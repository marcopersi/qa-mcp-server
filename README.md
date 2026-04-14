# QA MCP Server

A Model Context Protocol server that enriches AI coding assistants with code analysis and project context so the host LLM generates higher-quality tests.

Instead of embedding its own LLM, this server **analyzes source code and project structure**, then returns structured context and QA-engineering instructions. The host LLM (VS Code Copilot, Cursor, Claude Desktop, …) uses this context to write the actual test code.

## Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────┐
│  Host LLM       │◄──────►│  qa-mcp-server   │───────►│  Analyzers  │
│  (Copilot, …)   │  MCP   │  (stdio)         │        │  code +     │
│                 │        │                  │        │  project    │
│  generates      │        │  enriches        │        └─────────────┘
│  test code      │        │  context &       │
│                 │        │  prompts         │
└─────────────────┘        └──────────────────┘
```

## Tools

| Tool | Description |
|------|-------------|
| `analyze_code` | Parses source code → imports, exports, functions, classes, framework detection |
| `detect_project_context` | Reads `package.json` → framework, test runner, language, dependencies |
| `generate_test_context` | Combines code + project analysis into an enriched prompt for the host LLM |

## Prompts

| Prompt | Description |
|--------|-------------|
| `generate-unit-tests` | Enriched context for unit test generation |
| `generate-integration-tests` | Enriched context for integration test generation |
| `generate-e2e-tests` | Enriched context for Playwright e2e test generation |

## Installation

```bash
npm install
npm run build
```

## Configuration (VS Code / Cursor)

Add to your MCP settings (`settings.json` or `.vscode/mcp.json`):

```json
{
  "mcpServers": {
    "qa-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/qa-mcp-server/dist/server.js"]
    }
  }
}
```

## Development

```bash
npm run dev      # run with tsx (no build step)
npm run build    # compile to dist/
npm start        # run compiled server
```
