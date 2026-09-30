import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { handleVercelRequest, nodeHandler } from '../server/vercel.js';
import { verifyOwnerCookie } from '../server/auth.js';
import { createFakeSupabase } from './helpers/fake-supabase.mjs';

const SECRET = 'a-test-secret-with-plenty-of-length-0123456789';
const jpeg = (n = 200) => { const b = new Uint8Array(n).fill(7); b[0] = 255; b[1] = 216; b[2] = 255; b[n - 2] = 255; b[n - 1] = 217; return b; };
const uuid = () => crypto.randomUUID();
function setup(extra = {}) {
  const fake = createFakeSupabase();
  const env = { SUPABASE_URL: 'https://fake.supabase.test', SUPABASE_SERVICE_ROLE_KEY: fake.key, SHOPDESK_AUTH_SECRET: SECRET, ...extra };
  // A tiny "browser": remembers the cookie the server issued.
  const browser = () => {
    let cookie = '';
    return async function call(path, { method = 'GET', body, headers = {}, type } = {}) {
      const h = new Headers(headers); if (cookie) h.set('cookie', cookie);
      if (body !== undefined && !(body instanceof Uint8Array)) { body = JSON.stringify(body); h.set('content-type', 'application/json'); }
      if (type) h.set('content-type', type);
      const response = await handleVercelRequest(new Request('https://shopdesk.example' + path, { method, body, headers: h }), env, { fetch: fake.fetch });
      const set = response.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
      return response;
    };
  };
  return { fake, env, browser };
}
const studio = (clientId = uuid(), projectId = uuid(), name = 'Smiley grocery store') => ({ schemaVersion: 2, activeClientId: clientId, activeProjectId: projectId, clients: [{ id: clientId, shop: { name, phone: '0607055533', location: 'Mkomjana village' }, products: [], projects: [{ id: projectId, title: 'My first flyer', draft: { headline: 'Fresh deals. Everyday value.', date: '2026-09-19', theme: 'green', format: 'status', items: [{ name: 'Potatoes', size: '1 kg pack', price: '10.00', photo: '' }] } }] }] });

test('GET /api/studio returns JSON and issues an HttpOnly signed identity cookie', async () => {
  const { browser } = setup(), call = browser();
  const response = await call('/api/studio');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), { data: null, revision: 0 });
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Lax/);
  assert.ok(verifyOwnerCookie(cookie.split(';')[0], SECRET));
});

test('errors are always JSON, never HTML', async () => {
  const { browser, env } = setup(), call = browser();
  for (const [path, method, status] of [['/api/nothing-here', 'GET', 404], ['/api/photos/not-a-uuid', 'GET', 404], ['/api/studio', 'DELETE', 404]]) {
    const response = await call(path, { method });
    assert.equal(response.status, status, path); assert.match(response.headers.get('content-type'), /application\/json/); assert.ok((await response.json()).error);
  }
  let response = await call('/api/studio', { method: 'PUT', body: { revision: 0, data: { nope: true } } });
  assert.equal(response.status, 400); assert.ok((await response.json()).error);
  response = await call('/api/studio', { method: 'PUT', body: '{not json', type: 'application/json' });
  assert.equal(response.status, 400); assert.match(response.headers.get('content-type'), /application\/json/);
  // Missing auth secret is reported as JSON with a code, not a crash.
  const broken = await handleVercelRequest(new Request('https://x.test/api/studio'), { ...env, SHOPDESK_AUTH_SECRET: '' });
  assert.equal(broken.status, 503); assert.equal((await broken.json()).code, 'auth_not_configured');
});

test('without Supabase settings /api/studio answers a labelled JSON 503 so the browser can switch to demo mode', async () => {
  for (const env of [{}, { SHOPDESK_STORAGE_MODE: 'local', SUPABASE_URL: 'x', SUPABASE_SERVICE_ROLE_KEY: 'y' }]) {
    const response = await handleVercelRequest(new Request('https://x.test/api/studio'), env);
    assert.equal(response.status, 503); assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal((await response.json()).code, 'storage_not_configured');
    assert.equal((await (await handleVercelRequest(new Request('https://x.test/api/health'), env)).json()).mode, 'demo');
  }
  const forced = await handleVercelRequest(new Request('https://x.test/api/studio'), { SHOPDESK_STORAGE_MODE: 'supabase' });
  assert.equal(forced.status, 503); assert.equal((await forced.json()).code, 'storage_not_configured');
  const health = await (await handleVercelRequest(new Request('https://x.test/api/health'), { SUPABASE_URL: 'u', SUPABASE_SERVICE_ROLE_KEY: 'k', SHOPDESK_AUTH_SECRET: SECRET })).json();
  assert.equal(health.mode, 'supabase');
});

