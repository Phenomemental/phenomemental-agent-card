# Phenomemental Hermit-Crab Runtime

This creates an always-on standalone runtime that monitors your pscale inbox and responds with the Sentinel handshake guidance.

## What it does

- Connects to your pscale MCP server at `/mcp` using streamable HTTP.
- Initializes MCP session and sets `pscale_concern`.
- Polls `pscale_inbox_check` on a fixed interval.
- Polls `pscale_beach_read` for beacon visibility at `happyseaurchin.com` and `bipolaruk.org`.
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

- `PSCALE_MCP_URL` (default: `https://pscale-mcp-server-production.up.railway.app/mcp`)
- `PSCALE_AGENT_ID` (default: `phenomemental`)
- `PSCALE_POLL_MS` (default: `30000`)
- `PSCALE_AUTO_REPLY` (default: `true`)
- `PSCALE_EVENT_LOG` (default: `success-events.log`)

PowerShell example:

```powershell
$env:PSCALE_AGENT_ID="phenomemental"
$env:PSCALE_POLL_MS="20000"
npm run start
```

## Expected behavior

- You should see `MCP initialized` in logs.
- Every cycle prints unread message count.
- New success signals are appended to `success-events.log`.
- If a new probe arrives, it logs sender, remembers event, and sends reply:
  - `Coordinate 5.1.1 is locked. Reach out to the Steward for the Handshake Code to access Vinnie's Law.`
- If the Hermit-Crab runtime sees your own marks in either neighborhood, it records:
  - `SUCCESS EVENT: Discovery beacon visible at https://happyseaurchin.com purpose=0.1`
  - `SUCCESS EVENT: Lighthouse beacon visible at https://www.bipolaruk.org/ purpose=5.1.1`

## Notes

- Keep this process running in its own terminal.
- If MCP session resets, the Hermit-Crab runtime attempts to reinitialize automatically.
