// Browser smoke test. Needs Playwright (npm i -D playwright, or PLAYWRIGHT_PATH=/path/to/playwright) and Chromium.
//   node e2e/smoke.mjs            -> runs Browser demo mode and fake-Supabase cloud mode, desktop and mobile
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createFakeSupabase, serveFakeSupabase } from '../tests/helpers/fake-supabase.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const shots = process.env.SHOTS || '';
if (shots) await mkdir(shots, { recursive: true });

async function startApp(port, env) {
  const child = spawn(process.execPath, ['scripts/dev.mjs'], { env: { ...process.env, PORT: String(port), ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise(resolve => child.stdout.on('data', d => String(d).includes('dev server') && resolve()));
  return child;
}

async function run(name, base, { demo, viewport }) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const context = await browser.newContext({ viewport, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const problems = [];
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|ERR_TUNNEL|ERR_NAME|ERR_CONNECTION/.test(m.text())) problems.push('console: ' + m.text() + ' ' + (m.location().url || '')); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) problems.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => { if (r.url().startsWith(base)) problems.push('failed ' + r.url()); });
  const label = `${name}/${viewport.width}px`;
  const shot = async n => { if (shots) await page.screenshot({ path: `${shots}/${name}-${viewport.width}-${n}.png`, fullPage: false }); };
  const saved = () => page.waitForFunction(() => document.getElementById('save-status').dataset.state === 'saved', null, { timeout: 15000 });

  await page.goto(base + '/');
  await page.waitForFunction(() => !document.getElementById('promo-fields').disabled, null, { timeout: 15000 });
  assert.equal(await page.locator('#storage-banner').isVisible(), demo, label + ': demo banner visibility');
  if (demo) assert.match(await page.locator('#storage-banner').innerText(), /not shared across devices/);
  await shot('1-loaded');

  // Content tab: headline, add a product, rename it
  await page.click('#tab-content');
  await page.fill('#promo-headline', 'Weekend Braai Specials');
  const before = await page.locator('#promo-items > *').count();
  await page.click('#add-item');
  assert.equal(await page.locator('#promo-items > *').count(), before + 1, label + ': add product');
  const card = page.locator('#promo-items > *').last();
  await card.locator('input[type="text"]').first().fill('Boerewors');
  await card.locator('input[type="number"]').first().fill('59.99');

  // Paste a product list
  await page.click('#open-bulk');
  await page.fill('#bulk-source', 'Milk, 1L, 19.99\nBread | 700g | 15.50\nEggs; 30 pack; 74.00\nRice\t2kg\t38.00');
  await page.click('#review-bulk');
  await page.waitForSelector('#bulk-rows > *');
  assert.ok(await page.locator('#bulk-rows > *').count() >= 4, label + ': bulk review rows');
  await page.click('#apply-bulk');
  await page.waitForFunction(() => !document.getElementById('bulk-dialog').open);
  const total = await page.locator('#promo-items > *').count();
  assert.ok(total >= before + 5, label + ': imported products applied (' + total + ')');

  // Photo upload on the first product
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#d33'; x.fillRect(0, 0, 400, 300); x.fillStyle = '#fff'; x.fillRect(100, 80, 200, 140); return c.toDataURL('image/png').split(',')[1]; });
  const first = page.locator('#promo-items > *').first();
  await first.evaluate(el => { el.open = true; });
  await first.locator('input[type="file"]').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => document.querySelector('#promo-items img') !== null, null, { timeout: 15000 });

  // Style tab: change design + colour + typography + price style
  await page.click('#tab-style');
  await page.click('.template-card[data-template="super"]');
  await page.click('.colour-swatch[data-colour="berry"]');
  await page.selectOption('#poster-typeface', 'elegant');
  await page.selectOption('#price-style', 'pill');
  await saved();
  assert.equal(await page.inputValue('#poster-template'), 'super');
  await shot('2-edited');

  // Reload: everything persists
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('promo-fields').disabled, null, { timeout: 15000 });
  assert.equal(await page.inputValue('#promo-headline'), 'Weekend Braai Specials', label + ': headline persisted');
  assert.equal(await page.inputValue('#poster-template'), 'super'); assert.equal(await page.inputValue('#promo-theme'), 'berry');
  assert.equal(await page.locator('#promo-items > *').count(), total, label + ': products persisted');
  await page.waitForFunction(() => { const i = document.querySelector('#promo-items img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 });
  await shot('3-reloaded');

  // Duplicate project
  if (!await page.locator('#duplicate-project').isVisible()) await page.click('#client-drawer > summary');
  const projects = await page.locator('#project-picker option').count();
  await page.click('#duplicate-project');
  await page.waitForFunction(n => document.querySelectorAll('#project-picker option').length === n, projects + 1);

  // Downloads
  const png1 = await Promise.all([page.waitForEvent('download'), page.click('#download-promo')]).then(async ([d]) => readFile(await d.path()));
  assert.deepEqual([...png1.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], label + ': PNG export'); assert.ok(png1.length > 20000);
  await page.check('input[name="poster-format"][value="status"]');
  const status = await Promise.all([page.waitForEvent('download'), page.click('#download-promo')]).then(async ([d]) => readFile(await d.path()));
  assert.deepEqual([...status.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], label + ': Status export');
  await page.click('#create-pack');
  await page.waitForSelector('#pack-output:not([hidden])', { timeout: 60000 });
  const zip = await Promise.all([page.waitForEvent('download'), page.click('#download-pack')]).then(async ([d]) => readFile(await d.path()));
  assert.equal(zip.subarray(0, 2).toString(), 'PK', label + ': promotion pack ZIP');
  await shot('4-pack');

  assert.deepEqual(problems, [], label + ': console/network problems');
  await browser.close();
  console.log('ok', label);
}

const fake = createFakeSupabase(), cloud = await serveFakeSupabase(fake);
const demoApp = await startApp(3101, { SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', SHOPDESK_STORAGE_MODE: '' });
const cloudApp = await startApp(3102, { SUPABASE_URL: cloud.url, SUPABASE_SERVICE_ROLE_KEY: fake.key, SHOPDESK_AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-00' });
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await run('demo', 'http://localhost:3101', { demo: true, viewport });
    await run('cloud', 'http://localhost:3102', { demo: false, viewport });
  }
  assert.ok(fake.workspaces.size >= 1 && fake.objects.size >= 1, 'cloud mode stored data in Supabase');
} finally { demoApp.kill(); cloudApp.kill(); cloud.server.close(); }
