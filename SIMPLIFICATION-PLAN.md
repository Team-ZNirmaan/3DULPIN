# Prototype 2 — Simplification Plan

**Status:** ✅ implemented (2026-09-25). See §13 for the result and where it differs from this plan.
**Scope:** `prototype2/` only. `prototype-ui/` stays untouched as the full reference version.
**Goal:** turn the full 13-screen build into a **basic, focused prototype** that shows the core of the problem statement clearly and quickly: survey data → AI → validated 3D volumes → 3D-ULPIN → property card. Everything else is cut or folded into the core screens.

---

## 1. Current state of `prototype2`

| Item | Now |
|---|---|
| Screens | 13 app screens + landing + public `/verify` |
| Code size | ~9,300 lines of TS/TSX across 59 files |
| Extras | 9-role switcher, EN/HI toggle, large-font mode, notifications bell, 11-step Demo Guide, toasts, hash-chained audit log |
| Git | One commit (`554ed62 first commit`) + uncommitted changes |

**Problem found in the uncommitted changes:** 22 files had `import … from 'react-i18next'` rewritten to relative paths such as `'../../node_modules/react-i18next'` and `'../../../node_modules/react-i18next'`. This looks like an IDE auto-import artifact. It breaks if the folder structure changes and bypasses normal module resolution. **Step 0 of the implementation reverts these to `'react-i18next'`**, or removes them entirely if i18n is dropped (see decision D2).

---

## 2. How we decide what stays

A feature stays only if it meets at least one of these:

1. **The PS explicitly asks for it:** 3D ULPINs; surface, multi-storey and underground identities; AI building extraction, floor segmentation, vertical parcel delineation, topology validation; vertical and underground rights.
2. **It is essential to the demo story** (survey → AI → 3D → validate → ULPIN → card).
3. **A DoLR judge understands it in under 30 seconds.**

Anything that is "our extra" (deed AI, dig-check, bank check, audit chain, exports, dashboards, role system) is cut from the prototype and moves to a **"Roadmap" slide** in the pitch.

---

## 3. Screen-by-screen decision

| # | Current screen | Decision | Why |
|---|---|---|---|
| — | Landing (role selection) | **Keep, simplify** | Remove the 9-role grid; one "Enter prototype" button + a short 3-pillar intro |
| 1 | **3D Explorer** | **Keep (centrepiece)** | *Is* the PS: vertical + underground volumes, each with its own identity |
| 2 | **Data & Pipeline** | **Keep, merge** with Building Analysis → new **"Survey & AI"** screen | The PS names 6 inputs and 4 AI tasks; one screen shows both, in order |
| 3 | **Building Analysis** | **Merge** into "Survey & AI" | Its M1/M2/M3 visuals are the best proof of the AI; the separate page is redundant |
| 4 | **Validation Center** | **Keep, simplify** | "Intelligent topology validation" is a PS requirement |
| 5 | **3D-ULPIN Registry** | **Keep, simplify** | "Generating standardised 3D ULPINs" is the headline outcome |
| 6 | **Citizen Portal / 3D Property Card** | **Keep, simplify** → "Property Card" | The end product a citizen and a government official both understand |
| — | Public `/verify` page | **Keep** | Small, and scanning the QR on a phone is a strong live-demo moment |
| 7 | Dashboard | **Cut** | Nice for officials, but not in the PS core; roadmap |
| 8 | Verification & Approval | **Cut** → fold one **"Approve & register"** action into Validation | Keeps the "AI proposes, official approves" idea without a whole screen |
| 9 | Rights & Deeds (M6) | **Cut** | Our addition beyond the PS; ownership still *shown* in unit details |
| 10 | Audit Log | **Cut** | Roadmap |
| 11 | Dig-check | **Cut** | Underground rights are already shown in the Explorer (underground view + point query) |
| 12 | Collateral Check | **Cut** | Roadmap |
| 13 | Exports & API | **Cut** → optionally keep one **"Download CityJSON"** button in Registry (decision D4) | Interoperability in one click, no extra screen |

