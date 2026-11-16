import { MODULE_ID, key } from "./fog.js";

/**
 * The day's travel budget, stored on the scene in `flags.hexploration.travel`:
 * { spent, forcedMarch, lastHex, log: [{ hex, text, cost }] }. This module only tracks it; it never
 * advances the game clock.
 */
const MAX_LOG = 12;
const path = `flags.${MODULE_ID}.travel`;

export function getTravel(scene) {
  const t = scene?.getFlag(MODULE_ID, "travel") ?? {};
  return { spent: 0, forcedMarch: false, lastHex: null, log: [], ...t };
}

/** GM only. Adds `cost` activities to the day's spent total (negative to refund) and records a log line. */
export async function addSpent(scene, cost, text, coords, { lastHex } = {}) {
  if (!game.user.isGM) return;
  const t = getTravel(scene);
  const log = [{ hex: coords ? key(coords) : null, text, cost }, ...t.log].slice(0, MAX_LOG);
  const update = {
    [`${path}.spent`]: Math.max(0, t.spent + cost),
    [`${path}.==log`]: log,
  };
  if (lastHex !== undefined) update[`${path}.lastHex`] = lastHex;
  await scene.update(update);
}

/** GM only. Remembers where the party is without charging anything (e.g. the first move after a reset). */
export async function setLastHex(scene, coords) {
  if (!game.user.isGM) return;
  await scene.update({ [`${path}.lastHex`]: coords ? key(coords) : null });
}

/** GM only. Starts a new day: spent goes back to 0 and the log is cleared; the party's position is kept. */
export async function newDay(scene) {
  if (!game.user.isGM) return;
  await scene.update({ [`${path}.spent`]: 0, [`${path}.==log`]: [] });
}

export async function setForcedMarch(scene, on) {
  if (!game.user.isGM) return;
  await scene.update({ [`${path}.forcedMarch`]: !!on });
}
