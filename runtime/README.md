# Runtime

This folder is the runtime entrypoint surface for always-on sentinel behavior.

## Entrypoint

- `runtime/start.mjs` -> loads `runtime/sentinel-loop.mjs`
- `runtime/semantic-tension-engine.mjs` -> computes local convergence/tension values by coordinate
- `runtime/local-coordinate-engine.mjs` -> maintains sovereign local coordinate graph and opens new `0.x` contexts
- `runtime/tension-contrast-engine.mjs` -> computes local-internal, local-remote, and temporal tension for local contexts
- `runtime/fidelity-gates.mjs` -> evaluates pscale fidelity gates and writes status
- `runtime/reconciliation-engine.mjs` -> records explicit reconciliation events

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
- `PSCALE_SEMANTIC_LEDGER_FILE` (default: `state/semantic-tension-ledger.json`)
- `PSCALE_LOCAL_PROMOTE_REMOTE` (default: `false`; if `true`, remote nodes can update local nodes)
- `PSCALE_LOCAL_GRAPH_FILE` (default: `state/local-coordinate-graph.json`)
- `PSCALE_CONTRAST_LEDGER_FILE` (default: `state/semantic-contrast-ledger.json`)
- `PSCALE_MOBIUS_CYCLE_FILE` (default: `state/mobius-cycle-latest.json`)
- `PSCALE_SPINDLE_TRACE_FILE` (default: `state/spindle-trace-latest.json`)
- `PSCALE_FIDELITY_STATUS_FILE` (default: `state/fidelity-gate-status.json`)
- `PSCALE_RECONCILIATION_LOG_FILE` (default: `state/reconciliation-events.jsonl`)

## Local semantic persistence

Each runtime cycle updates a local ledger at `state/semantic-tension-ledger.json` with:

- coordinate-level convergence scores (`0.0` to `1.0`)
- tension values (`1 - convergence`)
- relation bands and meaning deltas over time

By default, local nodes are sovereign and do not auto-mirror remote MCP state.

Each runtime cycle also updates:

- `state/local-coordinate-graph.json` (sovereign local graph with shell coordinates + `0.x` context openings)
- `state/semantic-contrast-ledger.json` (per-context decimal tension across internal/remote/temporal dimensions)
- `state/mobius-cycle-latest.json` (explicit observe/orient/act/remember/report artifact)
- `state/spindle-trace-latest.json` (spindle traversal choices and outcomes)
- `state/fidelity-gate-status.json` (pass/fail by fidelity gate each cycle)
