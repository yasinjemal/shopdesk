# Catalogue research: my-catalogue.co.za and South African retail leaflets

Studied on 9 October 2026 for the Handbill grocery templates. The site itself (`my-catalogue.co.za`) and the retailer domains it links to are blocked by the network policy of the environment this work was done in, so the study used the pages as indexed by search engines (titles, headings, product tables and snippets) rather than the rendered leaflet images. Findings that depend on visual inspection are marked as inferred.

## What the site is

A South African aggregator of current retailer catalogues and specials. Each retailer has a page titled `<RETAILER> Specials • <weekday> <day> <month> to <weekday> <day> <month> <year>`, a store and trading-hours page, and the catalogue broken into pages with a product table ("Catalogue: … / Page: …"). Separate product pages track the lowest current price for an item across retailers ("COGNAC price • Starting at R 459.99").

Retailers seen: Shoprite, Checkers, Boxer, SPAR, Makro, Game, Clicks, Supa Store, Save, Gelmar, Matrix Warehouse, AutoZone. Catalogue names seen: *Xtra Savings*, *Cash & Carry Spring Savings*, *September Month-End Promotion*, *Low Price Bonanza*, *Heritage Deals*, *Mid-Month Specials*, *GP October MM* (month-end madness), *Build*, *Liquor*, *Home & DIY*, *Cleanipedia*.

## Conventions observed and how Handbill applies them

| Observation | Source | Handbill response |
| --- | --- | --- |
| Validity windows are written with weekdays: "Thursday 8 Oct to Wednesday 21 Oct 2026". Leaflets run in weekly, two-week (mid-month) and month-end cycles. | my-catalogue page titles for Boxer, Shoprite, SPAR, Checkers; Guzzle's Boxer regional listing | Flyer dates now print as "Valid Thu 8 October – Wed 21 October 2026". New promotion types: *Month-end specials*, *Seasonal savings*. |
| Catalogues are multi-page, with products listed page by page. | my-catalogue product tables ("Page: …"); Supa Store table by catalogue page | A4/A5 exports can be split into numbered catalogue pages (12 offers per page) in one PDF, repeating the heading and contact strip on each page. |
| Retailers show a "SAVE" amount and the previous price alongside the special price. | Shoprite Xtra Savings listing; cataloguespecials.co.za Shoprite entries | Optional *previous price* per offer. It is struck through inside the price plate with the saving worked out from the two numbers. Nothing is ever shown unless the person entered it. |
| Pages are organised by department: fresh produce, butchery, bakery, pantry, household, personal care, baby, liquor, build/hardware. | Boxer catalogue types (Build, Liquor, GP); Cambridge Food "Fresh" specials; Boxer leaflet descriptions | Optional *section label* per offer, rendered as a department tag on the card in every design, with a datalist of common departments. *Hardware & building* is a new promotion type with a cash-and-carry starter. |
| Combo deals are itemised with one price: "Essentials Combo R 99,00". | cataloguespecials.co.za Boxer combo offers; Food Lover's catalogue (earlier research) | Already supported: 1–6 baskets, up to 20 products, one complete price per basket; a weekend combo starter was added earlier. |
| Product lines are written as *brand/product · pack size · price* with two-decimal prices and metric packs ("NOVA luxury tissues 2 ply 8's R 86.99", "Goldi IQF 5Kg R 209.99"). Butchery is priced per kg. | Supa Store and Usave product tables | Sample previews use the same grammar; pack-size fields and "Per kg" examples are kept prominent; the pack-size mismatch warning remains. |
| Wholesale (cash & carry) leaflets list case quantities and bulk packs. | Shoprite "Cash & Carry" catalogue name; Makro catalogue | Cash & Carry design with Product / Pack / Price columns; wholesale samples use case quantities; a 25-line A4 cash-and-carry starter prints as a numbered catalogue. |
| Aggregators warn that expired catalogues are "NO LONGER VALID". | my-catalogue January 2026 Shoprite page | Export is blocked when a shown end date has passed; the saved-flyer gallery labels expired promotions. |

Inferred, not verified visually: the dominant leaflet look in this market is red/yellow price blocks with large rand numerals and superscript cents, dense grids on the inner pages and one hero deal on the cover. The Weekend Burst, Big Price, Price Blocks, Front-page Feature and Weekly Circular designs cover those patterns with original artwork. No retailer branding, typography or artwork was copied.

## Sources

- my-catalogue.co.za pages as indexed: home, `/shoprite-specials`, `/boxer-specials`, `/spar-specials`, `/checkers-specials`, `/game-specials`, `/supa-store-specials`, `/retailers/*`, `/products/*`.
- cataloguespecials.co.za: Boxer combo specials and store catalogue pages.
- Guzzle, Kimbino and ClicFlyer retailer listings for Boxer and Shoprite (cycle timing and leaflet descriptions).
- Earlier sources recorded in the README: Consumer Protection Act section 23, CVS circular guidelines, Canadian Grocer, Made Good Designs, Publitas, Food Lover's Market and Pick n Pay catalogues.
