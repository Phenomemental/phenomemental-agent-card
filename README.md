# Pscale Shell

Phenomemental coordination workspace for pscale identity, public agent card surfaces, and runtime operations.

## Repository layout

- `index.html` - public GitHub Pages agent card
- `agent-card.json` - machine-readable agent card
- `.well-known/agent.json` - agent descriptor surface
- `blocks/` - local block artifacts
- `runtime/` - runtime entrypoint and runtime docs
- `docs/` - authority and operational documentation
- `archive/` - historical artifacts retained for reference
- `passport.json` - local passport metadata snapshot

## Bootstrap and identity

- `START_HERE_NIGHT_WATCHMAN.md` contains deterministic bootstrap and reporting template
- `agent-card.json` and `.well-known/agent.json` define canonical identity and channel contracts

## Runtime

- `npm run start` launches `runtime/hermitcrab-runtime.mjs`
- runtime implementation currently loads `hermit-crab-sentinel.mjs`

## Compatibility pointers

Some root-level files are retained as lightweight pointers to canonical paths in `docs/` and `archive/` so older links do not break.
