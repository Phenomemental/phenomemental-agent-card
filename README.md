# Pscale Shell

Phenomemental coordination workspace for pscale identity, public agent card surfaces, and runtime operations.

## Repository layout

- `index.html` - public GitHub Pages agent card
- `agent-card.json` - machine-readable agent card
- `.well-known/agent.json` - agent descriptor surface
- `blocks/` - local block artifacts
- `runtime/` - runtime entrypoint and runtime docs
- `state/` - local semantic persistence ledger written by runtime
- `state/local-coordinate-graph.json` - sovereign local semantic coordinate graph
- `state/semantic-contrast-ledger.json` - decimal tension contrasts for local `0.x` contexts
- `state/mobius-cycle-latest.json` - explicit observe/orient/act/remember/report cycle artifact
- `state/spindle-trace-latest.json` - spindle traversal path and rationale per cycle
- `state/fidelity-gate-status.json` - pscale fidelity gate enforcement status
- `docs/` - authority and operational documentation
- `archive/` - historical artifacts retained for reference

## Architecture fidelity

- `docs/PSCALE_FIDELITY_CHECKLIST.md` gates runtime/persistence changes against pscale-native semantics.
- `passport.json` - local passport metadata snapshot

## Bootstrap and identity

- `BOOTSTRAP.md` contains deterministic bootstrap and reporting template
- `agent-card.json` and `.well-known/agent.json` define canonical identity and channel contracts

## Pipeline and identity namespaces

- Published coordination pipeline: `beach -> inbox -> pool -> grain`
- Canonical public identity: `Phenomemental`
- Operational continuity identity: `steward-phenomemental` (internal continuity/audit)
- Legacy compatibility alias: `phenomemental`
- Sync rule: compare local snapshots and MCP reads only within the same `agent_id` namespace before declaring drift
- Runtime guard: outbound commons writes are blocked when `agent_id=steward-phenomemental`; use `Phenomemental` for commons signaling

## Runtime

- `npm run start` launches `runtime/start.mjs`
- runtime implementation currently loads `runtime/sentinel-loop.mjs`
- live beach snapshot writes to `state/beach-live-latest.json`

## Live Beach Visualizer

- open `beach-visualizer.html` to visualize beach marks
- run runtime loop in one terminal: `npm run start`
- run local server in another terminal: `npm run serve:visual` (or `npm run serve:visual:py3`)
- open [http://localhost:8080/beach-visualizer.html](http://localhost:8080/beach-visualizer.html)
- click `Start Live Mode` to poll `state/beach-live-latest.json` every 3 seconds

## Live Inbox Visualizer

- open `inbox-visualizer.html` to visualize inbox and message history
- runtime writes `state/inbox-live-latest.json` each cycle
- open [http://localhost:8080/inbox-visualizer.html](http://localhost:8080/inbox-visualizer.html)
- click `Start Live Mode` to poll `state/inbox-live-latest.json` every 3 seconds

## Compatibility pointers

Some root-level files are retained as lightweight pointers to canonical paths in `docs/` and `archive/` so older links do not break.
