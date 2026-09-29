import { fail } from '../core.js';

const UNAVAILABLE = 'Saved products are temporarily unavailable. Please try again.';

/**
 * Supabase Postgres + Storage through their REST APIs, used by the Vercel functions.
 * The service-role key is read on the server only and is never sent to the browser.
 */
export class VercelStorageAdapter {
  constructor({ url, serviceKey, bucket = 'shopdesk-photos', fetch = globalThis.fetch }) {
    this.base = url.replace(/\/+$/, ''); this.key = serviceKey; this.bucket = bucket; this.fetch = fetch;
  }
  async call(path, { headers = {}, ...init } = {}) {
    let response;
    try { response = await this.fetch(this.base + path, { ...init, headers: { apikey: this.key, Authorization: 'Bearer ' + this.key, ...headers } }); }
    catch (e) { console.error('Supabase request failed', { path, message: e.message }); throw fail(UNAVAILABLE, 503); }
    return response;
  }
  async ok(path, init, expected = [200, 201, 204]) {
    const response = await this.call(path, init);
    if (!expected.includes(response.status)) {
      console.error('Supabase returned an error', { path, status: response.status, body: (await response.text()).slice(0, 300) });
      throw fail(UNAVAILABLE, 503);
    }
    return response;
  }
  json(body) { return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }
  async getWorkspace(owner) {
    const rows = await (await this.ok('/rest/v1/poster_workspaces?select=data,revision&owner=eq.' + encodeURIComponent(owner))).json();
    return rows[0] ? { data: JSON.parse(rows[0].data), revision: rows[0].revision } : null;
  }
  async saveWorkspace(owner, data, revision, studio) {
    const result = await (await this.ok('/rest/v1/rpc/shopdesk_save_workspace', { method: 'POST', ...this.json({ p_owner: owner, p_data: JSON.stringify(data), p_revision: revision, p_studio: studio }) })).json();
    return typeof result === 'number' ? result : null;
  }
  async ownedPhotoIds(owner, ids) {
    const rows = await (await this.ok('/rest/v1/product_photos?select=id&owner=eq.' + encodeURIComponent(owner) + '&id=in.(' + ids.map(encodeURIComponent).join(',') + ')')).json();
    return new Set(rows.map(r => r.id));
  }
  requirePhotos() {}
  async countPhotos(owner) {
    const response = await this.ok('/rest/v1/product_photos?select=id&limit=1&owner=eq.' + encodeURIComponent(owner), { headers: { Prefer: 'count=exact' } });
    return Number((response.headers.get('content-range') || '').split('/')[1]) || 0;
  }
  async putPhoto(owner, id, bytes) {
    const path = `/storage/v1/object/${this.bucket}/photos/${id}`;
    await this.ok(path, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }, body: bytes });
    try { await this.ok('/rest/v1/product_photos', { method: 'POST', ...this.json({ id, owner, mime: 'image/jpeg', bytes: bytes.length }) }); }
    catch (e) { await this.call(path, { method: 'DELETE' }); throw e; }
  }
  async getPhoto(owner, id) {
    const rows = await (await this.ok('/rest/v1/product_photos?select=id&id=eq.' + encodeURIComponent(id) + '&owner=eq.' + encodeURIComponent(owner))).json();
    if (!rows.length) return null;
    const response = await this.call(`/storage/v1/object/${this.bucket}/photos/${id}`);
    if (response.status === 404 || response.status === 400) return null;
    if (!response.ok) throw fail(UNAVAILABLE, 503);
    return new Uint8Array(await response.arrayBuffer());
  }
}

/** Reads the storage mode from the environment: 'supabase' when configured, otherwise the browser demo. */
export function storageConfig(env) {
  const mode = (env.SHOPDESK_STORAGE_MODE || '').trim().toLowerCase();
  if (mode && !['local', 'supabase'].includes(mode)) throw fail('SHOPDESK_STORAGE_MODE must be "local" or "supabase".', 503, 'storage_not_configured');
  const configured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
  if (mode === 'supabase' && !configured) throw fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to use Supabase storage.', 503, 'storage_not_configured');
  return mode === 'local' || !configured ? { mode: 'demo' } : { mode: 'supabase', url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, bucket: env.SUPABASE_STORAGE_BUCKET || 'shopdesk-photos' };
}
