const MAX_BODY = 100000;
const MAX_PHOTO = 1500000;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export { json };
export const fail = (message, status = 400, code) => Object.assign(new Error(message), { status }, code ? { code } : {});
function text(value, max, label) { if (typeof value !== 'string' || value.length > max) throw fail('Check ' + label + '.'); return value.trim(); }
function item(value) {
  if (!value || typeof value !== 'object') throw fail('Check your product details.');
  const price = text(value.price, 20, 'the product price');
  if (price !== '' && (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 1000000)) throw fail('Product prices must be between R0 and R1,000,000.');
  const photo = value.photo == null ? '' : text(value.photo, 36, 'the product photo');
  if (photo && !/^[0-9a-f-]{36}$/.test(photo)) throw fail('Invalid photo.');
  const styling={};
  for(const [key,min,max] of [['photoScale',.5,2],['photoX',-1,1],['photoY',-1,1]])if(value[key]!==undefined){if(!Number.isFinite(value[key])||value[key]<min||value[key]>max)throw fail('Check the product photo framing.');styling[key]=value[key];}
  if(value.featured!==undefined){if(typeof value.featured!=='boolean')throw fail('Choose a valid featured offer.');styling.featured=value.featured;}
  return { name:text(value.name,50,'the product name'),size:text(value.size,25,'the pack size'),price,photo,...styling };
}
export function validateWorkspace(data) {
  if (!data || !data.shop || !data.draft || !Array.isArray(data.products) || data.products.length > 100) throw fail('Check your saved shop and products.');
  const d = data.draft;
  const template = d.template ?? 'simple';
  if (!['simple','retail','bold','market','boutique','menu','studio','super','ribbon','signature','pop','editorial','noir','warehouse','atelier','street'].includes(template)) throw fail('Choose a poster template.');
  const maxItems = template === 'simple' ? 3 : 25;
  const finishing={};
  for(const [key,values] of [['typeface',['design','modern','elegant','geometric']],['priceStyle',['design','solid','outline','pill']]])if(d[key]!==undefined){
    if(!values.includes(d[key]))throw fail('Choose a valid design finish.');finishing[key]=d[key];
  }
  if(d.itemCount!==undefined){
    if(!Number.isInteger(d.itemCount)||d.itemCount<1||d.itemCount>25||!Array.isArray(d.items)||d.itemCount>d.items.length)throw fail('Choose between 1 and 25 items.');
    finishing.itemCount=d.itemCount;
  }
  if(d.purpose!==undefined){if(!['offers','spotlight','event','opening'].includes(d.purpose))throw fail('Choose a flyer purpose.');finishing.purpose=d.purpose;}
  for(const [key,max] of [['details',180],['eventDate',10],['eventTime',40],['venue',80],['heroPhoto',36]])if(d[key]!==undefined)finishing[key]=text(d[key],max,'the project details');
  if(finishing.eventDate&&!/^\d{4}-\d{2}-\d{2}$/.test(finishing.eventDate))throw fail('Check the event date.');
  if(finishing.heroPhoto&&!/^[0-9a-f-]{36}$/.test(finishing.heroPhoto))throw fail('Invalid main photo.');
  for(const key of ['trimPhotos','cleanNames','showDate'])if(d[key]!==undefined){if(typeof d[key]!=='boolean')throw fail('Choose valid flyer options.');finishing[key]=d[key];}
  if(d.business!==undefined){if(!['grocery','fashion','food','beauty','services','general'].includes(d.business))throw fail('Choose a business type.');finishing.business=d.business;}
  for(const [key,max] of [['eyebrow',28],['cta',40],['terms',80]])if(d[key]!==undefined)finishing[key]=text(d[key],max,'the poster wording');
  if (!Array.isArray(d.items) || d.items.length < 1 || d.items.length > 25 || (d.purpose==='spotlight'?1:(d.itemCount??d.items.length)) > maxItems || !['green','blue','orange','red','plum','charcoal','teal','gold','berry','violet','cobalt','coral','coffee'].includes(d.theme) || !['poster','status'].includes(d.format)) throw fail('Choose a valid layout. Flyers hold up to 25 visible items; simple posters hold up to 3.');
  if(d.items.filter(i=>i?.featured===true).length>1)throw fail('Choose only one featured offer per flyer.');
  const logo = data.shop.logo == null ? '' : text(data.shop.logo,36,'the shop logo');
  if (logo && !/^[0-9a-f-]{36}$/.test(logo)) throw fail('Invalid shop logo.');
  const date = text(d.date,10,'the offer date');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail('Check the offer date.');
  const seen = new Set();
  const products = data.products.map(p => { const id = text(p.id,36,'the saved product'); if (!/^[0-9a-f-]{36}$/.test(id) || seen.has(id)) throw fail('Invalid saved product.'); seen.add(id); const v = item(p); delete v.featured; if (!v.name) throw fail('Give your saved product a name.'); return {id,...v}; });
  return {shop:{name:text(data.shop.name,50,'the shop name'),phone:text(data.shop.phone,24,'the phone number'),location:text(data.shop.location,60,'the location'),...(data.shop.logo!==undefined?{logo}:{})},products,draft:{headline:text(d.headline,45,'the headline'),date,theme:d.theme,format:d.format,...(d.template!==undefined?{template}:{}),...finishing,items:d.items.map(item)}};
}
export function validateStudio(data){
  if(data?.schemaVersion!==2||!Array.isArray(data.clients)||data.clients.length<1||data.clients.length>20)throw fail('Check your saved clients.');
  const seen=new Set();let count=0;
  function unique(value){const id=text(value,36,'the client or project');if(!/^[0-9a-f-]{36}$/.test(id)||seen.has(id))throw fail('Invalid client or project.');seen.add(id);return id;}
  const clients=data.clients.map(c=>{
    const id=unique(c.id);if(!Array.isArray(c.projects)||!c.projects.length)throw fail('Each client needs a project.');
    let shop,products;
    const projects=c.projects.map(p=>{if(++count>100)throw fail('You can save up to 100 projects.');const projectId=unique(p.id),title=text(p.title,60,'the project name');if(!title)throw fail('Name your project.');const workspace=validateWorkspace({shop:c.shop,products:c.products,draft:p.draft});shop=workspace.shop;products=workspace.products;return {id:projectId,title,draft:workspace.draft};});
    return {id,shop,products,projects};
  });
  const client=clients.find(c=>c.id===data.activeClientId);if(!client?.projects.some(p=>p.id===data.activeProjectId))throw fail('Choose a project belonging to this client.');
  return {schemaVersion:2,activeClientId:data.activeClientId,activeProjectId:data.activeProjectId,clients};
}
export async function readLimited(request, limit) {
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
export const PHOTO_LIMIT = 250;
const PHOTO_ID = /^[0-9a-f-]{36}$/;
/**
 * Shared API implementation used by the Cloudflare Worker and the Vercel functions.
 * `identify(request)` returns the trusted owner id; `storage()` returns a storage adapter:
 *   getWorkspace(owner) -> {data, revision} | null
 *   saveWorkspace(owner, data, revision, studio) -> new revision | null on conflict
 *   ownedPhotoIds(owner, ids) -> Set of ids the owner holds
 *   requirePhotos() -> throws if photo storage is unavailable
 *   countPhotos(owner) / putPhoto(owner, id, bytes) / getPhoto(owner, id) -> bytes | null
 */
export async function handleApi(request, { identify, storage: getStorage }, url = new URL(request.url)) {
  const owner = await identify(request); const storage = getStorage();
  if (request.method !== 'GET') protectWrite(request);
  const studio = url.pathname === '/api/studio', workspace = studio || url.pathname === '/api/workspace';
  if (workspace && request.method === 'GET') {
    const record = await storage.getWorkspace(owner);
    if (!studio && record && record.data.schemaVersion === 2) throw fail('Designer Mode is ready. Refresh ShopDesk to open your clients and projects.', 409);
    return json({ data: record ? record.data : null, revision: record?.revision ?? 0 });
  }
  if (workspace && request.method === 'PUT') {
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw fail('Send the saved workspace as JSON.', 415);
    let body; try { body = JSON.parse(new TextDecoder().decode(await readLimited(request, studio ? 1500000 : MAX_BODY))); } catch (e) { if (e.status) throw e; throw fail('Could not read these changes.'); }
    if (!Number.isInteger(body.revision) || body.revision < 0) throw fail('Reload your saved workspace before saving.');
    const data = studio ? validateStudio(body.data) : validateWorkspace(body.data);
    const workspaces = studio ? data.clients.flatMap(c => c.projects.map(p => ({ shop: c.shop, products: c.products, draft: p.draft }))) : [data];
    const photoIds = [...new Set(workspaces.flatMap(w => [...w.products, ...w.draft.items, { photo: w.shop.logo }, { photo: w.draft.heroPhoto }]).map(i => i.photo).filter(Boolean))];
    if (photoIds.length) { const owned = await storage.ownedPhotoIds(owner, photoIds); if (photoIds.some(id => !owned.has(id))) throw fail('A product photo could not be found in your account. Add it again.', 400); }
    const revision = await storage.saveWorkspace(owner, data, body.revision, studio);
    if (revision == null) throw fail('This workspace changed in another tab. Reload the saved version before making more changes.', 409);
    return json({ revision });
  }
  if (url.pathname === '/api/photos' && request.method === 'POST') {
    storage.requirePhotos();
    if (!request.headers.get('content-type')?.startsWith('image/jpeg')) throw fail('Choose a JPG, PNG or WebP photo.', 415);
    const bytes = await readLimited(request, MAX_PHOTO);
    if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) throw fail('This photo could not be read. Try another JPG, PNG or WebP image.');
    if (await storage.countPhotos(owner) >= PHOTO_LIMIT) throw fail('Your photo storage is full. Reuse a saved product photo for now.', 413);
    const id = crypto.randomUUID();
    await storage.putPhoto(owner, id, bytes);
    return json({ id }, 201);
  }
  if (url.pathname.startsWith('/api/photos/') && request.method === 'GET') {
    const id = url.pathname.slice('/api/photos/'.length); if (!PHOTO_ID.test(id)) throw fail('Photo not found.', 404);
    const bytes = await storage.getPhoto(owner, id); if (!bytes) throw fail('Photo not found.', 404);
    return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  throw fail('This page could not be found.', 404);
}
export function errorResponse(error, path) {
  if (!error.status) console.error('ShopDesk request failed', { path, message: error.message });
  const body = { error: error.status ? error.message : 'We could not reach your saved workspace. Your edits are still here; please try again.' };
  if (error.code) body.code = error.code;
  return json(body, error.status ?? 503);
}
/** Like handleApi, but always resolves to a JSON Response. */
export async function safeApi(request, deps) {
  const url = new URL(request.url);
  try { return await handleApi(request, deps, url); } catch (error) { return errorResponse(error, url.pathname); }
}
