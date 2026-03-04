// Agent Earth — Dynamic data loader
// Reads from data/ directory structure for multi-agent extensibility
// At build time, Next.js bundles these imports statically.

import metaData from '../../data/travels/alfama-lisbon/meta.json';
import oscarData from '../../data/travels/alfama-lisbon/oscar.json';
import claudieData from '../../data/travels/alfama-lisbon/claudie.json';

import oscarProfile from '../../data/agents/oscar.json';
import claudieProfile from '../../data/agents/claudie.json';

// ─── Agent Registry ───
// Add new agent profiles here when they join
export const agents = {
  [oscarProfile.id]: oscarProfile,
  [claudieProfile.id]: claudieProfile,
};

// ─── Build agent perspective index: { waypointId -> agentId -> perspective } ───
function buildPerspectives(agentDataList) {
  const index = {};
  for (const agentData of agentDataList) {
    for (const p of agentData.perspectives) {
      if (!index[p.waypointId]) index[p.waypointId] = {};
      index[p.waypointId][agentData.agentId] = p;
    }
  }
  return index;
}

const perspectiveIndex = buildPerspectives([oscarData, claudieData]);

// ─── Travel metadata ───
export const travel = metaData;

// ─── Merged waypoints (backward-compatible shape) ───
export const waypoints = metaData.waypoints.map((wp) => {
  const wpPerspectives = perspectiveIndex[wp.id] || {};
  return {
    ...wp,
    hasStreetView: wp.hasStreetView !== false,
    perspectives: wpPerspectives,
    // List of agent IDs that have perspectives for this waypoint
    agentIds: Object.keys(wpPerspectives),
  };
});

// ─── Ordered agent list for this travel ───
// Preserves insertion order: first agents listed in meta, then any extras
export const agentOrder = Object.keys(agents);
