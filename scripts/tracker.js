import { MODULE_ID, hexAt, key, setHexes, stateOf } from "./fog.js";
import { STATES, rank } from "./states.js";
import { terrainOf } from "./terrain.js";
import { activitiesPerDay, formatActivities, terrainCost } from "./travel.js";
import { isPartyToken, partyTravelInfo } from "./party.js";
import { addSpent, getTravel, newDay, setForcedMarch, setLastHex } from "./travel-state.js";

const t = (k, data) => (data ? game.i18n.format(`HEXPLORATION.${k}`, data) : game.i18n.localize(`HEXPLORATION.${k}`));

/** Human description of a hex's terrain for log lines, e.g. "Mountains (+1) with a road". */
function describe(rec) {
  let name = rec.terrain ? t(`Terrain.${rec.terrain}`) : t("Travel.Unset");
  if (rec.terrain && rec.adjust) name += ` (${rec.adjust > 0 ? "+" : "−"}${Math.abs(rec.adjust)})`;
  return rec.road ? `${name} + ${t("Terrain.road")}` : name;
}

/** Called when the party token moves: charge the Travel cost of the hex it entered. */
export async function trackMove(scene, coords) {
  const travel = getTravel(scene);
  const k = key(coords);
  if (travel.lastHex === k) return; // moved within the same hex
  if (travel.lastHex == null) return setLastHex(scene, coords); // first sighting: nothing to charge
  const rec = terrainOf(scene, coords);
  await addSpent(scene, terrainCost(rec), t("Travel.LogMove", { terrain: describe(rec) }), coords, { lastHex: k });
}

function partyHex() {
  const token = canvas.tokens?.placeables.find((tk) => isPartyToken(tk));
  return token ? hexAt(token.center) : null;
}

/** Spend the Reconnoiter cost of the hex the party is in and mark it Explored (never downgrading it). */
export async function reconnoiterAtParty(scene) {
  const coords = partyHex();
  if (!coords) return ui.notifications.warn(t("Travel.NoParty"));
  const rec = terrainOf(scene, coords);
  await addSpent(scene, terrainCost(rec, { reconnoiter: true }), t("Travel.LogRecon", { terrain: describe(rec) }), coords, {
    lastHex: key(coords),
  });
  if (rank(stateOf(scene, coords)) < rank(STATES.EXPLORED)) await setHexes(scene, [coords], STATES.EXPLORED);
}

/** GM-only window showing the day's hexploration budget. It tracks only; it never advances the clock. */
export class TravelTracker extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "hexploration-travel",
    classes: ["hexploration-travel"],
    tag: "section",
    window: { title: "HEXPLORATION.Travel.Title", icon: "fa-solid fa-route", resizable: false },
    position: { width: 340 },
    actions: {
      newDay: TravelTracker.onNewDay,
      spend: TravelTracker.onSpend,
      refund: TravelTracker.onRefund,
      forcedMarch: TravelTracker.onForcedMarch,
      reconnoiter: TravelTracker.onReconnoiter,
    },
  };

  static onNewDay() {
    return newDay(canvas.scene);
  }
  static onSpend() {
    return addSpent(canvas.scene, 1, t("Travel.LogManual"), null);
  }
  static onRefund() {
    return addSpent(canvas.scene, -1, t("Travel.LogManual"), null);
  }
  static onForcedMarch() {
    return setForcedMarch(canvas.scene, !getTravel(canvas.scene).forcedMarch);
  }
  static onReconnoiter() {
    return reconnoiterAtParty(canvas.scene);
  }

  async _renderHTML() {
    const scene = canvas.scene;
    const root = document.createElement("div");
    root.className = "hx-travel";
    if (!scene) return root;
    const travel = getTravel(scene);
    const info = partyTravelInfo(travel.forcedMarch);
    const total = activitiesPerDay(info.speed, { forcedMarch: info.forcedMarch, hexSizeMiles: info.hexSizeMiles });
    const left = total - travel.spent;
    const pct = Math.min(100, Math.max(0, (travel.spent / total) * 100));
    const hex = partyHex();
    const reconCost = hex ? formatActivities(terrainCost(terrainOf(scene, hex), { reconnoiter: true })) : null;
    const esc = foundry.utils.escapeHTML;
    const status = left < 0 ? t("Travel.Over", { n: formatActivities(-left) }) : t("Travel.Left", { n: formatActivities(left) });
    const log = travel.log.length
      ? travel.log.map((e) => `<li><span class="cost">${e.cost > 0 ? "+" : ""}${formatActivities(e.cost)}</span> ${esc(e.text)}</li>`).join("")
      : `<li class="empty">${t("Travel.NothingYet")}</li>`;
    root.innerHTML = `
      <p class="hx-budget"><strong>${t("Travel.Budget", { spent: formatActivities(travel.spent), total: formatActivities(total) })}</strong>
        <span class="${left < 0 ? "over" : ""}">${status}</span></p>
      <div class="hx-bar"><div class="${left < 0 ? "over" : ""}" style="width:${pct}%"></div></div>
      <p class="hx-meta">${t("Travel.Party", { speed: info.speed, size: info.hexSizeMiles })}
        (${t(info.source === "camping" ? "Travel.SourceCamping" : "Travel.SourceSettings")})</p>
      <label class="hx-forced"><input type="checkbox" data-action="forcedMarch" ${info.forcedMarch ? "checked" : ""}
        ${info.forcedMarchFromCamping ? "disabled" : ""}> ${t(info.forcedMarchFromCamping ? "Travel.ForcedMarchCamping" : "Travel.ForcedMarch")}</label>
      <div class="hx-buttons">
        <button type="button" data-action="reconnoiter" ${hex ? "" : "disabled"}>${t("Travel.Reconnoiter", { cost: reconCost ?? "-" })}</button>
        <button type="button" data-action="spend">+1</button>
        <button type="button" data-action="refund">−1</button>
        <button type="button" data-action="newDay">${t("Travel.NewDay")}</button>
      </div>
      <ol class="hx-log">${log}</ol>`;
    return root;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  /** Re-render if open; called whenever scene or token data changes. */
  refresh() {
    if (this.rendered) this.render();
  }
}
