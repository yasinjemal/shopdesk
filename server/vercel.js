import { Readable } from 'node:stream';
import { fail, json, safeApi, errorResponse } from './core.js';
import { resolveOwner } from './auth.js';
import { VercelStorageAdapter, storageConfig } from './adapters/vercel.js';

const BODY_LIMIT = 1600000; // above the 1.5 MB workspace and photo limits, so the core reports the friendly 413.
const DEMO = 'Cloud storage is not set up on this server, so ShopDesk is using Browser demo mode.';

/** Web-standard handler: Request in, JSON Response out. Never returns HTML. */
export async function handleVercelRequest(request, env = process.env, deps = {}) {
  const url = new URL(request.url);
  try {
    const config = storageConfig(env);
    if (url.pathname === '/api/health') return json({ ok: true, mode: config.mode, auth: Boolean(env.SHOPDESK_AUTH_SECRET) });
    if (config.mode === 'demo') throw fail(DEMO, 503, 'storage_not_configured');
    let cookie = null;
    const response = await safeApi(request, {
      identify: req => { const result = resolveOwner(req, env); cookie = result.cookie; return result.owner; },
      storage: () => new VercelStorageAdapter({ ...config, fetch: deps.fetch })
    });
    if (cookie) response.headers.append('Set-Cookie', cookie);
    return response;
  } catch (error) {
    return errorResponse(error, url.pathname);
  }
}

async function readBody(req) {
  if (req.readableEnded && req.body !== undefined) return Buffer.from(typeof req.body === 'string' || Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body));
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size <= BODY_LIMIT) chunks.push(chunk); } // keep draining so the client sees our JSON 413, not a reset
  return size > BODY_LIMIT ? null : Buffer.concat(chunks);
}

/** Node (req, res) adapter for Vercel functions. */
export async function nodeHandler(req, res, env = process.env, deps = {}) {
  let response;
  try {
    const proto = String(req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http')).split(',')[0].trim(), host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    let body;
    if (!['GET', 'HEAD'].includes(req.method)) { body = await readBody(req); if (!body) throw fail('This file or form is too large.', 413); }
    response = await handleVercelRequest(new Request(`${proto}://${host}${req.url}`, { method: req.method, headers, body }), env, deps);
  } catch (error) {
    response = errorResponse(error, req.url);
  }
  res.statusCode = response.status;
  const cookies = response.headers.getSetCookie?.() ?? [];
  for (const [key, value] of response.headers) if (key !== 'set-cookie') res.setHeader(key, value);
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}
