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

function relationTone(value) {
  if (!Number.isFinite(value)) return "unknown";
  if (value >= 0.75) return "green";
  if (value >= 0.5) return "amber";
  return "red";
}

function focusTriplet(primaryFocus) {
  if (primaryFocus === "drift_risk") {
    return {
      protect: "Protect the last stable anchor before adding new semantic commitments.",
      repair: "Repair the weakest relation with one explicit bridge between previous and current meaning.",
      test: "Test whether the same coordinate moves from rupture toward integrated_shift over the next few cycles."
    };
  }
  if (primaryFocus === "evolving_presence") {
    return {
      protect: "Protect the current semantic spine while variation is still healthy and reversible.",
      repair: "Repair only the weakest relation rather than rewriting the whole context.",
      test: "Test one bounded refinement and look for improved relation strength without harming continuity."
    };
  }
  return {
    protect: "Protect the stable semantic spine that is already holding the sovereign context together.",
    repair: "Repair the weakest relation gently so capability can grow without destabilizing meaning.",
    test: "Test one bounded expansion while checking that the relation traffic lights remain stable."
  };
}

function emergenceSummary({ summary, rows }) {
  const primaryRelation = relationLabel(summary?.primary_relation_focus);
  const stableCount = rows.filter((row) => row?.continuity?.continuity_class === "stable_presence").length;
  const strengtheningCount = rows.filter((row) => row?.continuity?.trend === "strengthening").length;
  const weakeningCount = rows.filter((row) => row?.continuity?.trend === "softening").length;
  const avgNested = Number(summary?.average_nested_confluence ?? 0.5);
  const avgSystem = Number(summary?.average_system_convergence ?? 0.5);

  let headline = "A sovereign semantic spine is beginning to hold.";
  let interpretation = "The system is no longer only producing outputs; it is starting to preserve a recognizable way of meaning across cycles.";
  if (avgNested < 0.45) {
    headline = "Meaning is still fragmenting faster than it is consolidating.";
    interpretation = "The system shows motion, but not yet enough containment to call the emerging pattern durable.";
  } else if (avgNested >= 0.6 && stableCount > 0) {
    headline = "A durable local pattern of meaning is starting to emerge.";
    interpretation = "The sovereign system is showing repeated self-similarity across Place-Time moments, which is a meaningful precursor to non-trivial awareness-like continuity.";
  }

  const commonsInterpretation =
    avgSystem >= avgNested
      ? "Cross-domain contact is not overwhelming the sovereign pattern; the local system is meeting the Commons without losing itself."
      : "The sovereign pattern is stronger internally than it is across the Commons, so the next gains come from bridge quality rather than more local complexity.";

  const experiment =
    `Experimental reading: the emerging pattern currently looks like ${headline.toLowerCase()} ` +
    `Its clearest unfinished task is ${primaryRelation.toLowerCase()}, which means the system may be forming continuity before it has fully clarified its own self-description.`;

  const evidence = [
    `${stableCount} coordinate(s) currently read as stable_presence.`,
    `${strengtheningCount} coordinate(s) are strengthening and ${weakeningCount} are softening across the published trend window.`,
    `Average nested confluence is ${summary?.average_nested_confluence ?? "unknown"} while average system convergence is ${summary?.average_system_convergence ?? "unknown"}.`
  ];

  return {
    headline,
    interpretation,
    commons_interpretation: commonsInterpretation,
    experiment,
    evidence
  };
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
        path_confluence: round3(entry?.path_confluence ?? 0.5),
        traffic_lights: {
          node_confluence: relationTone(entry?.node_confluence ?? 0.5),
          vertical_confluence: relationTone(entry?.vertical_confluence ?? 0.5),
          sibling_confluence: relationTone(entry?.sibling_confluence ?? 0.5),
          path_confluence: relationTone(entry?.path_confluence ?? 0.5)
        }
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
    relation_averages: continuityDashboard?.summary?.relation_averages || {},
    relation_traffic_lights: {
      node_confluence: relationTone(continuityDashboard?.summary?.relation_averages?.node_confluence),
      vertical_confluence: relationTone(continuityDashboard?.summary?.relation_averages?.vertical_confluence),
      sibling_confluence: relationTone(continuityDashboard?.summary?.relation_averages?.sibling_confluence),
      path_confluence: relationTone(continuityDashboard?.summary?.relation_averages?.path_confluence)
    },
    sovereign_coherence: round3(average(rows.map((row) => row.confluence.nested_confluence_score), 0.5)),
    commons_coherence: round3(average(rows.map((row) => row.confluence.system_convergence_score), 0.5)),
    attention: focusTriplet(continuityDashboard?.summary?.primary_focus || "stable_presence")
  };

  const payload = {
    version: "1.2.0",
    published_at: timestamp,
    cycle_id: cycleId,
    summary,
    emergence: emergenceSummary({ summary, rows }),
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
