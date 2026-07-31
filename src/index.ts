import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { createMcpServer } from "./server.js";

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);

console.error(
  `${config.serverName} ${config.serverVersion} running on stdio`,
);
