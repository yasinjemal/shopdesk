import '../public/templates.js';
const MAX_BODY = 100000;
const MAX_PHOTO = 1500000;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const db = env => { if (!env.DB) throw fail('Saved products are temporarily unavailable. Please try again.', 503); return env.DB; };
function user(request) { const id = request.headers.get('oai-authenticated-user-id'); if (!id) throw fail('Please reopen Handbill and sign in to load your saved flyers.', 401); return id; }
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
  if(value.wasPrice!==undefined){const was=text(value.wasPrice,20,'the previous price');if(was!==''&&(!Number.isFinite(Number(was))||Number(was)<0||Number(was)>1000000))throw fail('Previous prices must be between R0 and R1,000,000.');if(was!=='')styling.wasPrice=was;}
  if(value.section!==undefined){const section=text(value.section,24,'the section label');if(section)styling.section=section;}
  if(value.icon!==undefined){const icon=text(value.icon,32,'the illustration');if(icon&&!/^[a-z][a-z0-9-]{0,31}$/.test(icon))throw fail('Choose a valid illustration.');if(icon)styling.icon=icon;}
  if(value.caseQuantity!==undefined){if(!Number.isInteger(value.caseQuantity)||value.caseQuantity<2||value.caseQuantity>999)throw fail('Choose a case quantity from 2 to 999.');styling.caseQuantity=value.caseQuantity;}
  if(value.source!==undefined&&value.source!==null){styling.source=photoSource(value.source);}
  return { name:text(value.name,50,'the product name'),size:text(value.size,25,'the pack size'),price,photo,...styling };
}
export {normaliseProduct,photoSource,creditText,providerImageURL,CATALOGUE};
export function validateWorkspace(data) {
  if (!data || !data.shop || !data.draft || !Array.isArray(data.products) || data.products.length > 100) throw fail('Check your saved shop and products.');
  const d = data.draft;
  const template = d.template ?? 'simple';
  if (!['simple','retail','bold','market','boutique','menu','studio','super','ribbon','signature','pop','editorial','noir','warehouse','atelier','street','sunburst','botanical','blueprint','scrapbook','candy','mono','wholesale','mosaic','fresh','parade','shelf','paper','arc','ticket','terrace','combo-board','combo-ticket','combo-fresh','gazette','harvest','ledger','midnight','diagonal','circular','frontpage','aisle','price-blocks','fresh-cut','split-banner','combo-circular','combo-receipt','weekend','butcher','bakery','household','bigprice','cashcarry','crate','tagsale'].includes(template)) throw fail('Choose a poster template.');
  const maxItems = d.purpose==='combos'?20:template === 'simple' ? 3 : 25;
  const finishing={};
  if(d.combos!==undefined){
    if(!Array.isArray(d.combos)||!d.combos.length||d.combos.length>6)throw fail('Choose 1 to 6 combos.');
    finishing.combos=d.combos.map(c=>{if(!c||typeof c!=='object')throw fail('Check your combo.');const price=text(c.price,20,'the bundle price');if(price!==''&&(!Number.isFinite(Number(price))||Number(price)<0||Number(price)>1000000))throw fail('Check the bundle price.');return {name:text(c.name,40,'the combo name'),price};});
    if(d.items?.some(i=>i.combo!==undefined&&i.combo>=d.combos.length))throw fail('Choose an existing combo for each product.');
  }

  for(const [key,values] of [['logoSize',['compact','prominent']],['exportQuality',['standard','4k']],['printPages',['single','catalogue']],['typeface',['design','modern','elegant','geometric']],['priceStyle',['design','solid','outline','pill']]])if(d[key]!==undefined){
    if(!values.includes(d[key]))throw fail('Choose a valid design finish.');finishing[key]=d[key];
  }
  if(d.itemCount!==undefined){
    if(!Number.isInteger(d.itemCount)||d.itemCount<1||d.itemCount>25||!Array.isArray(d.items)||d.itemCount>d.items.length)throw fail('Choose between 1 and 25 items.');
    finishing.itemCount=d.itemCount;
  }
  if(d.purpose!==undefined){if(!['offers','combos','spotlight','event','opening'].includes(d.purpose))throw fail('Choose a flyer purpose.');finishing.purpose=d.purpose;}
  if(d.promotion!==undefined&&d.promotion!==''){if(!['weekly','weekend','monthend','seasonal','wholesale','produce','butchery','bakery','household','hardware','single','combos','sale','menu','collection','services','event','opening'].includes(d.promotion))throw fail('Choose a promotion type.');finishing.promotion=d.promotion;}
  for(const [key,max] of [['details',180],['eventDate',10],['eventTime',40],['venue',80],['heroPhoto',36]])if(d[key]!==undefined)finishing[key]=text(d[key],max,'the project details');
  if(finishing.eventDate&&!/^\d{4}-\d{2}-\d{2}$/.test(finishing.eventDate))throw fail('Check the event date.');
  if(finishing.heroPhoto&&!/^[0-9a-f-]{36}$/.test(finishing.heroPhoto))throw fail('Invalid main photo.');
  for(const key of ['trimPhotos','cleanNames','showDate','keepColours'])if(d[key]!==undefined){if(typeof d[key]!=='boolean')throw fail('Choose valid flyer options.');finishing[key]=d[key];}
  if(d.business!==undefined){if(!['grocery','fashion','food','beauty','services','general'].includes(d.business))throw fail('Choose a business type.');finishing.business=d.business;}
  for(const [key,max] of [['eyebrow',28],['cta',40],['terms',80]])if(d[key]!==undefined)finishing[key]=text(d[key],max,'the poster wording');
  if (!Array.isArray(d.items) || d.items.length < 1 || d.items.length > 25 || (d.purpose==='spotlight'?1:(d.itemCount??d.items.length)) > maxItems || !['green','blue','orange','red','plum','charcoal','teal','gold','berry','violet','cobalt','coral','coffee','sage','terracotta','lavender','peach','lemon','aqua','burgundy','slate','tangerine','petrol','raspberry','olive','indigo','cocoa','tomato','kraft','mint'].includes(d.theme) || !['poster','status','square','landscape','a4','a5'].includes(d.format)) throw fail('Choose a valid layout. Flyers hold up to 25 visible items; simple posters hold up to 3.');
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
// ---------------------------------------------------------------------------
// Product catalogue: names, pack sizes and photos from an approved open provider.
// All provider traffic goes through here so the browser never talks to the
// provider, never follows arbitrary URLs and never sees credentials.
const CATALOGUE={
  provider:'off',apiHost:'world.openfoodfacts.org',imageHosts:['images.openfoodfacts.org'],
  userAgent:'Handbill/1.0 (flyer builder; https://github.com/yasinjemal/shopdesk)',
  maxQuery:80,searchTTL:600,productTTL:3600,upstreamTimeout:8000,maxJson:400000,maxImage:1500000,
  perOwner:[20,300000],global:[120,60000],licence:'Open Food Facts · ODbL data · photos CC BY-SA 3.0'
};
const upstreamCalls={owners:new Map(),global:[]};
function allowUpstream(owner){
  const now=Date.now(),[limit,windowMs]=CATALOGUE.perOwner,[gLimit,gWindow]=CATALOGUE.global;
  upstreamCalls.global=upstreamCalls.global.filter(t=>now-t<gWindow);
  const mine=(upstreamCalls.owners.get(owner)||[]).filter(t=>now-t<windowMs);
  if(mine.length>=limit||upstreamCalls.global.length>=gLimit)return false;
  mine.push(now);upstreamCalls.owners.set(owner,mine);upstreamCalls.global.push(now);
  if(upstreamCalls.owners.size>5000)upstreamCalls.owners.clear();
  return true;
}
export function gtinValid(value){
  const code=String(value||'').replace(/\s+/g,'');
  if(!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code))return false;
  const digits=code.split('').map(Number),check=digits.pop();
  return (10-digits.reverse().reduce((t,d,i)=>t+d*(i%2===0?3:1),0)%10)%10===check;
}
const clean=(value,max)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
function photoSource(value){
  if(!value||typeof value!=='object')throw fail('Check the photo credit.');
  // Checked before any trimming so an over-long value can never pass as a shorter one.
  const provider=clean(value.provider,16),code=String(value.code??'').replace(/\s+/g,''),language=String(value.language??'').trim().toLowerCase(),revision=String(value.revision??'').trim();
  if(provider!==CATALOGUE.provider)throw fail('Unknown photo provider.');
  if(!gtinValid(code))throw fail('Check the product code.');
  if(!/^[a-z]{2,3}$/.test(language))throw fail('Check the photo language.');
  if(!/^\d{1,6}$/.test(revision))throw fail('Check the photo revision.');
  return {provider,code,title:clean(value.title,80),author:clean(value.author,60),language,revision,url:'https://world.openfoodfacts.org/product/'+code};
}
function creditText(source){return 'Photo: '+(source.author||'Open Food Facts contributors')+' via Open Food Facts, CC BY-SA 3.0, '+source.url+' (lang '+source.language+', rev '+source.revision+')';}
function imageFolder(code){
  if(code.length<=8)return code;const padded=code.padStart(13,'0');
  return padded.slice(0,3)+'/'+padded.slice(3,6)+'/'+padded.slice(6,9)+'/'+padded.slice(9);
}
function providerImageURL(source,size=400){
  const url=new URL('https://'+CATALOGUE.imageHosts[0]+'/images/products/'+imageFolder(source.code)+'/front_'+source.language+'.'+source.revision+'.'+size+'.jpg');
  if(!CATALOGUE.imageHosts.includes(url.hostname)||url.protocol!=='https:')throw fail('Photo host not allowed.');
  return url.href;
}
async function readBounded(response,limit){
  const reader=response.body?.getReader();if(!reader)throw fail('The product database sent no data.',502);
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw fail('The product database sent too much data.',502);}chunks.push(value);}}finally{reader.releaseLock();}
  const out=new Uint8Array(size);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength;}return out;
}
async function upstream(url,limit,accept){
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||![CATALOGUE.apiHost,...CATALOGUE.imageHosts].includes(parsed.hostname))throw fail('Provider host not allowed.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),CATALOGUE.upstreamTimeout);
  let response;
  try{response=await fetch(url,{headers:{'User-Agent':CATALOGUE.userAgent,Accept:accept},redirect:'error',signal:controller.signal});}
  catch(e){throw fail(e.name==='AbortError'?'The product database took too long to answer.':'The product database could not be reached.',504);}
  finally{clearTimeout(timer);}
  if(response.status===404)return null;
  if(!response.ok)throw fail('The product database is unavailable right now.',502);
  return {bytes:await readBounded(response,limit),type:response.headers.get('content-type')||''};
}
function normaliseProduct(p){
  const code=clean(p?.code,14);if(!gtinValid(code))return null;
  const brand=clean((p.brands||'').split(',')[0],30),title=clean(p.product_name_en||p.product_name,60);
  if(!title)return null;
  const name=clean(brand&&!title.toLowerCase().includes(brand.toLowerCase())?brand+' '+title:title,50);
  const images=p.images&&typeof p.images==='object'?p.images:{};
  const preferred=['front_'+clean(p.lang||p.lc||'en',3).toLowerCase(),'front_en',...Object.keys(images).filter(k=>k.startsWith('front_'))];
  const key=preferred.find(k=>images[k]&&images[k].rev!==undefined),front=key?images[key]:null;
  const language=key?key.slice(6):'en',revision=front?String(front.rev):'';
  const author=clean(front&&images[String(front.imgid)]?.uploader||(Array.isArray(p.photographers)?p.photographers[0]:''),60);
  let size=clean(p.quantity,25),sizeFromName=false;
  if(!size){const m=name.match(/(\d+\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|cl|mg)\b/i);if(m){size=(m[1]?m[1].replace(/\s*[x×]\s*/,' × '):'')+m[2].replace(',','.')+' '+(m[3].toLowerCase()==='l'?'L':m[3].toLowerCase());sizeFromName=true;}}
  const valid=/^[a-z]{2,3}$/.test(language)&&/^\d{1,6}$/.test(revision);
  const source={provider:CATALOGUE.provider,code,title:name,author,language:valid?language:'en',revision:valid?revision:'',url:'https://world.openfoodfacts.org/product/'+code};
  return {code,name,size,sizeFromName,image:valid?providerImageURL(source,200):'',language:source.language,revision:source.revision,author,updated:Number(p.last_modified_t||0)||0,source};
}
const FIELDS='code,product_name,product_name_en,brands,quantity,images,lang,lc,last_modified_t,photographers';
async function cachedJSON(cacheKey,ttl,load){
  const cache=globalThis.caches?.default,request=new Request('https://handbill.cache.invalid'+cacheKey);
  if(cache){const hit=await cache.match(request);if(hit)return {data:await hit.json(),cached:true};}
  const data=await load();
  if(cache&&data)await cache.put(request,new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':'max-age='+ttl}}));
  return {data,cached:false};
}
async function catalogueSearch(owner,url){
  const code=(url.searchParams.get('code')||'').replace(/\s+/g,''),q=clean(url.searchParams.get('q'),CATALOGUE.maxQuery);
  const attribution={provider:CATALOGUE.provider,licence:CATALOGUE.licence,url:'https://world.openfoodfacts.org'};
  if(code){
    if(!gtinValid(code))throw fail('That barcode does not pass its check digit. Check the digits under the barcode.');
    const {data,cached}=await cachedJSON('/product/'+code,CATALOGUE.productTTL,async()=>{
      if(!allowUpstream(owner))throw fail('Too many online searches in a short time. Local search still works; try again in a few minutes.',429);
      const result=await upstream('https://'+CATALOGUE.apiHost+'/api/v2/product/'+code+'.json?fields='+FIELDS,CATALOGUE.maxJson,'application/json');
      if(!result)return {products:[]};
      let body;try{body=JSON.parse(new TextDecoder().decode(result.bytes));}catch{throw fail('The product database sent an unreadable answer.',502);}
      const product=body?.status===1?normaliseProduct(body.product):null;return {products:product?[product]:[]};
    });
    return json({...data,query:{code},cached,attribution});
  }
  if(q.length<2)throw fail('Type at least two letters to search online.');
  const {data,cached}=await cachedJSON('/search/'+encodeURIComponent(q.toLowerCase()),CATALOGUE.searchTTL,async()=>{
    if(!allowUpstream(owner))throw fail('Too many online searches in a short time. Local search still works; try again in a few minutes.',429);
    const params=new URLSearchParams({search_terms:q,search_simple:'1',action:'process',json:'1',page_size:'12',fields:FIELDS});
    const result=await upstream('https://'+CATALOGUE.apiHost+'/cgi/search.pl?'+params,CATALOGUE.maxJson,'application/json');
    if(!result)return {products:[]};
    let body;try{body=JSON.parse(new TextDecoder().decode(result.bytes));}catch{throw fail('The product database sent an unreadable answer.',502);}
    const products=(Array.isArray(body?.products)?body.products:[]).map(normaliseProduct).filter(Boolean).slice(0,12);
    return {products};
  });
  return json({...data,query:{q},cached,attribution});
}
async function cataloguePhoto(owner,request,env,database){
  if(!env.BUCKET)throw fail('Photo storage is temporarily unavailable. Please try again.',503);
  let body;try{body=JSON.parse(new TextDecoder().decode(await readLimited(request,2000)));}catch(e){if(e.status)throw e;throw fail('Could not read this photo request.');}
  const source=photoSource(body?.source??body),sourceKey=[source.provider,source.code,source.language,source.revision].join(':'),credit=creditText(source);
  const existing=await database.prepare('SELECT id FROM product_photos WHERE owner = ? AND source_key = ?').bind(owner,sourceKey).first();
  if(existing)return json({id:existing.id,credit,source,reused:true});
  const count=await database.prepare('SELECT COUNT(*) AS count FROM product_photos WHERE owner = ?').bind(owner).first();
  if(count.count>=250)throw fail('Your photo storage is full. Remove unused photos first.',413);
  if(!allowUpstream(owner))throw fail('Too many photo downloads in a short time. Try again in a few minutes.',429);
  const result=await upstream(providerImageURL(source,400),CATALOGUE.maxImage,'image/jpeg,image/png,image/webp');
  if(!result)throw fail('This product photo is no longer available from the provider.',404);
  const bytes=result.bytes,mime=result.type.split(';')[0].trim();
  const signature=(offset,values)=>values.every((v,i)=>bytes[offset+i]===v);
  const kind=bytes.length>=4&&signature(0,[255,216,255])?'image/jpeg':bytes.length>=33&&signature(0,[137,80,78,71,13,10,26,10])?'image/png':bytes.length>=20&&signature(0,[82,73,70,70])&&signature(8,[87,69,66,80])?'image/webp':'';
  if(!kind||!['image/jpeg','image/png','image/webp'].includes(mime)||kind!==mime)throw fail('The provider photo could not be read.',502);
  const id=crypto.randomUUID(),key='photos/'+id;
  await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:kind},customMetadata:{credit:credit.slice(0,900),source:sourceKey}});
  try{await database.prepare('INSERT INTO product_photos (id,owner,mime,bytes,created_at,source_key,credit) VALUES (?,?,?,?,?,?,?)').bind(id,owner,kind,bytes.length,new Date().toISOString(),sourceKey,credit).run();}catch(e){await env.BUCKET.delete(key);throw e;}
  return json({id,credit,source,reused:false},201);
}
async function readLimited(request, limit) {
  if (Number(request.headers.get('content-length')) > limit) throw fail('This file or form is too large.',413);
  if (!request.body) throw fail('No data was received.');
  const reader = request.body.getReader(); const chunks=[]; let size=0;
  try { while(true){ const {done,value}=await reader.read(); if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw fail('This file or form is too large.',413);}chunks.push(value); } } finally { reader.releaseLock(); }
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;
}
function protectWrite(request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw fail('Open Handbill to make this change.',403);
  const origin=request.headers.get('origin');if(origin && origin!==new URL(request.url).origin)throw fail('Open Handbill to make this change.',403);
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
  if(url.pathname==='/api/catalogue/search'&&request.method==='GET')return await catalogueSearch(owner,url);
  if(url.pathname==='/api/catalogue/photo'&&request.method==='POST')return await cataloguePhoto(owner,request,env,database);
  const studio=url.pathname==='/api/studio',workspace=studio||url.pathname==='/api/workspace';
  if(workspace && request.method==='GET'){
    const record=await database.prepare('SELECT data, revision FROM poster_workspaces WHERE owner = ?').bind(owner).first();
    if(!studio&&record&&JSON.parse(record.data).schemaVersion===2)throw fail('Your workspace is ready. Refresh Handbill to open your clients and projects.',409);
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
      if(!error.status)console.error('Handbill request failed',{path:url.pathname,message:error.message});
      return json({error:error.status?error.message:'We could not reach your saved workspace. Your edits are still here; please try again.'},error.status??503);
    }
  }
};
