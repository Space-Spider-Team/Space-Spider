SageCare is a Next.js crew health prototype. When configured, Supabase stores crew logs, monitoring entries, nutrition estimates, source records, app settings, and the NASA OSDR search cache. SQLite remains available as a local fallback.

## Requirements

- Node.js 22.13 or later (`node:sqlite` local fallback)
- npm

## Supabase setup

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase/migrations/20261115_app_storage.sql`](supabase/migrations/20261115_app_storage.sql).
3. Set `SUPABASE_SECRET_KEY` in `.env.local` to a server-only secret/service-role key from Project Settings > API Keys. The app can reuse `NEXT_PUBLIC_SUPABASE_URL` if already set, or set `SUPABASE_URL` directly. A publishable/anon key, including one named `NEXT_PUBLIC_*`, will not work because the tables are restricted by RLS.
4. Restart the app. State, sources, and NASA cache then read from and write to Supabase. On migration, a synthetic check row is added to each data table; it contains no crew health data and is ignored by profile views.

To check the connection, visit `/api/health/storage`; it reports row counts for all three tables without exposing stored records. `/api/state` should report `storage: supabase`. In Supabase, open **Table Editor** and select `data_sources`, `app_state`, and `nasa_search_cache`. The migration seeds a clearly labeled check row in each table; the first app read also imports missing local SQLite rows, and a NASA search saves its response to the cache. [`supabase/verify.sql`](supabase/verify.sql) provides the same check in SQL Editor.

The secret key is server-only. Never use a `NEXT_PUBLIC_` prefix or commit `.env.local`. If Supabase is unset, the app uses `data/sagecare.sqlite`; set `SAGECARE_DB_PATH` to move that file. SQLite files are excluded from git. On the first Supabase read, existing SQLite state is copied over if the Supabase state table is empty.

Existing browser logs are imported the first time the server database is empty. Browser storage remains as a local fallback if the API is unavailable.

## Source layout

- `src/app/` contains routes and API handlers.
- `src/components/app-shell/` contains the shared header and app-level reminders.
- `src/components/providers/` contains the crew state provider and database synchronization.
- `src/components/shared/` contains reusable UI components.
- `src/components/dashboard/`, `monitoring/`, and `nutrition/` group screens by feature.
- `src/lib/server/database.ts` is the server-side SQLite/Supabase storage adapter; `/api/state` validates and reads/writes app state.
- `supabase/migrations/` contains the database schema and seed records.

NASA OSDR search returns study metadata only. Human research files may have controlled access; this app does not import private astronaut medical records. Profile and sensor readings remain simulated unless entered by a crew member. This prototype has no sign-in: the server-only Supabase secret bypasses RLS, so keep the app private and do not store real patient data until user authentication and access controls are added.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
