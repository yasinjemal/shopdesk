# Product entry research: how to make adding products effortless

Goal: a grocer, wholesaler, takeaway or salon owner should get a product onto a flyer in one tap, with its size and a picture, without typing more than a word or two. Everything below was weighed against three rules: never invent a price or claim, never put a photo on a flyer that the person is not allowed to use, and always keep manual entry one tap away.

## Options considered

| Approach | What it gives | Cost and risk | Decision |
| --- | --- | --- | --- |
| **Built-in curated catalogue** of common products with sizes, departments and synonyms | Works offline, instantly, in every browser; tuned to what South African shops sell; no licensing | Needs curation; cannot know every product | **Built.** 257 entries across pantry, dairy, bakery, butchery, produce, frozen, beverages, snacks, household, personal care, baby, pet, airtime, stationery, hardware, takeaway, salon, fashion and services. |
| **The person's own history** (saved items, recent picks, last prices and sizes) | The most relevant data there is; prices are theirs | Needs to rank first and never overwrite | **Built.** Saved items and recent picks rank first; last size and price appear on the chip. |
| **Original illustrations** drawn in code | Every offer looks finished before a photo exists; coloured to match the design; crisp at 4K and print; no copyright | Generic by nature; cannot show a specific brand | **Built.** 103 illustrations rendered on demand. A real photo always replaces one. |
| **Open Food Facts** barcode lookup (ODbL data, CC BY-SA photos) | Name and pack size from a barcode; growing South African coverage | Photos carry share-alike and packaging rights, so they cannot go on a flyer; coverage patchy outside Europe; needs network; API asks for an identifying User-Agent | **Built for names and sizes only.** Camera scanning where `BarcodeDetector` exists, typed barcode everywhere, with attribution and an honest fallback message. |
| **GS1 / Verified by GS1** | Authoritative product registry | No free public API found for South Africa | Not used. |
| **Retailer catalogue data** (aggregator sites, retailer PDFs) | Real local products | Scraping third-party catalogues and reusing their photos is not permitted | Not used; only studied for conventions. |
| **Community product library** (people share product entries and photos) | Grows with use; local relevance | Moderation, photo rights, privacy of prices | Deferred. The existing shared-template allowlist is the model if this is added later. |
| **Voice entry** (Web Speech API) | Say "maize meal 12.5 kg 119.99" | Online only in most browsers; accuracy varies with accents | **Built as a progressive enhancement**; the button appears only where the API exists, and the text goes through the same parser as typing. |
| **Camera OCR of shelf labels or invoices** | Fast capture of many prices | Needs a server-side OCR service and careful review of every number | Deferred. |
| **Generated photos (AI image models)** | Attractive pictures from a name | Cost per image, invented packaging, trust and rights questions | Not used. Illustrations give the finished look without inventing a product. |
| **Supplier price list import** | Many products at once | Already covered by paste-a-list | **Improved.** Pasted rows now pick up illustrations and departments automatically. |

## How the search works

1. **Normalise** what was typed (case, punctuation, `&`).
2. **Pull out the size and price** first: `mielie meal 12.5kg 119.99` becomes query "mielie meal", size "12.5 kg", price "119.99". Units handled: kg, g, ml, L, m, mm, cm, MB, GB, V, pack, tray, dozen, ream, roll, box, bag, pocket, "per kg", "each", "serves", "size".
3. **Score every catalogue entry** against its name, synonyms and size names. Exact match, then prefix, then a spelling slip (one edit for words of five letters, two for eight), then substring.
4. **Boost** the person's saved items and recent picks, the current business type and, when set, the flyer's department.
5. **Order sizes** so their own last size comes first, then the size they typed, then the common sizes.
6. **Fall back honestly**: whatever is not matched is added exactly as typed, with the parsed size and price.

## What a lazy path looks like now

- Type "maize" → tap "12.5 kg" → type the price. Three actions, one product with an illustration and department.
- Paste a supplier list → every known product gets an illustration and department; nothing else is touched.
- Scan a barcode → name and size arrive → tap "Add to flyer" → type the price.
- Say "chicken braai pack 5 kg 89.99" → the parser fills name, size and price.

## Sources

- Open Food Facts licence and API terms: [API tutorial, "Be on the legal side"](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/) and [API conditions](https://support.openfoodfacts.org/help/en-gb/12-api-data-reuse/94-are-there-conditions-to-use-the-api): database under ODbL, images under CC BY-SA, identify your app, respect rate limits.
- GS1 South Africa: [factsheet on barcodes in Africa](https://www.tralac.org/documents/resources/factsheets/7966-barcodes-empower-africa-s-enterprises-and-consumers-factsheet-august-2026.html) and [GS1 services](https://asset.gs1.org/services): GS1 SA issues 600/601 prefixes; no free public product-lookup API was found.
- South African leaflet conventions already recorded in `docs/catalogue-research.md`.
