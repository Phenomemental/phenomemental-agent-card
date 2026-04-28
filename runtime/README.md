# Runtime

This folder is the runtime entrypoint surface for always-on sentinel behavior.

## Entrypoint

- `runtime/start.mjs` -> loads `runtime/sentinel-loop.mjs`

## Defaults

- MCP URL default: `https://pscale-mcp-server-production.up.railway.app/mcp/v2`
- Agent default: `Phenomemental`
- Operator default: `Phenomemental`

## Start

```powershell
npm run start
```

## Optional env vars

- `PSCALE_MCP_URL`
- `PSCALE_AGENT_ID`
- `PSCALE_OPERATOR_ID`
- `PSCALE_POLL_MS`
- `PSCALE_AUTO_REPLY`
- `PSCALE_EVENT_LOG`
