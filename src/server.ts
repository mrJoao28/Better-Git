import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "./config.js";
import { analyzeDependenciesTool } from "./tools/analyze-dependencies.js";
import { analyzeRepositoryTool } from "./tools/analyze-repository.js";
import { architectureReportTool } from "./tools/architecture-report.js";
import { getFileContentTool } from "./tools/get-file-content.js";
import { getStructureTool } from "./tools/get-structure.js";

export function createMcpServer(): McpServer {
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

  server.registerTool(
    getFileContentTool.name,
    {
      title: getFileContentTool.title,
      description: getFileContentTool.description,
      inputSchema: getFileContentTool.inputSchema,
    },
    getFileContentTool.handler,
  );

  server.registerTool(
    analyzeDependenciesTool.name,
    {
      title: analyzeDependenciesTool.title,
      description: analyzeDependenciesTool.description,
      inputSchema: analyzeDependenciesTool.inputSchema,
    },
    analyzeDependenciesTool.handler,
  );

  server.registerTool(
    architectureReportTool.name,
    {
      title: architectureReportTool.title,
      description: architectureReportTool.description,
      inputSchema: architectureReportTool.inputSchema,
    },
    architectureReportTool.handler,
  );

  return server;
}
