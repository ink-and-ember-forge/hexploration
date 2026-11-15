import { getFog, stateOf } from "./fog.js";
import { STATES, STATE_STYLE } from "./states.js";

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
  container = null;
  #generation = 0;

  attach() {
    this.detach();
    this.container = new PIXI.Container();
    this.container.eventMode = "none";
    canvas.interface.addChild(this.container);
    this.redraw();
  }

  detach() {
    this.#generation++;
    this.container?.destroy({ children: true });
    this.container = null;
  }

  async redraw() {
    if (!this.container) return;
    const generation = ++this.#generation;
    const scene = canvas.scene;
    const fog = getFog(scene);
    const clear = () => this.container.removeChildren().forEach((c) => c.destroy());
    if (!fog.enabled || !canvas.grid.isHexagonal) return clear();

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
    const rows = Math.ceil(canvas.dimensions.sceneHeight / canvas.grid.sizeY) + 2;
    const cols = Math.ceil(canvas.dimensions.sceneWidth / canvas.grid.sizeX) + 2;
    const first = canvas.grid.getOffset({ x: rect.x, y: rect.y });
    for (let di = -1; di <= rows; di++) {
      for (let dj = -1; dj <= cols; dj++) {
        const coords = { i: first.i + di, j: first.j + dj };
        const state = stateOf(scene, coords);
        const style = STATE_STYLE[state] ?? STATE_STYLE[STATES.UNKNOWN];
        if (!style.fogged && !style.outline) continue; // visited: just the map
        const center = canvas.grid.getCenterPoint(coords);
        if (!rect.contains(center.x, center.y)) continue; // don't draw into the padding around the map
        const verts = canvas.grid.getVertices(coords);
        if (!verts.length) continue;
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
        this.container.addChild(shape, sprite);
      } else {
        shape.tint = 0x000000;
        shape.alpha = alpha;
        this.container.addChild(shape);
      }
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
      this.container.addChild(g);
    }
  }
}
