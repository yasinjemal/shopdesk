import { fail } from '../core.js';

/** Cloudflare D1 (workspaces, photo index) + R2 (photo bytes). Behaviour matches the original Worker. */
export class CloudflareStorageAdapter {
  constructor(env) {
    if (!env.DB) throw fail('Saved products are temporarily unavailable. Please try again.', 503);
    this.db = env.DB; this.bucket = env.BUCKET;
  }
  async getWorkspace(owner) {
    const record = await this.db.prepare('SELECT data, revision FROM poster_workspaces WHERE owner = ?').bind(owner).first();
    return record ? { data: JSON.parse(record.data), revision: record.revision } : null;
  }
  async saveWorkspace(owner, data, revision, studio) {
    const row = await this.db.prepare("INSERT INTO poster_workspaces (owner,data,revision,updated_at) SELECT ?, ?, 1, ? WHERE ? = 0 OR EXISTS (SELECT 1 FROM poster_workspaces WHERE owner = ?) ON CONFLICT(owner) DO UPDATE SET data = excluded.data, revision = poster_workspaces.revision + 1, updated_at = excluded.updated_at WHERE poster_workspaces.revision = ? AND (? = 1 OR COALESCE(json_extract(poster_workspaces.data, '$.schemaVersion'), 1) <> 2) RETURNING revision").bind(owner, JSON.stringify(data), new Date().toISOString(), revision, owner, revision, studio ? 1 : 0).first();
    return row ? row.revision : null;
  }
  async ownedPhotoIds(owner) {
    const rows = await this.db.prepare('SELECT id FROM product_photos WHERE owner = ?').bind(owner).all();
    return new Set(rows.results.map(r => r.id));
  }
  requirePhotos() { if (!this.bucket) throw fail('Photo storage is temporarily unavailable. Please try again.', 503); }
  async countPhotos(owner) { return (await this.db.prepare('SELECT COUNT(*) AS count FROM product_photos WHERE owner = ?').bind(owner).first()).count; }
  async putPhoto(owner, id, bytes) {
    const key = 'photos/' + id;
    await this.bucket.put(key, bytes, { httpMetadata: { contentType: 'image/jpeg' } });
    try { await this.db.prepare('INSERT INTO product_photos (id,owner,mime,bytes,created_at) VALUES (?,?,?,?,?)').bind(id, owner, 'image/jpeg', bytes.length, new Date().toISOString()).run(); }
    catch (e) { await this.bucket.delete(key); throw e; }
  }
  async getPhoto(owner, id) {
    const record = await this.db.prepare('SELECT mime FROM product_photos WHERE id = ? AND owner = ?').bind(id, owner).first(); if (!record) return null;
    if (!this.bucket) throw fail('Photos are temporarily unavailable.', 503);
    const object = await this.bucket.get('photos/' + id); return object ? object.body : null;
  }
}
