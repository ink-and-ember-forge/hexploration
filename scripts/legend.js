import { TERRAIN_ORDER, TERRAIN_STYLE } from "./terrain.js";

let el = null;
const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;

export function hideTerrainLegend() {
  el?.remove();
  el = null;
}

/** Small key shown while the GM is editing terrain: colour per terrain, how many hexes have it, and how many are unset. */
export function showTerrainLegend(counts) {
  if (!el) {
    el = document.createElement("div");
    el.className = "hexploration-legend";
    document.body.append(el);
  }
  const row = (chip, label, n) =>
    `<div class="row"><span class="chip" style="${chip}"></span><span class="name">${label}</span><span class="n">${n}</span></div>`;
  el.innerHTML =
    `<div class="title">${game.i18n.localize("HEXPLORATION.Terrain.legendTitle")}</div>` +
    TERRAIN_ORDER.map((id) =>
      row(`background:${hex(TERRAIN_STYLE[id].color)}`, game.i18n.localize(`HEXPLORATION.Terrain.${id}`), counts[id] ?? 0),
    ).join("") +
    row("border:2px dashed #ddd", game.i18n.localize("HEXPLORATION.Terrain.unset"), counts.unset ?? 0);
}
