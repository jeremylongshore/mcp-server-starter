# MCP Server Starter

A small remote MCP server you can deploy to Railway in one click. It has the boring parts done: Streamable HTTP transport, a `/health` check, bearer-token auth, structured JSON logs, env-based config, and one sample tool to replace with your own.

<!-- Replace {TEMPLATE_CODE} after the template is created on Railway. -->
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/{TEMPLATE_CODE}?utm_medium=integration&utm_source=button&utm_campaign=mcp-server-starter)

## Endpoints

| Path | Method | What it does |
| --- | --- | --- |
| `/health` | GET | Returns `{"status":"ok"}`. Railway uses it as the healthcheck. |
| `/mcp` | POST | MCP JSON-RPC over Streamable HTTP (stateless). Needs `Authorization: Bearer <MCP_AUTH_TOKEN>` when a token is set. |
| `/` | GET | Lists the endpoints. |

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | Railway sets this. |
| `MCP_AUTH_TOKEN` | empty | Bearer token. The template generates a random one. Empty turns auth off. Use that only for local dev. |
| `MCP_SERVER_NAME` | `mcp-server-starter` | Name reported to clients. |

## Connect a client

After deploy, open the service's **Variables** tab to copy `MCP_AUTH_TOKEN`. Your URL is `https://<your-service>.up.railway.app/mcp`.

**Claude Code**

```bash
claude mcp add --transport http starter https://<your-service>.up.railway.app/mcp \
  --header "Authorization: Bearer <MCP_AUTH_TOKEN>"
```

**Cursor and other clients** (`mcp.json`)

```json
{
  "mcpServers": {
    "starter": {
      "url": "https://<your-service>.up.railway.app/mcp",
      "headers": { "Authorization": "Bearer <MCP_AUTH_TOKEN>" }
    }
  }
}
```

## Add your own tool

Tools are registered in `buildServer()` in `src/server.js`:

```js
server.registerTool(
  "add",
  { description: "Add two numbers", inputSchema: { a: z.number(), b: z.number() } },
  async ({ a, b }) => ({ content: [{ type: "text", text: String(a + b) }] }),
);
```

The server is stateless: each request gets a fresh MCP server instance. That lets you scale replicas without sticky sessions. If your tools need state, keep it in a database (for example, add Railway Postgres and read `DATABASE_URL`).

## Run locally

```bash
npm install
cp .env.example .env   # optional
npm start              # http://localhost:3000
npm test               # health, auth, and an MCP client round-trip
```

## Before you expose real tools

The bearer token is a minimum. For multi-user or public servers, put OAuth 2.1 in front of `/mcp`, as the MCP authorization spec describes. Keep tools least-privilege: don't ship shell-exec or filesystem-write tools on a public URL.

## License

MIT © Intent Solutions
