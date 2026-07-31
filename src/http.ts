import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createMcpServer } from "./server.js";
import { config } from "./config.js";

const host = process.env.MCP_HTTP_HOST || "127.0.0.1";
const port = Number.parseInt(process.env.MCP_HTTP_PORT || "3000", 10);
const endpoint = "/mcp";
const maxBodyBytes = Number.parseInt(process.env.MCP_MAX_BODY_BYTES || "1048576", 10);
const maxSessions = Number.parseInt(process.env.MCP_MAX_SESSIONS || "100", 10);
const rateLimitWindowMs = Number.parseInt(process.env.MCP_RATE_LIMIT_WINDOW_MS || "60000", 10);
const rateLimitMax = Number.parseInt(process.env.MCP_RATE_LIMIT_MAX || "120", 10);
const allowedOrigins = new Set(
  (process.env.MCP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const httpToken = process.env.MCP_HTTP_TOKEN;
const requireAuth = process.env.MCP_REQUIRE_AUTH === "true" || Boolean(httpToken);

const transports = new Map<string, StreamableHTTPServerTransport>();
const requestCounters = new Map<string, { count: number; resetAt: number }>();

if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
  throw new Error("MCP_HTTP_PORT must be a valid TCP port.");
}
if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1024) {
  throw new Error("MCP_MAX_BODY_BYTES must be at least 1024 bytes.");
}
if (!Number.isSafeInteger(maxSessions) || maxSessions < 1) {
  throw new Error("MCP_MAX_SESSIONS must be at least 1.");
}
if (!Number.isSafeInteger(rateLimitWindowMs) || rateLimitWindowMs < 1000) {
  throw new Error("MCP_RATE_LIMIT_WINDOW_MS must be at least 1000ms.");
}
if (!Number.isSafeInteger(rateLimitMax) || rateLimitMax < 1) {
  throw new Error("MCP_RATE_LIMIT_MAX must be at least 1.");
}
if (requireAuth && !httpToken) {
  throw new Error("MCP_REQUIRE_AUTH=true requires MCP_HTTP_TOKEN to be configured.");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function getClientKey(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

function isRateLimited(req: IncomingMessage): boolean {
  const now = Date.now();
  const key = getClientKey(req);
  const current = requestCounters.get(key);

  if (!current || current.resetAt <= now) {
    requestCounters.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }
  if (current.count >= rateLimitMax) return true;
  current.count += 1;
  return false;
}

function isAuthorized(req: IncomingMessage): boolean {
  if (!requireAuth) return true;
  return req.headers.authorization === `Bearer ${httpToken}`;
}

function isOriginAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  return allowedOrigins.has(origin);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const contentLengthHeader = req.headers["content-length"];
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
      throw new Error("MCP request body exceeds the configured size limit.");
    }
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > maxBodyBytes) {
      throw new Error("MCP request body exceeds the configured size limit.");
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  return JSON.parse(raw);
}

function cleanupRateLimitEntries(): void {
  const now = Date.now();
  for (const [key, value] of requestCounters) {
    if (value.resetAt <= now) requestCounters.delete(key);
  }
}

const rateLimitCleanup = setInterval(cleanupRateLimitEntries, rateLimitWindowMs);
rateLimitCleanup.unref();

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (isRateLimited(req)) {
    res.setHeader("Retry-After", Math.ceil(rateLimitWindowMs / 1000));
    sendJson(res, 429, { error: "Rate limit exceeded" });
    return;
  }
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON body";
      sendJson(res, message.includes("size limit") ? 413 : 400, { error: message });
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
    if (transports.size >= maxSessions) {
      sendJson(res, 503, { error: "MCP session capacity reached" });
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
    if (req.method === "DELETE") transports.delete(sessionId);
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
        sessions: transports.size,
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
    if (!res.headersSent) sendJson(res, 500, { error: "Internal server error" });
    else res.destroy();
  }
});

httpServer.listen(port, host, () => {
  console.error(
    `${config.serverName} ${config.serverVersion} running on http://${host}:${port}${endpoint}`,
  );
});

function shutdown(): void {
  clearInterval(rateLimitCleanup);
  for (const transport of transports.values()) void transport.close().catch(() => undefined);
  transports.clear();
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
