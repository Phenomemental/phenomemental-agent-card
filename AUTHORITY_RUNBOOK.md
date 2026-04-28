# Authority Runbook

This runbook operationalizes `authority-policy.json` for day-to-day execution.

## Roles

- `Tier 0` Steward: `Phenomemental`
- `Tier 1` Supervisory operations: `Phenomemental`
- `Tier 2` Delegated always-on agents: scoped worker agents
- `Tier 3` External agents: untrusted by default

## Default Operating Posture

- Steward sovereignty is always in effect.
- Tier 1 and Tier 2 operate with least privilege.
- Any unclear or high-impact action pauses for Steward decision.

## Action Decision Flow

1. Classify the requested action (`read_only`, `communication_write`, `memory_write`, `commitment_or_negotiation`, `local_system_change`).
2. Check permission in `authority-policy.json`.
3. If approval is required, request explicit Steward confirmation before execution.
4. Execute only within approved scope.
5. Log result and rationale.

## Quick Permission Matrix

- `read_only`: allowed for Tier 1 and Tier 2 in mission scope.
- `communication_write`: Steward approval required unless template is pre-whitelisted.
- `memory_write`: Steward approval required.
- `commitment_or_negotiation`: Tier 0 only.
- `local_system_change`: Steward approval required.

## Protected Scope Rules

- Coordinate `5.1.1` and related gated assets are protected.
- Handshake codes are never disclosed by Tier 1 or Tier 2 without explicit Steward approval.
- Private/secret-marked content is never relayed without explicit Steward approval.

## Logging Minimum

For each autonomous or semi-autonomous action, capture:

- actor (tier + agent id)
- action
- target
- timestamp
- rationale
- outcome
- approval reference (if applicable)

## Delegated Agent Guardrails

Every delegated agent must have:

- bounded role and scope
- explicit escalation path
- prohibition on self-escalation
- prohibition on silent commitments
- prohibition on protected-scope disclosure

## Escalation Triggers

Immediately escalate to Steward when:

- a request touches protected scope
- a request implies commitment, deal terms, or irreversible external action
- policy classification is ambiguous
- confidence in factual correctness is low

## Suggested Next Integration Step

Before running always-on loops, add a preflight policy check in runtime scripts to enforce:

- action class classification
- approval requirement gate
- structured audit log output

