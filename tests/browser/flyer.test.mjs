import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

import { startApp } from '../../scripts/local-server.mjs';

for (const width of [320, 390, 1280]) test(`flyer controls work and persist at ${width}px`, async () => {
  const app = await startApp();
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.SHOPDESK_BROWSER_CHANNEL ? { channel: process.env.SHOPDESK_BROWSER_CHANNEL } : {}) });
    const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: width < 700, hasTouch: width < 700 });
    page.setDefaultTimeout(8000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(app.url);
    await page.waitForFunction(() => !document.querySelector('#promo-fields').disabled);
    const click = selector => width < 700 ? page.locator(selector).tap() : page.locator(selector).click();
    await click('#tab-content');
    await click('#open-bulk');
    assert.equal(await page.locator('#bulk-dialog').evaluate(el => el.open), true);
    await page.locator('#bulk-source').fill('Rice, 2 kg, R40\nBeans, 1 kg, R25');
    await click('#review-bulk');
    assert.equal(await page.locator('#bulk-rows .bulk-row').count(), 2);
    await click('#apply-bulk');
    await page.waitForFunction(() => !document.querySelector('#bulk-dialog').open);
    assert.equal(await page.locator('#promo-items > details').count(), 3);
    await click('.save-product >> nth=0');
    await click('#open-saved-grid');
    await page.getByRole('checkbox', { name: 'Select Potatoes', exact: true }).check();
    await page.getByRole('textbox', { name: 'Flyer price for Potatoes' }).fill('12.50');
    await click('#apply-saved-selection');
    await page.waitForFunction(() => !document.querySelector('#saved-grid-dialog').open);
    let state = await page.evaluate(() => ShopDeskPromotion.itemState());
    assert.equal(state.items[3].price, '12.50');
    assert.equal(state.products[0].price, '10.00');
    await click('.feature-offer >> nth=0');
    assert.equal(await page.locator('.feature-offer').first().getAttribute('aria-pressed'), 'true');
    const photo = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 500; c.height = 500; const ctx = c.getContext('2d'); ctx.fillStyle = '#e53855'; ctx.fillRect(40, 80, 350, 320); return c.toDataURL('image/png').split(',')[1]; });
    await page.locator('input[aria-label="Choose photo for item 1"]').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from(photo, 'base64') });
    await page.waitForFunction(() => ShopDeskPromotion.itemState().ready && ShopDeskPromotion.itemState().items[0].photo);
    await page.getByRole('button', { name: 'Adjust size & position' }).click();
    assert.equal(await page.locator('#photo-adjust-dialog').evaluate(el => el.open), true);
    const before = await page.locator('#promo-canvas').evaluate(el => el.toDataURL());
    await page.locator('#photo-scale').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#photo-scale-value').textContent(), '105%');
    assert.notEqual(await page.locator('#promo-canvas').evaluate(el => el.toDataURL()), before);
    await click('#reset-photo-adjust');
    assert.equal(await page.locator('#photo-scale-value').textContent(), '100%');
    await click('#close-photo-adjust');
    await page.waitForFunction(() => document.querySelector('#save-status').textContent === 'All changes saved');
    await page.reload();
    await page.waitForFunction(() => !document.querySelector('#promo-fields').disabled);
    state = await page.evaluate(() => ShopDeskPromotion.itemState());
    assert.equal(state.items.length, 4); assert.equal(state.items[0].featured, true); assert.ok(state.items[0].photo);
    assert.equal(state.items[3].price, '12.50'); assert.equal(state.products[0].price, '10.00');
    const pngDownload = page.waitForEvent('download');
    await click('#download-promo');
    const png = await pngDownload;
    assert.deepEqual((await readFile(await png.path())).subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    await click('#create-pack-bottom');
    await page.waitForFunction(() => !document.querySelector('#download-pack').disabled);
    const zipDownload = page.waitForEvent('download');
    await click('#download-pack');
    const zip = await zipDownload;
    assert.equal((await readFile(await zip.path())).readUInt32LE(0), 0x04034b50);
    await click('#close-pack');
    // A full project must explain disabled selections before the product grid,
    // including when some of its 25 items are reserved by a lower visible count.
    await click('#tab-content');
    await click('#open-bulk');
    await page.locator('#bulk-source').fill(Array.from({ length: 21 }, (_, i) => `Extra ${i + 1}, each, R5`).join('\n'));
    await click('#review-bulk'); await click('#apply-bulk');
    await page.waitForFunction(() => !document.querySelector('#bulk-dialog').open);
    await page.locator('#product-count').selectOption('3');
    state = await page.evaluate(() => ShopDeskPromotion.itemState());
    assert.equal(state.items.length, 25); assert.equal(state.count, 3); assert.equal(state.available, 0);
    await click('#open-saved-grid');
    assert.equal(await page.locator('#saved-grid-error').isVisible(), true);
    assert.match(await page.locator('#saved-grid-error').textContent(), /Reducing the product count keeps items/);
    assert.equal(await page.locator('#saved-grid-error').evaluate(el => {
      const r = el.getBoundingClientRect(); return document.activeElement === el && r.top >= 0 && r.bottom <= innerHeight;
    }), true);
    assert.equal(await page.getByRole('checkbox', { name: 'Select Potatoes', exact: true }).isDisabled(), true);
    if (process.env.SHOPDESK_SCREENSHOTS) await page.screenshot({ path: `.sites-runtime/capacity-${width}.png` });
    await click('#close-saved-grid');
    await click('#open-bulk');
    assert.equal(await page.locator('#bulk-capacity').evaluate(el => {
      const r = el.getBoundingClientRect(); return document.activeElement === el && r.top >= 0 && r.bottom <= innerHeight;
    }), true);
    await click('#close-bulk');
    await page.locator('#product-count').selectOption('25');
    assert.equal(await page.locator('#promo-items > details').count(), 25);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); await app.close(); }
});

test('workspace load failure is visible and retry restores product controls', async () => {
  const app = await startApp();
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.SHOPDESK_BROWSER_CHANNEL ? { channel: process.env.SHOPDESK_BROWSER_CHANNEL } : {}) });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    page.setDefaultTimeout(8000);
    await page.route('**/api/studio', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Test connection unavailable. Try again.' }) }), { times: 1 });
    await page.goto(app.url);
    await page.locator('#workspace-error').waitFor({ state: 'visible' });
    assert.match(await page.locator('#workspace-error').textContent(), /Test connection unavailable/);
    assert.equal(await page.locator('#open-bulk').isDisabled(), true);
    await page.locator('#retry-save').tap();
    await page.waitForFunction(() => !document.querySelector('#promo-fields').disabled);
    await page.locator('#tab-content').tap();
    await page.locator('#open-bulk').tap();
    assert.equal(await page.locator('#bulk-dialog').evaluate(el => el.open), true);
  } finally { await browser?.close(); await app.close(); }
});
