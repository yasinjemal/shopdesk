# Handbill

Handbill is a platform for creating professional, ready-made business flyers. Grocery stores, supermarkets, wholesalers and neighbourhood shops are the primary audience; restaurants, bakeries, beauty businesses, fashion shops and service businesses are supported with their own templates.

Someone with no design experience picks a finished-looking template, replaces the products and business details, and downloads a polished flyer.

**Choose a template → Add your offers → Add your branding → Preview and download.**

Handbill is the continuation of the ShopDesk codebase. The repository name, hosting project, storage bindings, API routes, local-storage keys and the `schemaVersion 2` record format are unchanged, so existing clients, projects, products, photos, logos, shared templates and saved favourites keep working.

## The brand

- **Name:** Handbill. A handbill is a small printed flyer handed out or pinned up; the name reads as a flyer product without tying it to one business type.
- **Mark:** a folded yellow price-tag sheet on a navy tile (inline SVG favicon and sidebar mark; `public/og.png` is the social preview).
- **Colours:** navy `#132032` chrome, market green `#0e7a5a` actions, tag yellow `#ffcf3f` accents, warm paper `#f6f4ee` canvas.
- **Type:** Manrope for headings, DM Sans for interface text. Flyer designs keep their own typography systems.
- **Voice:** short, practical, no invented claims. Suggestions are offered, never applied automatically.

## The user flow

1. **Templates (opening page).** A searchable gallery leads with Grocery & supermarket and filters by business, promotion type (weekly specials, weekend, wholesale catalogue, fresh produce, butchery, bakery, household essentials, single product, combos, sale, menu, collection, services, event, opening), visual style and output format. Every card shows a realistic example preview rendered from the actual design with sample products. Using a template always creates a separate, independent flyer; the examples never enter the project.
2. **Design.** Swap the design, choose a palette, apply a coordinated look (palette + typeface + price-label style in one tap), set the size and shape. Grocery designs come first in the editor gallery.
3. **Offers.** Choose what the flyer is for and a promotion type, pick crafted wording, add 1–25 products or build 1–6 combos, paste lists or reuse saved items, upload and frame photos, feature one offer.
4. **Branding.** Business name, logo (prominent by default), contact number, location and business type.
5. **Download.** The live preview is always beside the editor (and one tap away on phones). Standard or 4K PNG, A4/A5 print PDFs, promotion packs and copyable offer text.

The project bar keeps businesses and saved flyers together; **My flyers** opens the searchable gallery of saved work, with open, duplicate and new-edition actions.

## Flyer designs

59 designs, 33 palettes, four typography settings and four price-label settings, with optional previous prices, department tags and badges on every design. All design identifiers are unchanged; the twelve grocery designs below are additions.

### Customise any design

Every design accepts the same finishing controls from the **Customise colours, badges & finish** panel in step 1, so a shop can make a template its own without leaving the four-step flow. Each setting is an additive field on the saved draft; flyers saved before these controls existed render exactly as they did.

| Control | Choices | What it does |
| --- | --- | --- |
| Background | Design default, depth & gradient, dotted texture, diagonal stripes, paper grain | Dresses the page and every full-width band of the design |
| Offer cards | Design default, lifted with shadow, outlined in brand colour | Painted after the design, outside each card, so card artwork is untouched |
| Photo shape | Design default, rounded corners, circle | Clips product photos and illustrations; logos and hero photos are never clipped |
| Price size | Standard, large, huge | Scales the price box in every card family; names and photos make room |
| Headline | As typed, ALL CAPITALS | Case only; the wording is never rewritten |
| Badge style | Starburst sticker, ribbon, rounded pill, none | How offer badges are drawn, straddling the card corner like a leaflet sticker |
| Automatic “SAVE R…” badges | On or off | Only on offers with a genuine previous price; the amount is the two prices subtracted |
| Your own brand colours | Three colour pickers, seeded from the chosen palette | Replace the palette's main, accent and background colours for any design |

Each offer also takes its own badge (up to 14 characters, with presets such as NEW, BEST BUY and MULTI-BUY). Offers that never had an illustration chosen borrow the catalogue's illustration for their product name, so blank photo boxes no longer appear; removing an illustration is remembered. New projects created from starters open with depth, shadows, large prices and savings badges switched on; shared templates keep their author's exact finishes and colours, which are part of the design and never private.

