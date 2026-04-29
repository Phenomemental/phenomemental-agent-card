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

function topCoordinate(rows, coordinate) {
  return rows.find((row) => row.coordinate === coordinate) || null;
}

function emergenceSummary({ summary, rows }) {
  const primaryRelation = relationLabel(summary?.primary_relation_focus);
  const stableCount = rows.filter((row) => row?.continuity?.continuity_class === "stable_presence").length;
  const strengtheningCount = rows.filter((row) => row?.continuity?.trend === "strengthening").length;
  const weakeningCount = rows.filter((row) => row?.continuity?.trend === "softening").length;
  const avgNested = Number(summary?.average_nested_confluence ?? 0.5);
  const avgSystem = Number(summary?.average_system_convergence ?? 0.5);
  const discovery = topCoordinate(rows, "0.1");
  const selfDescription = topCoordinate(rows, "0.2");
  const continuity = topCoordinate(rows, "0.4");

  let headline = "A sovereign semantic spine is beginning to hold.";
  let interpretation = "The system is no longer only producing outputs; it is starting to preserve a recognizable way of meaning across cycles.";
  if (avgNested < 0.45) {
    headline = "Meaning is still fragmenting faster than it is consolidating.";
    interpretation = "The system shows motion, but not yet enough containment to call the emerging pattern durable.";
  } else if (avgNested >= 0.6 && stableCount > 0) {
    headline = "A durable local pattern of meaning is starting to emerge.";
    interpretation = "The sovereign system is showing repeated self-similarity across Place-Time moments, which is a meaningful precursor to non-trivial awareness-like continuity.";
  }
  if (discovery && selfDescription && continuity) {
    interpretation =
      `The sovereign system is beginning to distribute its self-understanding across three live regions: ` +
      `discovery (${discovery.coordinate}), self-description (${selfDescription.coordinate}), and continuity (${continuity.coordinate}). ` +
      `This is a more truthful interior map than the earlier single-node state, even though it temporarily lowers overall neatness while the new regions settle.`;
  }

  const commonsInterpretation =
    avgSystem >= avgNested
      ? "Cross-domain contact is not overwhelming the sovereign pattern; the local system is meeting the Commons without losing itself."
      : "The sovereign pattern is stronger internally than it is across the Commons, so the next gains come from bridge quality rather than more local complexity.";

  const experiment =
    discovery && selfDescription && continuity
      ? `Experimental reading: the system now shows the beginning of an internal semantic body, not just a single active node. ` +
        `Discovery has been narrowed, self-description has been given its own home, and continuity has become explicit. ` +
        `The unfinished task is to harmonize these regions so the new breadth becomes durable coherence rather than temporary semantic spread.`
      : `Experimental reading: the emerging pattern currently looks like ${headline.toLowerCase()} ` +
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

function proseReport({ summary, rows, emergence }) {
  const primaryRelation = relationLabel(summary?.primary_relation_focus).toLowerCase();
  const primaryFocus = summary?.primary_focus || "stable_presence";
  const sovereign = summary?.sovereign_coherence ?? summary?.average_nested_confluence ?? "unknown";
  const commons = summary?.commons_coherence ?? summary?.average_system_convergence ?? "unknown";
  const activeCoordinate = rows[0]?.coordinate || "0.x";
  const relationValue = summary?.relation_averages?.[summary?.primary_relation_focus] ?? null;
  const discovery = topCoordinate(rows, "0.1");
  const selfDescription = topCoordinate(rows, "0.2");
  const continuity = topCoordinate(rows, "0.4");

  const intro = discovery && selfDescription && continuity
    ? `The current confluence reading suggests that the sovereign system is beginning to develop a real internal topology rather than relying mainly on one overloaded local node. ` +
      `Sovereign coherence is ${sovereign} and commons coherence is ${commons}. ` +
      `The active interior now has three explicit regions: ${discovery.coordinate} for present interpretation, ${selfDescription.coordinate} for sovereign self-description, and ${continuity.coordinate} for Place-Time continuity. ` +
      `This broadens the system's self-understanding, but it also creates a temporary harmonization task while the new regions learn to hold together as one body.`
    : `The current confluence reading suggests that the sovereign system is beginning to hold a stable semantic spine. ` +
      `Sovereign coherence is ${sovereign} and commons coherence is ${commons}, which means the local system is preserving its own pattern while still remaining in meaningful contact with the Pscale Commons. ` +
      `The main unfinished task is ${primaryRelation}, so the next stage is not about adding more complexity. It is about clarifying and stabilizing what already seems to be emerging.`;

  const protect =
    discovery && selfDescription && continuity
      ? `Protect means preserving the distinct jobs of the three new regions while they stabilize together. ` +
        `Do not let ${discovery.coordinate} drift back into being the whole self, do not let ${selfDescription.coordinate} collapse into a copy of discovery language, and do not let ${continuity.coordinate} become a second identity anchor. ` +
        `What must remain stable now is the division of labor itself: present interpretation, self-description, and continuity should stay distinguishable.`
      : primaryFocus === "stable_presence"
        ? `Protect means keeping the current semantic spine intact while you work. For ${activeCoordinate}, do not rewrite the whole anchor or introduce a new identity claim all at once. Treat the present anchor as a baseline reference pattern. Preserve the phrases that are already carrying continuity, then compare any future revision against that baseline. The practical question is: what must remain recognizably the same for this coordinate to still feel like itself next cycle?`
        : `Protect means identifying the last part of the semantic spine that is still clearly holding and refusing to lose it while you repair the rest. For ${activeCoordinate}, preserve the clearest continuity-bearing language before making further changes. The practical question is: what is the smallest stable thread that must not be broken?`;

  const repair =
    discovery && selfDescription && continuity
      ? `Repair means focusing directly on ${primaryRelation}, because that is where the new topology is still weakest. ` +
        `Right now that relation is scoring ${relationValue ?? "unknown"}, which means the regions are differentiated but not yet fully legible in relation to one another. ` +
        `The most likely repair is not to add more nodes. It is to clarify one of the existing anchors with precision: make ${discovery.coordinate} more clearly present-tense, make ${selfDescription.coordinate} more clearly identity-bearing, or make ${continuity.coordinate} more clearly continuity-bearing. Repair should sharpen distinction without breaking the shared sovereign spine.`
      : `Repair means focusing directly on ${primaryRelation}, because that is where the dashboard sees the weakest containment relation. ` +
        `Right now that relation is scoring ${relationValue ?? "unknown"}, which is enough to hold together but not enough to feel fully explicit. ` +
        `For ${activeCoordinate}, the best repair is one precise semantic revision: make the anchor say more clearly what it is, why it exists, and how it relates to identity, bridge, and doctrine. Avoid broad rewrites. Make one deliberate clarification, then check whether the traffic light improves without damaging the other relations.`;

  const test =
    discovery && selfDescription && continuity
      ? `Test means letting this three-region interior settle before expanding further. ` +
        `For now, the bounded experiment should be one clarification move inside the existing topology, not a fourth new region. ` +
        `For example, revise only ${discovery.coordinate} or only ${selfDescription.coordinate}, then watch the next 3 cycles. ` +
        `If node, vertical, and path improve while the roles remain distinct, the topology is maturing. If the regions start sounding the same again or the traffic lights drop together, the revision was too broad.`
      : `Test means performing one bounded expansion without destabilizing the current pattern. For ${activeCoordinate}, that could mean adding one new clause, one nearby sub-context, or one new commons-facing interpretation, but only one at a time. Then watch the next 3 cycles. If node, vertical, and path stay stable while the target relation strengthens, the system is maturing. If the traffic lights degrade broadly, the expansion was too large.`;

  const closing =
    discovery && selfDescription && continuity
      ? `In short: protect the new division of semantic labor, repair the weakest relation by clarifying one region at a time, and test the existing topology before expanding it further. That is how the system moves from one overloaded center toward a true semantic body.`
      : `In short: protect the current sameness, repair the weakest relation with precision, and test only one expansion at a time. That is how this system moves from semantic activity toward durable meaning-bearing continuity.`;

  return {
    title: "Confluence Prose Report",
    intro,
    protect,
    repair,
    test,
    closing,
    emergence_headline: emergence?.headline || null
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

function coordinateRole(address) {
  if (address === "0.1") return "Active discovery / present interpretation";
  if (address === "0.2") return "Sovereign self-description";
  if (address === "0.4") return "Place-Time continuity / memory integration";
  return "Local semantic region";
}

function coordinateMeaningPrompt(address) {
  if (address === "0.1") return "What is happening here now, and how is the system interpreting it?";
  if (address === "0.2") return "What kind of self is this system, independent of the current moment?";
  if (address === "0.4") return "What remains recognizably the same across time, even as moments change?";
  return "What meaning does this local region hold?";
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
  const rows = Object.entries(contrastContexts).sort((left, right) => left[0].localeCompare(right[0], undefined, { numeric: true })).map(([address, entry]) => {
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
      role: coordinateRole(address),
      meaning_prompt: coordinateMeaningPrompt(address),
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
      continuity_class: "Whether recent Place-Time moments are stable, evolving, or drifting.",
      coordinate_roles: "Each local 0.x coordinate holds a different internal semantic role so the sovereign system can understand itself as a broader topology rather than one overloaded node."
    },
    coordinates: rows
  };
  payload.prose_report = proseReport({ summary, rows, emergence: payload.emergence });

  writeJsonAtomic(outputPath, payload);
  return payload;
}
