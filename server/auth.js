import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { fail } from './core.js';

const COOKIE = 'shopdesk_uid';
const YEAR = 60 * 60 * 24 * 365;
const sign = (secret, id) => createHmac('sha256', secret).update('sd1.' + id).digest('base64url');

function readCookie(header, name) {
  for (const part of (header || '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0 && part.slice(0, at).trim() === name) return part.slice(at + 1).trim();
  }
  return '';
}

/** Returns the owner id from a valid signed cookie, or null. The id is never taken from a client-chosen header or body. */
export function verifyOwnerCookie(header, secret) {
  const value = readCookie(header, COOKIE), [prefix, id, mac] = value.split('.');
  if (prefix !== 'sd1' || !/^[0-9a-f-]{36}$/.test(id || '') || !mac) return null;
  const expected = Buffer.from(sign(secret, id)), given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given) ? 'vercel:' + id : null;
}

/** Identifies the browser by a signed HttpOnly cookie, issuing one on first contact. */
export function resolveOwner(request, env) {
  const secret = env.SHOPDESK_AUTH_SECRET;
  if (!secret || secret.length < 16) throw fail('ShopDesk sign-in is not configured. Set SHOPDESK_AUTH_SECRET (16+ characters) on the server.', 503, 'auth_not_configured');
  const existing = verifyOwnerCookie(request.headers.get('cookie'), secret);
  if (existing) return { owner: existing, cookie: null };
  const id = randomUUID();
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return { owner: 'vercel:' + id, cookie: `${COOKIE}=sd1.${id}.${sign(secret, id)}; Path=/; Max-Age=${YEAR}; HttpOnly; SameSite=Lax${secure}` };
}
