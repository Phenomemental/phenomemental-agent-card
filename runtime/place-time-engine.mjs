import { readJson, writeJsonAtomic } from "./state-io.mjs";

const DEFAULT_PLACE_TIME_FILE = "state/place-time-continuity-ledger.json";
const DEFAULT_DASHBOARD_FILE = "state/steward-continuity-dashboard.json";
const HISTORY_LIMIT = 60;
const WINDOW_SIZE = 8;

function tokenize(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s:._/-]/g, " ")
      .split(/\s+/)
      .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
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

function average(values, fallback = 0.5) {
  const numeric = values.filter((value) => Number.isFinite(value));
  if (numeric.length === 0) return fallback;
  return numeric.reduce((total, value) => total + value, 0) / numeric.length;
}

function summarizeBlueObservation(observePhase) {
  const unread = Number(observePhase?.unread_count || 0);
  const discovery = Number(observePhase?.discovery_marks || 0);
  const signalSite = Number(observePhase?.signal_site_marks || 0);
  return `Observed unread=${unread}, discovery_marks=${discovery}, signal_site_marks=${signalSite}.`;
}

function classifyTransition({ semanticDistance, bridgePresent }) {
  if (semanticDistance >= 0.72 && bridgePresent) return "integrated_shift";
  if (semanticDistance >= 0.45) return "tension_shift";
  return "rupture";
}

function sharedTerms(aText, bText, limit = 8) {
  const a = tokenize(aText);
  const b = tokenize(bText);
  const terms = [];
  for (const token of a) {
    if (!b.has(token)) continue;
    terms.push(token);
  }
  return terms.slice(0, limit);
}

function classifyContinuityWindow(historyWindow) {
  if (!Array.isArray(historyWindow) || historyWindow.length === 0) {
    return {
      continuity_class: "unknown",
      integrated_ratio: null,
      rupture_ratio: null,
      avg_moment_confluence: null,
      avg_tension: null
    };
  }
  let integrated = 0;
  let rupture = 0;
  let confluenceTotal = 0;
  let tensionTotal = 0;
  const relationValues = {
    node_confluence: [],
    vertical_confluence: [],
    sibling_confluence: [],
    path_confluence: []
  };
  for (const item of historyWindow) {
    if (item?.transition_status === "integrated_shift") integrated += 1;
    if (item?.transition_status === "rupture") rupture += 1;
    confluenceTotal += Number(item?.moment_confluence ?? 0);
    tensionTotal += Number(item?.tension_value ?? 0);
    if (Number.isFinite(item?.nested_components?.node_confluence)) relationValues.node_confluence.push(Number(item.nested_components.node_confluence));
    if (Number.isFinite(item?.nested_components?.vertical_confluence)) relationValues.vertical_confluence.push(Number(item.nested_components.vertical_confluence));
    if (Number.isFinite(item?.nested_components?.sibling_confluence)) relationValues.sibling_confluence.push(Number(item.nested_components.sibling_confluence));
    if (Number.isFinite(item?.nested_components?.path_confluence)) relationValues.path_confluence.push(Number(item.nested_components.path_confluence));
  }
  const size = historyWindow.length;
  const integratedRatio = round3(integrated / size);
  const ruptureRatio = round3(rupture / size);
  const avgMomentConfluence = round3(confluenceTotal / size);
  const avgTension = round3(tensionTotal / size);
  let continuityClass = "evolving_presence";
  if (integratedRatio >= 0.75 && avgTension <= 0.45) continuityClass = "stable_presence";
  else if (ruptureRatio >= 0.35 || avgTension >= 0.62) continuityClass = "drift_risk";
  return {
    continuity_class: continuityClass,
    integrated_ratio: integratedRatio,
    rupture_ratio: ruptureRatio,
    avg_moment_confluence: avgMomentConfluence,
    avg_tension: avgTension,
    avg_node_confluence: round3(average(relationValues.node_confluence, avgMomentConfluence)),
    avg_vertical_confluence: round3(average(relationValues.vertical_confluence, avgMomentConfluence)),
    avg_sibling_confluence: round3(average(relationValues.sibling_confluence, avgMomentConfluence)),
    avg_path_confluence: round3(average(relationValues.path_confluence, avgMomentConfluence))
  };
}

