import { fail, json, safeApi, validateWorkspace, validateStudio } from '../server/core.js';
import { CloudflareStorageAdapter } from '../server/adapters/cloudflare.js';

export { validateWorkspace, validateStudio };
// ASSETS is prepended by scripts/build.mjs.
function user(request) { const id = request.headers.get('oai-authenticated-user-id'); if (!id) throw fail('Please reopen ShopDesk and sign in to load your saved products.', 401); return id; }
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return safeApi(request, { identify: user, storage: () => new CloudflareStorageAdapter(env) });
    try {
      if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
      const asset = ASSETS[url.pathname === '/index.html' ? '/' : url.pathname]; if (!asset) return new Response('Not found', { status: 404 });
      return new Response(request.method === 'HEAD' ? null : asset.body, { headers: { 'Content-Type': asset.type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' } });
    } catch (error) {
      console.error('ShopDesk request failed', { path: url.pathname, message: error.message });
      return json({ error: 'We could not reach your saved workspace. Your edits are still here; please try again.' }, 503);
    }
  }
};
