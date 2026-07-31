import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "./server.js";
import { config } from "./config.js";

const host = process.env.MCP_HTTP_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.MCP_HTTP_PORT || "3000", 10);
const endpoint = "/mcp";
const allowedOrigins = new Set(
  (process.env.MCP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const httpToken = process.env.MCP_HTTP_TOKEN;

const transports = new Map<string, StreamableHTTPServerTransport>();

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function isAuthorized(req: IncomingMessage): boolean {
  if (!httpToken) return true;
  return req.headers.authorization === `Bearer ${httpToken}`;
}

function isOriginAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  return allowedOrigins.has(origin);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  return JSON.parse(raw);
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!isAuthorized(req)) {
    res.writeHead(401, { "WWW-Authenticate": "Bearer" });
    res.end();
    return;
  }

  if (!isOriginAllowed(req)) {
    sendJson(res, 403, { error: "Origin is not allowed" });
    return;
  }

  const sessionHeader = req.headers["mcp-session-id"];
  const sessionId = typeof sessionHeader === "string" ? sessionHeader : undefined;

  if (req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      sendJson(res, 415, { error: "Content-Type must be application/json" });
      return;
    }

    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    if (sessionId) {
      const transport = transports.get(sessionId);
      if (!transport) {
        sendJson(res, 404, { error: "MCP session not found" });
        return;
      }
      await transport.handleRequest(req, res, body);
      return;
    }

    if (!isInitializeRequest(body)) {
      sendJson(res, 400, {
        error: "Missing MCP session. The first request must initialize a session.",
      });
      return;
    }

    let transport: StreamableHTTPServerTransport;
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports.set(newSessionId, transport);
      },
    });

    transport.onclose = () => {
      const closedSessionId = transport.sessionId;
      if (closedSessionId) transports.delete(closedSessionId);
    };

    const server = createMcpServer();

    // StreamableHTTPServerTransport exposes `onclose` as optional in its
    // concrete type, while the MCP server's Transport contract requires it.
    // At this point the handler has been assigned above, so this assertion
    // reflects the runtime invariant without weakening the rest of the code.
    await server.connect(transport as unknown as Parameters<typeof server.connect>[0]);
    await transport.handleRequest(req, res, body);
    return;
  }

  if (req.method === "GET" || req.method === "DELETE") {
    if (!sessionId) {
      sendJson(res, 400, { error: "Mcp-Session-Id header is required" });
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      sendJson(res, 404, { error: "MCP session not found" });
      return;
    }

    await transport.handleRequest(req, res);
    return;
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  sendJson(res, 405, { error: "Method not allowed" });
}

const httpServer = createHttpServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        server: config.serverName,
        version: config.serverVersion,
        transport: "streamable-http",
      });
      return;
    }

    if (url.pathname !== endpoint) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    await handleMcp(req, res);
  } catch (error) {
    console.error("HTTP MCP request failed:", error);
    if (!res.headersSent) {
      sendJson(res, 500, { error: "Internal server error" });
    } else {
      res.destroy();
    }
  }
});

httpServer.listen(port, host, () => {
  console.error(
    `${config.serverName} ${config.serverVersion} running on http://${host}:${port}${endpoint}`,
  );
});

function shutdown(): void {
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
