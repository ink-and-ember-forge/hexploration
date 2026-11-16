import { getFog, stateOf } from "./fog.js";
import { STATES, STATE_STYLE } from "./states.js";
import { TERRAIN_STYLE, getTerrainMap } from "./terrain.js";

const loadTex = (src) => (foundry.canvas?.loadTexture ?? loadTexture)(src);

/** Draws a closed polygon as dashes (PIXI 7 has no native dashed lines). */
function dashedPolygon(g, pts, [dash, gap]) {
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k];
    const b = pts[(k + 1) % pts.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = (b.x - a.x) / len;
    const dy = (b.y - a.y) / len;
    for (let pos = 0; pos < len; pos += dash + gap) {
      const end = Math.min(pos + dash, len);
      g.moveTo(a.x + dx * pos, a.y + dy * pos);
      g.lineTo(a.x + dx * end, a.y + dy * end);
    }
  }
}

/**
 * Draws the fog and status outlines as a PIXI container above tokens. Redrawn whenever scene flags
 * change. Fogged hexes show the scene's custom fog image (stretched over the scene) when one is set,
 * otherwise plain black.
 */
export class FogOverlay {
  container = null; // root: holds the clip mask and the content
  content = null; // everything drawn lives here, clipped to the scene rectangle
  #generation = 0;
  #editingTerrain = false;

  /** While the GM has the Terrain tool selected, labels also show on fogged hexes. */
  setEditingTerrain(editing) {
    if (editing === this.#editingTerrain) return;
    this.#editingTerrain = editing;
    this.redraw();
  }

  attach() {
    this.detach();
    const rect = canvas.dimensions.sceneRect;
    this.container = new PIXI.Container();
    this.container.eventMode = "none";
    const mask = new PIXI.Graphics().beginFill(0xffffff).drawRect(rect.x, rect.y, rect.width, rect.height).endFill();
    this.content = new PIXI.Container();
    this.content.mask = mask; // the mask must be in the display list too
    this.container.addChild(mask, this.content);
    canvas.interface.addChild(this.container);
    this.redraw();
  }

  detach() {
    this.#generation++;
    this.container?.destroy({ children: true });
    this.container = null;
    this.content = null;
  }

  async redraw() {
    if (!this.container) return;
    const generation = ++this.#generation;
    const scene = canvas.scene;
    const fog = getFog(scene);
    const clear = () => this.content.removeChildren().forEach((c) => c.destroy());
    if (!fog.enabled || !canvas.grid.isHexagonal) {
      clear();
      // Without fog there is nothing hiding hexes, so labels are for the GM's editing only.
      if (canvas.grid.isHexagonal) this.#drawTerrainLabels(scene, canvas.dimensions.sceneRect, false);
      return;
    }

    let texture = null;
    if (fog.image) {
      try {
        texture = await loadTex(fog.image);
      } catch (err) {
        console.warn(`hexploration | could not load fog image "${fog.image}"`, err);
      }
      if (generation !== this.#generation || !this.container) return; // superseded while loading
    }

    // The GM sees the same fog as players unless they switch on the dimmed preview.
    const dim = game.user.isGM && game.settings.get("hexploration", "dimFog");
    const groups = {
      [STATES.UNKNOWN]: { polys: [], alpha: dim ? 0.4 : 1 },
      [STATES.SEEN]: { polys: [], alpha: dim ? 0.15 : 0.55 },
    };
    const outlines = [];
    const rect = canvas.dimensions.sceneRect;
    // Cover every hex that could touch the scene: bound the offset range by the four corners, padded by 1.
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.right, y: rect.y },
      { x: rect.x, y: rect.bottom },
      { x: rect.right, y: rect.bottom },
    ].map((p) => canvas.grid.getOffset(p));
    const [iMin, iMax] = [Math.min(...corners.map((c) => c.i)) - 1, Math.max(...corners.map((c) => c.i)) + 1];
    const [jMin, jMax] = [Math.min(...corners.map((c) => c.j)) - 1, Math.max(...corners.map((c) => c.j)) + 1];
    for (let i = iMin; i <= iMax; i++) {
      for (let j = jMin; j <= jMax; j++) {
        const coords = { i, j };
        const state = stateOf(scene, coords);
        const style = STATE_STYLE[state] ?? STATE_STYLE[STATES.UNKNOWN];
        if (!style.fogged && !style.outline) continue; // visited: just the map
        const verts = canvas.grid.getVertices(coords);
        if (!verts.length) continue;
        // Keep any hex that overlaps the scene, even partly: edge hexes must be fogged too.
        const xs = verts.map((p) => p.x);
        const ys = verts.map((p) => p.y);
        if (Math.max(...xs) < rect.x || Math.min(...xs) > rect.right || Math.max(...ys) < rect.y || Math.min(...ys) > rect.bottom) continue;
        const center = canvas.grid.getCenterPoint(coords);
        if (style.fogged) groups[state].polys.push(verts.flatMap((p) => [p.x, p.y]));
        else {
          // Inset the outline so neighbouring hexes' outlines stay distinct.
          const pts = verts.map((p) => ({ x: center.x + (p.x - center.x) * 0.94, y: center.y + (p.y - center.y) * 0.94 }));
          outlines.push({ pts, outline: style.outline });
        }
      }
    }

    clear();
    for (const { polys, alpha } of Object.values(groups)) {
      if (!polys.length) continue;
      const shape = new PIXI.Graphics();
      shape.beginFill(0xffffff, 1);
      for (const poly of polys) shape.drawPolygon(poly);
      shape.endFill();
      if (texture) {
        const sprite = new PIXI.Sprite(texture);
        sprite.position.set(rect.x, rect.y);
        sprite.width = rect.width;
        sprite.height = rect.height;
        sprite.alpha = alpha;
        sprite.mask = shape; // mask must be in the display list too
        this.content.addChild(shape, sprite);
      } else {
        shape.tint = 0x000000;
        shape.alpha = alpha;
        this.content.addChild(shape);
      }
    }

    // The core grid can end up hidden under the fog, which makes picking a hex hard. Redraw the cell
    // edges of fogged hexes: a dark halo plus a light line, so they read on dark and light fog alike.
    const fogged = Object.values(groups).flatMap((g) => g.polys);
    if (fogged.length) {
      const t = Math.max(1, scene.grid.thickness ?? 1);
      const grid = new PIXI.Graphics();
      grid.lineStyle(t + 2, 0x000000, 0.35);
      for (const poly of fogged) grid.drawPolygon(poly);
      grid.lineStyle(t, 0xffffff, 0.4);
      for (const poly of fogged) grid.drawPolygon(poly);
      this.content.addChild(grid);
    }

    // Outlines on top: a dark halo first so the coloured line reads on any terrain.
    if (outlines.length) {
      const g = new PIXI.Graphics();
      for (const { pts, outline } of outlines) {
        g.lineStyle(outline.width + 4, 0x000000, 0.55);
        g.drawPolygon(pts.flatMap((p) => [p.x, p.y]));
        g.lineStyle(outline.width, outline.color, 1);
        if (outline.dash) dashedPolygon(g, pts, outline.dash);
        else g.drawPolygon(pts.flatMap((p) => [p.x, p.y]));
      }
      this.content.addChild(g);
    }

    this.#drawTerrainLabels(scene, rect, true);
  }

