// Local server that behaves like the Vercel deployment: static files from public/ and the same API handler.
// Set SUPABASE_* and SHOPDESK_AUTH_SECRET for cloud storage, or leave them unset to see Browser demo mode.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { nodeHandler } from '../server/vercel.js';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const port = Number(process.env.PORT) || 3000;
createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) return nodeHandler(req, res);
  const path = new URL(req.url, 'http://localhost').pathname, file = path === '/' ? 'index.html' : normalize(path).replace(/^([/\\])+/, '');
  try {
    if (file.includes('..')) throw new Error('bad path');
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(await readFile(join('public', file)));
  } catch { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain'); res.end('Not found'); }
}).listen(port, () => console.log('ShopDesk dev server on http://localhost:' + port));
