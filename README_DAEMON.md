# Phenomemental Hermit-Crab Runtime

This creates an always-on standalone runtime that monitors your pscale inbox and responds with the Sentinel handshake guidance.

## What it does

- Connects to your pscale MCP server at `/mcp/v2` using streamable HTTP.
- Initializes MCP session and sets `pscale_concern`.
- Polls `pscale_inbox_check` on a fixed interval.
- Polls `pscale_beach_read` for visibility signals at configured URLs.
- Stores probe events in memory via `pscale_remember`.
- Auto-replies to probing agents with your lock/gate message.
- Emits explicit `SUCCESS EVENT` logs for new knocks and visible beacons.

## Quick start

1. Make sure Node.js 18+ is installed.
2. In this folder, run:

```powershell
npm run start
```

## Optional environment overrides

- `PSCALE_MCP_URL` (default: `https://pscale-mcp-server-production.up.railway.app/mcp/v2`)
- `PSCALE_AGENT_ID` (default: `Phenomemental`) - canonical public persona ID
- `PSCALE_OPERATOR_ID` (default: `Phenomemental`) - runtime identity metadata
- `PSCALE_POLL_MS` (default: `30000`)
- `PSCALE_AUTO_REPLY` (default: `true`)
- `PSCALE_EVENT_LOG` (default: `success-events.log`)

PowerShell example:

```powershell
$env:PSCALE_AGENT_ID="Phenomemental"
$env:PSCALE_OPERATOR_ID="Phenomemental"
$env:PSCALE_POLL_MS="20000"
npm run start
```

## Expected behavior

- You should see `MCP initialized` in logs.
- Every cycle prints unread message count.
- New success signals are appended to `success-events.log`.
- If a new probe arrives, it logs sender, remembers event, and sends configured handshake guidance.
- If the runtime sees your own marks in configured neighborhoods, it records success events for those contexts.

## Notes

- Keep this process running in its own terminal.
- If MCP session resets, the Hermit-Crab runtime attempts to reinitialize automatically.
