# ShopDesk

ShopDesk helps small businesses and freelance designers create promotional flyers, save client projects, and manage everyday pricing and cash calculations.

Current application: version 11, updated 14 September 2026.

## Features included

- A redesigned workspace with Style, Content, and Business editor tabs, visual design previews, colour swatches, collapsible product cards, and an expanded flyer preview.

- Flyer designs for retail, food, fashion, beauty, and service businesses.
- Choose 1–25 products or services; layouts adapt automatically. The simple poster remains limited to three visible offers.
- Reduce the product count without losing the remaining items; increase it again to restore them.
- Super Saver, Corner Ribbon, and Signature Collection designs with distinct headers, price labels, and footers.
- Nine colour palettes, including Ocean teal, Midnight gold, and Berry pink.
- Custom colours, logos, product photos, headlines, prices, contact details, and expiry dates.
- Promotional offers, menus, price lists, single-offer spotlights, events, and grand-opening announcements.
- Poster (4:5) and WhatsApp Status (9:16) PNG exports.
- Promotion packs containing a flyer, Status pages, a caption, and a ZIP download.
- Designer Mode with client profiles, named projects, and project duplication.
- Account-based saving of workspaces and uploaded images.
- Pricing and margin calculator, plus daily cash closing summaries.

## Install, test, and build

Use Node.js 22 or newer with npm. From the project directory:

```sh
npm ci
npm test          # unit and API tests (Worker, Vercel API, browser storage, flyer logic)
npm run build     # Cloudflare Worker bundle in dist/
npm run dev       # local server that behaves like the Vercel deployment (http://localhost:3000)
npm run test:e2e  # optional browser tests; needs Playwright and Chromium (PLAYWRIGHT_PATH=/path/to/playwright)
```

`npm run build` bundles the Worker, the shared API core and the D1/R2 adapter into `dist/server/index.js` with the frontend embedded, plus hosting metadata and database migrations under `dist/.openai/`. `npm run build:vercel` only checks that the Vercel files are present; Vercel serves `public/` and `api/` directly.

## Project structure

| Path | Purpose |
| --- | --- |
| `public/` | Browser interface, poster rendering, promotion packs, business presets and Designer Mode |
| `public/storage.js` | Browser storage layer: talks to `/api/*`, or switches to labelled Browser demo mode (localStorage + IndexedDB) when the server has no storage |
| `server/core.js` | Shared API: validation, revision checks, photo rules, JSON errors |
| `server/adapters/cloudflare.js` | `CloudflareStorageAdapter`: D1 workspaces + R2 photos |
| `server/adapters/vercel.js` | `VercelStorageAdapter`: Supabase Postgres + Storage over REST |
| `server/auth.js`, `server/vercel.js` | Signed HttpOnly identity cookie and the Vercel request handler |
| `worker/index.js` | Cloudflare Worker entry (owner from the trusted Sites header) |
| `api/` | Vercel function routes (`studio`, `photos`, `photos/[id]`, `workspace`, `health`, and a JSON catch-all) |
| `supabase/migrations/` | SQL for the Vercel database |
| `db/schema.ts`, `drizzle/` | Cloudflare D1 schema and migrations |
| `scripts/` | `build.mjs` (Worker), `dev.mjs` (local server), `check-vercel.mjs` |
| `tests/`, `e2e/` | Automated tests |
| `.env.example` | Environment variables for Vercel |

## Deployment targets

ShopDesk runs on two targets and the browser code is identical on both.

| | Cloudflare (Sites) | Vercel |
| --- | --- | --- |
| Entry | `worker/index.js` | `api/*.js` + static `public/` |
| Workspaces | D1 (`DB`) | Supabase Postgres |
| Photos | R2 (`BUCKET`) | Supabase Storage (private bucket) |
| Identity | `oai-authenticated-user-id` header from the Sites auth layer | Signed HttpOnly cookie (`SHOPDESK_AUTH_SECRET`) |
| Not configured | n/a | Browser demo mode |

### Why Vercel used to show "Unexpected token 'T'…"

The original app is a Worker that owned both the pages and `/api/*`. Vercel only served `public/`, so `/api/studio` returned Vercel's HTML 404 ("The page could not be found") and the browser tried to parse it as JSON. Now `api/` provides the routes, every API path answers JSON (including errors and unknown paths), and the browser refuses to parse non-JSON, switching to demo mode instead.

