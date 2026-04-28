# Pscale Fidelity Checklist

Use this checklist before and after any runtime or persistence change.

## Purpose

Ensure local implementation remains pscale-native, not merely pscale-inspired.

## Gate 1: Coordinate Semantics

- [ ] Every persisted semantic node has an explicit coordinate address (`0.x`, `5.1.1`, `shell.*`, etc.).
- [ ] Coordinate relationships are explicit (parent/link/contrast target), not implicit in prose.
- [ ] New local contexts are opened at coordinate addresses and tracked as events.

## Gate 2: Anchor Semantics (`_`)

- [ ] Each coordinate node includes `_` as the semantic anchor.
- [ ] Anchor updates are versioned in history.
- [ ] Anchor updates are never silent; each has timestamp and reason/evidence.

## Gate 3: Spindle and Traversal Evidence

- [ ] Traversal intent/path is captured when orientation uses spindle-style reading.
- [ ] Orientation outputs include which coordinates were compared.
- [ ] Contrasts are computed at coordinate level, not only at global/session level.

## Gate 4: Mobius Process Integrity

- [ ] Runtime cycle expresses explicit phases: observe -> orient -> act -> remember -> report.
- [ ] Each phase writes auditable outputs (success/failure/evidence).
- [ ] Failures degrade gracefully and preserve state continuity.

## Gate 5: Sovereignty and Difference

- [ ] Local state is sovereign by default (no implicit remote overwrite).
- [ ] Local-vs-remote difference is preserved as signal.
- [ ] Difference is tracked with decimal semantics (convergence/tension), not binary collapse.
- [ ] Reconciliation is explicit and logged, never automatic by default.

## Gate 6: MCP Channel Fidelity

- [ ] Channel behavior maps to explicit pscale MCP tools:
  - beach: `pscale_beach_read` / `pscale_beach_mark`
  - inbox: `pscale_inbox_check` / `pscale_inbox_send`
  - pool: `pscale_pool_read` / `pscale_pool_join` / `pscale_pool_send`
  - game: `pscale_walk` + channel reads / `pscale_pool_send`
- [ ] Reports include MCP-auditable fields from channel contracts.

## Gate 7: Persistence Contract Compatibility

- [ ] Begin/during/end state transitions are explicitly persisted.
- [ ] Local state files are schema-consistent and parse-safe.
- [ ] Runtime can cold-start from local state without requiring prior chat memory.
- [ ] Legacy identity fields remain historical-only unless explicitly promoted.

## Gate 8: Steward Governance

- [ ] High-impact actions remain steward-gated per authority policy.
- [ ] Ambiguity defaults to pause/escalate behavior.
- [ ] Protected scope handling aligns with authority runbook.

## Minimum Release Rule

Do not treat a persistence/runtime change as complete unless all gates are checked.