**Result: 5 screens** (Survey & AI, 3D Explorer, Validation, 3D-ULPIN Registry, Property Card) + landing + `/verify`.

---

## 4. Navigation & demo story

Replace the grouped sidebar with a **numbered step bar** across the top (decision D1). It tells the story on its own and leaves the full width to the 3D view.

```
[Logo Bhu-Aayam  PROTOTYPE · DEMO DATA]   ① Survey & AI  ② 3D Model  ③ Validate  ④ 3D-ULPIN  ⑤ Property Card
```

| Step | Screen | What the judge sees (≈ 4 minutes total) |
|---|---|---|
| ① | Survey & AI | The 6 PS inputs → "Run" → M1 footprint, M2 "5 floors detected, 4 sanctioned", M3 plan → flats |
| ② | 3D Model | Tower with every flat/bay as its own volume; floor slicer; underground view shows metro tunnel; point query |
| ③ | Validate | Basement vs tunnel conflict and flat overlap; the official approves a fix and then **Approve & register** |
| ④ | 3D-ULPIN | Code anatomy; a mistyped code is caught; the parcel → tower → floor → flat hierarchy |
| ⑤ | Property Card | The unit highlighted in 3D, rights, parking, QR → scan on a phone → "Authentic" |

---

## 5. Feature trimming inside the kept screens

### ① Survey & AI (new, merged)
| Keep | Remove |
|---|---|
| Strip of the **6 PS inputs** (drone imagery, 3D point cloud (photogrammetric), GIS parcels, building floor plans, GNSS/CORS, DEM/DSM), each with source + one key number | Full dataset catalogue table + expandable QC checks |
| Stepper with "Run pipeline" animation (simulated) | Per-stage log console (optional, see D5) |
| Tabs **M1 extraction**, **M2 floor segmentation**, **M3 plan → units** (existing SVG visuals + 3–4 key metrics each) | "Volumes" tab (section view, boundary convention), input trust-model card, photogrammetry note card |
| "Deviation from sanction" banner | Recharts residual bar chart (the evidence table is enough) |

### ② 3D Explorer
| Keep | Remove |
|---|---|
| Cesium scene, offline basemap, picking, hover tooltip | "Plot labels" and "Elevated infra" layer toggles (show them always) |
| Floor slicer (All / Only) | "Up to" slicer mode |
| Underground view toggle | Colour modes "Accuracy tier" and "Issues" → keep **Legal class** + **Status** |
| Point query (click → rights at the 3D point) | Issue markers (issues live on the Validate screen) |
| Details panel: code, type, level, heights, area, rights, lineage | Details: open-issues block, DIGIPIN row, "Open in Registry" button |
| Mobile drawer/bottom-sheet behaviour | — |

### ③ Validate
| Keep | Remove |
|---|---|
| Issue list + detail (explanation, affected objects, "Show in 3D") | Search box, "open only" filter, 5-layer legend card |
| Actions **Approve fix** / **Reject** | "Send to field", "Refer to ULB", "Reopen" |
| **New:** one **"Approve & register"** button once blocking issues are resolved (replaces the whole Verification page) | Anomaly-score bar (keep the score as text) |
| Keep 3–4 issues: basement↔tunnel (blocking), flat overlap, extra floor, sliver gap | Area-anomaly issue tied to deeds (depends on deleted M6) — or keep it as text-only (D6) |

