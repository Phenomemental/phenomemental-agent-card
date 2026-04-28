import { readJson, writeJsonAtomic } from "./state-io.mjs";

const DEFAULT_CONTRAST_FILE = "state/semantic-contrast-ledger.json";
const HISTORY_LIMIT = 50;
const LOCAL_CONFLUENCE_WEIGHT = 0.7;
const CROSS_DOMAIN_WEIGHT = 0.3;
const INTENTIONAL_REMOTE_DISCOUNT = 0.35;
const SYSTEM_TENSION_SMOOTHING_ALPHA = 0.35;

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
  const normalizeToken = (token) =>
    token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s:._/-]/g, " ")
      .split(/\s+/)
      .map(normalizeToken)
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

function classifyLocalState(localConfluenceTension) {
  if (localConfluenceTension <= 0.35) return "congruent";
  if (localConfluenceTension <= 0.65) return "mixed";
  return "incongruent";
}

function topMissingTerms(localAnchor, shellText, limit = 6) {
  const local = tokenize(localAnchor);
  const shell = tokenize(shellText);
  const missing = [];
  for (const token of shell) {
    if (local.has(token)) continue;
    missing.push(token);
  }
  return missing.slice(0, limit);
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

    const tensionIntent = node?._meta?.tension_intent || "unknown";
    const localInternalTension = round3(1 - internalSim);
    const localRemoteTensionRaw = round3(1 - remoteSim);
    const remoteDiscount = tensionIntent === "intentional" ? INTENTIONAL_REMOTE_DISCOUNT : 1;
    const localRemoteTension = round3(localRemoteTensionRaw * remoteDiscount);
    const temporalTension = round3(1 - temporalSim);
    const localConfluenceTension = round3((localInternalTension * 0.65) + (temporalTension * 0.35));
    const crossDomainTension = localRemoteTension;
    const systemTensionRaw = round3((localConfluenceTension * LOCAL_CONFLUENCE_WEIGHT) + (crossDomainTension * CROSS_DOMAIN_WEIGHT));
    const entry = contexts[address] || { history: [] };
    const previousSystemTension = Number(entry?.system_tension);
    const systemTension = Number.isFinite(previousSystemTension)
      ? round3((previousSystemTension * (1 - SYSTEM_TENSION_SMOOTHING_ALPHA)) + (systemTensionRaw * SYSTEM_TENSION_SMOOTHING_ALPHA))
      : systemTensionRaw;
    const convergence = round3(1 - systemTension);
    const localState = classifyLocalState(localConfluenceTension);
    const missingShellTerms = topMissingTerms(localAnchor, shellText);

    entry.local_anchor = localAnchor;
    entry.remote_coordinate = node?._meta?.remote_coordinate || null;
    entry.tension_intent = tensionIntent;
    entry.local_internal_tension = localInternalTension;
    entry.local_remote_tension_raw = localRemoteTensionRaw;
    entry.remote_discount_factor = remoteDiscount;
    entry.local_remote_tension = localRemoteTension;
    entry.temporal_tension = temporalTension;
    entry.local_confluence_tension = localConfluenceTension;
    entry.cross_domain_tension = crossDomainTension;
    entry.system_tension_raw = systemTensionRaw;
    entry.previous_system_tension = Number.isFinite(previousSystemTension) ? round3(previousSystemTension) : null;
    entry.smoothing_alpha = SYSTEM_TENSION_SMOOTHING_ALPHA;
    entry.system_tension = systemTension;
    entry.local_state = localState;
    entry.overall_tension = systemTension;
    entry.convergence_score = convergence;
    entry.confluence_explainability = {
      missing_shell_terms: missingShellTerms,
      shell_anchor_token_count: tokenize(shellText).size,
      local_anchor_token_count: tokenize(localAnchor).size
    };
    entry.last_updated = timestamp;
    entry.history = Array.isArray(entry.history) ? entry.history : [];
    entry.history.push({
      timestamp,
      tension_intent: tensionIntent,
      local_internal_tension: localInternalTension,
      local_remote_tension_raw: localRemoteTensionRaw,
      remote_discount_factor: remoteDiscount,
      local_remote_tension: localRemoteTension,
      temporal_tension: temporalTension,
      local_confluence_tension: localConfluenceTension,
      cross_domain_tension: crossDomainTension,
      system_tension_raw: systemTensionRaw,
      previous_system_tension: Number.isFinite(previousSystemTension) ? round3(previousSystemTension) : null,
      smoothing_alpha: SYSTEM_TENSION_SMOOTHING_ALPHA,
      system_tension: systemTension,
      local_state: localState,
      overall_tension: systemTension,
      convergence_score: convergence,
      missing_shell_terms: missingShellTerms
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
