# Carpet Blog

Next.js app that generates an SEO-friendly carpet installation blog using OpenAI and posts to WordPress. Includes a homepage trigger and Vercel Cron for daily 8AM EST posting.

## Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env.local` (never commit real secrets):

```
OPENAI_API_KEY=...
WP_USER=...
WP_PASS=...
WP_API_URL=https://bestcarpetinstallersnearme.com/wp-json/wp/v2
SECRET_KEY=...
```

3. Run locally

```bash
npm run dev
```

Open http://localhost:3000

## Vercel Cron

- `vercel.json` schedules a daily run at 13:00 UTC (aimed at 8AM Eastern; adjust for DST if needed).

## Security

- API accepts `?secret=SECRET_KEY` for cron invocations. The homepage button omits the secret for convenience.
