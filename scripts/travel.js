/**
 * Hexploration travel rules (Pathfinder 2e Gamemastery Guide, "Hexploration"). Pure functions, no Foundry
 * globals, so they can be tested on their own.
 *
 * - The party's Speed (slowest member) sets how many hexploration activities it gets per day.
 * - Travelling into a hex costs 1 / 2 / 3 Travel activities for open / difficult / greater difficult terrain.
 * - A road makes the terrain one step better for Travel only; Reconnoitering is not sped up by roads.
 * - A hex is 12 miles across; smaller hexes mean proportionally more activities per hex.
 */
const clamp = (n) => Math.min(3, Math.max(1, n));

/** Travel activities to cross a hex of each terrain type (open 1, difficult 2, greater difficult 3). */
export const BASE_COST = Object.freeze({ open: 1, forest: 2, hills: 2, mountains: 3, swamp: 3, water: 1 });

/**
 * Cost of a hex. `adjust` is the GM's per-hex override in steps (-1 easier, +1 harder, e.g. dense jungle).
 * A hex with no terrain set is assumed open.
 */
export function terrainCost({ terrain = null, road = false, adjust = 0 } = {}, { reconnoiter = false } = {}) {
  const cost = clamp((BASE_COST[terrain] ?? 1) + adjust);
  return road && !reconnoiter ? Math.max(1, cost - 1) : cost;
}

/** Hexploration activities per day from Speed in feet (Table 3-6), with forced march and hex size applied. */
export function activitiesPerDay(speed, { forcedMarch = false, hexSizeMiles = 12 } = {}) {
  let activities = speed <= 10 ? 0.5 : speed < 30 ? 1 : speed < 45 ? 2 : speed < 60 ? 3 : 4;
  // Forced march: one extra Travel activity, or a full one each day for a party at Speed 10 or less.
  if (forcedMarch) activities = speed <= 10 ? 1 : activities + 1;
  return activities * (12 / hexSizeMiles);
}

const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
export { fmt as formatActivities };