### Deploy on Vercel with Supabase (free tiers)

1. **Supabase project**: create a project at supabase.com. In *SQL editor*, run `supabase/migrations/0001_shopdesk.sql`.
2. **Storage bucket**: *Storage → New bucket* named `shopdesk-photos`, **private** (leave "Public bucket" off).
3. **Keys**: *Project settings → API*: copy the project URL and the `service_role` key. The service-role key bypasses row-level security, so it must only ever be a Vercel environment variable, never committed and never in `public/`.
4. **Vercel project**: import the GitHub repository. Framework preset **Other**; `vercel.json` already sets the output directory (`public`) and build command. Do not override them.
5. **Environment variables** (Project → Settings → Environment Variables, for Production and Preview), see `.env.example`:

   | Variable | Value |
   | --- | --- |
   | `SUPABASE_URL` | `https://<project>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | the `sb_secret_…` key (Project settings → API Keys → Secret keys) or the legacy `service_role` key; server only |
   | `SUPABASE_STORAGE_BUCKET` | `shopdesk-photos` |
   | `SHOPDESK_AUTH_SECRET` | random 32+ characters, e.g. `openssl rand -base64 48` |
   | `SHOPDESK_STORAGE_MODE` | optional: `supabase` to fail loudly if misconfigured, or `local` to force Browser demo mode |

6. **Deploy**, then check `https://<your-app>.vercel.app/api/health`. It must return JSON with `"mode":"supabase"`. `"mode":"demo"` means the Supabase variables are missing. `https://<your-app>.vercel.app/api/studio` must return `{"data":null,"revision":0}` (JSON, never HTML).

### Browser demo mode

If the Supabase variables are absent (or `SHOPDESK_STORAGE_MODE=local`), `/api/health` reports `demo` and the app shows a **Browser demo mode** banner. Workspaces are saved in `localStorage` and photos in IndexedDB. Everything works, including exports, but the data is **not shared across devices or browsers** and is lost if site data is cleared. If the browser blocks storage or is full, the app says so instead of failing silently.

### Identity and ownership on Vercel

There are no accounts on Vercel. The first visit receives a random id in an `HttpOnly`, `SameSite=Lax` (and `Secure` on https) cookie signed with `SHOPDESK_AUTH_SECRET`. The owner is only ever derived from a valid signature, never from a header, query or body, so one browser cannot read another browser's workspace or photos, and a photo can only be attached to its owner's workspace. Limitations: clearing cookies or switching browser or device starts an empty workspace, and rotating `SHOPDESK_AUTH_SECRET` orphans existing data. Add real sign-in before treating this as multi-device storage. Writes reject cross-site origins; JSON bodies are limited to 1.5 MB (100 KB for the legacy workspace route), photos to 1.5 MB JPEG with 250 per browser.

### Cloudflare (Sites)

Unchanged: the Worker uses the D1 binding `DB`, the R2 binding `BUCKET` and the trusted `oai-authenticated-user-id` header. Deployment outside Sites requires an authentication layer that prevents callers from spoofing this header.

## Source backup and saved business data

This repository contains the current application source, tests, migrations, and these setup notes. It does **not** contain saved clients, projects, product photos, logos, or other live database and bucket contents. Those remain in the running application's storage and require a separate data export for a full backup.

The initial GitHub import was a source snapshot. Earlier Sites commits were not imported. Installed dependencies and generated build output are excluded.

The design library includes 16 templates, 13 palettes, four typography settings, and four price-label settings. Colour Block, The Edit, Neon Night, Warehouse Deals, Atelier and Street Kitchen each support 1–25 offers. Category filters help browse styles. Finishes save with each project and carry into promotion packs; older drafts retain their original look.

Product workflow: paste comma-, tab-, semicolon- or pipe-separated lists for an editable review; select multiple saved products with search and flyer-only price edits; frame product photos with scale and position controls and resolution warnings; feature one offer in a larger layout. Framing and featured selections persist with the project and are retained in PNG and promotion-pack exports. Batch additions preserve existing offers and reserved products.
