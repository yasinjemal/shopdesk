# ShopDesk

ShopDesk helps small businesses and freelance designers create promotional flyers, save client projects, and manage everyday pricing and cash calculations.

The current source expands the design collection and product editing tools while retaining the shared template library, pricing tools, cash closing, and saved-data format.

## Features included

- A reusable template library with 30 ShopDesk starters, search, business filters, and a shared Community collection.
- Use a template to create a separate project with your current business details. Existing projects are never replaced.
- Share design settings alone, or explicitly include the headline and visible product names, pack sizes, and prices. Contact details, photos, dates, event details, and hidden products are excluded by an allowlist on the server.
- Unlist and relist your own shared templates. Existing copies belong to their recipients and remain unchanged.

- A redesigned workspace with Style, Content, and Business editor tabs, visual design previews, colour swatches, collapsible product cards, and an expanded flyer preview.

- Flyer designs for retail, food, fashion, beauty, and service businesses.
- Price Parade, Spotlight Shelf, and Paper & Ink add sale tickets, a lead-product shelf, and a restrained paper catalogue (34 designs total).
- Arc Gallery, Ticket Wall and Café Terrace add curved gallery details, perforated offer tickets and café awning stripes. Tangerine, petrol, raspberry, olive, indigo and cocoa extend the palette collection.
- Grocery combo flyers hold up to 20 visible product lines in 1–6 numbered frames. Combo Market, Bundle Tickets and Fresh Basket offer original grocery graphics with editable combo names and one complete-bundle price. A visual combo board lets you edit one basket at a time with its name, price and products together. Add products inside a basket, change quantities (1–99) with touch-friendly +/− controls, choose crafted names, reuse products from this flyer or saved items, and copy complete combos into independent variations. Move products between baskets or reorder within one. Copying respects both the 20-visible/25-retained product limits and the six-combo limit. Bulk and count controls remain under More product tools. Photos and individual prices are preserved. Empty combos are omitted; incomplete bundles cannot be downloaded. Individual prices and all reserved products remain available when returning to ordinary flyers. Promotion packs retain each complete combo on its own Status page, with matching itemised captions. Existing shapes, 4K output and A4/A5 print exports work with combos. Optional `draft.combos` and item `combo` / `quantity` fields extend schemaVersion 2 without database migrations. Shared designs omit private details and photos; combo wording/prices are included only when content sharing is selected.
- Ready-made wording offers three curated tones for each business type, with event, opening and spotlight variations. Apply a headline, small heading, contact message or footer independently, or choose a complete set. The last wording change can be undone while the picker is open. Choices stay editable and changing context never replaces text automatically. Suggestions are local, curated copy; they do not invent prices, discounts, delivery or availability.
- Business logos have 25% larger dimensions by default, with a Compact option for the original size. The renderer reserves space for the business name; the logo preference persists in projects, copies, shared styles and export pages.
- Six shapes: 4:5 portrait, 9:16 Status, 1:1 square, 16:9 landscape, A4, and A5.
- Standard or 4K PNG exports (3,840 px on the long edge), redrawn from the layout. A4/A5 always export at 300 dpi; PDF downloads carry the physical paper size and a 5 mm white margin. Print PDFs at Actual size / 100%. These are RGB raster PDFs for everyday printing, without commercial bleed or CMYK separations.
- New uploads preserve up to a 3,840-pixel long edge within the existing 1.5 MB stored-photo limit. Transparent PNG/WebP inputs remain transparent. Small originals are never enlarged during upload; previously saved photos retain their existing quality and can be replaced with larger originals.
- Preview photos are decoded at up to 1,000 pixels. Exports decode each stored source only to the size needed for its card and release temporary canvases afterwards.
- Promotion packs retain the chosen new shape and quality for the full flyer; Status pages remain 1080 × 1920 for easy sharing. Existing portrait/Status pack behaviour is preserved.
- Wholesale Board, Market Mosaic, and Fresh Focus bring compact retail grids, a large lead offer, and dark photo-focused panels to the collection.
- Multi-buy quantities display “2 for” (or another chosen quantity) against the total entered price. Quantities stay with saved products, shared content, project copies, captions, and exports.
- Optional promotion start dates alongside end dates. Invalid date ranges are saved as editable drafts but cannot be exported until corrected.
- Choose 1–25 products or services; layouts adapt automatically. The simple poster remains limited to three visible offers.
- Reduce the product count without losing the remaining items; increase it again to restore them.
- Super Saver, Corner Ribbon, and Signature Collection designs with distinct headers, price labels, and footers.
- 27 colour palettes, including sage, terracotta, lavender, peach, lemon, aqua, burgundy, and slate. Keep your chosen palette when changing designs with the optional colour lock.
- Move products up or down while retaining photos, framing, and featured status. Undo the last product removal within the active project without replacing other edits.
- Custom colours, logos, product photos, headlines, prices, contact details, and expiry dates.
- Promotional offers, menus, price lists, single-offer spotlights, events, and grand-opening announcements.
- Poster (4:5) and WhatsApp Status (9:16) PNG exports.
- Promotion packs containing a flyer, Status pages, a caption, and a ZIP download.
- Designer Mode with client profiles, named projects, and project duplication.
- My flyers: a searchable gallery of saved projects, with business and date-status filters, six layouts per page, and direct opening in the editor. Search includes visible product names and preserves hidden items.
- New editions copy an existing flyer into a separate project under its original business. Offer dates default to today through the next six days and can be edited; event copies use a new event date; evergreen menus retain their date settings. Designs, high-resolution preferences, photos, framing, multi-buy prices, and reserved items are preserved. The original project and saved products stay intact.
- Gallery date labels describe the entered dates, not a delivery schedule. They do not send messages or publish promotions.
- Account-based saving of workspaces and uploaded images.
- Pricing and margin calculator, plus daily cash closing summaries.

