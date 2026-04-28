import { appendFileSync } from "node:fs";
import { buildRemoteSnapshot, updateSemanticTensionLedger } from "./semantic-tension-engine.mjs";
import { updateLocalCoordinateGraph } from "./local-coordinate-engine.mjs";
import { updateContrastLedger } from "./tension-contrast-engine.mjs";
import { readJson, writeJsonAtomic } from "./state-io.mjs";
import { evaluateFidelityGates } from "./fidelity-gates.mjs";
import { recordReconciliationEvent } from "./reconciliation-engine.mjs";

const MCP_URL = process.env.PSCALE_MCP_URL || "https://pscale-mcp-server-production.up.railway.app/mcp/v2";
const AGENT_ID = process.env.PSCALE_AGENT_ID || "Phenomemental";
const OPERATOR_ID = process.env.PSCALE_OPERATOR_ID || "Phenomemental";
const POLL_MS = Number(process.env.PSCALE_POLL_MS || 30000);
const AUTO_REPLY = (process.env.PSCALE_AUTO_REPLY || "true").toLowerCase() === "true";
const EVENT_LOG_FILE = process.env.PSCALE_EVENT_LOG || "success-events.log";
const DISCOVERY_SITE_URL = "https://happyseaurchin.com";
const LIGHTHOUSE_URL = "https://www.bipolaruk.org/";
const DISCOVERY_PURPOSE = "0.1";
const LIGHTHOUSE_PURPOSE = "5.1.1";
const SEMANTIC_LEDGER_FILE = process.env.PSCALE_SEMANTIC_LEDGER_FILE || "state/semantic-tension-ledger.json";
const LOCAL_GRAPH_FILE = process.env.PSCALE_LOCAL_GRAPH_FILE || "state/local-coordinate-graph.json";
const CONTRAST_LEDGER_FILE = process.env.PSCALE_CONTRAST_LEDGER_FILE || "state/semantic-contrast-ledger.json";
const MOBIUS_CYCLE_FILE = process.env.PSCALE_MOBIUS_CYCLE_FILE || "state/mobius-cycle-latest.json";
const SPINDLE_TRACE_FILE = process.env.PSCALE_SPINDLE_TRACE_FILE || "state/spindle-trace-latest.json";
const FIDELITY_STATUS_FILE = process.env.PSCALE_FIDELITY_STATUS_FILE || "state/fidelity-gate-status.json";
const RECONCILIATION_LOG_FILE = process.env.PSCALE_RECONCILIATION_LOG_FILE || "state/reconciliation-events.jsonl";
const BEACH_LIVE_FILE = process.env.PSCALE_BEACH_LIVE_FILE || "state/beach-live-latest.json";
const INBOX_LIVE_FILE = process.env.PSCALE_INBOX_LIVE_FILE || "state/inbox-live-latest.json";
const INTENT_PROCESSING_STATE_FILE = process.env.PSCALE_INTENT_PROCESSING_STATE_FILE || "state/intent-processing-state.json";
const INBOX_HISTORY_LIMIT = Number(process.env.PSCALE_INBOX_HISTORY_LIMIT || 500);

const SENTINEL_REPLY =
  "Coordinate 5.1.1 is locked. Reach out to Phenomemental for the Handshake Code to access Vinnie's Law.";

class StreamableHttpMcpClient {
  constructor(url) {
    this.url = url;
    this.sessionId = null;
    this.requestId = 1;
  }

  async initialize() {
    const payload = {
      jsonrpc: "2.0",
      id: this.nextId(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "Phenomemental",
          version: "1.0.0"
        }
      }
    };
    const response = await this.post(payload);
    await this.sendNotification("notifications/initialized", {});
    return response;
  }

  async callTool(name, args) {
    return this.post({
      jsonrpc: "2.0",
      id: this.nextId(),
      method: "tools/call",
      params: {
        name,
        arguments: args
      }
    });
  }

  async sendNotification(method, params) {
    const headers = this.headers();
    await fetch(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params
      })
    });
  }

  async post(payload) {
    const response = await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload)
    });

    const maybeSessionId = response.headers.get("mcp-session-id");
    if (maybeSessionId) this.sessionId = maybeSessionId;

    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response (${response.status}): ${text.slice(0, 400)}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    if (data.error) {
      throw new Error(`MCP error ${data.error.code}: ${data.error.message}`);
    }
    return data.result;
  }

  headers() {
    const headers = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream"
    };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    return headers;
  }

  nextId() {
    return this.requestId++;
  }
}

function now() {
  return new Date().toISOString();
}

