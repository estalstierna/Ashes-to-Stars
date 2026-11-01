# Ashes to Stars: 2077

A text-based grand strategy RPG for mobile browsers.

**2077.** The Long War (2062–2077) is over, and a third of humanity is gone. Choose a name, gender, nation and role, then rebuild the world, burn it again, or reach for the stars. The game can run for centuries, to the year 3000 and beyond. Can you reach Kardashev II, the "Space God" milestone?

## Features (prototype v0.1)

- **16 nations**, from superpowers (USA, European Federation, China, India) to new and small states (Republic of Sweden, Cascadia, Siberian Free Republic, Free City of Singapore…).
- **4 roles**:
  - **Head of State**: control the budget and run the nation.
  - **Politician**: win elections or plot palace intrigue.
  - **General**: stage a coup.
  - **Corporate Executive**: buy the state.
- **Politics:** elections, coups, government changes, approval and stability.
- **Military** (its own tab):
  - Manpower comes from a conscription slider. Higher conscription costs economic growth and approval.
  - Equipment is split across four branches: Army, Navy, Air Force and Space Force.
  - Military power = √(equipment × manpower) × quality.
  - 15 multi-year military projects form a tech tree, from drone swarms to the Stellar Lance.
  - Wars with war scores, offensives, peace deals, annexations and rebellions.
- **Economy tab:**
  - GDP, growth, wealth per person and how much of the economy's potential it has reached.
  - A breakdown of exactly why the economy grows or shrinks.
  - Charts of GDP and treasury/debt over time (tap to see values).
  - The national budget, trade agreements and a ranking of world economies.
- **Alliances:**
  - When an ally is attacked, its allies join the war. Allies of the attacker sometimes join too.
  - If your ally is attacked you get a call to arms: honour it, or refuse and break the alliance.
  - When the original war ends, the allies' wars end with it.
  - AI nations form and break alliances over time, especially against a common enemy.
- **Economy:** set taxes and spending per sector (military, economy, welfare, science, space) and see your surplus or deficit live. Deficits become national debt, with interest that rises as debt grows. Also trade agreements and Earth restoration.
- **Space race:** 12 milestones, from Lunar Outpost to Mars, the asteroid belt, Titan, a Dyson swarm, exoplanet colonies and Kardashev II.
- **Characters age and die.** When yours dies, loses an election or is overthrown, you continue as an heir or protégé.
- **Turn length grows with time:** 1 year per turn until 2150, then 5 years, then 10, then 25.
- **Procedural content:** about 35 events with randomised nations, people, companies and places. AI nations act on their own and AI leaders rise and fall.
- **Interactive world map** in the World tab:
  - Real terrain (NASA Blue Marble) with the borders of the 2077 nations.
  - Drag to pan, pinch to zoom, and tap a nation to open its details.
  - Three modes: Nations, Terrain and Diplomacy (coloured by your relations).
  - The world is divided into about 500 provinces. When a nation cedes land in a peace deal, the provinces along the border change hands, so the map shows partial losses too.
  - Fully conquered nations take on the conqueror's colour.
- **Occupation and independence:**
  - Conquered nations have unrest and integration.
  - Decades of stable rule integrate them for good. Instability, wars and a large conquered population fuel unrest.
  - High unrest first gives a resistance movement, then a regional uprising: only part of the homeland (about 15–35%) rises, with its share of the people.
  - The uprising becomes a guerrilla war of independence. Win it and the whole homeland is freed; lose it and the uprising is crushed for a generation.
  - New states start unstable and do not wage wars of aggression for 15 years.
  - Rulers can use "Pacify occupied lands" or "Grant regional autonomy". The Military tab shows unrest and integration for each occupied nation.
  - A brown haze shows war damage to the Earth and clears as the planet heals.
- Works offline, autosaves, and can be installed to the home screen as an app (PWA).

## Play

It is a static site with no build step and no dependencies. Open `index.html` in a browser, or host the folder on any static host. GitHub Pages works: **Settings → Pages → Deploy from a branch**, then pick the branch and the `/ (root)` folder.

To install it on a phone, open the URL and choose **Share → Add to Home Screen** (iOS) or **Install app** (Android/Chrome).

## Project layout

| File | Purpose |
|---|---|
| `js/data.js` | Nations, governments, space milestones and lore |
| `js/engine.js` | Simulation: economy, wars, elections, coups, succession, saving |
| `js/military.js` | Manpower, branches, military power and military projects |
| `js/actions.js` | Everything the player can do, per role |
| `js/events.js` | Procedural events |
| `js/ui.js` | Screens and interface |
| `js/names.js` | Procedural name generator, organised by culture |
| `js/mapdata.js` | Generated map provinces (from `tools/build-map.js`) |
| `js/territory.js` | Province ownership: cessions, annexations and rebellions on the map |
| `img/earth.jpg` | Earth texture |

## Tests

```
node tests/sim.js 10 3000     # plays 10 full random games to year 3000; checks for crashes/NaN and prints balance data
node tests/ui-smoke.js /tmp/shots   # mobile browser smoke test with screenshots (needs Playwright)
```

## Rebuilding the map

`js/mapdata.js` is generated. It assigns real countries to the fictional 2077 nations, then splits large countries into provinces on an 8° grid. It also records which provinces border each other.

```
npm i world-atlas@2.0.2 topojson-client@3.1.0 polygon-clipping@0.15.7   # in any folder
NODE_PATH=<that folder>/node_modules node tools/build-map.js
```

## Credits

- Country borders: [Natural Earth](https://www.naturalearthdata.com/) via `world-atlas` (public domain).
- Earth texture: NASA Blue Marble (public domain), taken from the `three-globe` package.
