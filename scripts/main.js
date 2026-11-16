import { MODULE_ID, getFog, hexAt, isHexScene, resetAllHexes, setEnabled, setHexes, setImage, stateOf } from "./fog.js";
import { STATES, rank } from "./states.js";
import { closeMenu, showStatusMenu, showTerrainMenu } from "./menu.js";
import { clearTerrain, setTerrain, terrainOf } from "./terrain.js";
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
  game.settings.register(MODULE_ID, "showTerrain", {
    name: "HEXPLORATION.Settings.ShowTerrain.Name",
    hint: "HEXPLORATION.Settings.ShowTerrain.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => overlay.redraw(),
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

// v13 scene controls: a dedicated "Hexploration" group (GM only), like Tiles or Lighting.
// Non-toggle tools behave like radio buttons (only one active at a time); buttons just run.
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;
  controls.hexploration = {
    name: "hexploration",
    order: 50, // after the core groups
    title: "HEXPLORATION.Title",
    icon: "fa-solid fa-hexagon-nodes",
    activeTool: "hexStatus",
    tools: {
      hexStatus: { name: "hexStatus", title: "HEXPLORATION.Tools.Status", icon: "fa-solid fa-hexagon-nodes", order: 0 },
      hexTerrain: { name: "hexTerrain", title: "HEXPLORATION.Tools.Terrain", icon: "fa-solid fa-mountain-sun", order: 1 },
      hexFogToggle: {
        name: "hexFogToggle",
        title: "HEXPLORATION.Fog.Enable",
        icon: "fa-solid fa-hexagon",
        order: 2,
        button: true,
        onChange: async () => {
          const scene = canvas.scene;
          if (!isHexScene(scene)) return ui.notifications.warn(game.i18n.localize("HEXPLORATION.Fog.NeedsHexGrid"));
          const enable = !getFog(scene).enabled;
          await setEnabled(scene, enable);
          ui.notifications.info(game.i18n.localize(enable ? "HEXPLORATION.Fog.Enabled" : "HEXPLORATION.Fog.Disabled"));
        },
      },
      hexFogImage: {
        name: "hexFogImage",
        title: "HEXPLORATION.Fog.ImageTitle",
        icon: "fa-solid fa-image",
        order: 3,
        button: true,
        onChange: () => openImageDialog(),
      },
      hexFogDim: {
        name: "hexFogDim",
        title: "HEXPLORATION.Fog.DimTitle",
        icon: "fa-solid fa-circle-half-stroke",
        order: 4,
        toggle: true,
        active: game.settings.get(MODULE_ID, "dimFog"),
        onChange: (_event, active) => game.settings.set(MODULE_ID, "dimFog", active),
      },
      // Last, so the destructive button is the least likely to be hit by accident.
      hexFogReset: {
        name: "hexFogReset",
        title: "HEXPLORATION.Fog.ResetTitle",
        icon: "fa-solid fa-rotate-left",
        order: 5,
        button: true,
        onChange: () => confirmReset(),
      },
    },
  };
});

async function confirmReset() {
  const scene = canvas.scene;
  if (!scene) return;
  const count = Object.keys(getFog(scene).hexes).length;
  if (!count) return ui.notifications.info(game.i18n.localize("HEXPLORATION.Fog.ResetNothing"));
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("HEXPLORATION.Fog.ResetTitle") },
    content: `<p>${game.i18n.format("HEXPLORATION.Fog.ResetConfirm", { count })}</p>`,
    yes: { label: game.i18n.localize("HEXPLORATION.Fog.ResetYes"), default: false },
    no: { default: true }, // Enter/Escape must not trigger the destructive option
    rejectClose: false,
  });
  if (!confirmed) return;
  await resetAllHexes(scene);
  ui.notifications.info(game.i18n.localize("HEXPLORATION.Fog.ResetDone"));
}

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

const activeHexTool = () => (game.user.isGM && ["hexStatus", "hexTerrain"].includes(ui.controls?.tool?.name) ? ui.controls.tool.name : null);

/** Opens the menu for the active tool on the hex under the pointer. */
function openHexMenu(event, tool) {
  const scene = canvas.scene;
  if (!scene) return;
  const coords = hexAt(canvas.canvasCoordinatesFromClient({ x: event.clientX, y: event.clientY }));
  console.log(`${MODULE_ID} | ${tool} menu for hex`, coords);
  if (tool === "hexStatus") {
    if (!getFog(scene).enabled) return ui.notifications.warn(game.i18n.localize("HEXPLORATION.Fog.NotEnabled"));
    return showStatusMenu(event.clientX, event.clientY, stateOf(scene, coords), (state) => setHexes(scene, [coords], state));
  }
  if (!isHexScene(scene)) return ui.notifications.warn(game.i18n.localize("HEXPLORATION.Fog.NeedsHexGrid"));
  const current = terrainOf(scene, coords);
  showTerrainMenu(event.clientX, event.clientY, current, {
    setTerrain: (terrain) => setTerrain(scene, coords, { terrain }),
    setRoad: (road) => setTerrain(scene, coords, { road }),
    clear: () => clearTerrain(scene, coords),
  });
}

/**
 * Raw browser event on the canvas element, in the capture phase (before PIXI sees it).
 * With a Hexploration menu tool active, a left-click opens that tool's menu for the hex.
 */
document.addEventListener(
  "pointerdown",
  (event) => {
    const tool = activeHexTool();
    if (event.button !== 0 || !tool || event.target !== canvas.app?.view) return;
    event.preventDefault();
    event.stopPropagation(); // keep the click from also starting a token marquee/deselect
    openHexMenu(event, tool);
  },
  { capture: true },
);

// Show terrain labels on fogged hexes too while the GM is editing terrain.
Hooks.on("renderSceneControls", () => overlay.setEditingTerrain(game.user.isGM && ui.controls?.tool?.name === "hexTerrain"));

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
