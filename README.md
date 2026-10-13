# ZNirmaan Portal

Prototype frontend for **3D ULPIN Generation and Vertical Property Mapping** (SIH 2026). It shows a unique 3D-ULPIN for every parcel, flat, parking bay, common area and underground space, on a real 3D map of Shivajinagar, Pune.

This is a prototype with demo data only: no backend, and no real owners or records.

## What it does

| Screen | What you can do |
|---|---|
| **3D Bhu-Naksha** | Parcel map of 15 plots on real terrain and buildings. Tower 1 on CTS 1177 as one 3D block per legal space. Click or hover a block, explode the floors, show one floor at a time. The **Underground** view fades the ground to show the basements, both metro tunnels and the water main; plots above the metro are hatched for its right of user. |
| **Register a building** | Pick the plot, add the six survey data sources (sample files), generate, and get 88 3D-ULPINs grouped by type. Registering turns the grey tower into coloured spaces everywhere. **Reset demo** is here too. |
| **Search land records** | One box for a plot number, a ULPIN or a 3D-ULPIN. A typing mistake is caught by the check character, the wrong characters are marked, and the right code is suggested. Every code is explained part by part. |
| **3D property card** | The record of one space: location, areas, holder, rights with their documents, parking, restrictions, a drawing of the tower with the space highlighted, a QR code, and a print layout. |

Everything works in English and Hindi (the **EN / हिं** switch in the header), including names, places and documents.

## Run it

1. Install Node.js 20 or newer.
2. Install the dependencies:
   ```
   npm install
   ```
3. Add your Cesium ion token:
   - Create a free account at https://ion.cesium.com.
   - Copy your token from Access Tokens.
   - Copy `.env.example` to `.env.local` and paste the token after `VITE_CESIUM_ION_TOKEN=`.

   Without a token, the map uses Cesium's evaluation token and shows a notice. `.env.local` is git-ignored, so the token never reaches GitHub.
4. Start the app:
   ```
   npm run dev
   ```
   Then open the address it prints.

The 3D city streams from Cesium's servers, so the map needs an internet connection. Without one, the map says so; Register, Search and the property cards still work.

## Hosting

`npm run build` writes a static site to `dist/`. It uses hash links (`#/map`, `#/card/...`), so it works on any static host without server settings. Build with your token in `.env.local`; the QR codes on the property cards point to wherever the site is hosted.

## Demo script

About 6 to 8 minutes. Before you start, open the site once so the map is cached, and set the language.

1. **Reset demo.** Open *Register a building*. If the tower is already registered, press **Reset demo**.
2. **Register a building.** Pick CTS 1177, press **Continue**, **Use all sample files**, **Continue**, then **Generate 3D-ULPINs**. Point out the 88 codes and the counts per type.
3. **3D view.** Press **View in 3D**. Tower 1 now stands as coloured spaces on its plot among the real buildings of Shivajinagar.
4. **Explode floors and the floor picker.** Press **Explode**, then pick floor **5** to see it as a floor plan. Click a flat to show its 3D-ULPIN and rights. Press **All** and **Explode** again to put it back together.
5. **Underground view.** Press **Underground**. Show the basements, the two metro tunnels 21 to 27 m below and the water main, then click a tunnel for its code and the metro's right of user. Back in the parcel map, the plots above the tunnel are hatched.
6. **Property card.** Open Flat 502 (from the plot's list of spaces) and press **Open property card**. Show the drawing, the rights with their documents, the allotted parking and the QR code.
7. **Search with a typo.** Open *Search land records* and press **A 3D-ULPIN with a typing mistake**. The two swapped digits are marked and Flat 502 is suggested.
8. **Switch to Hindi.** Press **हिं** in the header; every screen, including names and places, switches.

## Other commands

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/`. |
| `npm run preview` | Serve the build at http://localhost:4173 |
| `npm run typecheck` | TypeScript checks |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (codes, typo check, demo data, translations) |
| `npm run data` | Rebuilds `src/data/site.generated.json` (plots and the metro alignment) from the saved OpenStreetMap extract in `scripts/osm/` |
| `npm run shots` | Screenshots of every screen at 1366×768 and 1920×1080 in English and Hindi, saved to `screenshots/`. Run `npm run build` first. |
| `npm run interact` | Clicks through Register, Search, the cards and the map in a test browser and checks each step. Run `npm run build` first. |
| `npm run rehearse` | Runs the demo script above in English and in Hindi, with a screenshot per step and a video of each run. Run `npm run build` first. |

## Demo data

All data is fictional except the geography:
- **Real:** plot shapes are drawn around real buildings near Shivaji Nagar metro station, and the metro tunnel follows the real Purple Line alignment. Both come from OpenStreetMap (© OpenStreetMap contributors, ODbL).
- **Fictional:** owners, CTS numbers, ULPINs and documents. The village and taluka (Bhamburda, Haveli) follow how Shivajinagar property is usually described.

To check every code, area and right, open `#/debug` (a review page that is not in the menu).

## Stack

React, Vite, TypeScript, CesiumJS (Cesium World Terrain and Cesium OSM Buildings), i18next (English and Hindi), qrcode, and Fontsource fonts.
