import { STATE_ORDER, STATE_STYLE } from "./states.js";

let open = null;

export function closeMenu() {
  open?.remove();
  open = null;
}

const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;

/** Small context menu listing every hex status at (clientX, clientY). Calls onPick(status). */
export function showStatusMenu(clientX, clientY, current, onPick) {
  closeMenu();
  const menu = document.createElement("menu");
  menu.className = "hexploration-menu";
  for (const state of STATE_ORDER) {
    const o = STATE_STYLE[state].outline;
    const item = document.createElement("button");
    item.type = "button";
    item.className = "hexploration-menu-item" + (state === current ? " current" : "");
    // The swatch previews the outline: colour, thickness and line style.
    const swatch = o
      ? `border:${Math.max(2, o.width / 2)}px ${o.dash ? "dashed" : "solid"} ${hex(o.color)}`
      : `border:2px solid transparent;background:${STATE_STYLE[state].fogged ? "#222" : "transparent"}`;
    item.innerHTML = `<span class="swatch" style="${swatch}"></span><span>${game.i18n.localize(
      `HEXPLORATION.State.${state}`,
    )}</span>${state === current ? '<i class="fa-solid fa-check"></i>' : ""}`;
    item.addEventListener("click", () => {
      closeMenu();
      onPick(state);
    });
    menu.append(item);
  }
  document.body.append(menu);
  const { width, height } = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(clientX, window.innerWidth - width - 8)}px`;
  menu.style.top = `${Math.min(clientY, window.innerHeight - height - 8)}px`;
  open = menu;
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
