import { readJson, writeJsonAtomic } from "./state-io.mjs";

const DEFAULT_CONTRAST_FILE = "state/semantic-contrast-ledger.json";
const HISTORY_LIMIT = 50;

function readContrastLedger(filePath) {
  const fallback = { version: "1.0.0", updated_at: null, contexts: {} };
  const parsed = readJson(filePath, fallback);
  if (parsed && typeof parsed === "object" && parsed.contexts) return parsed;
  return { version: "1.0.0", updated_at: null, contexts: {} };
}

function writeContrastLedger(filePath, ledger) {
  writeJsonAtomic(filePath, ledger);
}

function tokenize(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s:._/-]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function similarity(aText, bText) {
  const a = tokenize(aText);
  const b = tokenize(bText);
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  let intersect = 0;
  for (const token of a) {
    if (b.has(token)) intersect += 1;
  }
  return intersect / union.size;
}

function round3(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}

export function updateContrastLedger({
  contrastPath = DEFAULT_CONTRAST_FILE,
  timestamp,
  graph,
  remoteSnapshot
}) {
  const ledger = readContrastLedger(contrastPath);
  const contexts = ledger.contexts || {};
  const coordinates = graph?.coordinates || {};

  for (const [address, node] of Object.entries(coordinates)) {
    if (node?._meta?.kind !== "context" || !address.startsWith("0.")) continue;

    const shellAnchors = (node?._meta?.links || [])
      .map((ref) => coordinates[ref]?._)
      .filter(Boolean);
    const shellText = shellAnchors.join(" ");
    const localAnchor = node._ || "";
    const remoteAnchor = remoteSnapshot[node?._meta?.remote_coordinate]?._ || "";

    const internalSim = shellText ? similarity(localAnchor, shellText) : 0.5;
    const remoteSim = remoteAnchor ? similarity(localAnchor, remoteAnchor) : 0.5;
    const previousAnchor =
      Array.isArray(node._history) && node._history.length > 1
        ? String(node._history[node._history.length - 2]?._ || localAnchor)
        : localAnchor;
    const temporalSim = similarity(localAnchor, previousAnchor);

    const localInternalTension = round3(1 - internalSim);
    const localRemoteTension = round3(1 - remoteSim);
    const temporalTension = round3(1 - temporalSim);
    const overallTension = round3((localInternalTension * 0.45) + (localRemoteTension * 0.35) + (temporalTension * 0.2));
    const convergence = round3(1 - overallTension);

    const entry = contexts[address] || { history: [] };
    entry.local_anchor = localAnchor;
    entry.remote_coordinate = node?._meta?.remote_coordinate || null;
    entry.local_internal_tension = localInternalTension;
    entry.local_remote_tension = localRemoteTension;
    entry.temporal_tension = temporalTension;
    entry.overall_tension = overallTension;
    entry.convergence_score = convergence;
    entry.last_updated = timestamp;
    entry.history = Array.isArray(entry.history) ? entry.history : [];
    entry.history.push({
      timestamp,
      local_internal_tension: localInternalTension,
      local_remote_tension: localRemoteTension,
      temporal_tension: temporalTension,
      overall_tension: overallTension,
      convergence_score: convergence
    });
    if (entry.history.length > HISTORY_LIMIT) {
      entry.history = entry.history.slice(entry.history.length - HISTORY_LIMIT);
    }
    contexts[address] = entry;
  }

  ledger.contexts = contexts;
  ledger.updated_at = timestamp;
  writeContrastLedger(contrastPath, ledger);
  return ledger;
}
