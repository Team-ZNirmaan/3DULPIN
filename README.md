# ZNirmaan Portal

Prototype frontend for **3D ULPIN Generation and Vertical Property Mapping** (SIH 2026). It shows a unique 3D-ULPIN for every parcel, flat, parking bay, common area and underground space, on a real 3D map of Shivajinagar, Pune.

This is a prototype with demo data only: no backend, and no real owners or records.

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

## Other commands

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/`. It can be hosted on any static host. |
| `npm run preview` | Serve the build at http://localhost:4173 |
| `npm run typecheck` | TypeScript checks |
| `npm run lint` | ESLint |
| `npm test` | Unit tests |
| `npm run data` | Rebuilds `src/data/site.generated.json` (plots and the metro alignment) from the saved OpenStreetMap extract in `scripts/osm/` |
| `npm run shots` | Screenshots of every screen at 1366×768 and 1920×1080 in English and Hindi, saved to `screenshots/`. Run `npm run build` first. |

## Demo data

All data is fictional except the geography:
- **Real:** plot shapes are drawn around real buildings near Shivaji Nagar metro station, and the metro tunnel follows the real Purple Line alignment. Both come from OpenStreetMap (© OpenStreetMap contributors, ODbL).
- **Fictional:** owners, CTS numbers, ULPINs and documents.

To check every code, area and right, open `#/debug` (a review page that is not in the menu).

## Stack

React, Vite, TypeScript, CesiumJS (Cesium World Terrain and Cesium OSM Buildings), i18next (English and Hindi) and Fontsource fonts.
