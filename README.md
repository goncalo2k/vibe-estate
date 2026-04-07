# Property Agg

A Portuguese real estate aggregator that scrapes listings from multiple providers, stores them in a unified database, and uses Claude AI to analyze each property's value.

## What was built

### Monorepo structure (pnpm + Turborepo)

```
apps/
  api/       Cloudflare Workers API (Hono + D1)
  web/       React SPA (Vite + Tailwind + React Query)
packages/
  shared/    Zod schemas & TypeScript types shared across apps
```

### API (`apps/api`)

**Framework:** Hono on Cloudflare Workers with D1 (SQLite) as the database.

**Routes:**
- `GET/POST/PUT/DELETE /api/searches` — CRUD for saved search criteria (operation, price range, area, rooms, location, providers, email notifications)
- `GET /api/properties` — paginated, filterable property listings with sorting by price, area, score, or date
- `GET /api/properties/:id` — single property with its AI analysis
- `GET/POST /api/analysis/properties/:id/analysis` — trigger or retrieve Claude-powered property analysis
- `GET /api/health` — health check

**Provider system:** Pluggable provider interface (`PropertyProvider`) with implementations for:
- **Idealista** — API-based (requires API key/secret)
- **RE/MAX** — HTML scraper
- **Imovirtual** — HTML scraper

Each provider normalizes listings into a common `PropertyInsert` schema. The registry pattern makes adding new providers straightforward.

**Scheduled jobs (Cron triggers):**
- Every 2 hours: scrape all providers for each active search, upsert properties, then send email notifications for new matches
- Every 6 hours: batch-analyze up to 20 unanalyzed properties using Claude
- Daily at 3 AM: mark properties not seen in 7 days as inactive

**AI analysis:** Calls the Anthropic API (Claude Sonnet) to evaluate each property, returning a summary, rating (great_deal / good / fair / overpriced), score (1-100), price-per-m2 comparison against market averages, and pros/cons.

**Email notifications:** Uses Cloudflare Email Workers to send HTML digest emails when new properties match a saved search.

**Deduplication:** V1 relies on `UNIQUE(provider, external_id)` per provider. Cross-provider dedup (matching on location + rooms + area + price) is stubbed for future work.

### Web app (`apps/web`)

**Stack:** React 19, React Router, TanStack React Query, Tailwind CSS 4, Vite.

**Pages:**
- **Home** — property grid with filters (operation, type, price, area, rooms, location, provider) and pagination
- **Property detail** — full listing info with AI analysis badge (rating + score + pros/cons)
- **Searches** — manage saved search criteria with a form UI

**Type-safe API client:** Uses Hono's RPC type export so the frontend client is fully typed against the API routes.

### Shared package (`packages/shared`)

Zod schemas for properties, searches, analyses, and provider search params. Single source of truth for validation and TypeScript types used by both apps.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| API framework | Hono |
| AI | Claude (Anthropic API) |
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS 4 |
| Data fetching | TanStack React Query |
| Validation | Zod |
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript (ES2022, strict) |

## Getting started

```bash
pnpm install
pnpm dev          # starts both api (wrangler dev) and web (vite) via turbo

# Database
cd apps/api
pnpm db:migrate:local    # apply D1 migrations locally
pnpm db:migrate:remote   # apply to production
```

### Required environment variables (Cloudflare Workers secrets)

- `IDEALISTA_API_KEY` / `IDEALISTA_API_SECRET`
- `ANTHROPIC_API_KEY`
- `NOTIFICATION_EMAIL_FROM` / `NOTIFICATION_EMAIL_TO`
- `SEND_EMAIL` (Cloudflare Email Workers binding)
