<p align="center"><img src="public/brand/zoot-wordmark.png" alt="Zoot" width="260" /></p>

# Zoot

**Short layover, just Zoot!** Zoot turns 6–14 spare hours in Singapore into a timed walking quest: the planner builds a schedule that fits the clock, a tilted 3D toy-city map makes it playable, and passport chops prove you were there.

SMU IS216 · Section G3 · Group 4 · Vue 3 + Vite + Bootstrap 5 + Pinia + Supabase + Vercel + Groq, with MapLibre GL, Three.js and Turf.

---

## Quick start

```bash
npm install
npm run dev            # http://localhost:5173
npm run test:planner   # headless checks: golden path, rain swap, refusals, Groq pipeline
```

No keys are required. With nothing configured the app runs in **guest mode**: data lives in `localStorage`, the deterministic planner builds every mission, and the map uses free OpenFreeMap tiles. Add keys to switch on Supabase and Groq (see below).

## Environment variables

Copy `.env.example` to `.env` locally, and add the same keys in Vercel → Project → Settings → Environment Variables.

| Key | Where it is read | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | browser | Auth (magic link), Postgres, RLS. Public by design. |
| `GROQ_API_KEY` | `/api/*` only (server) | Groq picks places and writes copy. **Never prefix with `VITE_`.** |
| `GROQ_MODEL` | `/api/*` | Defaults to `llama-3.3-70b-versatile`. |
| `ONEMAP_EMAIL`, `ONEMAP_PASSWORD` | `/api/route`, `npm run routes:gen` | OneMap account; the server fetches and renews the routing token. **Never prefix with `VITE_`.** |
| `ONEMAP_TOKEN` | same | Optional ready-made OneMap token (lasts ~3 days); used until it expires. |
| `VITE_DEV_PANEL` | browser | `1` shows `/dev` and demo walk (fake GPS) in production. **Set it on the grading deployment.** |

`npm run dev` mounts the Vercel functions in `/api` through a small Vite plugin, so Groq works locally with the key in `.env`. `npm run preview` does not serve `/api`, so there the app uses the offline planner.

## Grading-day demo script (Sonion's layover)

1. Open the Vercel URL on a phone → **Start a layover** → **Continue as guest** (or use the email magic link) → quiz → *Budget*.
2. `/plan`: **Changi T3**, **8 h**, interests **Hawker · Gardens · Photo** → **Build my quest**.
   - The buffer bar shows 30 min exit immigration + 45 min check-in/security + 45 min safety. The mission ends at T3 with ≥ 90 min to the gate.
3. **Play on map**: the pastel 3D Singapore, the traveller, a dotted path, and a pulsing totem at stop 1. The HUD shows **TIME TO GATE** (amber < 90 min, red < 45) and "Head back by …".
4. Tap the joystick (demo walk), then **Arrive** (teleports 220 m from the stop). Tap the ground inside the ring, or use WASD. When the Stamp button glows, press it: +XP, chop celebration, and a new passport page.
5. **See chop** → the 3D passport flips to that area and a rubber stamp slams the chop onto the page.
6. Walking near an off-path gem pings a **sidequest** toast. The FAB lists it, and it's greyed out as "Not enough time" if it would break the buffer.
7. `/dev` → **Force rain** → back on Mission: the outdoor Gardens leg is flagged, and **Indoor rewrite** swaps it for indoor stops, leaving stamped legs untouched.
8. 14-hour variant: same flow with 14 h and *Adventurous*. Evening stops (Garden Rhapsody, Spectra) appear, and after about 23:30 the plan switches from MRT to taxi because the trains stop.

## How the planner works

```
/plan form ─► computeBudget()  exit 30 · re-entry 45 · safety 45 (airport) / 20 (hotel)
          ─► buildCandidates() interests, window size, indoor/rain, exclusions
          ─► Groq (/api/plan)  picks 3–6 place_ids + "why" copy   ← zoot.choice.v1
               │ validateChoice() → retry once → else ↓
               ▼
          ─► deterministic planner: Turf radius clusters (1.2 km) → greedy nearest-neighbour
             with variety + time budget → MRT when walk > 18 min (static graph, transfer
             penalty, closes 23:30) → mandatory "Return to origin" leg
          ─► validateMission()                                    ← zoot.mission.v1
```

