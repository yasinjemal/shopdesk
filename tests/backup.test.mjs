import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/studio.js';
import '../public/backup.js';
import { validateStudio } from '../server/core.js';

const B = globalThis.ShopDeskBackup;
const uuid = () => crypto.randomUUID();
const jpegUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
function studio() {
  const c = uuid(), p = uuid(), logo = uuid(), hero = uuid(), a = uuid(), b = uuid();
  return { photos: { logo, hero, a, b }, data: { schemaVersion: 2, activeClientId: c, activeProjectId: p, clients: [{ id: c, shop: { name: 'Shop', phone: '', location: '', logo }, products: [{ id: uuid(), name: 'Milk', size: '1 L', price: '19.99', photo: a }, { id: uuid(), name: '=HYPERLINK("x")', size: '', price: '5' }], projects: [{ id: p, title: 'Week 1', draft: { headline: 'Deals', date: '2030-01-01', theme: 'green', format: 'poster', template: 'bold', heroPhoto: hero, items: [{ name: 'Bread', size: '700 g', price: '15.50', photo: b }] } }] }] } };
}

test('backup round-trips a workspace, its photos and its structure', () => {
  const { data, photos } = studio();
  const file = JSON.stringify(B.build(data, Object.fromEntries(Object.values(photos).map(id => [id, jpegUrl]))));
  const parsed = B.parse(file);
  assert.deepEqual(parsed.studio, data);
  assert.deepEqual(B.summary(parsed.studio), { clients: 1, projects: 1, products: 2, photos: 4 });
  assert.deepEqual(new Set(B.photoIds(parsed.studio)), new Set(Object.values(photos)));
});

test('restoring remaps photo ids and clears photos that could not be restored; the result still validates on the server', () => {
  const { data, photos } = studio();
  const map = new Map([[photos.logo, uuid()], [photos.hero, uuid()], [photos.a, uuid()]]); // photo b failed to upload
  const next = B.remap(data, map);
  assert.equal(next.clients[0].shop.logo, map.get(photos.logo));
  assert.equal(next.clients[0].products[0].photo, map.get(photos.a));
  assert.equal(next.clients[0].projects[0].draft.items[0].photo, '', 'failed photo is cleared, not left dangling');
  assert.equal(data.clients[0].shop.logo, photos.logo, 'input is not mutated');
  assert.doesNotThrow(() => validateStudio(next));
});

test('bad backups are rejected with a readable message', () => {
  const { data } = studio();
  const good = B.build(data, {});
  const cases = [['', /empty/], ['{oops', /not valid JSON/], [JSON.stringify({ format: 'other' }), /not a ShopDesk backup/], [JSON.stringify({ ...good, version: 9 }), /newer version/], [JSON.stringify({ ...good, studio: { schemaVersion: 1 } }), /valid list of clients/], [JSON.stringify({ ...good, studio: { ...data, activeProjectId: uuid() } }), /which project/], [JSON.stringify({ ...good, photos: { [uuid()]: 'javascript:alert(1)' } }), /photo/], [JSON.stringify({ ...good, studio: { ...data, clients: [{ id: 'x', shop: {}, projects: [] }] } }), /damaged/]];
  for (const [text, message] of cases) assert.throws(() => B.parse(text), message, String(text).slice(0, 30));
});

test('product CSV quotes fields, neutralises spreadsheet formulas and can be read back by the importer', () => {
  const { data } = studio(); data.clients[0].products.push({ id: uuid(), name: 'Chips, "hot"', size: '2 x 50 g', price: '12' });
  const csv = B.productsCSV(data.clients);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], 'client,name,size,price');
  assert.equal(lines[1], 'Shop,Milk,1 L,19.99');
  assert.ok(lines[2].includes("'=HYPERLINK"), 'formula neutralised');
  assert.equal(lines[3], 'Shop,"Chips, ""hot""",2 x 50 g,12');
});
