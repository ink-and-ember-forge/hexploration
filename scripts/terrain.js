import { MODULE_ID, key } from "./fog.js";

/**
 * Per-hex terrain, stored separately from fog status in `flags.hexploration.terrain` as
 * { "i_j": { terrain?: id, road?: boolean } }. A road is a feature that crosses any terrain, so it
 * is a flag next to the terrain type, not another terrain choice.
 */
export const TERRAIN_ORDER = ["open", "forest", "hills", "mountains", "swamp", "water"];

export const TERRAIN_STYLE = Object.freeze({
  open: { color: 0x7fa83a },
  forest: { color: 0x2e7d32 },
  hills: { color: 0xb8872b },
  mountains: { color: 0x7a7a86 },
  swamp: { color: 0x5b6e2f },
  water: { color: 0x2f74c0 },
});

export const getTerrainMap = (scene) => scene?.getFlag(MODULE_ID, "terrain") ?? {};

export function terrainOf(scene, coords) {
  const record = getTerrainMap(scene)[key(coords)];
  return { terrain: record?.terrain ?? null, road: !!record?.road };
}

/** GM only. Merges `patch` ({ terrain?, road? }) into the hex's record, e.g. { terrain: "forest" }. */
export async function setTerrain(scene, coords, patch) {
  if (!game.user.isGM) return;
  const path = `flags.${MODULE_ID}.terrain.${key(coords)}`;
  const update = {};
  for (const [field, value] of Object.entries(patch)) update[`${path}.${field}`] = value;
  await scene.update(update);
}

/** GM only. Removes both terrain and road from a hex. */
export async function clearTerrain(scene, coords) {
  if (!game.user.isGM) return;
  await scene.update({ [`flags.${MODULE_ID}.terrain.-=${key(coords)}`]: null });
}
