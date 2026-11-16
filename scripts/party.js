import { MODULE_ID } from "./fog.js";

const KINGMAKER_TOOLS = "pf2e-kingmaker-tools";

/** The party actor that pf2e-kingmaker-tools has set up for camping, if the module is installed and used. */
function campingActor() {
  return game.actors?.contents.find((a) => a.getFlag(KINGMAKER_TOOLS, "camping-sheet")) ?? null;
}

/**
 * Travel inputs for the day budget. Reads pf2e-kingmaker-tools' camping data when present (so both agree),
 * otherwise falls back to this module's own settings.
 * Returns { speed, hexSizeMiles, forcedMarch, forcedMarchFromCamping, source }.
 */
export function partyTravelInfo(ownForcedMarch) {
  const actor = campingActor();
  const camping = actor?.getFlag(KINGMAKER_TOOLS, "camping-sheet");
  if (camping) {
    const travelSpeed = actor.system?.movement?.speeds?.travel?.value ?? 0;
    return {
      speed: Math.max(camping.minimumTravelSpeed ?? 0, travelSpeed) || 25,
      hexSizeMiles: camping.hexSizeInMiles || 12,
      forcedMarch: !!camping.forcedMarchActive,
      forcedMarchFromCamping: true,
      source: "camping",
    };
  }
  return {
    speed: game.settings.get(MODULE_ID, "partySpeed"),
    hexSizeMiles: game.settings.get(MODULE_ID, "hexSizeMiles"),
    forcedMarch: !!ownForcedMarch,
    forcedMarchFromCamping: false,
    source: "settings",
  };
}

/** True for the token that represents the party (a PF2e party actor, or one flagged by this module). */
export const isPartyToken = (token) => token?.actor?.type === "party" || !!token?.actor?.getFlag(MODULE_ID, "isParty");
