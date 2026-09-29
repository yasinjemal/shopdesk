import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Load public/storage.js the way a browser would, with a fake window, localStorage and fetch.
function browser({ fetchImpl, storage = new Map(), blockStorage = false } = {}) {
  const events = [];
  const localStorage = {
    getItem: k => { if (blockStorage) throw new Error('blocked'); return storage.has(k) ? storage.get(k) : null; },
    setItem: (k, v) => { if (blockStorage) throw new Error('blocked'); if (v.length > 500000) throw new Error('QuotaExceededError'); storage.set(k, v); },
    removeItem: k => storage.delete(k)
  };
  const win = { localStorage, crypto, URL, CustomEvent, fetch: fetchImpl, AbortController, setTimeout, clearTimeout, console, dispatchEvent: e => events.push(e), Response };
  win.window = win; vm.createContext(win);
  vm.runInContext(readFileSync(new URL('../public/storage.js', import.meta.url), 'utf8'), win);
  return { api: win.ShopDeskStorage, storage, events };
}
const htmlNotFound = async () => new Response('<!doctype html><title>404</title>The page could not be found', { status: 404, headers: { 'content-type': 'text/html' } });
const jsonReply = (body, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('an HTML 404 from /api/studio switches to Browser demo mode instead of a JSON parse error', async () => {
  const { api, events } = browser({ fetchImpl: htmlNotFound });
  const result = await api.loadStudio();
  assert.equal(result.mode, 'demo'); assert.equal(api.mode, 'demo'); assert.equal(result.data, null); assert.equal(result.revision, 0);
  assert.equal(events[0].detail.mode, 'demo');
});

test('a labelled JSON 503 from an unconfigured server also selects demo mode', async () => {
  const { api } = browser({ fetchImpl: jsonReply({ error: 'not set up', code: 'storage_not_configured' }, 503) });
  assert.equal((await api.loadStudio()).mode, 'demo');
});

test('real server errors are surfaced, never hidden by demo mode', async () => {
  for (const [status, code] of [[401, undefined], [503, undefined], [503, 'auth_not_configured']]) {
    const { api } = browser({ fetchImpl: jsonReply({ error: 'Something specific', code }, status) });
    await assert.rejects(api.loadStudio(), /Something specific/); assert.equal(api.mode, 'remote');
  }
  const { api } = browser({ fetchImpl: async () => { throw new TypeError('network down'); } });
  await assert.rejects(api.loadStudio(), /network down/); assert.equal(api.mode, 'remote');
});

test('remote mode passes the workspace through unchanged and uses /api/photos URLs', async () => {
  const seen = [];
  const { api } = browser({ fetchImpl: async (path, options) => { seen.push([path, options?.method]); return jsonReply({ data: { schemaVersion: 2 }, revision: 4 })(); } });
  const result = await api.loadStudio();
  assert.equal(result.mode, 'remote'); assert.equal(result.revision, 4);
  assert.equal(api.photoURL('abc'), '/api/photos/abc');
  await api.saveStudio(4, { schemaVersion: 2 }); assert.deepEqual(seen[1], ['/api/studio', 'PUT']);
});

test('demo mode saves and reloads the workspace, with revision checks', async () => {
  const shared = new Map();
  const first = browser({ fetchImpl: htmlNotFound, storage: shared });
  await first.api.loadStudio();
  const data = { schemaVersion: 2, clients: [{ id: 'c' }] };
  assert.equal((await first.api.saveStudio(0, data)).revision, 1);
  assert.equal((await first.api.saveStudio(1, data)).revision, 2);
  await assert.rejects(first.api.saveStudio(1, data), error => error.status === 409);
  // Reload (new page load, same browser storage).
  const reloaded = browser({ fetchImpl: htmlNotFound, storage: shared });
  const result = await reloaded.api.loadStudio();
  assert.equal(result.revision, 2); assert.deepEqual(JSON.parse(JSON.stringify(result.data)), data);
});

test('demo mode reports blocked or full browser storage clearly', async () => {
  const blocked = browser({ fetchImpl: htmlNotFound, blockStorage: true });
  await assert.rejects(blocked.api.loadStudio(), /blocking storage/);
  const full = browser({ fetchImpl: htmlNotFound });
  await full.api.loadStudio();
  await assert.rejects(full.api.saveStudio(0, { big: 'x'.repeat(600000) }), /out of space/);
});

test('unreadable demo data is set aside with a visible notice, not silently discarded', async () => {
  const storage = new Map([['shopdesk.demo.studio.v1', '{broken']]);
  const { api } = browser({ fetchImpl: htmlNotFound, storage });
  const result = await api.loadStudio();
  assert.equal(result.data, null); assert.match(api.notice, /could not be read/);
  assert.equal(storage.get('shopdesk.demo.studio.v1.unreadable'), '{broken');
});

test('demo mode keeps uploaded photos available by id and enforces the size limit', async () => {
  const { api } = browser({ fetchImpl: htmlNotFound });
  await api.loadStudio();
  const blob = new Blob([new Uint8Array([255, 216, 255, 1, 2, 255, 217])], { type: 'image/jpeg' });
  const { id } = await api.uploadPhoto(blob);
  assert.match(id, /^[0-9a-f-]{36}$/); assert.match(api.photoURL(id), /^blob:/);
  assert.equal(api.photoURL('missing'), '');
  await assert.rejects(api.uploadPhoto(new Blob([new Uint8Array(1500001)])), /smaller/);
  assert.match(api.notice, /disappear when you close the tab/, 'no IndexedDB here, so the user is told photos are temporary');
});
