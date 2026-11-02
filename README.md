# Ashes to Stars: 2077

A text-based grand strategy RPG for mobile browsers.

**2077.** The Long War (2062–2077) is over, and a third of humanity is gone. Choose a name, gender, nation and role, then rebuild the world, burn it again, or reach for the stars. The game can run for centuries, to the year 3000 and beyond. Can you reach Kardashev II, the "Space God" milestone?

## Features (prototype v0.1)

- **16 nations**, from superpowers (USA, European Federation, China, India) to new and small states (Republic of Sweden, Cascadia, Siberian Free Republic, Free City of Singapore…).
- **Flags and national history:** every nation has its own flag. Tap a nation to see its capital, motto, backstory and a timeline: events before 2077 plus everything that happens in your game (wars, peace treaties, alliances, new leaders, regime changes, annexations and space milestones).
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
  - **War goals:** conquer territory, reparations, regime change, total conquest (only against much smaller nations) or liberation of a nation the enemy occupies. Each goal changes how much the world fears you.
  - **Front line:** provinces along the border are occupied as the war score moves, shown striped on the map.
  - **Peace talks:** pick your terms (occupied provinces, reparations, regime change, annexation, liberation, or concessions) and see how likely the other side is to accept.
  - AI enemies can offer you peace when they are losing, or demand your surrender when they are winning.
  - AI wars end with the winner keeping the land its armies hold.
- **Economy tab:**
  - GDP, growth, wealth per person and how much of the economy's potential it has reached.
  - A breakdown of exactly why the economy grows or shrinks.
  - Charts of GDP and treasury/debt over time (tap to see values).
  - The national budget, trade agreements and a ranking of world economies.
- **Laws & policies** (Home → Laws):
  - Eight areas: speech and press, military service, economic model, environment, AI, immigration, civil liberties and space policy. Each has three options with clear trade-offs, such as growth, approval, stability, research, space, Earth healing, military quality, conscription unrest, threat and faction support.
  - Changing a law uses an action, and each area has a 5-year cooldown.
  - AI nations start with laws that fit their government and change them after coups.
- **Cabinet & rivals** (Home → Cabinet):
  - As ruler you appoint five ministers: Finance, Defence, Foreign Affairs, Interior and Science. Each has a competence of ★1–5, a loyalty score and traits such as Brilliant, Corrupt, Ambitious, Popular, Hawk, Dove, Reformer or Hardliner.
  - Ministers boost growth, military quality, relations, stability and research.
  - Corrupt ministers skim money and cause scandals. Ambitious ones with low loyalty may resign and become rivals.
  - **Rivals** are named, persistent enemies: opposition leaders, generals, media tycoons, regime insiders and former ministers. They grow when you are unpopular, smear you, weaken you in elections, and generals may attempt coups.
  - You can discredit them, have the spies investigate them, offer them a ministry, or arrest them in non-democracies.
- **Difficulty and balance:**
  - Four difficulty levels: Easy, Normal, Hard and Brutal. They set AI growth, the cost of your actions, how strongly the world reacts to your expansion, war weariness, unrest in occupied lands and how much of a conquered economy you gain.
  - **Threat (aggressive expansion):** wars, conquests and annexations make the world fear you. Fear sours relations, leads nations to sign defensive pacts against you and can bring a coalition into your next war. It fades in peacetime.
  - Investment in the economy, science, space and welfare has diminishing returns.
  - Stacked growth bonuses are capped at +3%, and national programmes have cooldowns.
  - **Sovereign default:** above 200% debt-to-GDP a nation defaults. Its debt is written down, at the cost of a crisis.
