import { readJson, writeJsonAtomic } from "./state-io.mjs";

const DEFAULT_STATE_FILE = "state/semantic-tension-ledger.json";
const HISTORY_LIMIT = 50;
const LOCAL_PROMOTE_REMOTE = (process.env.PSCALE_LOCAL_PROMOTE_REMOTE || "false").toLowerCase() === "true";

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function round3(value) {
  return Number(clamp01(value).toFixed(3));
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

function jaccardSimilarity(a, b) {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  let intersect = 0;
  for (const token of a) {
    if (b.has(token)) intersect += 1;
  }
  return intersect / union.size;
}

function structureSimilarity(localNode, remoteNode) {
  const localCount = Number(localNode?.signal_count || 0);
  const remoteCount = Number(remoteNode?.signal_count || 0);
  const maxCount = Math.max(localCount, remoteCount, 1);
  const countScore = 1 - Math.min(Math.abs(localCount - remoteCount) / maxCount, 1);

  const localLatest = String(localNode?.latest_actor || "none");
  const remoteLatest = String(remoteNode?.latest_actor || "none");
  const actorScore = localLatest === remoteLatest ? 1 : 0;

  return (countScore * 0.7) + (actorScore * 0.3);
}

function describeBand(score) {
  if (score >= 0.9) return "semantic resonance";
  if (score >= 0.7) return "compatible divergence";
  if (score >= 0.4) return "active tension";
  return "semantic rupture";
}

function buildNarrative(localNode, remoteNode, convergenceScore) {
  const localAnchor = localNode?._ || "no local anchor";
  const remoteAnchor = remoteNode?._ || "no remote anchor";
  const band = describeBand(convergenceScore);
  return `${band}: local='${localAnchor}' | remote='${remoteAnchor}'`;
}

function readLedger(statePath) {
  const fallback = {
    version: "1.0.0",
    updated_at: null,
    coordinates: {}
  };
  const parsed = readJson(statePath, fallback);
  if (parsed && typeof parsed === "object" && parsed.coordinates) return parsed;
  return {
    version: "1.0.0",
    updated_at: null,
    coordinates: {}
  };
}

function writeLedger(statePath, ledger) {
  writeJsonAtomic(statePath, ledger);
}

export function buildRemoteSnapshot({ agentId, messages, discoveryMarks, signalSiteMarks }) {
  const latestMessage = messages[0] || null;
  const latestDiscovery = discoveryMarks[0] || null;
  const latestSignalSite = signalSiteMarks[0] || null;

  return {
    "0.inbox": {
      _: "Inbox semantic activity",
      signal_count: messages.length,
      latest_actor: latestMessage?.from_agent || latestMessage?.from || "none",
      latest_type: latestMessage?.message_type || "none"
    },
    "0.1.discovery": {
      _: "Discovery beach signal",
      signal_count: discoveryMarks.length,
      latest_actor: latestDiscovery?.agent_id || "none",
      latest_type: latestDiscovery?.purpose || "none"
    },
    "5.1.1.signal_site": {
      _: "Signal site coordinate signal",
      signal_count: signalSiteMarks.length,
      latest_actor: latestSignalSite?.agent_id || "none",
      latest_type: latestSignalSite?.purpose || "none"
    },
    "identity.agent": {
      _: "Runtime identity lock",
      signal_count: 1,
      latest_actor: agentId,
      latest_type: "identity"
    }
  };
}

export function updateSemanticTensionLedger({
  statePath = DEFAULT_STATE_FILE,
  timestamp,
  remoteSnapshot
}) {
  const ledger = readLedger(statePath);
  const coordinates = ledger.coordinates || {};
  // Legacy migration: purge historical "lighthouse" coordinate naming.
  if (coordinates["5.1.1.lighthouse"]) {
    const legacy = coordinates["5.1.1.lighthouse"];
    const current = coordinates["5.1.1.signal_site"] || null;
    if (!current) {
      coordinates["5.1.1.signal_site"] = {
        ...legacy,
        _meta: {
          ...(legacy?._meta || {}),
          address: "5.1.1.signal_site"
        }
      };
    } else if (Array.isArray(legacy?._history)) {
      current._history = Array.isArray(current._history) ? current._history : [];
      current._history.push(...legacy._history);
      if (current._history.length > HISTORY_LIMIT) {
        current._history = current._history.slice(current._history.length - HISTORY_LIMIT);
      }
    }
    delete coordinates["5.1.1.lighthouse"];
  }

  for (const [coordinate, remoteNode] of Object.entries(remoteSnapshot)) {
    const source = coordinates[coordinate] || {};
    const node = {
      _: typeof source._ === "string" ? source._ : "uninitialized local meaning",
      _meta: {
        address: coordinate,
        updated_at: source?._meta?.updated_at || null
      },
      _remote: source._remote || null,
      _contrast: source._contrast || {
        convergence_score: 0,
        tension_value: 1,
        relation_band: "semantic rupture",
        meaning_delta: "bootstrap"
      },
      _history: Array.isArray(source._history) ? source._history : []
    };
    if (!coordinates[coordinate]) {
      Object.assign(node, {
        _: "uninitialized local meaning",
        _meta: { address: coordinate, updated_at: null },
        _remote: null,
        _contrast: {
          convergence_score: 0,
          tension_value: 1,
          relation_band: "semantic rupture",
          meaning_delta: "bootstrap"
        },
        _history: []
      });
    }

    const isBootstrap = node._ === "uninitialized local meaning";
    let convergence = 0.5;
    let tension = 0.5;
    let relationBand = "active tension";
    let meaningDelta = `bootstrap midpoint: local='${node._}' | remote='${remoteNode?._}'`;

    if (!isBootstrap) {
      const localAnchorTokens = tokenize(node._);
      const remoteAnchorTokens = tokenize(remoteNode?._);
      const anchorScore = jaccardSimilarity(localAnchorTokens, remoteAnchorTokens);
      const structScore = structureSimilarity(node._remote || {}, remoteNode);
      convergence = round3((anchorScore * 0.6) + (structScore * 0.4));
      tension = round3(1 - convergence);
      relationBand = describeBand(convergence);
      meaningDelta = buildNarrative(node, remoteNode, convergence);
    }

    node._remote = remoteNode;
    node._meta = node._meta || { address: coordinate };
    node._meta.address = coordinate;
    node._meta.updated_at = timestamp;
    node._contrast = {
      convergence_score: convergence,
      tension_value: tension,
      relation_band: relationBand,
      meaning_delta: meaningDelta
    };
    node._history = Array.isArray(node._history) ? node._history : [];
    node._history.push({
      timestamp,
      convergence_score: convergence,
      tension_value: tension,
      relation_band: relationBand,
      meaning_delta: meaningDelta
    });
    if (node._history.length > HISTORY_LIMIT) {
      node._history = node._history.slice(node._history.length - HISTORY_LIMIT);
    }

    // Local sovereignty default: do not overwrite local meaning from remote snapshots.
    // Optional promotion exists for explicit operator-controlled reconciliation.
    if (LOCAL_PROMOTE_REMOTE) {
      node._ = remoteNode._;
    }

    coordinates[coordinate] = node;
  }

  ledger.coordinates = coordinates;
  ledger.updated_at = timestamp;
  writeLedger(statePath, ledger);
  return ledger;
}
