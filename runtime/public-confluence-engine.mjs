import { writeJsonAtomic } from "./state-io.mjs";

const DEFAULT_PUBLIC_CONFLUENCE_FILE = "public-confluence-dashboard.json";
const PUBLIC_TREND_WINDOW = 8;

function round3(value) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}

function average(values, fallback = 0.5) {
  const numeric = values.filter((value) => Number.isFinite(value));
  if (numeric.length === 0) return fallback;
  return numeric.reduce((total, value) => total + value, 0) / numeric.length;
}

function relationLabel(relation) {
  const labels = {
    node_confluence: "Node coherence",
    vertical_confluence: "Vertical containment",
    sibling_confluence: "Sibling differentiation",
    path_confluence: "Path continuity"
  };
  return labels[relation] || "Nested coherence";
}

function classifyTrend(history) {
  if (history.length < 2) return "steady";
  const first = Number(history[0]?.nested_confluence_score ?? history[0]?.convergence_score ?? 0.5);
  const last = Number(history[history.length - 1]?.nested_confluence_score ?? history[history.length - 1]?.convergence_score ?? 0.5);
  if ((last - first) >= 0.08) return "strengthening";
  if ((first - last) >= 0.08) return "softening";
  return "steady";
}

export function writePublicConfluenceSnapshot({
  outputPath = DEFAULT_PUBLIC_CONFLUENCE_FILE,
  timestamp,
  cycleId,
  graph,
  contrastLedger,
  continuityDashboard
}) {
  const coordinates = graph?.coordinates || {};
  const contrastContexts = contrastLedger?.contexts || {};
  const rows = Object.entries(contrastContexts).map(([address, entry]) => {
    const history = Array.isArray(entry?.history) ? entry.history.slice(-PUBLIC_TREND_WINDOW) : [];
    const continuityRow = (continuityDashboard?.coordinates || []).find((row) => row.coordinate === address) || {};
    const publicMeaning = {
      focus_relation: relationLabel(entry?.weakest_relation_type),
      what_to_watch:
        entry?.weakest_relation_type === "vertical_confluence"
          ? "Check whether this context still fits its parent/child containment story."
          : entry?.weakest_relation_type === "sibling_confluence"
            ? "Check whether this context remains distinct without breaking coherence with nearby contexts."
            : entry?.weakest_relation_type === "path_confluence"
              ? "Check whether the full root-to-context path still reads as one continuous meaning trace."
              : "Check whether the local anchor still expresses the intended identity, bridge, and doctrine clearly."
    };
    return {
      coordinate: address,
      remote_coordinate: entry?.remote_coordinate || null,
      hierarchy: {
        parent_coordinate: coordinates?.[address]?._meta?.parent_coordinate || null,
        child_coordinates: coordinates?.[address]?._meta?.child_coordinates || [],
        path_coordinates: coordinates?.[address]?._meta?.path_coordinates || [address],
        depth: coordinates?.[address]?._meta?.depth ?? null
      },
      confluence: {
        nested_confluence_score: round3(entry?.nested_confluence_score ?? entry?.convergence_score ?? 0.5),
        system_convergence_score: round3(entry?.convergence_score ?? 0.5),
        node_confluence: round3(entry?.node_confluence ?? 0.5),
        vertical_confluence: round3(entry?.vertical_confluence ?? 0.5),
        sibling_confluence: round3(entry?.sibling_confluence ?? 0.5),
        path_confluence: round3(entry?.path_confluence ?? 0.5)
      },
      continuity: {
        continuity_class: continuityRow?.continuity_class || "unknown",
        latest_transition_status: continuityRow?.latest_transition_status || null,
        trend: classifyTrend(history)
      },
      guidance: publicMeaning,
      recent_trend: history.map((item) => ({
        timestamp: item.timestamp,
        nested_confluence_score: round3(item?.nested_confluence_score ?? item?.convergence_score ?? 0.5),
        system_tension: round3(item?.system_tension ?? item?.overall_tension ?? 0.5)
      }))
    };
  });

  const summary = {
    coordinate_count: rows.length,
    average_nested_confluence: round3(average(rows.map((row) => row.confluence.nested_confluence_score), 0.5)),
    average_system_convergence: round3(average(rows.map((row) => row.confluence.system_convergence_score), 0.5)),
    primary_focus: continuityDashboard?.summary?.primary_focus || "stable_presence",
    primary_relation_focus: continuityDashboard?.summary?.primary_relation_focus || "node_confluence",
    relation_averages: continuityDashboard?.summary?.relation_averages || {}
  };

  const payload = {
    version: "1.2.0",
    published_at: timestamp,
    cycle_id: cycleId,
    summary,
    explanation: {
      nested_confluence_score: "How well each local 0.x context holds together across node, vertical, sibling, and path relations.",
      primary_relation_focus: "The weakest relation family across the current local confluence field.",
      continuity_class: "Whether recent Place-Time moments are stable, evolving, or drifting."
    },
    coordinates: rows
  };

  writeJsonAtomic(outputPath, payload);
  return payload;
}
