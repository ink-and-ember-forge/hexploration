# Hexploration

A Foundry VTT (v13) module that improves hex exploration for the **Pathfinder 2e Kingmaker** campaign.
It builds on [pf2e-kingmaker-tools](https://github.com/BernhardPosselt/pf2e-kingmaker-tools) and only adds
what that module lacks. It works standalone and integrates softly when Kingmaker Tools is present.

## Roadmap
1. **Fog of war** (in progress): GM-controlled hex overlay, auto-reveal as the party moves.
2. Travel and time tracking.
3. Exploration activities and encounters.
4. Kingdom integration (claiming hexes, via Kingmaker Tools).

## Fog usage
On a hex-grid scene, use the Token controls: hexagon button toggles fog, eye reveals hexes
(click: seen, click again or shift-click: explored), eye-slash re-hides. The party actor's token auto-reveals as it moves.

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
