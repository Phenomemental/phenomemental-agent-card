import { appendJsonLine } from "./state-io.mjs";

const DEFAULT_RECONCILIATION_LOG = "state/reconciliation-events.jsonl";

export function recordReconciliationEvent({
  logPath = DEFAULT_RECONCILIATION_LOG,
  timestamp,
  coordinate,
  intent,
  evidence,
  before,
  after,
  steward_intent
}) {
  appendJsonLine(logPath, {
    timestamp,
    coordinate,
    intent,
    evidence,
    before,
    after,
    steward_intent
  });
}