- **Treaties and alliances** (World → Diplomacy):
  - Three treaty types: non-aggression pact (15 years), defensive pact (defend each other only when attacked) and full alliance (defend each other, and may join each other's wars of aggression).
  - When a war starts, every treaty partner weighs whether to join. This depends on the treaty type, which side its partner is on (defending is far more likely than attacking), relations with both sides, whether together they can win, other wars it is fighting, any pact with the enemy, and distance.
  - Betraying an attacked partner breaks the treaty. Declining to join an attack only cools relations.
  - The player gets a call to arms when a partner is attacked, and a request to join when a full ally attacks someone.
  - The Diplomacy view lists your treaties, the chance each partner would defend you against your worst rival, and all alliances in the world.
- **Economy:** set taxes and spending per sector (military, economy, welfare, science, space) and see your surplus or deficit live. Deficits become national debt, with interest that rises as debt grows. Also trade agreements and Earth restoration.
- **Space tab:**
  - A tappable map of the solar system with the Moon, Mars, Ceres and the Belt, Europa, Ganymede, Titan, Venus' cloud cities, Mercury and Proxima b. Each has facts and lore; the Moon has the most, including Artemis Colony (USA, 2065) and Shackleton Outpost (China, 2072).
  - Colonies are real places. You found them, expand them through five levels (outpost to metropolis), and they add space progress, research and growth. Big, distant colonies may demand independence.
  - AI nations race you for every world.
  - The 12-step space race, from Lunar Outpost to Kardashev II, also lives here.
- **Characters age and die.** When yours dies, loses an election or is overthrown, you continue as an heir or protégé.
- **Turn length grows with time:** 1 year per turn until 2150, then 5 years, then 10, then 25.
- **Procedural content:**
  - About 70 events with randomised nations, people, companies and places. They cover disasters, economy, diplomacy, security, science, space, society, your family and personal life, and situations specific to politicians, generals and executives.
  - Events do not repeat within a few turns.
  - World news reports what happens to other nations, such as disasters, breakthroughs, protests, scandals and trade deals.
  - AI nations act on their own, and AI leaders rise and fall.
- **End-turn check:** before a turn ends you are reminded of unused actions, idle research and free military project slots, with shortcuts to each.
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
| `js/war.js` | War goals, front lines and peace negotiations |
| `js/space.js` | Solar system bodies and colonies |
| `js/actions.js` | Everything the player can do, per role |
| `js/events.js` | Procedural events and the event queue |
| `js/events-extra.js` | More events, plus yearly world news |
| `js/ui/kit.js` | Shared UI helpers: modals, toasts, event delegation, shared view state |
| `js/ui/main.js` | Title screen, character creation, the frame around the tabs, turn flow, events and succession |
| `js/ui/government.js` | Laws and cabinet views on the Home tab |
| `js/ui/home.js`, `actions.js`, `economy.js`, `military.js`, `world.js`, `science.js`, `space.js`, `news.js` | One file per tab |
| `js/names.js` | Procedural name generator, organised by culture |
| `js/mapdata.js` | Generated map provinces (from `tools/build-map.js`) |
| `js/territory.js` | Province ownership: cessions, annexations and rebellions on the map |
| `img/earth.jpg` | Earth texture |

## Tests

```
npm test            # simulation (6 full games to year 3000) + every event choice
npm run test:ui     # mobile browser tests: smoke test + UI flows (needs Playwright + Chromium)
npm run test:all    # everything
node tests/balance.js USA 2150 4 war   # balance check: an aggressive (war) or min-maxing (econ) bot per difficulty
```

GitHub Actions runs all of them on every push (`.github/workflows/test.yml`).

## Rebuilding the map

`js/mapdata.js` is generated. It assigns real countries to the fictional 2077 nations, then splits large countries into provinces on an 8° grid. It also records which provinces border each other.

```
npm i world-atlas@2.0.2 topojson-client@3.1.0 polygon-clipping@0.15.7   # in any folder
NODE_PATH=<that folder>/node_modules node tools/build-map.js
```

## Credits

- Country borders: [Natural Earth](https://www.naturalearthdata.com/) via `world-atlas` (public domain).
- Earth texture: NASA Blue Marble (public domain), taken from the `three-globe` package.