| Design | Composition | Image treatment | Price label system |
| --- | --- | --- | --- |
| Supermarket Leaflet | Red masthead with a yellow slash carrying the campaign words, dense white cards | Large product photos at the top of every card | Yellow price flash across the card foot with red numerals and cents |
| Mega Deal | Black page, hazard stripes in the masthead corner, heavy capitals | Photos framed by thick yellow rules | Black price plate with a yellow edge and yellow numerals |
| Fresh Market | Green masthead with a curved foot and leaf shapes | Round photo stages on white cards | Rounded green tag with white numerals |
| Premium Deli | Navy page, gold hairlines, serif headings | Square photos with a gold hairline frame | Gold numerals over a short gold rule |
| Weekend Burst | Starburst heading, rounded cards, horizontal cards when wide | Full-card product photos | Round brand badge with an accent ring (pill when dense) |
| Butcher’s Block | Striped awning masthead, dark board, kraft panels | Square framed photo windows | White price tag with an accent rule, pack band in brand colour |
| Bakery Board | Chalkboard with dashed chalk frames, serif type | Oval photo windows | Soft accent price pill, centred text |
| Household List | Ticked list rows, pack-size pills | Small square thumbnails | Right-aligned bold price with accent underline |
| Big Price | One hero card plus compact deals, or a single-product spotlight | Photo beside the price | Oversized brand price with a thick accent bar |
| Cash & Carry | Catalogue table with Product / Pack / Price columns | Thumbnail cells | Accent price ticket with brand edge |
| Produce Crate | Slatted crate frames with nail-head corners | Full-width photos | Hanging chalk tag with a string |
| Tag Sale | Swing-tag cards with punched holes and strings | Centred photos | Large centred ticket price on white |

Grocery promotion coverage: weekly specials, weekend promotions, wholesale catalogues, fresh produce, butcheries, bakery offers, household essentials, single-product promotions and grocery combos each have at least one dedicated starter. Ordinary flyers hold 1–25 products; combo flyers hold up to 20 visible products in 1–6 editable baskets with names, quantities and one complete price per bundle.

Promotion types are an optional `draft.promotion` value (additive, no migration). They shape wording suggestions and gallery filters only; they never change prices or text.

### Adding products in one tap

`docs/product-catalogue-research.md` compares every approach considered for effortless product entry. What shipped:

- **A built-in product catalogue** of 257 common products for grocery, wholesale, takeaway, bakery, salon, fashion, hardware and service businesses, each with its common pack sizes, department and the words people actually type (synonyms, spelling slips, local names such as "mielie meal" or "kota"). No prices and no brands are built in.
- **Suggestions as you type**, in the quick-add bar and in every product name field. Typing "maize" shows Maize meal with size chips; typing "chicken braai pack 5kg R89.99" fills name, size and price in one go. The person's own saved items, recent picks, last sizes and last prices rank first. Anything not in the list is kept exactly as typed.
- **103 original illustrations**, drawn in code and coloured to match the design, so an offer looks finished before a photo exists. A real photo always replaces the illustration. Pasted lists pick up illustrations and departments automatically.
- **Find product & photo** (`docs/product-catalogue.md`): one dialog that searches the person's private saved products and the built-in list instantly, and Open Food Facts only when “Search online” is pressed (by name or by check-digit-validated barcode). It shows image, name, brand and pack together, respects exact pack sizes (5 kg never stands in for 10 kg), asks for the shop's own selling price, optionally includes the public product photo with its CC BY-SA credit stored in file metadata rather than on the flyer, remembers the product privately for the business, and offers an optional wholesale case quantity. Replacing an offer keeps its combo, quantity and featured state. Nothing is ever scraped from Google or retailer sites, no prices or sizes are invented, and the browser never talks to the provider directly.
- **Voice entry** where the browser offers speech recognition; the words go through the same parser as typing.

### Leaflet conventions (catalogue study)

`docs/catalogue-research.md` records a study of my-catalogue.co.za, the South African catalogue aggregator, and the retail leaflets it lists. The conventions it surfaced became these features:

- **Previous price and saving.** Each offer can carry an optional previous price. It is struck through inside the price plate with the saving worked out from the two numbers, on every design, in captions and in shared content. Nothing is shown unless the person typed it.
- **Department tags.** An optional section label (Fresh produce, Butchery, Household…) appears as a tag on the card in every design, with a datalist of common departments.
- **Catalogue pages.** A4 and A5 exports with more than twelve offers can print as a numbered multi-page catalogue PDF that repeats the heading and contact strip on every page. The choice is saved with the flyer as `draft.printPages`.
- **Weekday validity dates.** Flyer dates print as "Valid Thu 8 October – Wed 21 October 2026".
- **New promotion types and starters.** Month-end specials, seasonal savings and hardware & building, with ten catalogue-style starters (73 in total) including a multi-page month-end catalogue, a 25-line cash-and-carry list, a build & hardware price list and an A5 butchery board.

## Grocery design research

Sources used for the price hierarchy, pack-size, date and contact conventions in the grocery designs. Several pages could only be read through search summaries from this environment; the statutory source was read directly.

