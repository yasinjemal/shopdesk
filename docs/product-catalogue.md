# Find product & photo: the catalogue workflow

Handbill helps a shop owner add an offer by typing a product name or a barcode,
choosing the exact pack, entering their own price and, when a public photo
exists, including it with proper credit. This document explains how the flow
works, where the data comes from, what the licences require, how to grow the
catalogue and what the system deliberately does not do.

## The flow inside the editor

1. **Find product & photo** opens from the quick-add bar or from any offer card
   (where it replaces that offer in place).
2. **Local results appear instantly** on every keystroke and never leave the
   browser. The person's own saved products for the business come first, marked
   *private*; the built-in list of 257 common products follows. Local search
   understands aliases (pap, maize meal, mielie meal; cooking oil, sunflower
   oil; cooldrink, soft drink; washing powder, laundry powder), forgives one
   spelling slip from four letters and two from eight, and parses sizes and
   prices typed inline ("maize meal 10kg 89.99", "milk 6x1l").
3. **Exact pack sizes are respected.** A size is compared by quantity and unit,
   so "10kg", "10 kg" and "10 KG" are the same pack and 5 kg never satisfies a
   request for 10 kg. A size the family does not list is kept exactly as typed
   and marked as the person's own size rather than swapped for a near one.
4. **Search online is an explicit button.** Nothing is sent to a provider while
   typing. The button calls the Worker, never a provider directly, and the
   Worker answers from a short cache when it can. Barcodes are checked by their
   check digit (GTIN-8, 12, 13 and 14) before anything is sent; a failing code is
   explained rather than looked up.
5. **Choose exact pack, your selling price, include product photo, remember for
   this business.** The detail panel shows image, name, brand and pack together,
   with the price input prominent. Online records with a different measurable
   size than the one typed are filtered out. A size read from a product name
   rather than the provider's quantity field is flagged for checking. Prices
   are always the person's own: providers never supply them.
6. **Wholesale case** is an optional advanced control. A case quantity labels
   the offer "Case of 12 × 1 L" on the flyer and the price entered is the price
   of the whole case.
7. **Add to flyer / Use for this item.** New products enter the active combo in
   combo mode. Replacing an offer keeps its basket, pack count, featured state
   and multi-buy quantity. Controls are disabled while a photo downloads, the
   dialog stays open until the photo is stored, and a newer search is never
   overwritten by a slower older one. Every failure (provider down, timeout,
   photo unavailable, storage full) leaves a message and a way through.
8. **No match? Add it manually.** The typed name, size and price become an
   ordinary offer, exactly as before this feature existed.

## Providers

| Provider | Used for | Status |
| --- | --- | --- |
| Built-in list (`public/products.js`) | Names, pack sizes, departments, aliases, illustrations | Shipped, offline |
| Private saved products (D1 workspace) | The person's own products, prices and photos | Shipped, private per account |
| Open Food Facts (`world.openfoodfacts.org`) | Public names, brands, pack sizes and front photos by name or barcode | Shipped through the Worker |
| GS1 Verified by GS1, manufacturer and wholesaler feeds | Authoritative codes, sizes, official pack shots | Not integrated; see below |

Open Food Facts is a collaborative, open database. Coverage of South African
products is partial and uneven; packaged dry goods and drinks are better
covered than fresh produce, butchery and house brands. That is why local
search and manual entry are always first and always work when the provider is
unavailable.

### Product data model

Every provider record is normalised in the Worker before it reaches the
browser:

```json
{
  "code": "6001069000158",
  "name": "Ace Super Maize Meal",
  "size": "12.5 kg",
  "sizeFromName": false,
  "image": "https://images.openfoodfacts.org/images/products/600/106/900/0158/front_en.7.200.jpg",
  "language": "en",
  "revision": "7",
  "author": "thandi",
  "updated": 1700000000,
  "source": {"provider": "off", "code": "6001069000158", "title": "Ace Super Maize Meal", "author": "thandi", "language": "en", "revision": "7", "url": "https://world.openfoodfacts.org/product/6001069000158"}
}
```

Only `source` is saved on a flyer item, and only when its photo was taken from
the provider. The Worker validates the provider name, the code's check digit,
the language (`^[a-z]{2,3}$`) and the revision (`^\d{1,6}$`) every time a
workspace is saved, so a stored reference can never point anywhere except the
approved image host.

## Licensing and attribution

- Open Food Facts **data** is published under the Open Database License
  (ODbL). **Photos** are published under Creative Commons Attribution-ShareAlike
  3.0 (CC BY-SA 3.0).
- The dialog links to Open Food Facts and states both licences. Search
  responses carry an `attribution` object.
- Each stored photo records its credit (`product_photos.credit`) and its
  provider key (`product_photos.source_key`, `provider:code:language:revision`)
  as well as the same values in the R2 object's custom metadata.
