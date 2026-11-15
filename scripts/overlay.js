import { getFog, stateOf, STATES } from "./fog.js";

const loadTex = (src) => (foundry.canvas?.loadTexture ?? loadTexture)(src);

/**
 * Draws the fog as a PIXI container above tokens. Redrawn whenever scene flags change.
 * Fogged hexes show the scene's custom fog image (stretched over the scene) when one is set,
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
    const rect = canvas.dimensions.sceneRect;
    const rows = Math.ceil(canvas.dimensions.sceneHeight / canvas.grid.sizeY) + 2;
    const cols = Math.ceil(canvas.dimensions.sceneWidth / canvas.grid.sizeX) + 2;
    const first = canvas.grid.getOffset({ x: rect.x, y: rect.y });
    for (let di = -1; di <= rows; di++) {
      for (let dj = -1; dj <= cols; dj++) {
        const coords = { i: first.i + di, j: first.j + dj };
        const state = stateOf(scene, coords);
        if (state === STATES.EXPLORED) continue;
        const center = canvas.grid.getCenterPoint(coords);
        if (!rect.contains(center.x, center.y)) continue; // don't draw into the padding around the map
        const verts = canvas.grid.getVertices(coords);
        if (verts.length) groups[state].polys.push(verts.flatMap((p) => [p.x, p.y]));
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
  }
}
