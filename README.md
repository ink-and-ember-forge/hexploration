# Hexploration

A Foundry VTT (v13) module that improves hex exploration for the **Pathfinder 2e Kingmaker** campaign.
It builds on [pf2e-kingmaker-tools](https://github.com/BernhardPosselt/pf2e-kingmaker-tools) and only adds
what that module lacks. It works standalone and integrates softly when Kingmaker Tools is present.

## Roadmap
1. **Fog of war** (in progress): GM-controlled hex overlay, auto-reveal as the party moves.
2. Travel and time tracking.
3. Exploration activities and encounters.
4. Kingdom integration (claiming hexes, via Kingmaker Tools).

## Fog and hex status
On a hex-grid scene, use the Token controls: the hexagon button toggles fog, and the **Hex Status** tool lets you
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
token marks hexes it moves into as Visited (it never downgrades a hex). Marking a hex Visited, by token or from
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
