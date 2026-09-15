import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
const assets = {};
for (const [file, type] of Object.entries({'index.html':'text/html; charset=utf-8','styles.css':'text/css; charset=utf-8','logic.js':'text/javascript; charset=utf-8','poster.js':'text/javascript; charset=utf-8','pack.js':'text/javascript; charset=utf-8','promotion.js':'text/javascript; charset=utf-8','app.js':'text/javascript; charset=utf-8','interface.js':'text/javascript; charset=utf-8','items.js':'text/javascript; charset=utf-8','batch.js':'text/javascript; charset=utf-8'})) {
  assets['/' + (file === 'index.html' ? '' : file)] = {body: await readFile('public/' + file, 'utf8'),type};
}
assets['/business.js'] = {body:await readFile('public/business.js','utf8'),type:'text/javascript; charset=utf-8'};
assets['/studio.js'] = {body:await readFile('public/studio.js','utf8'),type:'text/javascript; charset=utf-8'};
const source = await readFile('worker/index.js','utf8');
const manifest = JSON.parse(await readFile('.openai/hosting.json','utf8'));
if (manifest.static || manifest.d1 !== 'DB' || manifest.r2 !== 'BUCKET') throw new Error('Expected DB and BUCKET bindings for saved posters.');
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js','const ASSETS = '+JSON.stringify(assets)+';\n'+source);
await writeFile('dist/.openai/hosting.json',JSON.stringify(manifest,null,2));
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log('Built ShopDesk Worker with embedded public assets, DB migrations and photo storage.');