test('saves and reloads a studio workspace, protects concurrent edits, keeps the exact stored JSON', async () => {
  const { browser, fake } = setup(), call = browser(), data = studio();
  let response = await call('/api/studio', { method: 'PUT', body: { revision: 0, data } });
  assert.equal(response.status, 200); assert.equal((await response.json()).revision, 1);
  assert.deepEqual(await (await call('/api/studio')).json(), { data, revision: 1 });
  assert.equal((await call('/api/studio', { method: 'PUT', body: { revision: 0, data } })).status, 409);
  const changed = studio(data.activeClientId, data.activeProjectId, 'Changed'); 
  assert.equal((await (await call('/api/studio', { method: 'PUT', body: { revision: 1, data: changed } })).json()).revision, 2);
  assert.equal((await (await call('/api/studio')).json()).data.clients[0].shop.name, 'Changed');
  assert.equal(fake.workspaces.size, 1);
});

test('old (pre-Designer-Mode) saved workspaces still load and are upgraded by the client', async () => {
  const { browser } = setup(), call = browser();
  const old = { shop: { name: 'Old shop', phone: '', location: '' }, products: [], draft: { headline: 'Old', date: '2026-09-19', theme: 'green', format: 'status', items: [{ name: 'Potatoes', size: '1 kg', price: '10.00', photo: '' }] } };
  assert.equal((await call('/api/workspace', { method: 'PUT', body: { revision: 0, data: old } })).status, 200);
  assert.deepEqual((await (await call('/api/studio')).json()).data, old);
  await import('../public/business.js'); await import('../public/studio.js');
  const upgraded = globalThis.ShopDeskStudio.upgrade(old);
  assert.equal(upgraded.schemaVersion, 2);
  assert.equal((await call('/api/studio', { method: 'PUT', body: { revision: 1, data: upgraded } })).status, 200);
  assert.equal((await call('/api/workspace')).status, 409, 'legacy endpoint refuses upgraded data like the Worker');
});

test('each browser only sees its own workspace and photos; forged owners and cookies are ignored', async () => {
  const { browser } = setup(), alice = browser(), bob = browser();
  const data = studio();
  await alice('/api/studio', { method: 'PUT', body: { revision: 0, data } });
  const { id } = await (await alice('/api/photos', { method: 'POST', body: jpeg(), type: 'image/jpeg' })).json();
  assert.equal((await alice('/api/photos/' + id)).status, 200);
  assert.deepEqual(await (await bob('/api/studio')).json(), { data: null, revision: 0 });
  assert.equal((await bob('/api/photos/' + id)).status, 404);
  // Bob cannot attach Alice's photo to his own workspace.
  const stolen = studio(); stolen.clients[0].projects[0].draft.items[0].photo = id;
  const attempt = await bob('/api/studio', { method: 'PUT', body: { revision: 0, data: stolen } });
  assert.equal(attempt.status, 400); assert.match((await attempt.json()).error, /photo/i);
  // A client-supplied owner header or a tampered cookie never grants access.
  const spoof = await bob('/api/studio', { headers: { 'oai-authenticated-user-id': 'vercel:whatever', 'x-owner': 'alice' } });
  assert.deepEqual(await spoof.json(), { data: null, revision: 0 });
  const aliceId = verifyOwnerCookie(alice.cookie ?? '', SECRET);
  const forged = await handleVercelRequest(new Request('https://x.test/api/studio', { headers: { cookie: 'shopdesk_uid=sd1.' + uuid() + '.AAAA' } }), { SUPABASE_URL: 'https://fake.supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', SHOPDESK_AUTH_SECRET: SECRET }, { fetch: createFakeSupabase().fetch });
  assert.equal(forged.status, 200); assert.match(forged.headers.get('set-cookie'), /HttpOnly/, 'forged cookie is replaced with a fresh identity');
  assert.equal(aliceId, null);
});

test('photo upload and retrieval, with validation and limits', async () => {
  const { browser, fake } = setup(), call = browser(), bytes = jpeg(500);
  const created = await call('/api/photos', { method: 'POST', body: bytes, type: 'image/jpeg' });
  assert.equal(created.status, 201); const { id } = await created.json(); assert.match(id, /^[0-9a-f-]{36}$/);
  const fetched = await call('/api/photos/' + id);
  assert.equal(fetched.status, 200); assert.equal(fetched.headers.get('content-type'), 'image/jpeg'); assert.deepEqual(new Uint8Array(await fetched.arrayBuffer()), bytes);
  assert.equal((await call('/api/photos', { method: 'POST', body: bytes, type: 'image/png' })).status, 415);
  assert.equal((await call('/api/photos', { method: 'POST', body: new Uint8Array(1500001), type: 'image/jpeg' })).status, 413);
  assert.equal((await call('/api/photos', { method: 'POST', body: new Uint8Array([1, 2, 3, 4, 5]), type: 'image/jpeg' })).status, 400);
  // A saved workspace may reference the photo, but not a made-up one.
  const good = studio(); good.clients[0].projects[0].draft.items[0].photo = id;
  assert.equal((await call('/api/studio', { method: 'PUT', body: { revision: 0, data: good } })).status, 200);
  const bad = studio(); bad.clients[0].projects[0].draft.items[0].photo = uuid();
  assert.equal((await call('/api/studio', { method: 'PUT', body: { revision: 1, data: bad } })).status, 400);
  assert.equal(fake.objects.size, 1);
});

