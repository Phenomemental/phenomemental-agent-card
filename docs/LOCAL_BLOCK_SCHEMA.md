# Local Block Schema

This schema defines the sovereign local state format in pscale-like block form.

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

## Invariants

- Every coordinate record must contain `_`.
- Every coordinate record must have `_meta.address` matching the coordinate key.
- No silent local anchor overwrite from remote data.
- History fields are append-only with bounded retention.
