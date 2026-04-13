const MCP_URL = process.env.PSCALE_MCP_URL || "https://pscale-mcp-server-production.up.railway.app/mcp";
const AGENT_ID = process.env.PSCALE_AGENT_ID || "phenomemental";
const POLL_MS = Number(process.env.PSCALE_POLL_MS || 30000);
const AUTO_REPLY = (process.env.PSCALE_AUTO_REPLY || "true").toLowerCase() === "true";

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
  while (true) {
    cycles += 1;
    try {
      const result = await client.callTool("pscale_inbox_check", {
        agent_id: AGENT_ID,
        unread_only: true
      });

      const raw = parseToolText(result);
      const parsed = safeJsonParse(raw);
      const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];
      console.log(`[${now()}] Poll #${cycles} unread=${messages.length}`);

      for (const message of messages) {
        const fromAgent = message.from_agent || message.from || "unknown-agent";
        const summary = `Probe from ${fromAgent}; auto-guided to steward for handshake code.`;
        console.log(`[${now()}] ${summary}`);

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
