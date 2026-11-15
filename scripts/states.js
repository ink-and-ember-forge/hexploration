/**
 * Hex status ladder. A hex is in exactly one status. Fogged statuses are covered by the fog;
 * the others show the real map, with an outline that differs in colour AND line style so it
 * stays readable for colour-blind players (Okabe-Ito palette).
 */
export const MODULE_ID = "hexploration";

export const STATES = Object.freeze({
  UNKNOWN: "unknown",
  SEEN: "seen",
  VISITED: "visited",
  EXPLORED: "explored",
  CLEARED: "cleared",
  CLAIMED: "claimed",
});

/** Ladder order; also the order shown in the menu. `fogged` hexes are covered by the fog overlay. */
export const STATE_ORDER = [
  STATES.UNKNOWN,
  STATES.SEEN,
  STATES.VISITED,
  STATES.EXPLORED,
  STATES.CLEARED,
  STATES.CLAIMED,
];

export const STATE_STYLE = Object.freeze({
  [STATES.UNKNOWN]: { fogged: true, outline: null },
  [STATES.SEEN]: { fogged: true, outline: null },
  [STATES.VISITED]: { fogged: false, outline: null },
  [STATES.EXPLORED]: { fogged: false, outline: { color: 0x009e73, width: 4, dash: [18, 12] } },
  [STATES.CLEARED]: { fogged: false, outline: { color: 0xe69f00, width: 4, dash: null } },
  [STATES.CLAIMED]: { fogged: false, outline: { color: 0x3aa0ff, width: 8, dash: null } },
});

export const rank = (state) => Math.max(0, STATE_ORDER.indexOf(state));
