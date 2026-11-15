SageCare is a Next.js crew health prototype. When configured, Supabase stores crew logs, monitoring entries, source records, and the NASA OSDR search cache. SQLite remains available as a local fallback.

## Requirements

- Node.js 22.13 or later (`node:sqlite` local fallback)
- npm

## Supabase setup

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase/migrations/20261115_app_storage.sql`](supabase/migrations/20261115_app_storage.sql).
3. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from the project settings.
4. Restart the app. State, sources, and NASA cache now read from and write to Supabase.

The secret key is server-only. Never use a `NEXT_PUBLIC_` prefix or commit `.env.local`. If Supabase is unset, the app uses `data/sagecare.sqlite`; set `SAGECARE_DB_PATH` to move that file. SQLite files are excluded from git. On the first Supabase read, existing SQLite state is copied over if the Supabase state table is empty.

Existing browser logs are imported the first time the server database is empty. Browser storage remains as a local fallback if the API is unavailable.

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
