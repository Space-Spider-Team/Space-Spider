# SageCare

SageCare is a prototype crew health and nutrition dashboard inspired by long-duration spaceflight. The current implementation is the **Crew App** in [`crew-app/`](crew-app/): it presents sample crew data, supports health and nutrition logging, and can persist app state to Supabase.

This repository does not currently contain a working base-station console, live wearable or spacecraft sensor integrations, telemetry ingestion service, or operational medical workflow. Sample readings and profiles are illustrative and must not be treated as astronaut telemetry or clinical guidance.

Research references are listed in [References.md](References.md).

## Current features

- Four app pages: **For you**, **Dashboard**, **Monitoring**, and **Nutrition**.
- UTC mission clock and a time-of-day color theme based on UTC.
- Sample crew profiles with profile switching, hydration and mood check-ins, and health reminders. Reminder audio is a soft browser-generated chime after the user has interacted with the page.
- Monitoring views with illustrative readings, manually entered records, charts, and NASA Human Research Roadmap references.
- Meal logging from the app's demo catalog, nutrient details, profile-based nutrition requirement estimates, and weekly or monthly intake charts.
- NASA Open Science Data Repository study metadata search. Results are cached for six hours; OSDR metadata is research context, not a source of personal health readings or clinical thresholds.
- Supabase persistence for app state, source records, and the NASA search cache, with a local SQLite fallback and browser storage fallback.

## Technology stack

| Area | Current implementation |
|---|---|
| Web app | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4 and project CSS variables |
| Charts and sound | Inline SVG charts and the browser Web Audio API; no charting library |
| API | Next.js route handlers for state, storage health, and NASA OSDR search |
| Hosted database | Supabase PostgreSQL through server-side PostgREST requests |
| Local database | Node.js `node:sqlite` adapter |
| Browser fallback | `localStorage` for crew logs and settings when the API is unavailable |
| Testing and lint | Vitest and ESLint scripts are defined in `crew-app/package.json` |

Python/FastAPI, MQTT, TimescaleDB, analytics services, and a base-station app are **not part of the current running application**. The root `requirements.txt` is a proposed dependency list for future services; it is not used by `crew-app`.

## Run the Crew App

Requirements: Node.js 22.13 or later and npm.

```powershell
cd crew-app
npm install
npm run dev
```

Open [Link](https://crew-app-beige.vercel.app/).

## Supabase setup

1. Create a Supabase project.
2. Run [`crew-app/supabase/migrations/20261115_app_storage.sql`](crew-app/supabase/migrations/20261115_app_storage.sql) in the Supabase SQL Editor.
3. Copy [`crew-app/.env.example`](crew-app/.env.example) to `crew-app/.env.local` and set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Use a server-only Supabase secret or service-role key. Do not prefix it with `NEXT_PUBLIC_` or commit `.env.local`.
4. Restart the development server.

The migration creates three tables:

| Table | Purpose |
|---|---|
| `app_state` | Crew logs, monitoring state, and app settings, stored as JSONB by profile and domain |
| `data_sources` | Labels and links describing where stored data comes from |
| `nasa_search_cache` | Cached OSDR search results and fetch times |

Check `/api/health/storage` for database connectivity and table row counts. `/api/state` reads saved state and reports whether storage is `supabase` or `local`. The SQL verification script is [`crew-app/supabase/verify.sql`](crew-app/supabase/verify.sql).

When Supabase is not configured, the app uses `crew-app/data/sagecare.sqlite` by default. Set `SAGECARE_DB_PATH` to choose another SQLite file location. Existing browser or SQLite state can be imported when server-side storage is initialized.

## Data sources and limitations

- Demo profiles, vital signs, and some timeline items are illustrative, not live measurements.
- Meal nutrient values include provided reference values and demo estimates. The app records meals entered by the user; it does not verify food consumption with sensors.
- NASA OSDR search returns public study metadata. Some underlying study files may have access restrictions.
- NASA Human Research Roadmap links provide research context. They are not individualized medical advice or operational thresholds.
- The app has no sign-in or user-level authorization. Its server-side Supabase key can bypass row-level security, so keep deployments private and do not enter real patient or astronaut health information.
- The app is a research/demo prototype, not a medical device. It does not diagnose or prescribe treatment.

## Repository layout

```text
.
├── README.md
├── References.md                 Research and data-source references
├── requirements.txt              Proposed Python service dependencies; not used by the app
└── crew-app/
    ├── src/app/                  Pages and API routes
    ├── src/components/           App shell and feature components
    ├── src/lib/                  Crew data, nutrition, records, database adapter
    ├── supabase/                 SQL migration and verification query
    ├── .env.example              Supabase and local database configuration template
    └── package.json              App dependencies and scripts
```

## Team

| Name | GitHub | Country | Role |
|---|---|---|---|
| Şule Hanne Kurt | [@shanne](https://github.com/shanne) | Turkey | Team owner |
| Muhammad Burhan Ahmed | [@burhanahmed](https://github.com/burhanahmed) | Pakistan | Team member |
| Razal Rasheed | [@rzl](https://github.com/rzl) | India | Team member |
| Celina Sattler | [@celinasattler](https://github.com/celinasattler) | Austria | Team member |
| Abhishek Gautam | [@abhishekghz](https://github.com/abhishekghz) | India | Team member |
| Reema Alrashdi | [@reema23](https://github.com/reema23) | Saudi Arabia | Team member |
