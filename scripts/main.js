import { MODULE_ID, getFog, hexAt, isHexScene, setEnabled, setHexes, setImage, stateOf } from "./fog.js";
import { STATES, rank } from "./states.js";
import { closeMenu, showStatusMenu } from "./menu.js";
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
  game.settings.register(MODULE_ID, "dimFog", {
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: () => overlay.redraw(),
  });
});

Hooks.on("canvasReady", () => {
  console.log(`${MODULE_ID} | canvasReady, hex grid:`, canvas.grid.isHexagonal);
  overlay.attach();
});
Hooks.on("canvasTearDown", () => {
  closeMenu();
  overlay.detach();
});
Hooks.on("updateScene", (scene, changes) => {
  if (scene.id === canvas.scene?.id && foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) overlay.redraw();
});

// v13 scene controls: tools is an object keyed by tool name. Non-toggle tools behave like radio
// buttons (only one active at a time, including the core Select tool).
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;
  const tools = controls.tokens?.tools;
  if (!tools) return;
  tools.hexStatus = { name: "hexStatus", title: "HEXPLORATION.Tools.Status", icon: "fa-solid fa-hexagon-nodes", order: 100 };
  tools.hexFogDim = {
    name: "hexFogDim",
    title: "HEXPLORATION.Fog.DimTitle",
    icon: "fa-solid fa-circle-half-stroke",
    order: 104,
    toggle: true,
    active: game.settings.get(MODULE_ID, "dimFog"),
    onChange: (_event, active) => game.settings.set(MODULE_ID, "dimFog", active),
  };
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

const statusToolActive = () => game.user.isGM && ui.controls?.tool?.name === "hexStatus";

/** Opens the status menu for the hex under the pointer. */
function openStatusMenu(event) {
  const scene = canvas.scene;
  if (!scene) return;
  if (!getFog(scene).enabled) return ui.notifications.warn(game.i18n.localize("HEXPLORATION.Fog.NotEnabled"));
  const coords = hexAt(canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY }));
  console.log(`${MODULE_ID} | menu for hex`, coords);
  showStatusMenu(event.clientX, event.clientY, stateOf(scene, coords), (state) => setHexes(scene, [coords], state));
}

/**
 * Raw browser events on the canvas element, in the capture phase (before PIXI sees them).
 * With the Hex Status tool active: left-click opens the menu; right-click opens it too, but only on
 * release without dragging, so right-drag panning keeps working.
 */
let rightDown = null;
document.addEventListener(
  "pointerdown",
  (event) => {
    if (!statusToolActive() || event.target !== canvas.app?.view) return;
    if (event.button === 2) rightDown = { x: event.clientX, y: event.clientY };
    else if (event.button === 0) {
      event.preventDefault();
      event.stopPropagation(); // keep the click from also starting a token marquee/deselect
      openStatusMenu(event);
    }
  },
  { capture: true },
);
document.addEventListener(
  "pointerup",
  (event) => {
    if (event.button !== 2 || !rightDown) return;
    const dragged = Math.hypot(event.clientX - rightDown.x, event.clientY - rightDown.y) > 5;
    rightDown = null;
    if (dragged || !statusToolActive() || event.target !== canvas.app?.view) return;
    event.preventDefault();
    event.stopPropagation();
    openStatusMenu(event);
  },
  { capture: true },
);
document.addEventListener("contextmenu", (e) => statusToolActive() && e.target === canvas.app?.view && e.preventDefault(), {
  capture: true,
});

Hooks.once("ready", () => console.log(`${MODULE_ID} | ready`));

// Auto-reveal the hex a party token moves into. Runs on the GM client only.
Hooks.on("updateToken", (token, changes) => {
  if (!game.user.isGM || !game.settings.get(MODULE_ID, "autoReveal")) return;
  if (!("x" in changes || "y" in changes)) return;
  const scene = token.parent;
  if (scene.id !== canvas.scene?.id || !getFog(scene).enabled) return;
  if (token.actor?.type !== "party" && !token.actor?.getFlag(MODULE_ID, "isParty")) return;
  const center = token.object?.center;
  if (!center) return;
  // Moving onto a hex marks it Visited, but never downgrades one already Explored/Cleared/Claimed.
  const coords = hexAt(center);
  if (rank(stateOf(scene, coords)) < rank(STATES.VISITED)) setHexes(scene, [coords], STATES.VISITED);
});
