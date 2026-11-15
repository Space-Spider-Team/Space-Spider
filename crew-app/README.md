SageCare is a Next.js crew health prototype. Crew logs and monitoring entries are stored in SQLite on the app server. NASA OSDR study metadata can be searched from Monitoring and is cached in the same database.

## Requirements

- Node.js 22.13 or later (`node:sqlite`)
- npm

The database defaults to `data/sagecare.sqlite`. Set `SAGECARE_DB_PATH` to move it. SQLite files are excluded from git.

Existing browser logs are imported the first time the server database is empty. Browser storage remains as a local fallback if the API is unavailable.

NASA OSDR search returns study metadata only. Human research files may have controlled access; this app does not import private astronaut medical records. Profile and sensor readings remain simulated unless entered by a crew member. Do not expose this unauthenticated prototype to a public network or store real patient data in it.

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