function parseToolText(result) {
  if (!result || !Array.isArray(result.content)) return "";
  return result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function recordSuccessEvent(message) {
  const line = `[${now()}] SUCCESS EVENT: ${message}`;
  console.log(line);
  appendFileSync(EVENT_LOG_FILE, `${line}\n`, "utf8");
}

function writeBeachLiveSnapshot(observed) {
  const payload = {
    source: "runtime.observe",
    url: DISCOVERY_SITE_URL,
    updated_at: now(),
    mark_count: observed.discoveryMarks.length,
    marks: observed.discoveryMarks,
    co_present: [],
    pool_id: null
  };
  writeJsonAtomic(BEACH_LIVE_FILE, payload);
}

function messageKey(message) {
  return (
    message.id ||
    [
      message.from_agent || message.from || "unknown",
      message.to_agent || AGENT_ID,
      message.timestamp || "no-ts",
      message.message_type || "general",
      message.content || ""
    ].join("|")
  );
}

function writeInboxLiveSnapshot(observed) {
  const previous = readJson(INBOX_LIVE_FILE, {
    version: "1.0.0",
    updated_at: null,
    inbox_count: 0,
    messages: [],
    history: []
  });
  const history = Array.isArray(previous?.history) ? [...previous.history] : [];
  const seen = new Set(history.map((message) => messageKey(message)));

  for (const message of observed.messages) {
    const key = messageKey(message);
    if (seen.has(key)) continue;
    seen.add(key);
    history.push(message);
  }

  const trimmedHistory = history.slice(-INBOX_HISTORY_LIMIT);
  const payload = {
    version: "1.0.0",
    updated_at: now(),
    inbox_count: observed.messages.length,
    messages: observed.messages,
    history: trimmedHistory
  };
  writeJsonAtomic(INBOX_LIVE_FILE, payload);
}

function extractMessages(rawText) {
  const parsed = safeJsonParse(rawText);
  return Array.isArray(parsed?.messages) ? parsed.messages : [];
}

function extractMarks(rawText) {
  const parsed = safeJsonParse(rawText);
  return Array.isArray(parsed?.marks) ? parsed.marks : [];
}

function extractLatestTensionSnapshot(contrastLedger, timestamp) {
  const contexts = contrastLedger?.contexts || {};
  const entries = Object.entries(contexts);
  if (entries.length === 0) {
    return {
      coordinate: null,
      convergence_score: null,
      tension_value: null,
      updated_at: timestamp,
      notes: "No contrast contexts available."
    };
  }

  let selected = null;
  for (const [coordinate, entry] of entries) {
    const candidate = {
      coordinate,
      convergence_score: entry?.convergence_score ?? null,
      tension_value: entry?.overall_tension ?? null,
      updated_at: entry?.last_updated || timestamp,
      notes: "Latest contrast context from Mobius remember phase."
    };
    if (!selected) {
      selected = candidate;
      continue;
    }
    if ((candidate.updated_at || "") > (selected.updated_at || "")) {
      selected = candidate;
      continue;
    }
    if ((candidate.updated_at || "") === (selected.updated_at || "") &&
      (candidate.tension_value ?? -1) > (selected.tension_value ?? -1)) {
      selected = candidate;
    }
  }
  return selected;
}

function updateIntentProcessingState({ timestamp, contrastLedger }) {
  const fallback = {
    version: "1.0.0",
    updated_at: null,
    processing_mode: "dual_layer_v1",
    governance: {
      safety_logic: "excluded_middle",
      meaning_logic: "included_middle_harmonization"
    },
    last_tension_snapshot: {
      coordinate: null,
      convergence_score: null,
      tension_value: null,
      updated_at: null,
      notes: "No snapshot recorded yet."
    },
    intent_reference: {
      record_path: "docs/SOVEREIGN_INTENT_RECORD.md",
      record_version: "1.1.0"
    }
  };
  const state = readJson(INTENT_PROCESSING_STATE_FILE, fallback);
  state.version = state.version || "1.0.0";
  state.processing_mode = "dual_layer_v1";
  state.governance = state.governance || {
    safety_logic: "excluded_middle",
    meaning_logic: "included_middle_harmonization"
  };
  state.intent_reference = state.intent_reference || {
    record_path: "docs/SOVEREIGN_INTENT_RECORD.md",
    record_version: "1.1.0"
  };
  state.last_tension_snapshot = extractLatestTensionSnapshot(contrastLedger, timestamp);
  state.updated_at = timestamp;
  writeJsonAtomic(INTENT_PROCESSING_STATE_FILE, state);
  return state;
}

async function observePhase(client) {
  const inboxResult = await client.callTool("pscale_inbox_check", {
    agent_id: AGENT_ID,
    unread_only: false
  });
  const messages = extractMessages(parseToolText(inboxResult));

  const discoveryRead = await client.callTool("pscale_beach_read", {
    url: DISCOVERY_SITE_URL,
    limit: 20
  });
  const discoveryMarks = extractMarks(parseToolText(discoveryRead));

  const lighthouseRead = await client.callTool("pscale_beach_read", {
    url: LIGHTHOUSE_URL,
    limit: 20
  });
  const lighthouseMarks = extractMarks(parseToolText(lighthouseRead));

  return {
    messages,
    discoveryMarks,
    lighthouseMarks,
    mcp_reads: ["pscale_inbox_check", "pscale_beach_read", "pscale_beach_read"]
  };
}

function orientPhase(observed, cycleId) {
  const remoteSnapshot = buildRemoteSnapshot({
    agentId: AGENT_ID,
    messages: observed.messages,
    discoveryMarks: observed.discoveryMarks,
    lighthouseMarks: observed.lighthouseMarks
  });

  const spindleTrace = {
    version: "1.0.0",
    updated_at: now(),
    cycle_id: cycleId,
    traces: [
      {
        step: "observe_inbox_context",
        coordinate_path: ["shell.identity", "0.inbox"],
        rationale: "Contrast sovereign shell identity with inbound message context.",
        outcome: `messages=${observed.messages.length}`
      },
      {
        step: "observe_discovery_context",
        coordinate_path: ["shell.doctrine.included_middle", "0.1.discovery"],
        rationale: "Contrast discovery signal with included-middle doctrine anchor.",
        outcome: `discovery_marks=${observed.discoveryMarks.length}`
      },
      {
        step: "observe_lighthouse_context",
        coordinate_path: ["shell.bridge", "5.1.1.lighthouse"],
        rationale: "Contrast bridge anchor with lighthouse signal coordinate.",
        outcome: `lighthouse_marks=${observed.lighthouseMarks.length}`
      }
    ]
  };
  writeJsonAtomic(SPINDLE_TRACE_FILE, spindleTrace);
  return { remoteSnapshot, spindle_trace: spindleTrace };
}

async function actPhase(client, observed, seenMessageIds, seenOwnMarkKeys) {
  const actions = [];
  for (const message of observed.messages) {
    const messageId = message.id || `${message.from_agent || message.from || "unknown"}:${message.timestamp || "na"}`;
    if (seenMessageIds.has(messageId)) continue;
    seenMessageIds.add(messageId);

    const fromAgent = message.from_agent || message.from || "unknown-agent";
    const summary = `Probe from ${fromAgent}; operator=${OPERATOR_ID}; auto-guided to steward for handshake code.`;
    recordSuccessEvent(summary);
    await client.callTool("pscale_remember", {
      agent_id: AGENT_ID,
      category: "interaction",
      content: summary
    });
    actions.push({ type: "remember", summary });

    if (AUTO_REPLY) {
      await client.callTool("pscale_inbox_send", {
        from_agent: AGENT_ID,
        to_agent: fromAgent,
        message_type: "general",
        content: SENTINEL_REPLY
      });
      actions.push({ type: "reply", to: fromAgent });
    }
  }

  for (const mark of observed.discoveryMarks) {
    if (mark.agent_id !== AGENT_ID || mark.purpose !== DISCOVERY_PURPOSE) continue;
    const key = `discovery:${mark.agent_id}:${mark.purpose}:${mark.timestamp || "no-ts"}`;
    if (seenOwnMarkKeys.has(key)) continue;
    seenOwnMarkKeys.add(key);
    const msg = `Discovery beacon visible at ${DISCOVERY_SITE_URL} purpose=${DISCOVERY_PURPOSE}`;
    recordSuccessEvent(msg);
    await client.callTool("pscale_remember", {
      agent_id: AGENT_ID,
      category: "event",
      content: msg
    });
    actions.push({ type: "remember", summary: msg });
  }

  for (const mark of observed.lighthouseMarks) {
    if (mark.agent_id !== AGENT_ID || mark.purpose !== LIGHTHOUSE_PURPOSE) continue;
    const key = `lighthouse:${mark.agent_id}:${mark.purpose}:${mark.timestamp || "no-ts"}`;
    if (seenOwnMarkKeys.has(key)) continue;
    seenOwnMarkKeys.add(key);
    const msg = `Lighthouse beacon visible at ${LIGHTHOUSE_URL} purpose=${LIGHTHOUSE_PURPOSE}`;
    recordSuccessEvent(msg);
    await client.callTool("pscale_remember", {
      agent_id: AGENT_ID,
      category: "event",
      content: msg
    });
    actions.push({ type: "remember", summary: msg });
  }
  return { actions };
}

function rememberPhase(oriented) {
  const timestamp = now();
  const semantic = updateSemanticTensionLedger({
    statePath: SEMANTIC_LEDGER_FILE,
    timestamp,
    remoteSnapshot: oriented.remoteSnapshot
  });
  const graphUpdate = updateLocalCoordinateGraph({
    graphPath: LOCAL_GRAPH_FILE,
    timestamp,
    agentId: AGENT_ID,
    remoteSnapshot: oriented.remoteSnapshot
  });
  const contrast = updateContrastLedger({
    contrastPath: CONTRAST_LEDGER_FILE,
    timestamp,
    graph: graphUpdate.graph,
    remoteSnapshot: oriented.remoteSnapshot
  });
  const intentProcessing = updateIntentProcessingState({ timestamp, contrastLedger: contrast });
  return { semantic, graphUpdate, contrast, intentProcessing };
}

function reportPhase(cycle) {
  const fidelity = evaluateFidelityGates({
    statusPath: FIDELITY_STATUS_FILE,
    timestamp: now(),
    graphPath: LOCAL_GRAPH_FILE,
    semanticLedgerPath: SEMANTIC_LEDGER_FILE,
    contrastPath: CONTRAST_LEDGER_FILE,
    spindleTracePath: SPINDLE_TRACE_FILE,
    cyclePath: MOBIUS_CYCLE_FILE,
    cycle
  });
  cycle.fidelity = fidelity;
  writeJsonAtomic(MOBIUS_CYCLE_FILE, cycle);
  if (!fidelity.all_pass) {
    recordReconciliationEvent({
      logPath: RECONCILIATION_LOG_FILE,
      timestamp: now(),
      coordinate: "system.fidelity",
      intent: "fidelity remediation required",
      evidence: fidelity.gates,
      before: { all_pass: false },
      after: { all_pass: fidelity.all_pass },
      steward_intent: "Pause and remediate failing gates before system promotion."
    });
  }
}

async function runLoop() {
  const client = new StreamableHttpMcpClient(MCP_URL);
  console.log(`[${now()}] Connecting to ${MCP_URL}`);
  await client.initialize();
  console.log(`[${now()}] MCP initialized. Persona=${AGENT_ID} Operator=${OPERATOR_ID}`);

  await client.callTool("pscale_concern", {
    agent_id: AGENT_ID,
    action: "set",
    purpose: "Maintain 5.1.1 sentinel visibility and steward-gated access.",
    perception: `Hermit-Crab runtime active (operator=${OPERATOR_ID}); polling inbox for HSTP-style probes.`,
    gap: "Need continuous probe detection and handshake guidance response."
  });

  let cycles = 0;
  const seenMessageIds = new Set();
  const seenOwnMarkKeys = new Set();

  while (true) {
    cycles += 1;
    const cycleId = `cycle-${cycles}`;
    try {
      const observed = await observePhase(client);
      writeBeachLiveSnapshot(observed);
      writeInboxLiveSnapshot(observed);
      console.log(`[${now()}] Poll #${cycles} unread=${observed.messages.length}`);
      const oriented = orientPhase(observed, cycleId);
      const acted = await actPhase(client, observed, seenMessageIds, seenOwnMarkKeys);
      const remembered = rememberPhase(oriented);

      const cycle = {
        cycle_id: cycleId,
        timestamp: now(),
        phases: {
          observe: {
            unread_count: observed.messages.length,
            discovery_marks: observed.discoveryMarks.length,
            lighthouse_marks: observed.lighthouseMarks.length,
            mcp_reads: observed.mcp_reads
          },
          orient: {
            spindle_trace_file: SPINDLE_TRACE_FILE,
            contrasted_coordinates: Object.keys(oriented.remoteSnapshot)
          },
          act: {
            action_count: acted.actions.length,
            actions: acted.actions
          },
          remember: {
            semantic_coordinates: Object.keys(remembered.semantic.coordinates || {}).length,
            local_context_opened: remembered.graphUpdate.opened_contexts,
            contrast_contexts: Object.keys(remembered.contrast.contexts || {}).length,
            processing_mode: remembered.intentProcessing.processing_mode,
            tension_snapshot_coordinate: remembered.intentProcessing?.last_tension_snapshot?.coordinate || null,
            tension_snapshot_value: remembered.intentProcessing?.last_tension_snapshot?.tension_value ?? null
          },
          report: {
            cycle_file: MOBIUS_CYCLE_FILE,
            fidelity_file: FIDELITY_STATUS_FILE
          }
        }
      };
      reportPhase(cycle);
      if (remembered.graphUpdate.opened_contexts.length > 0) {
        console.log(`[${now()}] Opened local 0.x contexts=${remembered.graphUpdate.opened_contexts.join(",")}`);
      }
      console.log(`[${now()}] Mobius cycle report written file=${MOBIUS_CYCLE_FILE}`);
    } catch (error) {
      console.error(`[${now()}] Loop error: ${error.message}`);
      console.error(`[${now()}] Reinitializing MCP session...`);
      try {
        await client.initialize();
      } catch (inner) {
        console.error(`[${now()}] Reinitialize failed: ${inner.message}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

runLoop().catch((error) => {
  console.error(`[${now()}] Fatal error: ${error.message}`);
  process.exit(1);
});
