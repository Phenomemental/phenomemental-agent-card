# Identity Migration Strategy

This document defines compatibility behavior for migrating from legacy continuity ids to canonical profile-driven identity resolution.

## Scope

- Legacy continuity id: `Phenomemental-14042026`
- Canonical continuity id: `steward-phenomemental`
- Default active profile: `steward_primary`

## Migration Rules

1. Canonical writes MUST use `steward-phenomemental`.
2. Legacy id is historical-only and MUST NOT be auto-selected for new writes.
3. Reads MAY include legacy lookups for historical continuity checks.
4. If a legacy-only artifact is found, session must report it and continue under canonical id unless Steward explicitly overrides.

## Compatibility Matrix

- `pscale_walk`:
  - default target id: canonical
  - optional read-only fallback: legacy
- `pscale_recall`:
  - default target id: canonical
  - optional historical query on legacy
- `pscale_remember`, `pscale_write`, `pscale_create_block`, `pscale_inbox_send`, `pscale_pool_send`:
  - canonical only, unless Steward override is explicit

## Mark and Message Back-Compatibility

When interacting with collaborators that still reference legacy ids:

1. accept inbound reference as historical alias
2. reply with canonical identity fields:
   - `continuity_agent_id=steward-phenomemental`
   - `legacy_continuity_ids=[Phenomemental-14042026]`
3. include invitation routing target using canonical id

## Session Reporting Requirements

Every bootstrap report must include:

- active profile id
- canonical continuity id
- legacy ids acknowledged as historical-only
- whether any legacy fallback read was used

## Completion Criteria

Migration is considered stable when:

- bootstrap reports no identity drift events for consecutive sessions
- collaborators can resolve marks to canonical routing without manual correction
- no write actions target legacy ids without explicit Steward approval
