import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import worker from '../worker/index.js';

// Exercise the real API against isolated storage; never use a live account.
export async function startApp(port = 0) {
  const sql = new DatabaseSync(':memory:');
  for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
  const photos = new Map();
  const env = {
    DB: { prepare(query) { const stmt = sql.prepare(query); return { bind(...args) {
      return { async first() { return stmt.get(...args) ?? null; }, async all() { return { results: stmt.all(...args) }; }, async run() { return stmt.run(...args); } };
    } }; } },
    BUCKET: { async put(id, bytes) { photos.set(id, bytes); }, async get(id) { return photos.has(id) ? { body: photos.get(id) } : null; }, async delete(id) { photos.delete(id); } }
  };
  const server = createServer(async (req, res) => {
    try {
      if (req.url.startsWith('/api/')) {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        const body = Buffer.concat(chunks);
        const response = await worker.fetch(new Request('http://' + req.headers.host + req.url, {
          method: req.method, headers: { ...req.headers, 'oai-authenticated-user-id': req.headers['x-shopdesk-test-user']||'browser-test' },
          ...(body.length ? { body } : {})
        }), env);
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer())); return;
      }
      const path = req.url === '/' ? 'index.html' : req.url.slice(1);
      if(!/^[a-z-]+\.(html|css|js|png)$/.test(path)){res.writeHead(404).end();return;}
      res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.png')?'image/png':'text/html');
      res.end(await readFile(new URL('../public/' + path, import.meta.url)));
    } catch (error) { res.writeHead(500).end(error.message); }
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: async () => { await new Promise(resolve => server.close(resolve)); sql.close(); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = await startApp(4173);
  console.log('Handbill local preview: '+app.url+' — isolated test account; data resets when stopped.');
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });
}
