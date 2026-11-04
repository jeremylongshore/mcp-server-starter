# PUBLISH: MCP Server Starter to Railway marketplace

Status (Mon Nov 2, 2026, MST): scaffold built and smoke-tested locally (`npm test`: health, 401 without a token, and an MCP SDK client listing and calling `echo`). It hasn't been pushed, deployed, or templated. The Docker build hasn't been tested yet because the box has no Docker. Railway's first build is that test.

Jeremy OK'd publishing on Nov 2, 2026 (via CoS). Stripe Connect is a separate step and optional. Kickbacks default to Railway Credits.

## 1. Create the GitHub repo and push (needs gh auth or the browser)
- Repo: `jeremylongshore/mcp-server-starter`, public, MIT. No README init, because the folder already has one.
- From this folder:
  ```bash
  git init -b main && git add -A && git commit -m "MCP Server Starter: Streamable HTTP, /health, bearer auth, echo tool"
  git remote add origin https://github.com/jeremylongshore/mcp-server-starter.git
  git push -u origin main
  ```
  `node_modules` and `.env` are gitignored.
- Optional: add topics `mcp`, `railway`, `model-context-protocol`, `railway-template`.

## 2. Deploy on Railway (box browser, Jeremy's Railway login)
- Sign in at railway.com with GitHub (sign-in skill if a login is needed). Confirm which workspace to use, personal or Intent Solutions. The pack still has this open.
- New Project → Deploy from GitHub repo → `jeremylongshore/mcp-server-starter`. You may need to grant the Railway GitHub app access to the repo.
- `railway.json` sets Dockerfile build and the `/health` healthcheck automatically.
- Variables: `MCP_AUTH_TOKEN` = any long random string for this private test. `MCP_SERVER_NAME` is optional.
- Settings → Networking → **Generate Domain** (HTTP, target port = `PORT`, which Railway injects).
- Smoke-test:
  - `curl https://<domain>/health` should return `{"status":"ok",...}`.
  - `curl -X POST https://<domain>/mcp` should return 401.
  - Run `claude mcp add --transport http starter https://<domain>/mcp --header "Authorization: Bearer <token>"`, then list tools. `echo` should be the only one.

## 3. Create the template from the project
- Project → Settings → **Generate Template from Project** → Create Template → template composer.
- In the composer, set the service variable `MCP_AUTH_TOKEN` = `${{secret(32, "abcdef0123456789")}}` so every deployer gets a unique token. Leave `PORT` unset.
- Check that the healthcheck path is `/health` and public networking (HTTP) is on.
- Name: **MCP Server Starter**. Category: AI / Developer Tools. Use an MCP icon or a simple generated logo.
- Short description and overview: use the "Template B" blurbs in `/workspace/sponsorship-hunter/packs/railway-kickbacks.md`. Paste this folder's README as the template README.
- Create, then copy the template code from the URL (`railway.com/new/template/<CODE>`).

## 4. Publish to the marketplace (this is what counts for Goal 1 and kickbacks)
- Workspace Settings → Templates → **Publish** next to MCP Server Starter → fill out the form.
- Optional: attach the step-2 project as the **Live Demo**. Only do this if you're OK with that project running and billing. It holds its own token, so it isn't open to the public.
- Account settings: turn on **Template Queue Emails** to earn the +10% support bonus (25% total).

## 5. After publish
- Replace `{TEMPLATE_CODE}` in README.md with the real code, then commit and push.
- Record the template URL and publish date in the Sponsorship pipeline. Goal 1 then shows Railway as Submitted.
- Don't claim deploys or usage numbers until Railway shows them.

## Not part of this run
- Stripe Connect (Earnings → turn off Direct Deposit to Credits → onboarding) needs a separate OK. Nothing can be withdrawn until there's at least $100.
