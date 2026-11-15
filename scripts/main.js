import { MODULE_ID, STATES, getFog, hexAt, isHexScene, setEnabled, setHexes, setImage, stateOf } from "./fog.js";
import { FogOverlay } from "./overlay.js";

const overlay = new FogOverlay();

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
  overlay.attach();
});
Hooks.on("canvasTearDown", () => overlay.detach());
Hooks.on("updateScene", (scene, changes) => {
  if (scene.id === canvas.scene?.id && foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) overlay.redraw();
});

// v13 scene controls: tools is an object keyed by tool name. Non-toggle tools behave like radio
// buttons (only one active at a time, including the core Select tool), so reveal/hide exclude each other.
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;
  const tools = controls.tokens?.tools;
  if (!tools) return;
  tools.hexReveal = { name: "hexReveal", title: "HEXPLORATION.Tools.Reveal", icon: "fa-solid fa-eye", order: 100 };
  tools.hexHide = { name: "hexHide", title: "HEXPLORATION.Tools.Hide", icon: "fa-solid fa-eye-slash", order: 101 };
  tools.hexFogImage = {
    name: "hexFogImage",
    title: "HEXPLORATION.Fog.ImageTitle",
    icon: "fa-solid fa-image",
    order: 103,
    button: true,
    onChange: () => openImageDialog(),
  };
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

async function openImageDialog() {
  const scene = canvas.scene;
  if (!scene) return;
  const current = getFog(scene).image ?? "";
  const hint = game.i18n.localize("HEXPLORATION.Fog.ImageHint");
  const image = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("HEXPLORATION.Fog.ImageTitle") },
    content: `<div class="form-group"><label>${game.i18n.localize("HEXPLORATION.Fog.ImageLabel")}</label>
      <div class="form-fields"><file-picker name="image" type="image" value="${foundry.utils.escapeHTML(current)}"></file-picker></div>
      <p class="hint">${hint}</p></div>`,
    ok: {
      label: game.i18n.localize("HEXPLORATION.Fog.ImageSave"),
      callback: (_event, button) => new foundry.applications.ux.FormDataExtended(button.form).object.image,
    },
    rejectClose: false,
  });
  if (image === undefined || image === null) return; // dialog dismissed
  await setImage(scene, image.trim());
}

const TOOL_ACTIONS = { hexReveal: "reveal", hexHide: "hide" };

/**
 * Listen to the raw browser event on the canvas element (capture phase, before PIXI sees it).
 * The active tool is read from Foundry's own state, so there is nothing for us to keep in sync.
 */
function onCanvasPointerDown(event) {
  if (!game.user.isGM || event.button !== 0 || event.target !== canvas.app?.view) return;
  const action = TOOL_ACTIONS[ui.controls?.tool?.name];
  if (!action || !canvas.scene) return;
  event.preventDefault();
  event.stopPropagation(); // keep the click from also starting a token marquee/deselect
  const point = canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY });
  const coords = hexAt(point);
  console.log(`${MODULE_ID} | click`, action, point, coords);
  if (!getFog(canvas.scene).enabled) {
    return ui.notifications.warn(game.i18n.localize("HEXPLORATION.Fog.NotEnabled"));
  }
  if (action === "hide") return setHexes(canvas.scene, [coords], STATES.UNKNOWN);
  // Click cycles unknown -> seen -> explored; shift-click jumps straight to explored.
  const next = event.shiftKey || stateOf(canvas.scene, coords) === STATES.SEEN ? STATES.EXPLORED : STATES.SEEN;
  return setHexes(canvas.scene, [coords], next);
}

Hooks.once("ready", () => {
  document.addEventListener("pointerdown", onCanvasPointerDown, { capture: true });
  console.log(`${MODULE_ID} | ready`);
});

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
