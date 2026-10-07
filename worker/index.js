import '../public/templates.js';
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
  const styling={};
  for(const [key,min,max] of [['combo',0,5],['quantity',1,99]])if(value[key]!==undefined){if(!Number.isInteger(value[key])||value[key]<min||value[key]>max)throw fail('Check the combo assignment or quantity.');styling[key]=value[key];}
  if(value.dealQuantity!==undefined){if(!Number.isInteger(value.dealQuantity)||value.dealQuantity<2||value.dealQuantity>99)throw fail('Choose a multi-buy quantity from 2 to 99.');styling.dealQuantity=value.dealQuantity;}
  for(const [key,min,max] of [['photoScale',.5,2],['photoX',-1,1],['photoY',-1,1]])if(value[key]!==undefined){if(!Number.isFinite(value[key])||value[key]<min||value[key]>max)throw fail('Check the product photo framing.');styling[key]=value[key];}
  if(value.featured!==undefined){if(typeof value.featured!=='boolean')throw fail('Choose a valid featured offer.');styling.featured=value.featured;}
  return { name:text(value.name,50,'the product name'),size:text(value.size,25,'the pack size'),price,photo,...styling };
}
export function validateWorkspace(data) {
  if (!data || !data.shop || !data.draft || !Array.isArray(data.products) || data.products.length > 100) throw fail('Check your saved shop and products.');
  const d = data.draft;
  const template = d.template ?? 'simple';
  if (!['simple','retail','bold','market','boutique','menu','studio','super','ribbon','signature','pop','editorial','noir','warehouse','atelier','street','sunburst','botanical','blueprint','scrapbook','candy','mono','wholesale','mosaic','fresh','parade','shelf','paper','arc','ticket','terrace','combo-board','combo-ticket','combo-fresh','gazette','harvest','ledger','midnight','diagonal','circular','frontpage','aisle','price-blocks','fresh-cut','split-banner','combo-circular','combo-receipt'].includes(template)) throw fail('Choose a poster template.');
  const maxItems = d.purpose==='combos'?20:template === 'simple' ? 3 : 25;
  const finishing={};
  if(d.combos!==undefined){
    if(!Array.isArray(d.combos)||!d.combos.length||d.combos.length>6)throw fail('Choose 1 to 6 combos.');
    finishing.combos=d.combos.map(c=>{if(!c||typeof c!=='object')throw fail('Check your combo.');const price=text(c.price,20,'the bundle price');if(price!==''&&(!Number.isFinite(Number(price))||Number(price)<0||Number(price)>1000000))throw fail('Check the bundle price.');return {name:text(c.name,40,'the combo name'),price};});
    if(d.items?.some(i=>i.combo!==undefined&&i.combo>=d.combos.length))throw fail('Choose an existing combo for each product.');
  }

  for(const [key,values] of [['logoSize',['compact','prominent']],['exportQuality',['standard','4k']],['typeface',['design','modern','elegant','geometric']],['priceStyle',['design','solid','outline','pill']]])if(d[key]!==undefined){
    if(!values.includes(d[key]))throw fail('Choose a valid design finish.');finishing[key]=d[key];
  }
  if(d.itemCount!==undefined){
    if(!Number.isInteger(d.itemCount)||d.itemCount<1||d.itemCount>25||!Array.isArray(d.items)||d.itemCount>d.items.length)throw fail('Choose between 1 and 25 items.');
    finishing.itemCount=d.itemCount;
  }
  if(d.purpose!==undefined){if(!['offers','combos','spotlight','event','opening'].includes(d.purpose))throw fail('Choose a flyer purpose.');finishing.purpose=d.purpose;}
  for(const [key,max] of [['details',180],['eventDate',10],['eventTime',40],['venue',80],['heroPhoto',36]])if(d[key]!==undefined)finishing[key]=text(d[key],max,'the project details');
  if(finishing.eventDate&&!/^\d{4}-\d{2}-\d{2}$/.test(finishing.eventDate))throw fail('Check the event date.');
  if(finishing.heroPhoto&&!/^[0-9a-f-]{36}$/.test(finishing.heroPhoto))throw fail('Invalid main photo.');
  for(const key of ['trimPhotos','cleanNames','showDate','keepColours'])if(d[key]!==undefined){if(typeof d[key]!=='boolean')throw fail('Choose valid flyer options.');finishing[key]=d[key];}
  if(d.business!==undefined){if(!['grocery','fashion','food','beauty','services','general'].includes(d.business))throw fail('Choose a business type.');finishing.business=d.business;}
  for(const [key,max] of [['eyebrow',28],['cta',40],['terms',80]])if(d[key]!==undefined)finishing[key]=text(d[key],max,'the poster wording');
  if (!Array.isArray(d.items) || d.items.length < 1 || d.items.length > 25 || (d.purpose==='spotlight'?1:(d.itemCount??d.items.length)) > maxItems || !['green','blue','orange','red','plum','charcoal','teal','gold','berry','violet','cobalt','coral','coffee','sage','terracotta','lavender','peach','lemon','aqua','burgundy','slate','tangerine','petrol','raspberry','olive','indigo','cocoa'].includes(d.theme) || !['poster','status','square','landscape','a4','a5'].includes(d.format)) throw fail('Choose a valid layout. Flyers hold up to 25 visible items; simple posters hold up to 3.');
  if(d.items.filter(i=>i?.featured===true).length>1)throw fail('Choose only one featured offer per flyer.');
  const logo = data.shop.logo == null ? '' : text(data.shop.logo,36,'the shop logo');
  if (logo && !/^[0-9a-f-]{36}$/.test(logo)) throw fail('Invalid shop logo.');
  const date = text(d.date,10,'the offer date');
  if(d.startDate!==undefined){finishing.startDate=text(d.startDate,10,'the offer start date');if(finishing.startDate&&!/^\d{4}-\d{2}-\d{2}$/.test(finishing.startDate))throw fail('Check the offer start date.');}
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
  if(url.pathname==='/api/templates'&&request.method==='GET'){
    const mine=url.searchParams.get('mine')==='1',query=(url.searchParams.get('q')||'').slice(0,80).toLowerCase(),category=url.searchParams.get('category')||'';
    const cursor=url.searchParams.get('cursor')||'';
    if(cursor&&!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\|[0-9a-f-]{36}$/.test(cursor))throw fail('Reload the template library.');
    const [time='',id='']=cursor.split('|');
    const rows=await database.prepare("SELECT id,owner,data,listed,created_at FROM shared_templates WHERE ((? = 1 AND owner = ?) OR (? = 0 AND listed = 1)) AND (? = '' OR business = ?) AND (? = '' OR instr(lower(title || ' ' || description), ?) > 0) AND (? = '' OR created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC,id DESC LIMIT 13").bind(mine?1:0,owner,mine?1:0,category,category,query,query,cursor,time,time,id).all();
    const page=rows.results.slice(0,12),last=page.at(-1);
    return json({templates:page.map(row=>({id:row.id,...JSON.parse(row.data),mine:row.owner===owner,listed:!!row.listed})),cursor:rows.results.length>12?last.created_at+'|'+last.id:null});
  }
  if(url.pathname==='/api/templates'&&request.method==='POST'){
    let body;try{body=JSON.parse(new TextDecoder().decode(await readLimited(request,16000)));}catch(e){if(e.status)throw e;throw fail('Could not read this template.');}
    if(!/^[0-9a-f-]{36}$/.test(body?.id))throw fail('Reopen the sharing window and try again.');
    let template;try{template=globalThis.ShopDeskTemplates.validate(body.template);}catch(e){throw fail(e.message);}
    const serialized=JSON.stringify(template),previous=await database.prepare('SELECT owner,data FROM shared_templates WHERE id = ?').bind(body.id).first();
    if(previous){if(previous.owner!==owner||previous.data!==serialized)throw fail('This share request already exists. Reopen the sharing window.',409);return json({id:body.id});}
    const inserted=await database.prepare('INSERT INTO shared_templates (id,owner,title,description,business,data,listed,created_at) SELECT ?,?,?,?,?,?,1,? WHERE (SELECT COUNT(*) FROM shared_templates WHERE owner = ?) < 100 ON CONFLICT(id) DO NOTHING RETURNING id').bind(body.id,owner,template.title,template.description,template.design.business,serialized,new Date().toISOString(),owner).first();
    if(!inserted)throw fail('You can keep up to 100 shared templates. Please try an existing template.',409);
    return json({id:body.id},201);
  }
  if(url.pathname.startsWith('/api/templates/')&&request.method==='PATCH'){
    const id=url.pathname.slice('/api/templates/'.length);if(!/^[0-9a-f-]{36}$/.test(id))throw fail('Template not found.',404);
    let body;try{body=JSON.parse(new TextDecoder().decode(await readLimited(request,1000)));}catch{throw fail('Choose whether to list this template.');}
    if(typeof body?.listed!=='boolean')throw fail('Choose whether to list this template.');
    const updated=await database.prepare('UPDATE shared_templates SET listed = ? WHERE id = ? AND owner = ? RETURNING id').bind(body.listed?1:0,id,owner).first();
    if(!updated)throw fail('Template not found in your account.',404);
    return json({id,listed:body.listed});
  }
  const studio=url.pathname==='/api/studio',workspace=studio||url.pathname==='/api/workspace';
  if(workspace && request.method==='GET'){
    const record=await database.prepare('SELECT data, revision FROM poster_workspaces WHERE owner = ?').bind(owner).first();
    if(!studio&&record&&JSON.parse(record.data).schemaVersion===2)throw fail('Designer Mode is ready. Refresh ShopDesk to open your clients and projects.',409);
    return json({data:record?JSON.parse(record.data):null,revision:record?.revision??0});
  }
  if(workspace && request.method==='PUT'){
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw fail('Send the saved workspace as JSON.',415);
    let body;try{body=JSON.parse(new TextDecoder().decode(await readLimited(request,studio?1500000:MAX_BODY)));}catch(e){if(e.status)throw e;throw fail('Could not read these changes.');}
    if(!Number.isInteger(body.revision)||body.revision<0)throw fail('Reload your saved workspace before saving.');
    const data=studio?validateStudio(body.data):validateWorkspace(body.data);
    const workspaces=studio?data.clients.flatMap(c=>c.projects.map(p=>({shop:c.shop,products:c.products,draft:p.draft}))):[data];
    const photoIds=[...new Set(workspaces.flatMap(w=>[...w.products,...w.draft.items,{photo:w.shop.logo},{photo:w.draft.heroPhoto}]).map(i=>i.photo).filter(Boolean))];
    if(photoIds.length){const rows=await database.prepare('SELECT id FROM product_photos WHERE owner = ?').bind(owner).all();const owned=new Set(rows.results.map(r=>r.id));if(photoIds.some(id=>!owned.has(id)))throw fail('A product photo could not be found in your account. Add it again.',400);}
    const revision=body.revision;
    const row=await database.prepare("INSERT INTO poster_workspaces (owner,data,revision,updated_at) SELECT ?, ?, 1, ? WHERE ? = 0 OR EXISTS (SELECT 1 FROM poster_workspaces WHERE owner = ?) ON CONFLICT(owner) DO UPDATE SET data = excluded.data, revision = poster_workspaces.revision + 1, updated_at = excluded.updated_at WHERE poster_workspaces.revision = ? AND (? = 1 OR COALESCE(json_extract(poster_workspaces.data, '$.schemaVersion'), 1) <> 2) RETURNING revision").bind(owner,JSON.stringify(data),new Date().toISOString(),revision,owner,revision,studio?1:0).first();
    if(!row)throw fail('This workspace changed in another tab. Reload the saved version before making more changes.',409);
    return json({revision:row.revision});
  }
  if(url.pathname==='/api/photos' && request.method==='POST'){
    if(!env.BUCKET)throw fail('Photo storage is temporarily unavailable. Please try again.',503);
    const mime=request.headers.get('content-type')?.split(';')[0].trim();
    if(!['image/jpeg','image/png','image/webp'].includes(mime))throw fail('Choose a JPG, PNG or WebP photo.',415);
    const bytes=await readLimited(request,MAX_PHOTO);
    const signature=(offset,values)=>values.every((v,i)=>bytes[offset+i]===v);
    const valid=mime==='image/jpeg'?bytes.length>=4&&signature(0,[255,216,255])&&signature(bytes.length-2,[255,217]):mime==='image/png'?bytes.length>=33&&signature(0,[137,80,78,71,13,10,26,10])&&signature(12,[73,72,68,82]):bytes.length>=20&&signature(0,[82,73,70,70])&&signature(8,[87,69,66,80])&&signature(12,[86,80,56]);
    if(!valid)throw fail('This photo could not be read. Try another JPG, PNG or WebP image.');
    const count=await database.prepare('SELECT COUNT(*) AS count FROM product_photos WHERE owner = ?').bind(owner).first();
    if(count.count>=250)throw fail('Your photo storage is full. Reuse a saved product photo for now.',413);
    const id=crypto.randomUUID();const key='photos/'+id;
    await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
    try{await database.prepare('INSERT INTO product_photos (id,owner,mime,bytes,created_at) VALUES (?,?,?,?,?)').bind(id,owner,mime,bytes.length,new Date().toISOString()).run();}catch(e){await env.BUCKET.delete(key);throw e;}
    return json({id},201);
  }
  if(url.pathname.startsWith('/api/photos/')&&request.method==='GET'){
    const id=url.pathname.slice('/api/photos/'.length);if(!/^[0-9a-f-]{36}$/.test(id))throw fail('Photo not found.',404);
    const record=await database.prepare('SELECT mime FROM product_photos WHERE id = ? AND owner = ?').bind(id,owner).first();if(!record)throw fail('Photo not found.',404);
    if(!env.BUCKET)throw fail('Photos are temporarily unavailable.',503);
    const object=await env.BUCKET.get('photos/'+id);if(!object)throw fail('Photo not found.',404);
    return new Response(object.body,{headers:{'Content-Type':record.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
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
      const body=asset.encoding==='base64'?Uint8Array.from(atob(asset.body),char=>char.charCodeAt(0)):asset.body;
      return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
    } catch(error) {
      if(!error.status)console.error('ShopDesk request failed',{path:url.pathname,message:error.message});
      return json({error:error.status?error.message:'We could not reach your saved workspace. Your edits are still here; please try again.'},error.status??503);
    }
  }
};
