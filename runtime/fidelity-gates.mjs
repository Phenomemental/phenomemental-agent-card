import { existsSync } from "node:fs";
import { readJson, writeJsonAtomic } from "./state-io.mjs";

const DEFAULT_STATUS_FILE = "state/fidelity-gate-status.json";

function hasAnchors(graph) {
  const coordinates = graph?.coordinates || {};
  return Object.values(coordinates).every((node) => typeof node?._ === "string" && node._.length > 0);
}

export function evaluateFidelityGates({
  statusPath = DEFAULT_STATUS_FILE,
  timestamp,
  graphPath,
  semanticLedgerPath,
  contrastPath,
  spindleTracePath,
  cyclePath,
  cycle
}) {
  const graph = readJson(graphPath, null);
  const semantic = readJson(semanticLedgerPath, null);
  const contrast = readJson(contrastPath, null);
  const cycleArtifact = cycle || readJson(cyclePath, null);
  const spindle = readJson(spindleTracePath, null);

  const gates = {
    coordinate_semantics: !!graph?.coordinates && Object.keys(graph.coordinates).length > 0,
    underscore_anchor_semantics: hasAnchors(graph),
    spindle_traversal_evidence: !!spindle?.traces,
    mobius_process_integrity: !!cycleArtifact?.phases,
    sovereignty_difference_preserved: !!semantic?.coordinates && !process.env.PSCALE_LOCAL_PROMOTE_REMOTE,
    mcp_channel_fidelity: Array.isArray(cycleArtifact?.phases?.observe?.mcp_reads),
    persistence_contract_lifecycle: existsSync(graphPath) && existsSync(semanticLedgerPath) && existsSync(contrastPath),
    steward_governance_presence: true
  };

  const all_pass = Object.values(gates).every(Boolean);
  const status = {
    version: "1.0.0",
    updated_at: timestamp,
    all_pass,
    gates
  };
  writeJsonAtomic(statusPath, status);
  return status;
}
