# Local Block Schema

This schema defines the sovereign local state format in pscale-like block form.
Version note: runtime now emits `v1.1.0` semantics for Place-Time continuity tracing.

## Core Rule

- Coordinate entries are address-keyed.
- Each coordinate entry must include `_` as the semantic anchor.
- Metadata is stored under reserved fields (`_meta`, `_history`, `_contrast`, `_remote`).

## 1) Local Coordinate Graph

File: `state/local-coordinate-graph.json`

```json
{
  "version": "1.0.0",
  "updated_at": "ISO-8601",
  "coordinates": {
    "shell.identity": {
      "_": "Sovereign local identity context ...",
      "_meta": {
        "address": "shell.identity",
        "kind": "shell",
        "links": [],
        "opened_at": "ISO-8601",
        "updated_at": "ISO-8601"
      },
      "_history": []
    }
  }
}
```

## 2) Semantic Tension Ledger

File: `state/semantic-tension-ledger.json`

- Each coordinate stores local anchor, remote snapshot, and contrast values.
- Local anchor is sovereign by default and is not overwritten unless explicitly promoted.

## 3) Semantic Contrast Ledger

File: `state/semantic-contrast-ledger.json`

- Tracks decimal tension dimensions for local `0.x` contexts:
  - `local_internal_tension`
  - `local_remote_tension`
  - `temporal_tension`
  - `overall_tension`
  - `convergence_score`

## 4) Place-Time Continuity Ledger (v1.1)

File: `state/place-time-continuity-ledger.json`

- Coordinate-native continuity tracing for Included-Middle meaning work.
- Stores per-cycle Place-Time moments for each local `0.x` context:
  - `blue_observation` (what happened)
  - `red_interpretation` (what it means)
  - `moment_confluence`
  - `transition_status` (`integrated_shift` | `tension_shift` | `rupture`)
  - `sameness_focus_terms` (shared semantic spine terms)

```json
{
  "version": "1.1.0",
  "updated_at": "ISO-8601",
  "coordinate_presence": {
    "0.1": {
      "coordinate": "0.1",
      "remote_coordinate": "0.1.discovery",
      "latest_place_time": {
        "cycle_id": "cycle-390",
        "timestamp": "ISO-8601",
        "blue_observation": "Observed unread=0 ...",
        "red_interpretation": "Meaning anchor at 0.1: ...",
        "moment_confluence": 0.55,
        "tension_value": 0.45,
        "transition_status": "integrated_shift",
        "transition_similarity": 0.74,
        "continuity_signal": 0.56,
        "sameness_focus_terms": ["sovereign", "identity", "difference"]
      },
      "history": []
    }
  }
}
```

## 5) Steward Continuity Dashboard (v1.1)

File: `state/steward-continuity-dashboard.json`

- Compact stewardship view over recent Place-Time windows.
- Classifies each `0.x` coordinate into:
  - `stable_presence`
  - `evolving_presence`
  - `drift_risk`
- Focuses on sameness trajectory quality, not only difference.

```json
{
  "version": "1.1.0",
  "updated_at": "ISO-8601",
  "cycle_id": "cycle-440",
  "summary": {
    "total_coordinates": 1,
    "stable_presence_count": 0,
    "evolving_presence_count": 1,
    "drift_risk_count": 0,
    "primary_focus": "evolving_presence"
  },
  "actionable_focus": {
    "primary_focus": "evolving_presence",
    "primary_guidance": {
      "focus": "Stabilize sameness while preserving useful variation.",
      "actions": []
    },
    "class_guidance": {}
  },
  "focus_coordinates": {
    "drift_risk": [],
    "evolving_presence": ["0.1"],
    "stable_presence": []
  },
  "coordinates": []
}
```

## Invariants

- Every coordinate record must contain `_`.
- Every coordinate record must have `_meta.address` matching the coordinate key.
- No silent local anchor overwrite from remote data.
- History fields are append-only with bounded retention.