- **Groq never produces minutes or coordinates.** It returns ids and copy; `sequencePicks()` times every leg with Turf and the MRT graph. Ids outside the catalog slice, extra fields such as `travel_min`, or a wrong schema are all rejected (`src/lib/itinerarySchema.js`).
- **Walking times are real street routes.** `npm run routes:gen` asks OneMap for every place pair within 2 km and writes `src/data/walk-matrix.sg.json` (metres, seconds → `travel.js`) and `walk-geometry.sg.json` (map lines). Pairs outside the matrix fall back to straight-line × 1.3. On the map, MRT/taxi legs and the live "you → next stop" segment come from `/api/route`; without OneMap keys the path is drawn straight.
- **The planner refuses** rather than risk the flight: fewer than 60 usable minutes, no place that fits, or a place that can't be left in time to make `arrive_by` all get a refusal.
- **Mid-walk replans** (*I'm behind*, *Less walking*, *Swap next stop*, *Rain plan*) keep stamped legs and replan from the traveller's current position and time.

## Project structure and team lanes

| Member | Role (from the pitch deck) | Main files |
| --- | --- | --- |
| Matthew | 3D quest map, geofenced check-ins, hosting | `src/map/`, `src/gl/worldLayer.js`, `avatar.js`, `markers.js`, `src/views/MapView.vue`, `src/lib/geo.js`, `checkin.js`, `vercel.json` |
| Steven | Profile, authentication and verification | `src/stores/user.js`, `src/router/`, `src/lib/db/`, `src/views/AuthView.vue`, `OnboardView.vue`, `ProfileView.vue` |
| Shrey | Interactive 3D passport and customisation | `src/gl/passportScene.js`, `pageArt.js`, `src/views/PassportView.vue`, `CodexView.vue`, `src/lib/brand.js` |
| Kayra | Route optimiser and itinerary engine | `src/lib/planner.js`, `travel.js`, `itinerarySchema.js`, `groq.js`, `api/plan.js`, `src/views/PlanView.vue`, `MissionView.vue`, `supabase/` |
| Eudale | Clans, social quests and messaging | `src/views/PartyView.vue` (stub), `SwipeView.vue`, `src/stores/party.js`, the `parties` / `messages` tables |
| Hulbert | Weather and danger risk system | `src/lib/weather.js`, `src/components/WeatherChip.vue`, the rain rewrite, `advisories` table, `api/summary.js` |

```
public/brand/        Zoot wordmark, otter badge icons and the two mascot illustrations from the pitch deck
api/                 Vercel functions: plan.js (Groq chooser), summary.js (place blurb), _lib/groq.js
scripts/             gen-seed.mjs (→ supabase/seed.sql), test-planner.mjs
supabase/            schema.sql (tables, RLS, RPCs), seed.sql (generated)
src/data/            places.sg.json (89 POIs), origins, interests, styles, areas, sidequests
src/lib/             planner, travel (Turf + MRT graph), hours, itinerarySchema, groq client,
                     weather (Open-Meteo), geo (GPS + fake GPS), checkin rules, db adapters
src/stores/          user, trip, mission, passport, ui, party   (Pinia)
src/map/             MapLibre style, QuestMap component, quest path / geofence layers
src/gl/              Three.js: avatar, markers, worldLayer (custom layer), passport book, page art
src/styles/app.css   the Zoot design system (tokens, buttons, pills, cards, dark mode)
src/views/           one view per route in the IA table
```

## Brand

The look comes from the Zoot pitch deck: taxi yellow, ink black, a hot-pink accent, thick outlines and hard "sticker" shadows.

| Token | Value | Used for |
| --- | --- | --- |
| Yellow | `#FFCC00` | Primary buttons, pills, selected states, tall buildings on the map |
| Soft / pale yellow | `#FFE680` / `#FFF4C2` | Bands, hover states, page tint |
| Ink | `#111111` | Text, outlines, the time-to-gate board |
| Pink | `#F83878` | The walking path, the next stop, the Stamp button, the traveller's scarf |
| Orange-red | `#FF4D00` | Urgency: the red countdown state, taxi legs, errors |

Type: Bebas Neue for display headings, Fredoka for headings and the wordmark feel, Poppins for body text (all Google Fonts).

Where to change things: CSS tokens live at the top of `src/styles/app.css` (light and dark), colours used by canvas and WebGL code live in `src/lib/brand.js`, the map palette is in `src/map/style.js`, and the quest path colours are in `src/map/questLayers.js`.

## Supabase setup (about 5 minutes)

1. Create a free Supabase project. In **SQL Editor**, run `supabase/schema.sql`, then `supabase/seed.sql`.
2. In **Authentication → URL Configuration**, add your site URL and `https://<your-vercel-app>/auth` as a redirect URL. Google sign-in is optional (`signInWithGoogle` is already wired in `remote.js`).
3. Put the project URL and anon key in `.env` and in Vercel.
4. **Demo user:** sign in once with the team's shared inbox through the magic link and write the address here for the instructor. Guest mode also works with no account.
5. Before real users arrive, turn off server-side fake GPS: `update app_config set value = '0' where key = 'dev_fake_gps';`

`stamp_place()` re-checks every check-in on the server: 80 m radius (120 m when accuracy is worse than 50 m), accuracy over 150 m rejected unless fake GPS is allowed, one stamp per place per Singapore day, and XP added server-side. Clients have no insert policy on `stamps`, and a trigger stops them from editing their own XP. After editing `src/data/places.sg.json`, regenerate the seed with `npm run seed:sql`.

## Deploy to Vercel

Import the repo into Vercel (the framework is detected as Vite; `vercel.json` adds the SPA rewrite). Add the environment variables above, including `VITE_DEV_PANEL=1` for the grading build, then deploy. `/api/plan`, `/api/summary` and `/api/route` deploy automatically as Node functions.

## Scope status

| Tier | Feature | Status |
| --- | --- | --- |
| P0 | Auth (magic link + guest) and 4-style quiz | ✅ |
| P0 | Layover form with origin presets, hours slider, return time, interests | ✅ |
| P0 | Groq chooser + schema validator + retry + deterministic fallback | ✅ (Groq path unit-tested with a mocked API; needs a real key to demo live) |
| P0 | Turf clustering, walk/MRT/taxi times, MRT hours | ✅ |
| P0 | 3D map, avatar, dotted quest path, totems, geofence | ✅ |
| P0 | Geofenced stamps + XP (client mirror + server RPC) | ✅ |
| P0 | Time-to-gate HUD, Open-Meteo rain overlay and indoor rewrite | ✅ |
| P0 | 3D flip passport with chop slam | ✅ |
| P0 | Place page: postcard art, AI summary with stored fallback | ✅ |
| P1 | Sidequests on the map + swipe deck | ✅ |
| P1 | Dark/light mode, bookmarks, profile page | ✅ |
| P1 | Parties + realtime chat | Tables, RLS and Realtime publication are ready; the UI is a stub (`/party`) |
| P1 | GDACS advisories + severity tint | `advisories` table + demo row only |
| P2 | TikTok/Lemon8 embeds, visa snippet, flight links | Static ICA and flight-search links on `/me`; no embeds yet |

## Honest notes

- Place coordinates and hours are hand-curated and should be spot-checked before the demo, especially temporary closures.
- Place art is procedural. Add real photos through `places.image_url` (with licences you're allowed to use).
- Travel times come from a simplified MRT graph with average waits, not live transit data. Taxi times are distance-based estimates.
- The Supabase adapter was checked against a local Postgres with a stubbed `auth` schema (schema, seed, RPC rules, RLS, XP guard), but not yet against a live Supabase project.
- The wordmark, otter badge and the two mascot illustrations in `public/brand/` were exported from the team's pitch deck. Check that the licence of whatever tool made them covers publishing them in a public repo.
- No Pokémon names, assets or trademarks appear in the UI or repo. The GO-style feel comes from original low-poly meshes and styling.

## Credits

Map data © OpenStreetMap contributors · tiles and fonts by OpenFreeMap · weather by Open-Meteo · icons by Bootstrap Icons · fonts Fredoka and Nunito (Google Fonts).
