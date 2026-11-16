import { STATE_ORDER, STATE_STYLE } from "./states.js";
import { TERRAIN_ORDER, TERRAIN_STYLE } from "./terrain.js";

let open = null;

export function closeMenu() {
  open?.remove();
  open = null;
}

const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;

/**
 * Small menu at (clientX, clientY). Each item: { label, swatch (inline CSS for the preview chip),
 * checked, onPick }. A `separator: true` item draws a divider.
 */
export function showMenu(clientX, clientY, items) {
  closeMenu();
  const menu = document.createElement("menu");
  menu.className = "hexploration-menu";
  for (const entry of items) {
    if (entry.separator) {
      menu.append(Object.assign(document.createElement("hr"), { className: "hexploration-menu-sep" }));
      continue;
    }
    const item = document.createElement("button");
    item.type = "button";
    item.className = "hexploration-menu-item" + (entry.checked ? " current" : "");
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.cssText = entry.swatch ?? "";
    const label = document.createElement("span");
    label.textContent = entry.label;
    item.append(swatch, label);
    if (entry.checked) item.insertAdjacentHTML("beforeend", '<i class="fa-solid fa-check"></i>');
    item.addEventListener("click", () => {
      closeMenu();
      entry.onPick();
    });
    menu.append(item);
  }
  document.body.append(menu);
  const { width, height } = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(clientX, window.innerWidth - width - 8)}px`;
  menu.style.top = `${Math.min(clientY, window.innerHeight - height - 8)}px`;
  open = menu;
}

/** Menu listing every hex status; the swatch previews the outline's colour, thickness and line style. */
export function showStatusMenu(clientX, clientY, current, onPick) {
  showMenu(
    clientX,
    clientY,
    STATE_ORDER.map((state) => {
      const o = STATE_STYLE[state].outline;
      const swatch = o
        ? `border:${Math.max(2, o.width / 2)}px ${o.dash ? "dashed" : "solid"} ${hex(o.color)}`
        : `border:2px solid transparent;background:${STATE_STYLE[state].fogged ? "#222" : "transparent"}`;
      return {
        label: game.i18n.localize(`HEXPLORATION.State.${state}`),
        swatch,
        checked: state === current,
        onPick: () => onPick(state),
      };
    }),
  );
}

/** Menu for a hex's terrain type, its road flag, and clearing both. */
export function showTerrainMenu(clientX, clientY, current, handlers) {
  const items = TERRAIN_ORDER.map((id) => ({
    label: game.i18n.localize(`HEXPLORATION.Terrain.${id}`),
    swatch: `background:${hex(TERRAIN_STYLE[id].color)};border:2px solid #0006`,
    checked: current.terrain === id,
    onPick: () => handlers.setTerrain(id),
  }));
  items.push(
    { separator: true },
    {
      label: game.i18n.localize("HEXPLORATION.Terrain.road"),
      swatch: "background:repeating-linear-gradient(90deg,#d8c9a0 0 6px,transparent 6px 9px);height:6px",
      checked: current.road,
      onPick: () => handlers.setRoad(!current.road),
    },
    { label: game.i18n.localize("HEXPLORATION.Terrain.clear"), swatch: "", onPick: () => handlers.clear() },
  );
  showMenu(clientX, clientY, items);
}

// Dismiss on any outside click or Escape.
document.addEventListener(
  "pointerdown",
  (e) => {
    if (open && !open.contains(e.target)) closeMenu();
  },
  { capture: true },
);
document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
