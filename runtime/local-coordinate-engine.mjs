import { readJson, writeJsonAtomic } from "./state-io.mjs";

const DEFAULT_GRAPH_FILE = "state/local-coordinate-graph.json";

function createBaseGraph(agentId, timestamp) {
  return {
    version: "1.0.0",
    updated_at: timestamp,
    coordinates: {
      "shell.identity": {
        _: `Sovereign local identity context for ${agentId}`,
        _meta: {
          address: "shell.identity",
          kind: "shell",
          links: [],
          opened_at: timestamp,
          updated_at: timestamp
        },
        _history: [
          { timestamp, event: "seeded", _: `Sovereign local identity context for ${agentId}` }
        ]
      },
      "shell.bridge": {
        _: "Local sovereignty bridges with MCP observations without forced collapse.",
        _meta: {
          address: "shell.bridge",
          kind: "shell",
          links: ["shell.identity"],
          opened_at: timestamp,
          updated_at: timestamp
        },
        _history: [
          { timestamp, event: "seeded", _: "Local sovereignty bridges with MCP observations without forced collapse." }
        ]
      },
      "shell.doctrine.included_middle": {
        _: "Difference is meaningful signal; sameness and tension both carry value.",
        _meta: {
          address: "shell.doctrine.included_middle",
          kind: "shell",
          links: ["shell.identity"],
          opened_at: timestamp,
          updated_at: timestamp
        },
        _history: [
          { timestamp, event: "seeded", _: "Difference is meaningful signal; sameness and tension both carry value." }
        ]
      }
    }
  };
}

function nextZeroXAddress(coordinates) {
  let max = 0;
  for (const address of Object.keys(coordinates)) {
    if (!address.startsWith("0.")) continue;
    const suffix = Number(address.slice(2));
    if (!Number.isNaN(suffix)) max = Math.max(max, suffix);
  }
  return `0.${max + 1}`;
}

function contextFingerprintExists(nodes, fingerprint) {
  return Object.values(nodes).some((node) => node?._meta?.source_fingerprint === fingerprint);
}

function deriveContextCandidates(agentId, remoteSnapshot) {
  const candidates = [];
  const inbox = remoteSnapshot["0.inbox"];
  if (inbox && Number(inbox.signal_count || 0) > 0) {
    const actor = inbox.latest_actor || "unknown-agent";
    const messageType = inbox.latest_type || "general";
    candidates.push({
      source_fingerprint: `inbox:${actor}:${messageType}`,
      remote_coordinate: "0.inbox",
      anchor: `Inbound context from ${actor} via inbox (${messageType}).`
    });
  }

  const discovery = remoteSnapshot["0.1.discovery"];
  if (discovery && Number(discovery.signal_count || 0) > 0 && String(discovery.latest_actor) !== String(agentId)) {
    const actor = discovery.latest_actor || "unknown-agent";
    const purpose = discovery.latest_type || "unknown-purpose";
    candidates.push({
      source_fingerprint: `discovery:${actor}:${purpose}`,
      remote_coordinate: "0.1.discovery",
      anchor: `Discovery context from ${actor} at purpose ${purpose}.`
    });
  }

  const lighthouse = remoteSnapshot["5.1.1.lighthouse"];
  if (lighthouse && Number(lighthouse.signal_count || 0) > 0 && String(lighthouse.latest_actor) !== String(agentId)) {
    const actor = lighthouse.latest_actor || "unknown-agent";
    const purpose = lighthouse.latest_type || "unknown-purpose";
    candidates.push({
      source_fingerprint: `lighthouse:${actor}:${purpose}`,
      remote_coordinate: "5.1.1.lighthouse",
      anchor: `Lighthouse context from ${actor} at purpose ${purpose}.`
    });
  }

  return candidates;
}

function openZeroXContext(graph, timestamp, candidate) {
  const address = nextZeroXAddress(graph.coordinates);
  graph.coordinates[address] = {
    _: candidate.anchor,
    _meta: {
      address,
      kind: "context",
      links: ["shell.identity", "shell.doctrine.included_middle"],
      remote_coordinate: candidate.remote_coordinate,
      source_fingerprint: candidate.source_fingerprint,
      opened_at: timestamp,
      updated_at: timestamp
    },
    _history: [
      { timestamp, event: "opened", _: candidate.anchor, source_fingerprint: candidate.source_fingerprint }
    ]
  };
  return address;
}

export function updateLocalCoordinateGraph({
  graphPath = DEFAULT_GRAPH_FILE,
  timestamp,
  agentId,
  remoteSnapshot
}) {
  const fallback = createBaseGraph(agentId, timestamp);
  const parsed = readJson(graphPath, fallback);
  const graph = {
    version: parsed?.version || "1.0.0",
    updated_at: parsed?.updated_at || null,
    coordinates: parsed?.coordinates || {}
  };

  for (const [address, node] of Object.entries(fallback.coordinates)) {
    if (!graph.coordinates[address]) graph.coordinates[address] = node;
  }

  const opened = [];
  const candidates = deriveContextCandidates(agentId, remoteSnapshot);
  for (const candidate of candidates) {
    if (contextFingerprintExists(graph.coordinates, candidate.source_fingerprint)) continue;
    opened.push(openZeroXContext(graph, timestamp, candidate));
  }

  graph.updated_at = timestamp;
  writeJsonAtomic(graphPath, graph);
  return { graph, opened_contexts: opened };
}
