# ShopDesk

ShopDesk helps small businesses and freelance designers create promotional flyers, save client projects, and manage everyday pricing and cash calculations.

Current application: version 8, updated 14 September 2026.

## Features included

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

Use Node.js 24 with npm. From the project directory:

```sh
npm ci
npm test
npm run build
```

The build creates `dist/server/index.js` with embedded frontend assets, plus hosting metadata and database migrations under `dist/.openai/`.

This snapshot has no `npm run dev` script. Opening `public/index.html` directly does not provide the backend needed for saved projects and photo uploads.

## Project structure

| Path | Purpose |
| --- | --- |
| `public/` | Browser interface, poster rendering, promotion packs, business presets, and Designer Mode |
| `worker/index.js` | Worker request handler, account-scoped workspace API, and image storage API |
| `db/schema.ts` | Database schema |
| `drizzle/` | Database migrations |
| `scripts/build.mjs` | Production build |
| `tests/` | Automated tests |
| `.openai/hosting.json` | Existing Sites project and storage bindings |

## Hosting

The existing application runs on Sites using a Cloudflare Worker, a D1 database binding named `DB`, and an R2 bucket binding named `BUCKET`. The hosting manifest points to the existing ShopDesk Site.

Account identity comes from the trusted Sites authentication layer through the `oai-authenticated-user-id` header. Deployment outside Sites requires a verified authentication layer that prevents callers from spoofing this header, storage provisioning, and database migration setup. This is a Worker application, so GitHub Pages alone cannot run its backend.

## Source backup and saved business data

This repository contains the current application source, tests, migrations, and these setup notes. It does **not** contain saved clients, projects, product photos, logos, or other live database and bucket contents. Those remain in the running application's storage and require a separate data export for a full backup.

The initial GitHub import was a source snapshot. Earlier Sites commits were not imported. Installed dependencies and generated build output are excluded.
