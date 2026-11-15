/** Hex fog state, stored in scene flags as { enabled, hexes: { "i.j": "seen"|"explored" } }. */
export const MODULE_ID = "hexploration";
export const STATES = Object.freeze({ UNKNOWN: "unknown", SEEN: "seen", EXPLORED: "explored" });

// "_" not "." so keys are safe inside Foundry dot-paths.
export const key = ({ i, j }) => `${i}_${j}`;

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
  const update = {};
  for (const c of coordsList) {
    const path = `flags.${MODULE_ID}.fog.hexes`;
    // setFlag/update merges objects, so removal needs Foundry's "-=" delete syntax.
    if (state === STATES.UNKNOWN) update[`${path}.-=${key(c)}`] = null;
    else update[`${path}.${key(c)}`] = state;
  }
  console.debug(`${MODULE_ID} | setHexes`, state, update);
  await scene.update(update);
}

export async function setEnabled(scene, enabled) {
  if (!game.user.isGM) return;
  await scene.setFlag(MODULE_ID, "fog.enabled", enabled);
}
