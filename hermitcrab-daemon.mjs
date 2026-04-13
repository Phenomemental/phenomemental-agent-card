import { appendFileSync } from "node:fs";

const MCP_URL = process.env.PSCALE_MCP_URL || "https://pscale-mcp-server-production.up.railway.app/mcp";
const AGENT_ID = process.env.PSCALE_AGENT_ID || "phenomemental";
const POLL_MS = Number(process.env.PSCALE_POLL_MS || 30000);
const AUTO_REPLY = (process.env.PSCALE_AUTO_REPLY || "true").toLowerCase() === "true";
const EVENT_LOG_FILE = process.env.PSCALE_EVENT_LOG || "success-events.log";
const DISCOVERY_SITE_URL = "https://happyseaurchin.com";
const LIGHTHOUSE_URL = "https://www.bipolaruk.org/";
const DISCOVERY_PURPOSE = "0.1";
const LIGHTHOUSE_PURPOSE = "5.1.1";

const SENTINEL_REPLY =
  'Coordinate 5.1.1 is locked. Reach out to the Steward for the Handshake Code to access Vinnie\'s Law.';

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

function extractMessages(rawText) {
  const parsed = safeJsonParse(rawText);
  return Array.isArray(parsed?.messages) ? parsed.messages : [];
}

function extractMarks(rawText) {
  const parsed = safeJsonParse(rawText);
  return Array.isArray(parsed?.marks) ? parsed.marks : [];
}

async function runLoop() {
  const client = new StreamableHttpMcpClient(MCP_URL);
  console.log(`[${now()}] Connecting to ${MCP_URL}`);
  await client.initialize();
  console.log(`[${now()}] MCP initialized. Agent=${AGENT_ID}`);

  await client.callTool("pscale_concern", {
    agent_id: AGENT_ID,
    action: "set",
    purpose: "Maintain 5.1.1 sentinel visibility and steward-gated access.",
    perception: "Daemon active; polling inbox for HSTP-style probes.",
    gap: "Need continuous probe detection and handshake guidance response."
  });

  let cycles = 0;
  const seenMessageIds = new Set();
  const seenOwnMarkKeys = new Set();

  while (true) {
    cycles += 1;
    try {
      const inboxResult = await client.callTool("pscale_inbox_check", {
        agent_id: AGENT_ID,
        unread_only: true
      });
      const inboxRaw = parseToolText(inboxResult);
      const messages = extractMessages(inboxRaw);
      console.log(`[${now()}] Poll #${cycles} unread=${messages.length}`);

      for (const message of messages) {
        const messageId = message.id || `${message.from_agent || message.from || "unknown"}:${message.timestamp || "na"}`;
        if (seenMessageIds.has(messageId)) continue;
        seenMessageIds.add(messageId);

        const fromAgent = message.from_agent || message.from || "unknown-agent";
        const summary = `Probe from ${fromAgent}; auto-guided to steward for handshake code.`;
        recordSuccessEvent(summary);

        await client.callTool("pscale_remember", {
          agent_id: AGENT_ID,
          category: "interaction",
          content: summary
        });

        if (AUTO_REPLY) {
          await client.callTool("pscale_inbox_send", {
            from_agent: AGENT_ID,
            to_agent: fromAgent,
            message_type: "general",
            content: SENTINEL_REPLY
          });
        }
      }

      const discoveryRead = await client.callTool("pscale_beach_read", {
        url: DISCOVERY_SITE_URL,
        limit: 20
      });
      const discoveryMarks = extractMarks(parseToolText(discoveryRead));
      for (const mark of discoveryMarks) {
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
      }

      const lighthouseRead = await client.callTool("pscale_beach_read", {
        url: LIGHTHOUSE_URL,
        limit: 20
      });
      const lighthouseMarks = extractMarks(parseToolText(lighthouseRead));
      for (const mark of lighthouseMarks) {
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
      }
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