  /** Terrain/road badges. Players only see them on hexes that aren't fogged; the GM sees all while editing. */
  #drawTerrainLabels(scene, rect, fogEnabled) {
    const showFogged = game.user.isGM && this.#editingTerrain;
    if (!fogEnabled && !showFogged) return;
    if (!game.settings.get("hexploration", "showTerrain") && !showFogged) return;
    const fontSize = Math.max(10, canvas.grid.sizeY * 0.13);
    const style = CONFIG.canvasTextStyle.clone();
    Object.assign(style, { fontSize, fill: 0xffffff, stroke: 0x000000, strokeThickness: Math.max(2, fontSize / 5) });
    for (const [k, record] of Object.entries(getTerrainMap(scene))) {
      const [i, j] = k.split("_").map(Number);
      const coords = { i, j };
      const status = stateOf(scene, coords);
      if (STATE_STYLE[status]?.fogged && !showFogged) continue;
      const center = canvas.grid.getCenterPoint(coords);
      if (!rect.contains(center.x, center.y)) continue;
      const parts = [];
      if (record.terrain) {
        const step = Number(record.adjust ?? 0);
        const suffix = step ? ` (${step > 0 ? "+" : "\u2212"}${Math.abs(step)})` : ""; // difficulty override
        parts.push(game.i18n.localize(`HEXPLORATION.Terrain.${record.terrain}`) + suffix);
      }
      if (record.road) parts.push(game.i18n.localize("HEXPLORATION.Terrain.road"));
      if (!parts.length) continue;
      const text = new PIXI.Text(parts.join(" + "), style);
      text.anchor.set(0.5);
      const padX = fontSize * 0.5;
      const padY = fontSize * 0.25;
      const chip = new PIXI.Graphics();
      chip.beginFill(TERRAIN_STYLE[record.terrain]?.color ?? 0x8a7a55, 0.85);
      chip.drawRoundedRect(-text.width / 2 - padX, -text.height / 2 - padY, text.width + padX * 2, text.height + padY * 2, fontSize * 0.4);
      chip.endFill();
      const badge = new PIXI.Container();
      badge.addChild(chip, text);
      // Lower part of the hex, so it stays clear of a token sitting in the middle.
      badge.position.set(center.x, center.y + canvas.grid.sizeY * 0.3);
      this.content.addChild(badge);
    }
  }
}