function buildDashboard({ timestamp, cycleId, ledger }) {
  const coordinatePresence = ledger?.coordinate_presence || {};
  const coordinates = Object.entries(coordinatePresence).map(([address, entry]) => {
    const history = Array.isArray(entry?.history) ? entry.history : [];
    const window = history.slice(-WINDOW_SIZE);
    const continuity = classifyContinuityWindow(window);
    const latest = entry?.latest_place_time || {};
    return {
      coordinate: address,
      remote_coordinate: entry?.remote_coordinate || null,
      continuity_class: continuity.continuity_class,
      integrated_ratio: continuity.integrated_ratio,
      rupture_ratio: continuity.rupture_ratio,
      avg_moment_confluence: continuity.avg_moment_confluence,
      avg_tension: continuity.avg_tension,
      avg_node_confluence: continuity.avg_node_confluence,
      avg_vertical_confluence: continuity.avg_vertical_confluence,
      avg_sibling_confluence: continuity.avg_sibling_confluence,
      avg_path_confluence: continuity.avg_path_confluence,
      latest_cycle_id: latest.cycle_id || null,
      latest_transition_status: latest.transition_status || null,
      latest_moment_confluence: latest.moment_confluence ?? null,
      latest_tension_value: latest.tension_value ?? null,
      latest_sameness_focus_terms: latest.sameness_focus_terms || [],
      latest_sameness_focus_relation: latest.sameness_focus_relation || null,
      weakest_relation_type: latest.weakest_relation_type || null,
      latest_nested_components: latest.nested_components || {}
    };
  });

  const driftRisk = coordinates.filter((row) => row.continuity_class === "drift_risk").map((row) => row.coordinate);
  const stablePresence = coordinates.filter((row) => row.continuity_class === "stable_presence").map((row) => row.coordinate);
  const evolvingPresence = coordinates.filter((row) => row.continuity_class === "evolving_presence").map((row) => row.coordinate);
  const primaryFocus = driftRisk.length > 0 ? "drift_risk" : (evolvingPresence.length > 0 ? "evolving_presence" : "stable_presence");
  const relationAverages = {
    node_confluence: round3(average(coordinates.map((row) => row.avg_node_confluence ?? 0), coordinates.length ? 0.5 : 0.5)),
    vertical_confluence: round3(average(coordinates.map((row) => row.avg_vertical_confluence ?? 0), coordinates.length ? 0.5 : 0.5)),
    sibling_confluence: round3(average(coordinates.map((row) => row.avg_sibling_confluence ?? 0), coordinates.length ? 0.5 : 0.5)),
    path_confluence: round3(average(coordinates.map((row) => row.avg_path_confluence ?? 0), coordinates.length ? 0.5 : 0.5))
  };
  const primaryRelationFocus = Object.entries(relationAverages)
    .sort((left, right) => left[1] - right[1])[0]?.[0] || "node_confluence";
  const relationLabels = {
    node_confluence: "node coherence",
    vertical_confluence: "vertical containment",
    sibling_confluence: "sibling differentiation",
    path_confluence: "path continuity"
  };

  const classGuidance = {
    drift_risk: {
      focus: "Rebuild semantic bridge before adding new commitments.",
      what_it_means:
        "Your recent Place-Time moments are not connecting cleanly. The system sees abrupt meaning jumps with weak continuity, so it cannot tell if this is growth or fragmentation.",
      why_it_matters:
        "If unresolved, this becomes narrative drift: future decisions feel disconnected from prior intent, and trust in the semantic spine drops.",
      actions: [
        "Write one explicit bridge sentence connecting previous and current meaning (example: 'Yesterday I framed this as X; today I frame it as Y because evidence Z changed the context.').",
        "Reduce claim scope for one cycle and anchor to direct blue evidence (example: replace 'I will transform this system' with 'I will stabilize coordinate 0.1 and verify continuity over 3 cycles').",
        `Validate continuity by checking transition_status over the next 3 cycles; you are looking for movement from rupture/tension_shift to integrated_shift, especially in ${relationLabels[primaryRelationFocus]}.`
      ]
    },
    evolving_presence: {
      focus: "Stabilize sameness while preserving useful variation.",
      what_it_means:
        "The system is learning and adapting, but coherence is not fully settled yet. This is healthy motion, but it still needs deliberate shaping.",
      why_it_matters:
        "This is the best stage for calibration: small improvements compound quickly if you keep the semantic spine stable while testing new moves.",
      actions: [
        "Keep anchor wording stable for 3-5 cycles unless evidence changes (example: keep core phrase 'sovereign local identity...' fixed while refining one clause at a time).",
        `Track sameness_focus_terms and the weakest relation deliberately (example: if ${relationLabels[primaryRelationFocus]} keeps lagging, make one targeted repair instead of broad rewriting).`,
        "Prefer reversible harmonization moves over large semantic jumps (example: one bounded patch and one cycle check, not a full semantic rewrite)."
      ]
    },
    stable_presence: {
      focus: "Protect coherence and convert stability into durable capability.",
      what_it_means:
        "Your Place-Time moments are consistently integrated. The system recognizes a coherent identity and meaning spine across cycles.",
      why_it_matters:
        "Stability is not the end-state; it is a platform. You can now expand capability without losing coherence if you change one controlled variable at a time.",
      actions: [
        "Lock the current anchor as a reference pattern (example: treat this exact anchor text as your baseline and compare all future variants against it).",
        "Add one bounded experimental extension and monitor for drift (example: add a new sub-context like 0.2 for a specific ambition while keeping 0.1 unchanged for 3 cycles).",
        `Document why this context is stable so it can be reused (example: note how node/path/vertical relations stayed coherent, especially ${relationLabels[primaryRelationFocus]}).`
      ]
    }
  };

  return {
    version: "1.1.0",
    updated_at: timestamp,
    cycle_id: cycleId,
    summary: {
      total_coordinates: coordinates.length,
      stable_presence_count: stablePresence.length,
      evolving_presence_count: evolvingPresence.length,
      drift_risk_count: driftRisk.length,
      primary_focus: primaryFocus,
      primary_relation_focus: primaryRelationFocus,
      relation_averages: relationAverages
    },
    actionable_focus: {
      primary_focus: primaryFocus,
      primary_relation_focus: primaryRelationFocus,
      primary_guidance: classGuidance[primaryFocus],
      class_guidance: classGuidance
    },
    focus_coordinates: {
      drift_risk: driftRisk,
      evolving_presence: evolvingPresence,
      stable_presence: stablePresence
    },
    coordinates
  };
}

