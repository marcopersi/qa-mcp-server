import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { generateTests } from "./generators/test-generator.js";

const server = new Server(
  {
    name: "qa-mcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {
        generate_tests: {
          description: "Generate unit, integration, and Playwright tests",
          inputSchema: {
            type: "object",
            properties: {
              filePath: { type: "string" },
              code: { type: "string" }
            },
            required: ["filePath", "code"]
          }
        }
      }
    }
  }
);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "generate_tests") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { filePath, code } = request.params.arguments as {
    filePath: string;
    code: string;
  };

  const tests = await generateTests(filePath, code);

  return {
    content: [
      {
        type: "text",
        text: tests
      }
    ]
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();