test('a photo cap protects storage', async () => {
  const { browser, fake } = setup(), call = browser();
  const first = await (await call('/api/photos', { method: 'POST', body: jpeg(), type: 'image/jpeg' })).json();
  const owner = fake.photos.get(first.id).owner;
  for (let i = 0; i < 249; i++) { const id = uuid(); fake.photos.set(id, { id, owner }); }
  const full = await call('/api/photos', { method: 'POST', body: jpeg(), type: 'image/jpeg' });
  assert.equal(full.status, 413); assert.match((await full.json()).error, /full/);
});

test('storage outages are reported as JSON 503 without leaking details or the service key', async () => {
  const { browser, env } = setup();
  const failing = async () => new Response('secret upstream detail', { status: 500 });
  const response = await handleVercelRequest(new Request('https://x.test/api/studio', { headers: { cookie: '' } }), env, { fetch: failing });
  assert.equal(response.status, 503);
  const text = await response.text(); assert.ok(!text.includes('secret upstream') && !text.includes(env.SUPABASE_SERVICE_ROLE_KEY));
  const down = await handleVercelRequest(new Request('https://x.test/api/studio'), env, { fetch: async () => { throw new Error('ECONNREFUSED'); } });
  assert.equal(down.status, 503); assert.ok((await down.json()).error);
  assert.ok(browser);
});

test('the Vercel Node handler works over real HTTP: cookies, JSON bodies, photos and size limits', async () => {
  const { fake, env } = setup();
  const server = createServer((req, res) => nodeHandler(req, res, env, { fetch: fake.fetch }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    let response = await fetch(base + '/api/studio'); assert.equal(response.status, 200);
    const cookie = response.headers.getSetCookie()[0].split(';')[0]; assert.match(response.headers.get('content-type'), /json/);
    const data = studio();
    response = await fetch(base + '/api/studio', { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ revision: 0, data }) });
    assert.equal(response.status, 200);
    assert.deepEqual((await (await fetch(base + '/api/studio', { headers: { cookie } })).json()).data, data);
    response = await fetch(base + '/api/photos', { method: 'POST', headers: { cookie, 'content-type': 'image/jpeg' }, body: jpeg(900) });
    assert.equal(response.status, 201); const { id } = await response.json();
    assert.equal((await fetch(base + '/api/photos/' + id, { headers: { cookie } })).status, 200);
    assert.equal((await fetch(base + '/api/photos/' + id)).status, 404, 'no cookie, no photo');
    response = await fetch(base + '/api/photos', { method: 'POST', headers: { cookie, 'content-type': 'image/jpeg' }, body: new Uint8Array(1700000) });
    assert.equal(response.status, 413); assert.match(response.headers.get('content-type'), /json/);
    response = await fetch(base + '/api/anything'); assert.equal(response.status, 404); assert.match(response.headers.get('content-type'), /json/);
    response = await fetch(base + '/api/studio', { method: 'PUT', headers: { cookie, 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{}' });
    assert.equal(response.status, 403);
  } finally { server.close(); }
});

test('works with both legacy service_role JWT keys and the new sb_secret_ keys', async () => {
  for (const key of ['eyJhbGciOiJIUzI1NiJ9.legacy.jwt', 'sb_secret_abcdef123456']) {
    const fake = createFakeSupabase({ key });
    const env = { SUPABASE_URL: 'https://fake.supabase.test', SUPABASE_SERVICE_ROLE_KEY: key, SHOPDESK_AUTH_SECRET: SECRET };
    const first = await handleVercelRequest(new Request('https://x.test/api/studio'), env, { fetch: fake.fetch });
    assert.equal(first.status, 200, key.slice(0, 8));
    const cookie = first.headers.get('set-cookie').split(';')[0], data = studio();
    const put = await handleVercelRequest(new Request('https://x.test/api/studio', { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ revision: 0, data }) }), env, { fetch: fake.fetch });
    assert.equal(put.status, 200, key.slice(0, 8));
    const photo = await handleVercelRequest(new Request('https://x.test/api/photos', { method: 'POST', headers: { cookie, 'content-type': 'image/jpeg' }, body: jpeg() }), env, { fetch: fake.fetch });
    assert.equal(photo.status, 201, key.slice(0, 8));
  }
});