- Exports carry credits **outside the visible artwork**:
  - PNG: one `tEXt` `Comment` chunk per credited photo and a `Copyright` chunk
    listing them all.
  - PDF: `/Info` dictionary `Subject` ("Photo credits: …") and `Keywords`
    ("Open Food Facts, CC BY-SA 3.0").
  - Promotion packs and copied offer text: a "Photo credits:" block at the end
    of the caption.
  - Each credit names the product, the photographer (or "Open Food Facts
    contributors"), the provider, the licence, the product URL, the product
    code, the language and the revision.
- Flyers with no provider photos export byte-for-byte as before: no credit
  chunks, no PDF subject.
- Prices, "was" prices, multi-buy and case information are the shop's own and
  are never attributed to a provider.

## Security controls in the Worker

- Catalogue search and photo retrieval require the authenticated user header,
  like every other API route. Writes are protected by the same same-origin
  checks (`Origin` and `Sec-Fetch-Site`).
- Request bodies are read with a byte limit (2 000 bytes for photo requests);
  queries are capped at 80 characters and must be at least two.
- Upstream calls go only to `world.openfoodfacts.org` and
  `images.openfoodfacts.org` over HTTPS, with an 8 second timeout,
  `redirect: 'error'`, a descriptive User-Agent and streamed byte caps
  (400 kB for JSON, 1.5 MB for images). Oversized answers are cancelled
  mid-stream.
- Image bytes must carry a matching content type and file signature (JPEG, PNG
  or WebP) before they are stored.
- The image URL is **constructed by the Worker** from the validated code,
  language and revision. Nothing the browser sends is ever fetched as a URL, so
  there is no image proxy to abuse.
- Public search results are cached for 10 minutes and product lookups for an
  hour in the Worker cache; photo references are stored separately per owner
  and reused instead of downloaded twice.
- Upstream calls are rate limited per owner (20 per 5 minutes) and globally
  (120 per minute). Cached answers, local search and manual entry are not
  affected by the limit.
- No provider credentials exist: Open Food Facts needs none, and the browser
  only ever calls the Worker. The one exception is result thumbnails: the
  browser displays the 200 px preview straight from `images.openfoodfacts.org`
  (the only host the dialog accepts for a preview) and falls back to an
  illustration when it cannot load. Nothing is stored until the person ticks
  “Include product photo”, and then the Worker downloads it.

## Importing a larger official export

The built-in list is a hand-curated table in `public/products.js`
(`[name, sizes, section, icon, synonyms, business]`). To grow it from an
official export:

1. Download the Open Food Facts South Africa export (CSV or JSONL) or an
   official manufacturer or wholesaler product list that you are licensed to
   redistribute.
2. Keep only fields the app uses: name, brand, quantity, and (for provider
   photos) code, language and revision. Drop prices, stock and anything
   personal.
3. Normalise sizes with `ShopDeskProducts.parseSize` so that "12,5kg" becomes
   "12.5 kg" and case packs read "12 × 1 L".
4. Add rows to the table or, for very large sets, ship them as a separate
   JSON file loaded on demand and searched with the same `search()` function
   (it already accepts the catalogue through its `context`).
5. Run `npm test`: the catalogue test rejects duplicates, prices inside names,
   over-long names and sizes.

For a hosted catalogue with photos, store the records in D1 and serve them
through `/api/catalogue/search` ahead of the provider; the response shape and
the `source` model are already provider-neutral.

## Why no Google, retailer or random image scraping

- **Rights.** Retailer pack shots and Google image results are copyrighted
  and licensed to the retailer or manufacturer; reuse on a third party's flyer
  is not permitted. Open Food Facts photos are the only public source with a
  clear reuse licence, and that licence demands attribution, which Handbill
  stores and exports.
- **Accuracy.** Scraped results mix sizes, variants and countries. A photo of
  a 5 kg bag on a 10 kg offer misleads customers; Handbill filters provider
  records by exact size instead.
- **Safety.** Fetching arbitrary URLs from a Worker is an open proxy. Handbill
  fetches only URLs it constructs itself, on an allowlisted host.
- **Terms of service.** Retailer sites and search engines prohibit automated
  scraping; the product would be unreliable and could be cut off at any time.
- **No invented data.** Handbill never invents sizes, prices or availability
  and never generates fake branded packaging. Where no photo exists, an
  original illustration or the shop's own photo is used.

## Future feeds

- **GS1 Verified by GS1** can confirm a barcode's brand, description, net
  content and image URL, but it needs a licensed account and is not free.
  The `source.provider` field and the Worker's host allowlist are designed so
  a second provider (`'gs1'`) can be added without changing the flyer format.
- **Manufacturer feeds** (Tiger Brands, Pioneer Foods, Unilever, RCL and
  others publish product catalogues to retailers) would supply official pack
  shots under their own terms.
- **Wholesaler feeds** (cash and carry price lists) would allow case
  quantities and case pack configurations to be suggested rather than typed.
- **A shared Handbill catalogue** could let businesses opt in to publish their
  own product photos for other shops, with the same credit model.

Each would be another `provider` value with its own allowlisted hosts, licence
text and credit format; the browser code would not need to change.

## Limitations

- South African coverage on Open Food Facts is partial. Many house brands,
  fresh items and butchery lines will return nothing online; local search and
  manual entry cover them.
- Provider photos are front-of-pack photos taken by volunteers. Quality and
  framing vary. The photo framing controls on the offer card still apply.
- Provider pack sizes come from the record's quantity field; when it is empty
  the size is read from the product name and flagged. The person should check
  it against the pack.
- Online search is by name words, not by alias: "pap" finds Maize meal locally
  but the provider search sends the words typed. The local alias results stay
  on screen above the online ones.
- Camera scanning uses the browser's BarcodeDetector where available; typing
  the number under the barcode works everywhere.
- Credits in PNG files use Latin-1 text chunks; names outside Latin-1 are
  replaced with "?" in the chunk only (the PDF and caption keep them).
- The in-memory rate limiter is per Worker instance; a distributed deployment
  may allow proportionally more calls.
