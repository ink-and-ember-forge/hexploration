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
  console.log(`${MODULE_ID} | setHexes`, state, update);
  await scene.update(update);
}

/**
 * GM only. Enabling hex fog also switches off Foundry's own token vision, fog exploration and
 * darkness for the scene (remembering the previous values); disabling restores them.
 */
export async function setEnabled(scene, enabled) {
  if (!game.user.isGM) return;
  const flag = `flags.${MODULE_ID}.fog`;
  const fog = getFog(scene);
  if (enabled) {
    const update = {
      [`${flag}.enabled`]: true,
      tokenVision: false,
      "fog.exploration": false,
      "environment.globalLight.enabled": true,
    };
    // Only remember the originals the first time, so re-enabling can't overwrite them with our own values.
    if (!fog.restore) {
      update[`${flag}.restore`] = {
        tokenVision: scene.tokenVision,
        exploration: scene.fog.exploration,
        globalLight: scene.environment.globalLight.enabled,
      };
    }
    await scene.update(update);
  } else {
    const update = { [`${flag}.enabled`]: false };
    if (fog.restore) {
      update.tokenVision = fog.restore.tokenVision;
      update["fog.exploration"] = fog.restore.exploration;
      update["environment.globalLight.enabled"] = fog.restore.globalLight;
      update[`${flag}.-=restore`] = null;
    }
    await scene.update(update);
  }
}

/** GM only. Sets the scene's custom fog image path; an empty path removes it (falls back to black). */
export async function setImage(scene, path) {
  if (!game.user.isGM) return;
  if (path) await scene.setFlag(MODULE_ID, "fog.image", path);
  else await scene.update({ [`flags.${MODULE_ID}.fog.-=image`]: null });
}
