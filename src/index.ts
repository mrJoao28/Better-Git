import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { analyzeRepositoryTool } from "./tools/analyze-repository.js";
import { getStructureTool } from "./tools/get-structure.js";

const server = new McpServer({
  name: config.serverName,
  version: config.serverVersion,
});

server.registerTool(
  analyzeRepositoryTool.name,
  {
    title: analyzeRepositoryTool.title,
    description: analyzeRepositoryTool.description,
    inputSchema: analyzeRepositoryTool.inputSchema,
  },
  analyzeRepositoryTool.handler,
);

server.registerTool(
  getStructureTool.name,
  {
    title: getStructureTool.title,
    description: getStructureTool.description,
    inputSchema: getStructureTool.inputSchema,
  },
  getStructureTool.handler,
);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error(
  `${config.serverName} ${config.serverVersion} running on stdio`,
);
