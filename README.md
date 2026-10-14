<p align="center"><img src="public/brand/zoot-wordmark.png" alt="Zoot" width="260" /></p>

# Zoot · demo branch

**Short layover, just Zoot!** This branch is cut down to the live-demo flow only. The full app (itinerary engine, Groq, OneMap routing, passport, check-ins) lives on `main` / `kayra-branch`.

SMU IS216 · Section G3 · Group 4 · Vue 3 + Vite + Bootstrap 5 + Pinia + Supabase + Vercel, with MapLibre GL, Three.js and Turf.

## Quick start

```bash
npm install
npm run dev            # http://localhost:5173
```

Copy `.env.example` to `.env` and add the Supabase URL and anon key. Without them the app runs in guest mode (localStorage only), which skips the "write to Supabase" step.

## Live demo flow (1:30)

1. **Landing** (`/`): resize the window or open on a phone to show the responsive layout. Dark mode toggle top right.
2. **Create an account** (`/auth` → Password → *Create an account*). Show the new row in Supabase → **Authentication → Users** and in **Table Editor → profiles** (written by the `on_auth_user_created` trigger).
3. **Quiz** (`/onboard`): four questions pick a travel style. Refresh the `profiles` row: `style` is now set.
4. **Itinerary UI** (`/plan`): origin, hours, buffer bar, interests, energy. *Build my quest* shows "coming soon": the itinerary engine is not wired up in this build.
5. **3D map** (`/map`): tilted toy-city Singapore with the traveller at Marina Bay. Walk with WASD / arrow keys or tap the map; the rail buttons follow, zoom out and return to start.

**Before presenting:** turn off Supabase → Authentication → Email → *Confirm email*, so sign-up logs straight in. Use a fresh email (or delete the old user) so the quiz appears.

## What's in this branch

```
src/views/       LandingView, AuthView, OnboardView (quiz), PlanView, MapView
src/stores/      user (session + profile), trip (plan form draft), ui (theme, toasts, weather)
src/lib/         db/ (Supabase + guest adapters), budget.js (layover buffers), geo.js (fake GPS),
                 weather.js (Open-Meteo), hours.js, clock.js, config.js
src/map/ src/gl/ MapLibre toy-city style + Three.js traveller
supabase/        schema.sql (profiles table + signup trigger are what the demo uses)
```

## Supabase setup

1. In **SQL Editor**, run `supabase/schema.sql`.
2. In **Authentication → URL Configuration**, add `http://localhost:5173/auth` and `https://<your-vercel-app>/auth` as redirect URLs.
3. Put the project URL and anon key in `.env` and in Vercel.

## Deploy

Import the repo into Vercel (framework: Vite; `vercel.json` adds the SPA rewrite), add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then deploy.

## Credits

Map data © OpenStreetMap contributors · tiles and fonts by OpenFreeMap · weather by Open-Meteo · icons by Bootstrap Icons · fonts Bebas Neue, Fredoka and Poppins (Google Fonts).