- Consumer Protection Act 68 of 2008, section 23 (South Africa), [Acts Online text](https://www.acts.co.za/consumer-protection/23_disclosure_of_price_of_goods_or_services) and [GoLegal commentary](https://www.golegal.co.za/consumer-rights-consumer-protection/): a price in a catalogue, brochure or circular is adequately displayed when the publication states the period for which the price applies, or is dated and still current. Handbill therefore keeps validity dates prominent and requires an end date before export when dates are shown.
- [CVS Circular Creative Guidelines](https://p2pi.com/file/PtPI162fabdcb01e5c545658920/CVS%20Circular%20Creative%20Guidelines.pdf): price and product are the priority in a circular; brand messaging is secondary to a clear, value-led layout.
- [Canadian Grocer, “Five principles of effective print flyer engagement”](https://canadiangrocer.com/five-principles-effective-print-flyer-engagement): keep backgrounds simple, avoid clutter, give products and prices room.
- [Made Good Designs, catalogue design principles](https://madegooddesigns.com/catalog-design-principles/) and [flyer design guide](https://madegooddesigns.com/flyer-design/): one consistent grid, larger hero items, prices in a predictable position and style, consistent product photography, contact details as the final reading tier.
- [Publitas, flyers redesigned for mobile](https://www.publitas.com/blog/examples-of-flyers-with-improved-design): fewer items per page and larger prices read better on phones, which guided the Status and square compositions.
- Print guidance from [Doxdirect](https://doxdirect.com/blog/mastering-canva-7-tips-for-creating-print-ready-pdfs) and [Paperlust](https://printshop.paperlust.co/blog?p=3349): 300 dpi at final size, keep text inside a safe margin, RGB files shift in CMYK print. Handbill exports A4/A5 at 300 dpi with a 5 mm white margin and describes its PDFs as RGB raster files for everyday printing, not commercial CMYK or bleed-ready files.
- Retailer catalogue conventions already recorded for the combo and circular layouts: [Food Lover’s Market](https://promotions.foodloversmarket.co.za/view/347199588) and [Pick n Pay](https://cdn-prd-02.pnp.co.za/media/2025/catalogues/week23/BLFSHS1765_02_04082025_24082025_PnP%20Specials.pdf) show itemised combos with one complete price, exact pack sizes, per-kilogram butchery pricing and validity dates. All Handbill graphics are original; no retailer branding or third-party template artwork is copied.

## Screenshots and verification

`docs/catalogue-research.md` records the catalogue study. `docs/screenshots/` holds captures from the isolated local preview at 320 px, 390 px and 1280 px: the template gallery, each editor step, the combo board with 20 products in six baskets, My flyers, the wording picker, the legacy pricing page, a sheet of the eight grocery designs, a sheet of the four leaflet designs, two finish sheets (textures, shadows, badges and custom colours applied across design families), the Customise panel at 320 px and 1280 px, the phone editor with its floating live flyer and the phone preview dialog, and a sheet of exported files (4K combo flyer, A4 export and a flyer exported from an upgraded schemaVersion 1 workspace).

Verified in this environment: 62 unit tests and 35 browser checks pass; the production build completes; standard, 4K (3,840 px long edge), A4 (2,480 × 3,508) and A5 PDF (419.5 × 595.3 pt) exports have the expected dimensions; a crowded 20-product, six-basket combo flyer exports at 4K; and a schemaVersion 1 workspace saved through the old API opens, upgrades and exports.

## Built for phones first

Most shop owners work from a phone, so the editor is arranged for one thumb:

- The first screen reaches the work: on phones the page introductions and the gallery's step strip are hidden, so templates and the step bar appear immediately.
- The four-step bar sticks to the top of the screen while the long offers form scrolls.
- A floating **See flyer** thumbnail shows the live flyer from any step. Tapping it opens the full preview with a download button and a note on anything still missing, so nobody scrolls to the bottom to check a change.
- **Share to WhatsApp & more** uses the phone's own share sheet to send the exported PNG, with the offer text as the message, wherever the browser can share files. Elsewhere the button stays hidden and the download works as before.
- Every control keeps a 44 px touch target, prices open the decimal keypad, and the checks run at 320 px and 390 px as well as desktop.

## Features kept from ShopDesk

- 43 original starters with their identifiers and contents (`starter-0` … `starter-42`); 30 new starters are appended.
- Community template library with explicit allowlisted sharing, unlisting and account ownership checks. Private flyers are never published automatically.
- Saved businesses (clients), projects, products, photos, logos, hidden items, photo framing, featured offers, multi-buy quantities, combo quantities and reserved items.
- Six shapes (4:5, 9:16 Status, 1:1, 16:9, A4, A5), standard and 4K PNG exports, A4/A5 print PDFs and promotion packs with Status pages and a caption.
- Upload handling that preserves transparency, keeps up to a 3,840-pixel long edge within the stored-photo limit, never enlarges small originals, and warns when a small original limits export quality.
- Crafted wording with three tones, now also per promotion type; the last wording change can be undone while the picker is open.
- The pricing calculator and daily cash closing remain available from **More shop tools** in the sidebar, the footer and the `#pricing` / `#cash` routes. They are no longer in the primary navigation.

## Install, test and build

Use Node.js 22 or newer with npm. From the project directory:

```sh
npm ci
npm test
npm run build
```

Browser interaction checks use isolated, in-memory storage and exercise the real workspace and photo API. They never touch live saved projects:

```sh
npx playwright install chromium
npm run test:browser
```

Set `SHOPDESK_BROWSER_CHANNEL=chrome` to use an installed Google Chrome, or `SHOPDESK_BROWSER_EXECUTABLE=/path/to/chromium` to point at an existing Chromium build when the Playwright download is unavailable. The checks cover 320 px and 390 px touch layouts and a 1280 px desktop: the template gallery and its filters, template reuse and sharing between accounts, pasted lists, saved products, featured offers, photo upload and framing, every design family including the grocery designs, coordinated looks, PNG/PDF/ZIP downloads, persistence after reload, combo editing, saved-flyer search, new editions, recovery after a loading failure, and the Find product & photo flow with a stubbed provider (local-first search, explicit online search, exact packs, photo credits in PNG, PDF and pack files, replacement, combos and failure recovery).

`npm run dev` starts an isolated local preview at `http://127.0.0.1:4173` with an in-memory database and photo store. Its test identity header is strictly a local testing facility, never production authentication. Opening `public/index.html` directly does not provide the backend needed for saving or uploads.

The build creates `dist/server/index.js` with embedded frontend assets, plus hosting metadata and database migrations under `dist/.openai/`.

## Project structure

| Path | Purpose |
| --- | --- |
| `public/index.html`, `styles.css` | Interface shell: template gallery, four-step editor, dialogs |
| `public/poster.js` | Canvas renderer for all 59 designs, the finish engine (backdrops, card shadows, photo shapes, price size, badges, brand colours), shapes and exports |
| `public/templates.js` | Starter templates, promotion types, allowlisted sharing format |
| `public/samples.js` | Example products used only for previews |
| `public/products.js`, `illustrations.js`, `finder.js` | Product catalogue and search, original illustrations, the Find product & photo dialog (barcode, online search, voice entry) |
| `public/words.js`, `wording.js` | Crafted wording by business and promotion type |
| `public/library.js` | Template gallery page and sharing |
| `public/promotion.js`, `items.js`, `combos.js`, `batch.js` | Editor, product tools and combo board |
| `public/projects.js`, `project-gallery.js`, `studio.js` | Saved flyers, editions and workspace records |
| `public/output.js`, `pack.js`, `photos.js` | PNG/PDF exports, promotion packs, photo preparation |
| `worker/index.js` | Worker request handler, account-scoped workspace API, image storage API, catalogue search and provider photo retrieval |
| `db/schema.ts`, `drizzle/` | Database schema and additive migrations |
| `scripts/build.mjs`, `scripts/local-server.mjs` | Production build and isolated local preview |
| `tests/` | Unit tests and Playwright browser checks |
| `.openai/hosting.json` | Existing Sites project and storage bindings |

## Hosting and data

The application runs on Sites using a Cloudflare Worker, a D1 database binding named `DB` and an R2 bucket binding named `BUCKET`. The hosting manifest points to the existing project; identifiers were deliberately left unchanged.

Account identity comes from the trusted Sites authentication layer through the `oai-authenticated-user-id` header. Deployment outside Sites requires a verified authentication layer that prevents callers from spoofing this header, storage provisioning and database migration setup. The source also supports browser-local saving and photo storage on non-Sites deployments.

This repository contains the application source, tests, migrations and these notes. It does not contain saved businesses, projects, product photos, logos or other live database and bucket contents.

## Limitations

- Print PDFs are RGB raster files with the correct paper size, 300 dpi and a 5 mm white margin. They are not CMYK-separated or bleed-ready commercial print files.
- Example previews in the gallery use sample products and prices so the result is clear; Handbill never invents prices, discounts, delivery, stock availability or other claims for a real flyer.
- Shared community templates are not tagged by visual style, so the style filter applies to ready-made templates only.
- Browser checks are emulations. Physical devices and the signed-in production deployment still need separate verification.
- Online product search depends on Open Food Facts, whose South African coverage is partial; local search and manual entry always work. See `docs/product-catalogue.md` for the full list of catalogue limitations.
