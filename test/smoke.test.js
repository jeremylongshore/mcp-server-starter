import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const PORT = 39117;
const TOKEN = "test-token";
const base = `http://127.0.0.1:${PORT}`;
let proc;

before(async () => {
  proc = spawn(process.execPath, ["src/server.js"], {
    env: { ...process.env, PORT: String(PORT), MCP_AUTH_TOKEN: TOKEN },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${base}/health`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("server did not start");
});
after(() => proc.kill("SIGTERM"));

test("health returns ok", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, "ok");
});

test("mcp rejects missing token", async () => {
  const res = await fetch(`${base}/mcp`, { method: "POST", body: "{}" });
  assert.equal(res.status, 401);
});

test("MCP client lists and calls echo", async () => {
  const client = new Client({ name: "smoke", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } },
  }));
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name), ["echo"]);
  const out = await client.callTool({ name: "echo", arguments: { text: "hi" } });
  assert.match(out.content[0].text, /^hi \(server time /);
  await client.close();
});
