const MAX_BODY = 100000;
const MAX_PHOTO = 1500000;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const db = env => { if (!env.DB) throw fail('Saved products are temporarily unavailable. Please try again.', 503); return env.DB; };
function user(request) { const id = request.headers.get('oai-authenticated-user-id'); if (!id) throw fail('Please reopen ShopDesk and sign in to load your saved products.', 401); return id; }
function text(value, max, label) { if (typeof value !== 'string' || value.length > max) throw fail('Check ' + label + '.'); return value.trim(); }
function item(value) {
  if (!value || typeof value !== 'object') throw fail('Check your product details.');
  const price = text(value.price, 20, 'the product price');
  if (price !== '' && (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 1000000)) throw fail('Product prices must be between R0 and R1,000,000.');
  const photo = value.photo == null ? '' : text(value.photo, 36, 'the product photo');
  if (photo && !/^[0-9a-f-]{36}$/.test(photo)) throw fail('Invalid photo.');
  return { name:text(value.name,50,'the product name'),size:text(value.size,25,'the pack size'),price,photo };
}
export function validateWorkspace(data) {
  if (!data || !data.shop || !data.draft || !Array.isArray(data.products) || data.products.length > 100) throw fail('Check your saved shop and products.');
  const d = data.draft;
  if (!Array.isArray(d.items) || d.items.length < 1 || d.items.length > 3 || !['green','blue','orange'].includes(d.theme) || !['poster','status'].includes(d.format)) throw fail('Choose a valid poster layout and up to three products.');
  const date = text(d.date,10,'the offer date');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail('Check the offer date.');
  const seen = new Set();
  const products = data.products.map(p => { const id = text(p.id,36,'the saved product'); if (!/^[0-9a-f-]{36}$/.test(id) || seen.has(id)) throw fail('Invalid saved product.'); seen.add(id); const v = item(p); if (!v.name) throw fail('Give your saved product a name.'); return {id,...v}; });
  return {shop:{name:text(data.shop.name,50,'the shop name'),phone:text(data.shop.phone,24,'the phone number'),location:text(data.shop.location,60,'the location')},products,draft:{headline:text(d.headline,45,'the headline'),date,theme:d.theme,format:d.format,items:d.items.map(item)}};
}
async function readLimited(request, limit) {
  if (Number(request.headers.get('content-length')) > limit) throw fail('This file or form is too large.',413);
  if (!request.body) throw fail('No data was received.');
  const reader = request.body.getReader(); const chunks=[]; let size=0;
  try { while(true){ const {done,value}=await reader.read(); if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw fail('This file or form is too large.',413);}chunks.push(value); } } finally { reader.releaseLock(); }
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;
}
function protectWrite(request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw fail('Open ShopDesk to make this change.',403);
  const origin=request.headers.get('origin');if(origin && origin!==new URL(request.url).origin)throw fail('Open ShopDesk to make this change.',403);
}
async function handleAPI(request,env,url) {
  const owner=user(request); const database=db(env);
  if(request.method!=='GET')protectWrite(request);
  if(url.pathname==='/api/workspace' && request.method==='GET'){
    const record=await database.prepare('SELECT data, revision FROM poster_workspaces WHERE owner = ?').bind(owner).first();
    return json({data:record?JSON.parse(record.data):null,revision:record?.revision??0});
  }
  if(url.pathname==='/api/workspace' && request.method==='PUT'){
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw fail('Send the saved workspace as JSON.',415);
    let body;try{body=JSON.parse(new TextDecoder().decode(await readLimited(request,MAX_BODY)));}catch(e){if(e.status)throw e;throw fail('Could not read these changes.');}
    if(!Number.isInteger(body.revision)||body.revision<0)throw fail('Reload your saved workspace before saving.');
    const data=validateWorkspace(body.data);
    const photoIds=[...new Set([...data.products,...data.draft.items].map(i=>i.photo).filter(Boolean))];
    if(photoIds.length){const rows=await database.prepare('SELECT id FROM product_photos WHERE owner = ?').bind(owner).all();const owned=new Set(rows.results.map(r=>r.id));if(photoIds.some(id=>!owned.has(id)))throw fail('A product photo could not be found in your account. Add it again.',400);}
    const revision=body.revision;
    const row=await database.prepare('INSERT INTO poster_workspaces (owner,data,revision,updated_at) SELECT ?, ?, 1, ? WHERE ? = 0 OR EXISTS (SELECT 1 FROM poster_workspaces WHERE owner = ?) ON CONFLICT(owner) DO UPDATE SET data = excluded.data, revision = poster_workspaces.revision + 1, updated_at = excluded.updated_at WHERE poster_workspaces.revision = ? RETURNING revision').bind(owner,JSON.stringify(data),new Date().toISOString(),revision,owner,revision).first();
    if(!row)throw fail('This workspace changed in another tab. Reload the saved version before making more changes.',409);
    return json({revision:row.revision});
  }
  if(url.pathname==='/api/photos' && request.method==='POST'){
    if(!env.BUCKET)throw fail('Photo storage is temporarily unavailable. Please try again.',503);
    if(!request.headers.get('content-type')?.startsWith('image/jpeg'))throw fail('Choose a JPG, PNG or WebP photo.',415);
    const bytes=await readLimited(request,MAX_PHOTO);
    if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)throw fail('This photo could not be read. Try another JPG, PNG or WebP image.');
    const count=await database.prepare('SELECT COUNT(*) AS count FROM product_photos WHERE owner = ?').bind(owner).first();
    if(count.count>=250)throw fail('Your photo storage is full. Reuse a saved product photo for now.',413);
    const id=crypto.randomUUID();const key='photos/'+id;
    await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'image/jpeg'}});
    try{await database.prepare('INSERT INTO product_photos (id,owner,mime,bytes,created_at) VALUES (?,?,?,?,?)').bind(id,owner,'image/jpeg',bytes.length,new Date().toISOString()).run();}catch(e){await env.BUCKET.delete(key);throw e;}
    return json({id},201);
  }
  if(url.pathname.startsWith('/api/photos/')&&request.method==='GET'){
    const id=url.pathname.slice('/api/photos/'.length);if(!/^[0-9a-f-]{36}$/.test(id))throw fail('Photo not found.',404);
    const record=await database.prepare('SELECT mime FROM product_photos WHERE id = ? AND owner = ?').bind(id,owner).first();if(!record)throw fail('Photo not found.',404);
    if(!env.BUCKET)throw fail('Photos are temporarily unavailable.',503);
    const object=await env.BUCKET.get('photos/'+id);if(!object)throw fail('Photo not found.',404);
    return new Response(object.body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  throw fail('This page could not be found.',404);
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    try {
      if(url.pathname.startsWith('/api/'))return await handleAPI(request,env,url);
      if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed.'},405);
      const asset=ASSETS[url.pathname==='/index.html'?'/':url.pathname];if(!asset)return new Response('Not found',{status:404});
      return new Response(request.method==='HEAD'?null:asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
    } catch(error) {
      if(!error.status)console.error('ShopDesk request failed',{path:url.pathname,message:error.message});
      return json({error:error.status?error.message:'We could not reach your saved workspace. Your edits are still here; please try again.'},error.status??503);
    }
  }
};
