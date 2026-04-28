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

## Runtime

- `npm run start` launches `runtime/start.mjs`
- runtime implementation currently loads `runtime/sentinel-loop.mjs`

## Compatibility pointers

Some root-level files are retained as lightweight pointers to canonical paths in `docs/` and `archive/` so older links do not break.
