import { MODULE_ID, STATES, getFog, hexAt, isHexScene, setEnabled, setHexes, stateOf } from "./fog.js";
import { FogOverlay } from "./overlay.js";

const overlay = new FogOverlay();
let activeTool = null; // "reveal" | "hide" | null

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "autoReveal", {
    name: "HEXPLORATION.Settings.AutoReveal.Name",
    hint: "HEXPLORATION.Settings.AutoReveal.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
});

Hooks.on("canvasReady", () => {
  console.log(`${MODULE_ID} | canvasReady, hex grid:`, canvas.grid.isHexagonal);
  activeTool = null; // tools don't carry across scenes
  overlay.attach();
  ui.controls?.render();
});
Hooks.on("canvasTearDown", () => overlay.detach());
Hooks.on("updateScene", (scene, changes) => {
  if (scene.id === canvas.scene?.id && foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) overlay.redraw();
});

// v13 scene controls: tools is an object keyed by tool name.
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;
  const tools = controls.tokens?.tools;
  if (!tools) return;
  // "active" is derived from activeTool on every build, so the two tools behave like radio buttons.
  const mk = (name, tool, icon, order) => ({
    name,
    title: `HEXPLORATION.Tools.${tool === "reveal" ? "Reveal" : "Hide"}`,
    icon,
    order,
    toggle: true,
    active: activeTool === tool,
    onChange: (_event, active) => setTool(active ? tool : activeTool === tool ? null : activeTool),
  });
  tools.hexReveal = mk("hexReveal", "reveal", "fa-solid fa-eye", 100);
  tools.hexHide = mk("hexHide", "hide", "fa-solid fa-eye-slash", 101);
  tools.hexFogToggle = {
    name: "hexFogToggle",
    title: "HEXPLORATION.Fog.Enable",
    icon: "fa-solid fa-hexagon",
    order: 102,
    button: true,
    onChange: async () => {
      const scene = canvas.scene;
      if (!isHexScene(scene)) return ui.notifications.warn(game.i18n.localize("HEXPLORATION.Fog.NeedsHexGrid"));
      const enable = !getFog(scene).enabled;
      await setEnabled(scene, enable);
      ui.notifications.info(game.i18n.localize(enable ? "HEXPLORATION.Fog.Enabled" : "HEXPLORATION.Fog.Disabled"));
    },
  };
});

function setTool(tool) {
  console.log(`${MODULE_ID} | tool`, tool);
  activeTool = tool;
  overlay.setCapture(tool ? onPointerDown : null);
  ui.controls.render(); // rebuild controls so the other tool's toggle switches off
}

async function onPointerDown(event) {
  if (!activeTool || event.button !== 0 || !canvas.scene) return;
  const point = event.getLocalPosition(canvas.stage);
  const coords = hexAt(point);
  console.log(`${MODULE_ID} | click`, activeTool, point, coords);
  if (!getFog(canvas.scene).enabled) {
    return ui.notifications.warn(game.i18n.localize("HEXPLORATION.Fog.NotEnabled"));
  }
  if (activeTool === "reveal") {
    // Click cycles unknown -> seen -> explored; shift-click jumps straight to explored.
    const current = stateOf(canvas.scene, coords);
    const next = event.shiftKey || current === STATES.SEEN ? STATES.EXPLORED : STATES.SEEN;
    await setHexes(canvas.scene, [coords], next);
  } else {
    await setHexes(canvas.scene, [coords], STATES.UNKNOWN);
  }
}

// Auto-reveal the hex a party token moves into. Runs on the GM client only.
Hooks.on("updateToken", (token, changes) => {
  if (!game.user.isGM || !game.settings.get(MODULE_ID, "autoReveal")) return;
  if (!("x" in changes || "y" in changes)) return;
  const scene = token.parent;
  if (scene.id !== canvas.scene?.id || !getFog(scene).enabled) return;
  if (token.actor?.type !== "party" && !token.actor?.getFlag(MODULE_ID, "isParty")) return;
  const center = token.object?.center;
  if (!center) return;
  setHexes(scene, [hexAt(center)], STATES.EXPLORED);
});
