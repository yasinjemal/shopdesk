import { readFile, readdir, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { build } from 'esbuild';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const assets = {};
for (const file of await readdir('public')) {
  const type = types[file.slice(file.lastIndexOf('.'))];
  if (!type) throw new Error('No content type for public/' + file);
  assets['/' + (file === 'index.html' ? '' : file)] = { body: await readFile('public/' + file, 'utf8'), type };
}
const manifest = JSON.parse(await readFile('.openai/hosting.json', 'utf8'));
if (manifest.static || manifest.d1 !== 'DB' || manifest.r2 !== 'BUCKET') throw new Error('Expected DB and BUCKET bindings for saved posters.');
await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
// The Worker shares its API core and storage adapter with the Vercel functions, so bundle them into one module.
await build({ entryPoints: ['worker/index.js'], bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', outfile: 'dist/server/index.js', banner: { js: 'const ASSETS = ' + JSON.stringify(assets) + ';' } });
await writeFile('dist/.openai/hosting.json', JSON.stringify(manifest, null, 2));
await cp('drizzle', 'dist/.openai/drizzle', { recursive: true });
console.log('Built ShopDesk Worker with embedded public assets, DB migrations and photo storage.');
