# Daily News

Daily News is a scheduled, static news briefing for GitHub Pages. It fetches RSS feeds, filters low-signal stories, deduplicates by event, ranks the strongest items, writes a clean JSON briefing, and renders it as a premium animated React site. The current reader-facing name is **First Light**, but the repo and pipeline are kept name-neutral so the brand can change later.

## What It Builds

- React + Vite static site
- Daily RSS generation script
- GitHub Actions workflow for GitHub Pages
- Reader-facing JSON at `public/news-data.json`
- Execution log artifact at `dist-news-log.json`
- Rolling three-day archive: today plus the previous two generated briefings

The site has no backend requirement. GitHub Actions regenerates the data, builds static assets, and deploys the latest briefing over the stable Pages URL.

Each generation keeps the latest three briefing entries inside `public/news-data.json`. The website defaults to today and shows a horizontal date rail for switching to yesterday or two days ago when those archive entries exist. Older entries are dropped automatically.

## Local Setup

```bash
npm install
npm run generate
npm run dev
```

Vite will print a local URL, usually `http://localhost:5173`.

To test on a phone before opening a PR, keep the dev server running and open the Vite network URL on a phone connected to the same Wi-Fi. Vite prints it as `Network`, for example:

```text
http://192.168.20.5:5173/
```

If the IP changes, run:

```bash
ipconfig getifaddr en0
```

Then open `http://YOUR-IP:5173/` on the phone.

## Build Locally

```bash
npm run build
npm run preview
```

`npm run build` runs the RSS generator first, then writes the static site to `dist/`.

## News Sources

Edit feeds in [`config/sources.json`](/Users/savyarai/Documents/VS-Code/daily-news/config/sources.json). Each category has:

- `id`: stable app identifier
- `label`: reader-facing section title
- `accent`: section accent color
- `sources`: RSS feed names and URLs
- optional `minimumUsefulItems` and `fallbackLookbackHours`

The AI category widens its lookback window if the last 24 hours do not produce at least four useful items.

## Generation Rules

The generator lives in [`scripts/generate-news.mjs`](/Users/savyarai/Documents/VS-Code/daily-news/scripts/generate-news.mjs). It:

- fetches each feed independently
- cleans malformed XML characters and unescaped ampersands before parsing
- skips failed feeds and records the reason
- filters obvious low-signal posts such as coupons, deals, gossip, sponsored content, and thin how-to posts
- scores stories for recency, source strength, event overlap, and impact terms
- deduplicates similar real-world events inside categories and across categories
- replaces today’s archive entry and keeps only the latest three generated days
- writes reader data to [`public/news-data.json`](/Users/savyarai/Documents/VS-Code/daily-news/public/news-data.json)
- writes a separate execution log to `dist-news-log.json`

## GitHub Pages

The workflow is [`News Pipeline`](/Users/savyarai/Documents/VS-Code/daily-news/.github/workflows/news-pipeline.yml).

It runs at `20:00 UTC`, which is `6:00 AM Australia/Sydney` during AEST, and also supports `workflow_dispatch` for manual runs.

To publish:

1. Push this repo to GitHub.
2. In the repository, open **Settings → Pages**.
3. Set **Build and deployment → Source** to **GitHub Actions**.
4. Run the workflow manually once from **Actions → News Pipeline → Run workflow**.

The workflow uploads `dist-news-log.json` as an artifact so feed failures and article counts stay out of the reader-facing page.

## Design Notes

The app is built as a static editorial briefing, not a dashboard or RSS grid. It uses section-specific accents, Motion-powered entry animations, responsive lead-story layouts, keyboard-friendly links, and `prefers-reduced-motion` support.

Sections use CSS `content-visibility: auto` so off-screen briefing content can be skipped until the browser needs to paint it. This keeps long mobile briefings smoother, but full-page screenshots, print-style captures, or automated visual tests may show unvisited off-screen sections as blank unless the page is scrolled first.

Primary UI files:

- [`src/main.jsx`](/Users/savyarai/Documents/VS-Code/daily-news/src/main.jsx)
- [`src/styles.css`](/Users/savyarai/Documents/VS-Code/daily-news/src/styles.css)

Future product ideas are tracked in [`BACKLOG.md`](/Users/savyarai/Documents/VS-Code/daily-news/BACKLOG.md).
