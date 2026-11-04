// MCP Server Starter: a remote MCP server over Streamable HTTP.
// Routes: GET /health (Railway healthcheck), POST /mcp (MCP JSON-RPC).
import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 3000);
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN ?? "";
const SERVER_NAME = process.env.MCP_SERVER_NAME ?? "mcp-server-starter";
const MAX_BODY_BYTES = 1_000_000;

const log = (level, msg, extra = {}) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...extra }));

// Register tools here. One server instance per request keeps the server stateless,
// so it scales horizontally on Railway without sticky sessions.
function buildServer() {
  const server = new McpServer({ name: SERVER_NAME, version: "0.1.0" });

  server.registerTool(
    "echo",
    {
      title: "Echo",
      description: "Returns the text you send, plus the server time. Replace with your own tool.",
      inputSchema: { text: z.string().max(10_000).describe("Text to echo back") },
    },
    async ({ text }) => ({
      content: [{ type: "text", text: `${text} (server time ${new Date().toISOString()})` }],
    }),
  );

  return server;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("payload too large"), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : undefined);
      } catch {
        reject(Object.assign(new Error("invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function authorized(req) {
  if (!AUTH_TOKEN) return true; // auth off when no token is set
  return req.headers.authorization === `Bearer ${AUTH_TOKEN}`;
}

const httpServer = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/health") {
    return sendJson(res, 200, { status: "ok", name: SERVER_NAME, uptime_s: Math.round(process.uptime()) });
  }

  if (url.pathname === "/mcp") {
    if (!authorized(req)) return sendJson(res, 401, { error: "unauthorized" });
    if (req.method !== "POST") {
      // Stateless mode: no server-initiated SSE stream or session to delete.
      return sendJson(res, 405, { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
    }
    try {
      const body = await readJson(req);
      const server = buildServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (err) {
      log("error", "mcp request failed", { error: err.message });
      if (!res.headersSent) sendJson(res, err.status ?? 500, { error: err.message });
    }
    return;
  }

  if (url.pathname === "/") {
    return sendJson(res, 200, { name: SERVER_NAME, mcp_endpoint: "/mcp", health: "/health" });
  }

  sendJson(res, 404, { error: "not found" });
});

httpServer.listen(PORT, "0.0.0.0", () =>
  log("info", "listening", { port: PORT, auth: AUTH_TOKEN ? "bearer" : "off" }),
);

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    log("info", "shutting down", { signal: sig });
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
