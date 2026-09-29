// Interactive editor checks in Browser demo mode: every design, palette, finish, purpose, product counts, saved products.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const child = spawn(process.execPath, ['scripts/dev.mjs'], { env: { ...process.env, PORT: '3103', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(resolve => child.stdout.on('data', d => String(d).includes('dev server') && resolve()));
const browser = await chromium.launch(), problems = [];
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|ERR_TUNNEL/.test(m.text())) problems.push(m.text()); });
  page.on('pageerror', e => problems.push(e.message));
  await page.goto('http://localhost:3103/');
  await page.waitForFunction(() => !document.getElementById('promo-fields').disabled);
  const ink = () => page.evaluate(() => { const c = document.getElementById('promo-canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) n++; return n; });
  const pick = (id, value) => page.evaluate(([id, value]) => { const s = document.getElementById(id); s.value = value; s.dispatchEvent(new Event('change', { bubbles: true })); }, [id, value]);
  const valid = async why => { const err = await page.locator('#promo-error').isVisible() ? await page.locator('#promo-error').innerText() : ''; assert.equal(err, '', why + ': ' + err); assert.ok(await ink() > 200, why + ': canvas drawn'); };

  // 25 products via bulk paste
  await page.click('#tab-content');
  await page.click('#open-bulk');
  await page.fill('#bulk-source', Array.from({ length: 24 }, (_, i) => `Product ${i + 1} | ${i + 1}kg | ${10 + i}.50`).join('\n'));
  await page.click('#review-bulk'); await page.click('#apply-bulk');
  await page.waitForFunction(() => !document.getElementById('bulk-dialog').open);
  await pick('product-count', '25');
  assert.equal(await page.locator('#promo-items > *').count(), 25);
  await valid('25 products');
  // Reduce then restore keeps hidden products
  await pick('product-count', '5'); assert.equal(await page.locator('#promo-items > *').count(), 5);
  await pick('product-count', '25'); assert.equal(await page.locator('#promo-items > *').count(), 25);
  assert.equal(await page.locator('#promo-items > *').nth(24).locator('input[type="text"]').first().inputValue(), 'Product 24');

  // Every design, palette, typeface and price label
  await page.click('#tab-style');
  const designs = await page.$$eval('#poster-template option:not([disabled])', o => o.map(x => x.value));
  for (const design of designs) { await pick('poster-template', design); await valid('design ' + design); }
  await pick('poster-template', 'bold');
  for (const colour of await page.$$eval('#promo-theme option', o => o.map(x => x.value))) { await pick('promo-theme', colour); await valid('palette ' + colour); }
  for (const face of await page.$$eval('#poster-typeface option', o => o.map(x => x.value))) { await pick('poster-typeface', face); await valid('typeface ' + face); }
  for (const style of await page.$$eval('#price-style option', o => o.map(x => x.value))) { await pick('price-style', style); await valid('price ' + style); }
  console.log('checked designs:', designs.length);

  // Simple 1–3 layout
  await pick('poster-template', 'simple');
  assert.ok(await page.locator('#promo-items > *').count() <= 3);
  await valid('simple');
  await pick('poster-template', 'bold');

  // Purposes
  await page.click('#tab-content');
  await pick('flyer-purpose', 'spotlight'); await valid('spotlight');
  await pick('flyer-purpose', 'event');
  await page.fill('#event-date', '2030-05-01'); await page.fill('#event-time', '18:00'); await page.fill('#event-venue', 'Town hall'); await page.fill('#promo-details', 'Come along!');
  await valid('event');
  await pick('flyer-purpose', 'opening'); await page.fill('#event-date', '2030-06-01'); await valid('opening');
  await pick('flyer-purpose', 'offers'); await page.fill('#promo-cta', 'Order on WhatsApp'); await page.fill('#promo-terms', 'While stocks last'); await valid('offers again');

  // Feature one offer, remove product
  await pick('product-count', '6');
  await page.locator('#promo-items > *').nth(1).evaluate(el => { el.open = true; });
  await page.locator('#promo-items > *').nth(1).locator('.feature-offer').click();
  assert.equal(await page.locator('.feature-offer[aria-pressed="true"]').count(), 1); await valid('featured');
  await page.locator('#promo-items > *').nth(2).evaluate(el => { el.open = true; });
  const removedName = await page.locator('#promo-items > *').nth(2).locator('input[type="text"]').first().inputValue();
  await page.locator('#promo-items > *').nth(2).locator('.remove-item').click();
  assert.equal(await page.locator('#promo-items > *').count(), 5);
  await page.locator('#toast button', { hasText: 'Undo' }).click();
  assert.equal(await page.locator('#promo-items > *').count(), 6, 'undo restores the removed product');
  assert.equal(await page.locator('#promo-items > *').nth(2).locator('input[type="text"]').first().inputValue(), removedName, 'in its original position');
  await page.locator('#promo-items > *').nth(2).evaluate(el => { el.open = true; });
  await page.locator('#promo-items > *').nth(2).locator('.remove-item').click();

  // Save products for reuse and select several
  for (let i = 0; i < 3; i++) { const c = page.locator('#promo-items > *').nth(i); await c.evaluate(el => { el.open = true; }); await c.locator('.save-product').click(); }
  await pick('product-count', '12');
  await page.click('#open-saved-grid');
  await page.waitForSelector('#saved-product-grid > *');
  const tiles = page.locator('#saved-product-grid > *'); const n = await tiles.count(); assert.ok(n >= 3, 'saved tiles ' + n);
  await tiles.nth(0).locator('input[type="checkbox"]').check();
  assert.equal(await tiles.nth(1).locator('input[type="checkbox"]').isDisabled(), true, 'no more than the free spaces can be ticked');
  assert.match(await page.locator('#saved-selection-count').innerText(), /1 selected · 1 space available/, 'over-selecting is blocked');
  assert.match(await page.locator('#saved-grid-error').innerText(), /All 1 free space is selected/, 'and explained');
  await page.click('#apply-saved-selection');
  await page.waitForFunction(() => !document.getElementById('saved-grid-dialog').open);
  assert.equal(await page.locator('#saved-grid-error').isVisible(), false);

  // Validation feedback instead of silent failure
  await page.click('#tab-business'); await page.fill('#shop-name', '');
  await page.waitForFunction(() => !document.getElementById('promo-error').hidden);
  assert.match(await page.locator('#promo-error').innerText(), /business name/i);
  await page.fill('#shop-name', 'Test Shop'); await valid('restored');
  // Copy offer text
  await page.click('#copy-promo'); await page.waitForTimeout(300);
  console.log('clipboard:', JSON.stringify((await page.evaluate(() => navigator.clipboard.readText())).slice(0, 80)));
  assert.deepEqual(problems, []);
  console.log('ok editor');
} finally { await browser.close(); child.kill(); }
