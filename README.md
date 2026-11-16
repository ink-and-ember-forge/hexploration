# Hexploration

A Foundry VTT (v13) module that improves hex exploration for the **Pathfinder 2e Kingmaker** campaign.
It builds on [pf2e-kingmaker-tools](https://github.com/BernhardPosselt/pf2e-kingmaker-tools) and only adds
what that module lacks. It works standalone and integrates softly when Kingmaker Tools is present.

## Roadmap
1. **Fog of war** (in progress): GM-controlled hex overlay, auto-reveal as the party moves.
2. Travel and time tracking.
3. Exploration activities and encounters.
4. Kingdom integration (claiming hexes, via Kingmaker Tools).

## Terrain
The **Terrain** tool opens a menu on a clicked hex: Open, Forest, Hills, Mountains, Swamp or Water, plus a Road
on/off flag (a road crosses any terrain, so it is separate) and Clear. Terrain labels show on hexes players have
visited (a client setting can hide them). While the GM has the Terrain tool selected, every hex is tinted in its
terrain colour, hexes with no terrain yet get a dashed grey outline, and a legend shows how many hexes have each
terrain and how many are still unset; labels also show on every hex.
Each hex can also be made easier or harder by one step (e.g. dense jungle). Terrain is stored separately from fog
status, and the map reset button does not clear it.

## Travel
The **Travel Tracker** window (route icon) shows the day's hexploration budget and never advances the game clock.
Rules follow the Pathfinder 2e Gamemastery Guide: the party's Speed gives 1/2, 1, 2, 3 or 4 activities per day
(forced march adds one), and entering a hex costs 1 / 2 / 3 Travel activities for open / difficult / greater
difficult terrain. Open = plains and water, difficult = forest and hills, greater difficult = mountains and swamp;
a road makes a hex one step easier for Travel only, and Reconnoitering costs the same as the terrain's Travel
cost (roads don't help). The party token's moves are charged automatically (moving inside one hex is free); the
Reconnoiter button spends the cost for the party's hex and marks it Explored; +1/−1 adjust by hand and New day
resets the budget. Speed, hex size and forced march are read from pf2e-kingmaker-tools' camping data when it is
present, otherwise from this module's settings.

## Fog and hex status
On a hex-grid scene, use the **Hexploration** group in the scene controls (GM only): the hexagon button toggles fog, and the **Hex Status** tool lets you
click a hex to pick its status from a menu. Statuses, in order:

| Status | Look |
| --- | --- |
| Unknown | covered by the fog (custom image or black) |
| Seen | lightly fogged |
| Visited | the clear map, no outline |
| Explored | dashed green outline |
| Cleared | solid amber outline |
| Claimed | thick solid blue outline |

Outlines differ in colour *and* line style so they stay readable for colour-blind players. The party actor's
token marks hexes it moves into as Visited (it never downgrades a hex). The reset button (counter-clockwise arrow) sets every hex on the scene back to Unknown after a confirmation. Marking a hex Visited, by token or from
the menu, also marks its Unknown neighbours as Seen.

Enabling hex fog also turns off Foundry's token vision, fog exploration and darkness on that scene (global
illumination on), and turning it off restores the previous values. The GM sees fog at full strength like players;
the half-circle button dims it for a see-through preview. The image button sets a per-scene fog image.

## Status
Untested scaffold: not yet run inside Foundry.

## Releasing
Create a GitHub release with a tag like `v0.2.0`. The workflow stamps the version and manifest/download URLs
into `module.json`, zips the module, and attaches `module.json` and `module.zip` to the release.
Install in Foundry with the manifest URL:
`https://github.com/ink-and-ember-forge/hexploration/releases/latest/download/module.json`
