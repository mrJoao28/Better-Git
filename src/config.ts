import "dotenv/config";

export const config = {
  githubToken: process.env.GITHUB_TOKEN || undefined,
  serverName: process.env.MCP_SERVER_NAME || "repository-intelligence",
  serverVersion: process.env.MCP_SERVER_VERSION || "0.1.0",
} as const;
