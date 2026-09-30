import { createServer } from 'node:http';

/** In-memory stand-in for the parts of Supabase (PostgREST + Storage) that ShopDesk uses. */
export function createFakeSupabase({ key = 'test-service-key', bucket = 'shopdesk-photos' } = {}) {
  const workspaces = new Map(), photos = new Map(), objects = new Map(), calls = [];
  const reply = (body, status = 200, headers = {}) => new Response(body === undefined ? null : typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body), { status, headers: typeof body === 'object' && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json', ...headers } : headers });
  async function fetchImpl(input, init = {}) {
    const url = new URL(input), method = init.method || 'GET', headers = new Headers(init.headers);
    calls.push({ method, path: url.pathname + url.search });
    // Mirrors the platform: an sb_ key is valid in apikey only (as a Bearer token it is an "Invalid JWT"); a legacy JWT key goes in both.
    const bearer = headers.get('authorization');
    if (headers.get('apikey') !== key || (key.startsWith('sb_') ? bearer !== null : bearer !== 'Bearer ' + key)) return reply({ message: 'Invalid API key' }, 401);
    const eq = name => { const v = url.searchParams.get(name); return v?.startsWith('eq.') ? v.slice(3) : undefined; };
    if (url.pathname === '/rest/v1/poster_workspaces' && method === 'GET') {
      const row = workspaces.get(eq('owner')); return reply(row ? [{ data: row.data, revision: row.revision }] : []);
    }
    if (url.pathname === '/rest/v1/rpc/shopdesk_save_workspace' && method === 'POST') {
      const { p_owner, p_data, p_revision, p_studio } = JSON.parse(init.body), row = workspaces.get(p_owner);
      if (p_revision === 0) { if (row) return reply(null); workspaces.set(p_owner, { data: p_data, revision: 1 }); return reply(1); }
      if (!row || row.revision !== p_revision || (!p_studio && (JSON.parse(row.data).schemaVersion ?? 1) === 2)) return reply(null);
      row.data = p_data; row.revision++; return reply(row.revision);
    }
    if (url.pathname === '/rest/v1/product_photos' && method === 'GET') {
      const owner = eq('owner'), id = eq('id'), list = url.searchParams.get('id')?.startsWith('in.(') ? url.searchParams.get('id').slice(4, -1).split(',') : null;
      const rows = [...photos.values()].filter(p => p.owner === owner && (!id || p.id === id) && (!list || list.includes(p.id)));
      return reply(rows.map(p => ({ id: p.id })), 200, { 'Content-Range': rows.length ? `0-${rows.length - 1}/${rows.length}` : '*/0' });
    }
    if (url.pathname === '/rest/v1/product_photos' && method === 'POST') { const row = JSON.parse(init.body); photos.set(row.id, row); return reply(undefined, 201); }
    const match = url.pathname.match(/^\/storage\/v1\/object\/([^/]+)\/(.+)$/);
    if (match && match[1] === bucket) {
      if (method === 'POST') { objects.set(match[2], new Uint8Array(init.body)); return reply({ Key: match[1] + '/' + match[2] }); }
      if (method === 'GET') return objects.has(match[2]) ? reply(objects.get(match[2])) : reply({ error: 'not_found' }, 404);
      if (method === 'DELETE') { objects.delete(match[2]); return reply({}); }
    }
    return reply({ message: 'Unhandled fake Supabase route ' + method + ' ' + url.pathname }, 500);
  }
  return { key, bucket, workspaces, photos, objects, calls, fetch: fetchImpl };
}

/** Serves the fake over HTTP so the dev server can be pointed at it with SUPABASE_URL. */
export function serveFakeSupabase(fake, port = 0) {
  const server = createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const response = await fake.fetch('http://fake.local' + req.url, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined });
    res.statusCode = response.status; response.headers.forEach((v, k) => res.setHeader(k, v)); res.end(Buffer.from(await response.arrayBuffer()));
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, url: 'http://127.0.0.1:' + server.address().port })));
}