### ④ 3D-ULPIN Registry
| Keep | Remove |
|---|---|
| Live validator + code anatomy + "Try valid / Try mistyped" | Mint-preview dialog |
| Hierarchy tree (parcel → tower → level → unit + infrastructure roots) | Searchable table with type/status filters (the tree is enough for the demo) |
| Unit details panel (reuse Explorer's) | Copy button |
| Optional: "Download CityJSON" (D4) | Other exports (LADM, GeoJSON, full dataset) |

### ⑤ Property Card
| Keep | Remove |
|---|---|
| Search by code + 3 quick picks | Objection dialog |
| Card: iso view, code, level, area, share, holder, parking, encumbrances, signed QR | "Verify QR" dialog with tamper demo (the phone scan of `/verify` replaces it) |
| Print / PDF | Stale-card warning logic on `/verify` (optional) |

---

## 6. Shell & cross-cutting simplifications

| Area | Now | After |
|---|---|---|
| Roles | 9 roles, role switcher, route guards | **Removed**: one official view + public `/verify` |
| Navigation | Grouped sidebar + mobile drawer | **Top step bar** (D1); simple menu on mobile |
| Language | EN/HI toggle, ~960 lines of dictionaries | **D2**, recommended: English UI; the Property Card keeps bilingual labels as static text |
| Large-font mode, bell icon | Present | Removed |
| Demo Guide (11 steps) | Present | Removed; the numbered step bar *is* the guide |
| Toasts | Used everywhere | Keep (small, used by Validate / Registry) |
| Prototype badge + disclaimer strip | Present | **Keep** (honesty + emblem-law caution) |
| Offline operation (Cesium without ion, local fonts, canvas basemap) | Works | **Keep, unchanged** |

---

## 7. Data & logic trimming

| Area | Keep | Remove |
|---|---|---|
| `data/generate.ts` | Parcels, context buildings, Tower 1 levels/units, infrastructure, parties, rights, issues, pipeline stages, M1–M3 analysis | Deeds, verification tasks, audit seed; shrink datasets to the 6 PS inputs |
| `store/data.ts` | `select`, `flyTo`, `decideIssue` (fix-approved/rejected), `approveUnits`, `runPipeline`, `reset` | `linkDeed`, `rejectDeed`, `markDeedExtracted`, `completeTask`, `tamperAudit`, `logEvent` + audit state |
| `api/index.ts` | `resolvePoint`, `signCard`, `verifyCard` | `digCheck`, `collateral`, `extractDeed`, `matchDeed` |
| `domain/` | `ulpin`, `geo` (minus `digCheck`), `display`, `types` (trimmed), `digipin` (only if kept), `prng`, `hash` (`signPayload` / `verifyCard` only) | Hash-chain functions (`sealEvent`, `verifyChain`) |
| Tests | ULPIN check-character tests, fixture tests (determinism, uniqueness, no overlaps, tunnel conflict), point-query test | Dig-check test, audit-chain test, UTM test (unless CityJSON is kept) |
| Dependencies | react, react-router, zustand, cesium, @turf/turf, tailwind, lucide, qrcode.react, radix dialog/tabs, fonts | `recharts` (if the chart goes), `@radix-ui/react-dropdown-menu` (role switcher gone), `i18next` + `react-i18next` (if D2 = English only) |

---

## 8. File-level change list (for implementation later)

**Delete**
- `src/features/dashboard/`, `verification/`, `deeds/`, `audit/`, `demo-guide/`
- `src/features/services/DigCheckPage.tsx`, `CollateralPage.tsx`, `ExportsPage.tsx` (keep `exporters.ts` + its test only if D4 = yes)
- `src/app/roles.ts` (replace with a small `screens.ts`)
- `src/components/ui/dropdown.tsx`

**Merge / move**
- `features/analysis/visuals.tsx` + the M1–M3 parts of `AnalysisPage.tsx` + `PipelinePage.tsx` → `features/survey/SurveyAiPage.tsx`
- `features/citizen/CitizenPage.tsx` → `features/card/CardPage.tsx` (keep `PropertyCard.tsx`, `VerifyPage.tsx`)

**Modify**
- `app/AppShell.tsx` — top step bar; remove role switcher, language toggle (if D2), large-font, bell, guide
- `app/router.tsx` — 5 routes + landing + `/verify`; remove role guard
- `app/session-store.ts` — keep only what is still used (possibly nothing but language)
- `features/landing/LandingPage.tsx` — remove role grid
- `features/explorer/*` — trims from §5
- `features/validation/ValidationPage.tsx` — trims + "Approve & register"
- `features/registry/RegistryPage.tsx` — trims from §5
- `data/generate.ts`, `store/data.ts`, `api/index.ts`, `domain/*`, `i18n/*`
- `scripts/smoke.mjs`, `scripts/interact.mjs` — new route list and scenarios

**Keep as is**
- `features/explorer/scene.ts`, `basemap.ts`, `components/UnitIsoView.tsx`, `components/ui/*` (except dropdown), `styles/index.css`, `vite.config.ts`

**Expected size:** ~9,300 → roughly 4,500–5,000 lines.

---

## 9. Problem-statement coverage after the cuts

| PS requirement | Still covered by |
|---|---|
| Surface land parcels | Explorer (parcels + surface envelope), Registry tree |
| Multi-storey apartments | Explorer (every flat, bay, common area), Card |
| Underground infrastructure | Explorer underground view + point query |
| Drone imagery · 3D point cloud · GIS parcels · floor plans · GNSS/CORS · DEM/DSM | Survey & AI input strip + M1–M3 |
| AI building extraction | Survey & AI → M1 |
| AI floor segmentation | Survey & AI → M2 |
| AI vertical parcel delineation | Survey & AI → M3 |
| AI intelligent topology validation | Validate |
| Standardised 3D ULPINs | Registry (anatomy + check character) |
| Vertical & underground ownership rights | Explorer details + point query, Card |
| Volumetric cadastre | Explorer (solids, point query) |
| Reduced conflicts | Validate (tunnel conflict, overlap, extra floor) |
| Infrastructure planning | Explorer underground view (dig-check moves to roadmap) |

Every PS item stays covered. What moves to the **Roadmap slide**: deed AI + double-sale detection, field-verification app, dig-check / Call Before u Dig, bank collateral check, audit hash chain, full exports/APIs, dashboard, multi-role access, Hindi UI.

---

## 10. Implementation order (when approved)

0. Revert the `../node_modules/react-i18next` import paths; commit the clean baseline.
1. Delete cut screens and their routes; the app must build after this step.
2. New shell with the top step bar; simplify the landing page; remove roles.
3. Build "Survey & AI" by merging Pipeline + Analysis.
4. Trim the Explorer.
5. Trim Validate; add "Approve & register".
6. Trim Registry (+ optional CityJSON button).
7. Card page + `/verify`.
8. Trim data, store, api, domain, i18n, dependencies; update tests.
9. Verify (below), then commit.

## 11. Verification

- `npm run typecheck`, `npm test`, `npm run build` all pass
- Smoke test on the new route list at 1366×768, 1920×1080 and 390×844: no console errors, no horizontal overflow, zero non-local requests (still fully offline)
- Click through the 5-step story end to end in under ~4 minutes
- Scan the card's QR from a phone on the same Wi-Fi → `/verify` shows "Authentic"

---

## 12. Decisions needed from you

| # | Question | Recommendation |
|---|---|---|
| D1 | Navigation: **top numbered step bar**, or keep the left sidebar? | Top step bar — it tells the story and frees space for the 3D view |
| D2 | Language: English only, keep the EN/HI toggle, or English UI + bilingual Property Card? | English UI + bilingual Property Card (halves the text to maintain, keeps the government-friendly touch where it matters) |
| D3 | Keep **Dashboard** as a sixth screen? | No — mention it on the roadmap slide |
| D4 | Keep one **"Download CityJSON"** button in Registry? | Yes — one button proves interoperability at almost no cost |
| D5 | Keep the pipeline **log console** under the stepper? | No — the M1–M3 result tabs are more convincing |
| D6 | Keep the **Flat 204 area-anomaly** issue (it came from deed data)? | Keep as a text-only issue; it shows the ML anomaly layer |
| D7 | Keep the **Demo Guide** presenter bar? | No — the step bar replaces it |
| D8 | Any screen above you want kept that I marked "Cut", or cut that I marked "Keep"? | — |

---

## 13. Implementation result (2026-09-25)

**Your decisions applied:** keep everything bilingual (overrides D2) · keep the Property Card exactly as it was · clean up the 3D view. The recommendations were used for D1 and D3–D7.

**What was built**
- **Shell:** a top numbered step bar (① Survey & AI → ② 3D Model → ③ Validate → ④ 3D-ULPIN → ⑤ Property Card) plus the EN/हिं toggle. The sidebar, role system, large-font mode, bell, global search and Demo Guide are gone. On phones the step bar scrolls sideways under the logo.
- **Landing:** the role grid is replaced by one "Enter the prototype" button and a 5-step overview.
- **① Survey & AI:** the 6 inputs named in the PS, a compact pipeline stepper (Run / Reset) and the M1 / M2 / M3 tabs. The dataset catalogue, log console, residual chart and Volumes tab are removed.
- **② 3D Model (cleaned up):**
  - A full-bleed scene with one compact toolbar: View · Point query · Underground · Reset.
  - Colour mode (legal class / status) and the three layer toggles moved into a small **View** popover.
  - A vertical **floor rail** on the left edge (All, RF … B2).
  - A slim legend at the bottom and a one-line hint.
  - Details appear in a **floating card only when something is selected**, sized to its content, with lineage collapsed. On phones it becomes a bottom sheet.
  - Issue markers, tier/issue colour modes, the "Up to" slicer mode, the DIGIPIN row and the open-issues block are removed.
- **③ Validate:** the severity counts, the issue list and details, and Approve fix / Record restriction / Acknowledge / Reject. A new **Approve & register** card: Basement 2 unlocks once ISS-001 is resolved; Floor 5 stays held.
- **④ 3D-ULPIN:** the validator with its field breakdown, the hierarchy tree, the unit details and a **Download CityJSON** button.
- **⑤ Property Card:** unchanged (card, verify-QR dialog with tamper demo, objection form, print), now at `/app/card`. The public `/verify` page is unchanged too.

**Where this differs from the plan**
- **Bilingual is kept everywhere.** Both dictionaries were rebuilt with only the keys still in use. Pipeline stage names, method steps and metric labels are now translated too, where before they were English only. A new test (`src/i18n/keys.test.ts`) fails if any key used in the code is missing in either language.
- `logEvent` and the audit list stay in the store, because the unchanged Property Card's objection form uses them. There is still no Audit screen.
- Deed records stay as reference data, since the rights panel shows deed numbers. Deed linking itself is removed.
- The global search box was removed from the header to leave room for the step bar. The Registry validator does the same job.

**Checks run**
- `npm run typecheck` ✓ · `npm test` ✓ (18 tests, including the new i18n coverage test) · `npm run build` ✓
- Smoke test on 7 routes × 3 viewports (1366×768, 1920×1080, 390×844), **in English and in Hindi**: no console errors, no horizontal overflow, zero non-local requests (still fully offline)
- End-to-end story in the browser: run pipeline → M2 tab → record restriction → approve & register (17 codes) → mistyped code caught → Flat 402 Property Card ✓

**Size:** ~9,300 → ~6,070 lines across 49 files (the bilingual dictionaries account for ~800 of these).

**How to run** (from `prototype2/`): `npm install` → `npm run build && npm run preview` → open http://127.0.0.1:4180 (port 4180, so it doesn't clash with `prototype-ui`, which uses 4173/4174). Smoke test: `npm run smoke` while the preview is running.

**Git:** the changes are left uncommitted for you to review (`git status` in `prototype2/`).