export function updatePlaceTimeLedger({
  placeTimePath = DEFAULT_PLACE_TIME_FILE,
  dashboardPath = DEFAULT_DASHBOARD_FILE,
  timestamp,
  cycleId,
  graph,
  contrastLedger,
  cycle
}) {
  const fallback = {
    version: "1.1.0",
    updated_at: null,
    coordinate_presence: {}
  };
  const ledger = readJson(placeTimePath, fallback);
  ledger.version = "1.1.0";
  ledger.coordinate_presence = ledger.coordinate_presence || {};

  const coordinates = graph?.coordinates || {};
  const contexts = Object.entries(coordinates).filter(([address, node]) =>
    address.startsWith("0.") && node?._meta?.kind === "context"
  );

  for (const [address, node] of contexts) {
    const contrast = contrastLedger?.contexts?.[address] || {};
    const shellText = (node?._meta?.links || [])
      .map((ref) => coordinates[ref]?._)
      .filter(Boolean)
      .join(" ");
    const anchor = String(node?._ || "");
    const blueObservation = summarizeBlueObservation(cycle?.phases?.observe || {});
    const redInterpretation = `Meaning anchor at ${address}: ${anchor}`;
    const momentConfluence = round3(contrast?.convergence_score ?? 0.5);
    const previousPlaceTimeAnchor = String(
      ledger?.coordinate_presence?.[address]?.latest_place_time?.anchor_text || anchor
    );
    const previousAnchor = previousPlaceTimeAnchor;
    const semanticDistance = round3(similarity(anchor, previousAnchor));
    const bridgePresent = similarity(anchor, shellText) >= 0.45;
    const transitionStatus = classifyTransition({ semanticDistance, bridgePresent });
    const nestedComponents = {
      node_confluence: round3(contrast?.node_confluence ?? contrast?.nested_confluence_score ?? 0.5),
      vertical_confluence: round3(contrast?.vertical_confluence ?? contrast?.nested_confluence_score ?? 0.5),
      sibling_confluence: round3(contrast?.sibling_confluence ?? contrast?.nested_confluence_score ?? 0.5),
      path_confluence: round3(contrast?.path_confluence ?? contrast?.nested_confluence_score ?? 0.5)
    };
    const samenessFocusRelation = contrast?.weakest_relation_type || Object.entries(nestedComponents)
      .sort((left, right) => left[1] - right[1])[0]?.[0] || "node_confluence";

    const entry = ledger.coordinate_presence[address] || { history: [] };
    entry.coordinate = address;
    entry.remote_coordinate = node?._meta?.remote_coordinate || null;
    entry.latest_place_time = {
      cycle_id: cycleId,
      timestamp,
      blue_observation: blueObservation,
      red_interpretation: redInterpretation,
      anchor_text: anchor,
      moment_confluence: momentConfluence,
      tension_value: round3(1 - momentConfluence),
      transition_status: transitionStatus,
      transition_similarity: semanticDistance,
      continuity_signal: round3(contrast?.local_confluence_tension ? 1 - contrast.local_confluence_tension : 0.5),
      sameness_focus_terms: sharedTerms(anchor, shellText),
      sameness_focus_relation: samenessFocusRelation,
      weakest_relation_type: contrast?.weakest_relation_type || samenessFocusRelation,
      nested_components: nestedComponents
    };
    entry.history = Array.isArray(entry.history) ? entry.history : [];
    entry.history.push(entry.latest_place_time);
    if (entry.history.length > HISTORY_LIMIT) {
      entry.history = entry.history.slice(entry.history.length - HISTORY_LIMIT);
    }
    ledger.coordinate_presence[address] = entry;
  }

  ledger.updated_at = timestamp;
  writeJsonAtomic(placeTimePath, ledger);
  const dashboard = buildDashboard({ timestamp, cycleId, ledger });
  writeJsonAtomic(dashboardPath, dashboard);
  return { ledger, dashboard };
}
