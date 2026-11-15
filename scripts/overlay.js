import { getFog, stateOf, STATES } from "./fog.js";

/** Draws the fog as a PIXI container above tokens. Redrawn whenever scene flags change. */
export class FogOverlay {
  container = null;

  attach() {
    this.detach();
    this.container = new PIXI.Container();
    this.container.eventMode = "none";
    canvas.interface.addChild(this.container);
    this.redraw();
  }

  detach() {
    this.container?.destroy({ children: true });
    this.container = null;
  }

  redraw() {
    if (!this.container) return;
    this.container.removeChildren().forEach((c) => c.destroy());
    const scene = canvas.scene;
    const fog = getFog(scene);
    if (!fog.enabled || !canvas.grid.isHexagonal) return;

    const gm = game.user.isGM;
    const g = new PIXI.Graphics();
    const { width, height } = canvas.dimensions.sceneRect;
    const { x: sx, y: sy } = canvas.dimensions.sceneRect;
    const rows = Math.ceil(canvas.dimensions.sceneHeight / canvas.grid.sizeY) + 2;
    const cols = Math.ceil(canvas.dimensions.sceneWidth / canvas.grid.sizeX) + 2;

    // Iterate the full offset range; GMs see unknown hexes dimmed, players see them opaque.
    const first = canvas.grid.getOffset({ x: sx, y: sy });
    for (let di = -1; di <= rows; di++) {
      for (let dj = -1; dj <= cols; dj++) {
        const coords = { i: first.i + di, j: first.j + dj };
        const state = stateOf(scene, coords);
        if (state === STATES.EXPLORED) continue;
        const alpha = state === STATES.SEEN ? (gm ? 0.15 : 0.55) : gm ? 0.4 : 1;
        const verts = canvas.grid.getVertices(coords);
        if (!verts.length) continue;
        g.beginFill(0x000000, alpha).drawPolygon(verts.flatMap((p) => [p.x, p.y])).endFill();
      }
    }
    this.container.addChild(g);
  }
}