## Install, test, and build

Use Node.js 24 with npm. From the project directory:

```sh
npm ci
npm test
npm run build
```

Browser interaction checks use isolated, in-memory storage and exercise the real
workspace and photo API. They do not access live saved projects:

```sh
npx playwright install chromium
npm run test:browser
```

Set `SHOPDESK_BROWSER_CHANNEL=chrome` to use an installed Google Chrome instead.
The checks cover mobile touch at 320px and 390px and desktop at 1280px: pasted
lists, saved-product selection and flyer-only prices, featured offers, photo
upload/framing/reset, PNG/ZIP downloads, persistence after reload, full-project
feedback (including retained items), design and palette interactions, colour-lock persistence, ordering and undo with retained items, shared-template reuse, and recovery after a loading failure. These are browser emulations;
physical-device and signed-in production behavior still need separate verification.

If product selections are disabled, check the capacity message at the top of the
product dialog. Adding products fills empty cards or appends items; it does not
replace existing offers. A project retains up to 25 items, including items hidden
by reducing the visible count. Remove an unwanted item or start a new project to
free space; changing the count alone preserves the hidden items.

The build creates `dist/server/index.js` with embedded frontend assets, plus hosting metadata and database migrations under `dist/.openai/`.

`npm run dev` starts an isolated local preview at `http://127.0.0.1:4173` with an in-memory database and photo store. Preview data resets when stopped. Its test identity header is strictly a local testing facility, never production authentication. Opening `public/index.html` directly does not provide the backend needed for saving or uploads.

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

The source also supports browser-local saving and photo storage on non-Sites deployments. Loopback development hosts use the isolated Worker API so persistence and ownership checks are exercised during local tests.

## Source backup and saved business data

This repository contains the current application source, tests, migrations, and these setup notes. It does **not** contain saved clients, projects, product photos, logos, or other live database and bucket contents. Those remain in the running application's storage and require a separate data export for a full backup.

The initial GitHub import was a source snapshot. Earlier Sites commits were not imported. Installed dependencies and generated build output are excluded.

The shared library uses the additive `0001_reflective_junta.sql` migration and a separate `shared_templates` table. Existing workspaces, photo storage, and schemaVersion 2 records are unchanged. API access requires sign-in; owner checks protect listing changes. Templates use 12-item cursor pagination, bounded inputs, idempotent share requests, and a 100-template limit per account. Template availability follows the Site's access settings; adding a library does not make a private Site public.

The library is a first release for the existing audience, not an unattended public marketplace. Before a broad public launch, decide on moderation/reporting, support, data backup and recovery, pricing, and how new users gain access. Never auto-publish private drafts or infer revenue from usage alone.

The design library includes 34 designs, 27 palettes, four typography settings, and four price-label settings. The retail designs support 1–25 offers, with adaptive square and landscape compositions and portrait print layouts. Market Mosaic gives the first product a larger space unless another offer is featured. Category filters help browse styles. Finishes save with each project and carry into promotion packs; older drafts retain their content and settings, with the requested larger logo default (choose Compact for the original logo size). Optional `logoSize`, `exportQuality`, `keepColours`, `startDate`, and item `dealQuantity` values use the existing JSON records without a database migration. Missing quantities mean normal single-item pricing. Shared templates exclude promotion dates. Undo is temporary, clears when switching projects or reloading, and requires room for the restored item.

Product workflow: paste comma-, tab-, semicolon- or pipe-separated lists for an editable review; select multiple saved products with search and flyer-only price edits; frame product photos with scale and position controls and resolution warnings; feature one offer in a larger layout. Framing and featured selections persist with the project and are retained in PNG and promotion-pack exports. Batch additions preserve existing offers and reserved products.

Grocery design research: [Food Lover’s Market retailer catalogue](https://promotions.foodloversmarket.co.za/view/347199588) distinguishes fixed, itemised combos from “any 2” deals and shows exact pack sizes, complete bundle prices and promotion dates. The combo layouts apply these principles with original ShopDesk graphics; no retailer branding is copied.
