/** Hex fog state, stored in scene flags as { enabled, hexes: { "i.j": "seen"|"explored" } }. */
export const MODULE_ID = "hexploration";
export const STATES = Object.freeze({ UNKNOWN: "unknown", SEEN: "seen", EXPLORED: "explored" });

export const key = ({ i, j }) => `${i}.${j}`;

export function getFog(scene) {
  return scene?.getFlag(MODULE_ID, "fog") ?? { enabled: false, hexes: {} };
}

export const isHexScene = (scene) => scene?.grid?.isHexagonal ?? false;

export function hexAt(point) {
  return canvas.grid.getOffset(point);
}

export function stateOf(scene, coords) {
  return getFog(scene).hexes[key(coords)] ?? STATES.UNKNOWN;
}

/** GM only. Sets (or with UNKNOWN clears) the state of a list of hexes in one update. */
export async function setHexes(scene, coordsList, state) {
  if (!game.user.isGM) return;
  const fog = foundry.utils.deepClone(getFog(scene));
  for (const c of coordsList) {
    if (state === STATES.UNKNOWN) delete fog.hexes[key(c)];
    else fog.hexes[key(c)] = state;
  }
  await scene.setFlag(MODULE_ID, "fog", fog);
}

export async function setEnabled(scene, enabled) {
  if (!game.user.isGM) return;
  const fog = foundry.utils.deepClone(getFog(scene));
  fog.enabled = enabled;
  await scene.setFlag(MODULE_ID, "fog", fog);
}
