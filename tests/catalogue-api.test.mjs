import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import worker,{validateWorkspace,gtinValid,normaliseProduct,photoSource,creditText,providerImageURL,CATALOGUE} from '../worker/index.js';
import '../public/business.js';
import '../public/items.js';
import '../public/studio.js';

// The open product database is never contacted from tests: every upstream
// call is answered by this stub, which also records what the Worker asked for.
const calls=[];let answer=()=>new Response(JSON.stringify({products:[]}),{headers:{'Content-Type':'application/json'}});
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,init={})=>{calls.push({url:String(url),init});return answer(String(url),init);};
afterEach(()=>{calls.length=0;answer=()=>new Response('{}',{headers:{'Content-Type':'application/json'}});});
test.after(()=>{globalThis.fetch=realFetch;});

function environment(){
  const sql=new DatabaseSync(':memory:');
  for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
  const photos=new Map();
  const DB={prepare(query){const stmt=sql.prepare(query);return {bind(...args){return {async first(){return stmt.get(...args)??null;},async all(){return {results:stmt.all(...args)};},async run(){return stmt.run(...args);}};}};}};
  const BUCKET={async put(id,bytes,options){photos.set(id,{bytes,options});},async get(id){return photos.has(id)?{body:photos.get(id).bytes}:null;},async delete(id){photos.delete(id);}};
  return {DB,BUCKET,sql,photos};
}
let n=0;const owner=()=>'owner-'+(++n);
function request(path,{owner='alice',method='GET',body,headers={}}={}){
  const h=new Headers(headers);if(owner)h.set('oai-authenticated-user-id',owner);
  if(body&&typeof body!=='string'&&!(body instanceof Uint8Array)){body=JSON.stringify(body);h.set('content-type','application/json');}
  return new Request('https://handbill.test'+path,{method,body,headers:h});
}
const record=(over={})=>({code:'6001069000158',product_name:'Super Maize Meal',brands:'Ace, Example',quantity:'12.5 kg',lang:'en',images:{1:{uploader:'thandi'},front_en:{rev:'7',imgid:'1'}},last_modified_t:1700000000,...over});
const jsonAnswer=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const jpeg=()=>{const bytes=new Uint8Array(600);bytes.set([255,216,255,224]);bytes.set([255,217],598);return bytes;};
const imageAnswer=(bytes=jpeg(),type='image/jpeg')=>new Response(bytes,{headers:{'Content-Type':type}});

test('barcodes are checked by their check digit before anything leaves the server',()=>{
  assert.equal(gtinValid('6001069000158'),true);assert.equal(gtinValid('4006381333931'),true);assert.equal(gtinValid('12345670'),true);assert.equal(gtinValid('6001069000159'),false);
  assert.equal(gtinValid('6009999999999'),false);assert.equal(gtinValid('60010690001'),false);assert.equal(gtinValid('6001069000158 '),true);assert.equal(gtinValid(''),false);assert.equal(gtinValid('abc'),false);
});

test('provider records are normalised into brand, name, exact pack size and a checked photo reference',()=>{
  const product=normaliseProduct(record());
  assert.deepEqual(product,{code:'6001069000158',name:'Ace Super Maize Meal',size:'12.5 kg',sizeFromName:false,image:'https://images.openfoodfacts.org/images/products/600/106/900/0158/front_en.7.200.jpg',language:'en',revision:'7',author:'thandi',updated:1700000000,
    source:{provider:'off',code:'6001069000158',title:'Ace Super Maize Meal',author:'thandi',language:'en',revision:'7',url:'https://world.openfoodfacts.org/product/6001069000158'}});
  // A size read from the name is flagged, never presented as confirmed.
  const fromName=normaliseProduct(record({quantity:'',product_name:'Sunflower Oil 2L'}));assert.equal(fromName.size,'2 L');assert.equal(fromName.sizeFromName,true);
  assert.equal(normaliseProduct(record({quantity:'',product_name:'Sunflower Oil'})).size,'');
  // No photo revision means no photo URL and nothing to fetch later.
  const noPhoto=normaliseProduct(record({images:{}}));assert.equal(noPhoto.image,'');assert.equal(noPhoto.revision,'');
  const badRevision=normaliseProduct(record({images:{front_en:{rev:'../../etc'}}}));assert.equal(badRevision.image,'');
  assert.equal(normaliseProduct(record({code:'6009999999999'})),null);assert.equal(normaliseProduct(record({product_name:''})),null);assert.equal(normaliseProduct(null),null);
  // Short codes keep the flat provider folder; checked digits only.
  assert.equal(providerImageURL({code:'12345670',language:'fr',revision:'3'},400),'https://images.openfoodfacts.org/images/products/12345670/front_fr.3.400.jpg');
  assert.equal(creditText(photoSource(product.source)),'Photo: thandi via Open Food Facts, CC BY-SA 3.0, https://world.openfoodfacts.org/product/6001069000158 (lang en, rev 7)');
  assert.equal(creditText(photoSource({...product.source,author:''})),'Photo: Open Food Facts contributors via Open Food Facts, CC BY-SA 3.0, https://world.openfoodfacts.org/product/6001069000158 (lang en, rev 7)');
});

test('photo references accept only the approved provider with a valid code, language and revision',()=>{
  const good={provider:'off',code:'6001069000158',language:'en',revision:'7'};
  assert.equal(photoSource(good).url,'https://world.openfoodfacts.org/product/6001069000158');
  assert.throws(()=>photoSource({...good,provider:'google'}),/provider/);
  assert.throws(()=>photoSource({...good,code:'6009999999999'}),/product code/);
  assert.throws(()=>photoSource({...good,language:'en-US'}),/language/);
  assert.throws(()=>photoSource({...good,revision:'7.jpg'}),/revision/);
  assert.throws(()=>photoSource({...good,revision:'1234567'}),/revision/);
  assert.throws(()=>photoSource('https://images.openfoodfacts.org/x.jpg'),/credit/);
  // The client never supplies a URL that is used: the server builds the only one it will fetch.
  assert.equal(photoSource({...good,url:'https://evil.example/x.jpg',image:'https://evil.example/y.jpg'}).url,'https://world.openfoodfacts.org/product/6001069000158');
  // Saved flyer items carry the same checked reference; anything else is rejected.
  const item={name:'Maize meal',size:'12.5 kg',price:'119.99',photo:crypto.randomUUID(),source:{...good,title:'Ace Super Maize Meal',author:'thandi'}};
  const workspace={shop:{name:'Shop',phone:'',location:''},products:[],draft:{headline:'h',date:'2030-01-01',theme:'red',format:'poster',template:'bold',items:[item]}};
  assert.deepEqual(validateWorkspace(workspace).draft.items[0].source,{...item.source,url:'https://world.openfoodfacts.org/product/6001069000158'});
  assert.throws(()=>validateWorkspace({...workspace,draft:{...workspace.draft,items:[{...item,source:{...good,revision:'x'}}]}}),/revision/);
  assert.throws(()=>validateWorkspace({...workspace,draft:{...workspace.draft,items:[{...item,caseQuantity:1}]}}),/case quantity/);
  assert.equal(validateWorkspace({...workspace,draft:{...workspace.draft,items:[{...item,caseQuantity:12}]}}).draft.items[0].caseQuantity,12);
  // Pasted lists keep their raw line for review only; it never becomes a photo credit.
  const pasted=ShopDeskItems.parse('Cooking oil | 2 L | 45.99')[0];assert.equal(pasted.source,undefined);assert.equal(pasted.line,'Cooking oil | 2 L | 45.99');
  assert.deepEqual(ShopDeskItems.copy(pasted),{name:'Cooking oil',size:'2 L',price:'45.99',photo:''});
  assert.deepEqual(ShopDeskItems.copy({...item,source:'not a credit'}).source,undefined);assert.deepEqual(ShopDeskItems.copy({...item,source:null}).source,null);
  assert.deepEqual(validateWorkspace({...workspace,draft:{...workspace.draft,items:[ShopDeskItems.copy(pasted)]}}).draft.items[0],{name:'Cooking oil',size:'2 L',price:'45.99',photo:''});
});

test('catalogue search requires a signed-in user, a sensible query and talks only to the approved host',async()=>{
  const env=environment();
  assert.equal((await worker.fetch(request('/api/catalogue/search?q=maize',{owner:''}),env)).status,401);
  assert.equal((await worker.fetch(request('/api/catalogue/search?q=m'),env)).status,400);
  assert.equal((await worker.fetch(request('/api/catalogue/search?code=6009999999999'),env)).status,400);
  assert.equal(calls.length,0);
  answer=()=>jsonAnswer({products:[record(),record({code:'6009999999993',product_name:'Rice',quantity:'2 kg',brands:'Tastic'}),record({code:'bad'})]});
  const response=await worker.fetch(request('/api/catalogue/search?q='+encodeURIComponent('maize meal'),{owner:owner()}),env);
  assert.equal(response.status,200);const body=await response.json();
  assert.equal(body.products.length,2);assert.equal(body.products[0].name,'Ace Super Maize Meal');assert.equal(body.products[1].name,'Tastic Rice');
  assert.deepEqual(body.query,{q:'maize meal'});assert.equal(body.attribution.provider,'off');assert.match(body.attribution.licence,/ODbL/);
  assert.equal(calls.length,1);const call=new URL(calls[0].url);
  assert.equal(call.hostname,'world.openfoodfacts.org');assert.equal(call.searchParams.get('search_terms'),'maize meal');
  assert.equal(calls[0].init.redirect,'error');assert.match(calls[0].init.headers['User-Agent'],/Handbill/);assert.ok(calls[0].init.signal);
  // Query length is capped before it reaches the provider.
  await worker.fetch(request('/api/catalogue/search?q='+'a'.repeat(500),{owner:owner()}),env);
  assert.equal(new URL(calls[1].url).searchParams.get('search_terms').length,CATALOGUE.maxQuery);
  env.sql.close();
});

test('barcode lookups return one product, nothing for unknown codes and never guess',async()=>{
  const env=environment();
  answer=url=>url.includes('/api/v2/product/6001069000158.json')?jsonAnswer({status:1,product:record()}):new Response('',{status:404});
  let body=await (await worker.fetch(request('/api/catalogue/search?code=6001069000158',{owner:owner()}),env)).json();
  assert.equal(body.products.length,1);assert.equal(body.products[0].size,'12.5 kg');assert.deepEqual(body.query,{code:'6001069000158'});
  body=await (await worker.fetch(request('/api/catalogue/search?code=6009999999993',{owner:owner()}),env)).json();
  assert.deepEqual(body.products,[]);
  answer=()=>jsonAnswer({status:0});
  body=await (await worker.fetch(request('/api/catalogue/search?code=4006381333931',{owner:owner()}),env)).json();assert.deepEqual(body.products,[]);
  env.sql.close();
});

test('provider timeouts, failures, bad answers and oversized responses become clear errors and leave local search working',async()=>{
  const env=environment();const saved={timeout:CATALOGUE.upstreamTimeout,maxJson:CATALOGUE.maxJson};
  try{
    CATALOGUE.upstreamTimeout=30;
    answer=(url,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))));
    let response=await worker.fetch(request('/api/catalogue/search?q=maize',{owner:owner()}),env);assert.equal(response.status,504);assert.match((await response.json()).error,/too long/);
    CATALOGUE.upstreamTimeout=saved.timeout;
    answer=()=>{throw new TypeError('fetch failed');};
    response=await worker.fetch(request('/api/catalogue/search?q=rice',{owner:owner()}),env);assert.equal(response.status,504);assert.match((await response.json()).error,/could not be reached/);
    answer=()=>new Response('down',{status:503});
    response=await worker.fetch(request('/api/catalogue/search?q=sugar',{owner:owner()}),env);assert.equal(response.status,502);
    answer=()=>new Response('<html>not json',{status:200,headers:{'Content-Type':'text/html'}});
    response=await worker.fetch(request('/api/catalogue/search?q=bread',{owner:owner()}),env);assert.equal(response.status,502);assert.match((await response.json()).error,/unreadable/);
    CATALOGUE.maxJson=2000;
    answer=()=>jsonAnswer({products:Array.from({length:50},()=>record())});
    response=await worker.fetch(request('/api/catalogue/search?q=flour',{owner:owner()}),env);assert.equal(response.status,502);assert.match((await response.json()).error,/too much data/);
    // Streaming bodies are cut off at the byte limit rather than buffered whole.
    let pulled=0;const stream=new ReadableStream({pull(controller){pulled++;controller.enqueue(new Uint8Array(1000));}});
    answer=()=>new Response(stream,{status:200,headers:{'Content-Type':'application/json'}});
    response=await worker.fetch(request('/api/catalogue/search?q=salt',{owner:owner()}),env);assert.equal(response.status,502);assert.ok(pulled<10,'stopped reading early: '+pulled);
  }finally{CATALOGUE.upstreamTimeout=saved.timeout;CATALOGUE.maxJson=saved.maxJson;env.sql.close();}
});

test('upstream calls are rate limited per owner while cached answers stay available',async()=>{
  const env=environment();const saved=CATALOGUE.perOwner;
  try{
    CATALOGUE.perOwner=[2,300000];const me=owner();
    answer=()=>jsonAnswer({products:[record()]});
    for(const q of ['one','two'])assert.equal((await worker.fetch(request('/api/catalogue/search?q='+q,{owner:me}),env)).status,200);
    const limited=await worker.fetch(request('/api/catalogue/search?q=three',{owner:me}),env);assert.equal(limited.status,429);assert.match((await limited.json()).error,/Local search still works/);
    assert.equal(calls.length,2);
    assert.equal((await worker.fetch(request('/api/catalogue/search?q=three',{owner:owner()}),env)).status,200);
  }finally{CATALOGUE.perOwner=saved;env.sql.close();}
});

test('provider photos are fetched once from the approved host, stored with their credit and reused',async()=>{
  const env=environment();const me=owner();
  const source={provider:'off',code:'6001069000158',title:'Ace Super Maize Meal',author:'thandi',language:'en',revision:'7',url:'https://evil.example/not-used'};
  answer=()=>imageAnswer();
  let response=await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source}}),env);
  assert.equal(response.status,201);const first=await response.json();
  assert.match(first.id,/^[0-9a-f-]{36}$/);assert.equal(first.reused,false);assert.equal(first.credit,'Photo: thandi via Open Food Facts, CC BY-SA 3.0, https://world.openfoodfacts.org/product/6001069000158 (lang en, rev 7)');
  assert.equal(first.source.url,'https://world.openfoodfacts.org/product/6001069000158');
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://images.openfoodfacts.org/images/products/600/106/900/0158/front_en.7.400.jpg');assert.equal(calls[0].init.redirect,'error');
  const stored=env.photos.get('photos/'+first.id);assert.equal(stored.options.httpMetadata.contentType,'image/jpeg');assert.equal(stored.options.customMetadata.source,'off:6001069000158:en:7');assert.match(stored.options.customMetadata.credit,/CC BY-SA/);
  const served=await worker.fetch(request('/api/photos/'+first.id,{owner:me}),env);assert.equal(served.status,200);assert.equal((await served.arrayBuffer()).byteLength,600);
  // Same reference again: no second download, same id.
  response=await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source}}),env);
  assert.equal(response.status,200);const again=await response.json();assert.equal(again.id,first.id);assert.equal(again.reused,true);assert.equal(calls.length,1);
  // Another owner gets their own private copy.
  response=await worker.fetch(request('/api/catalogue/photo',{owner:owner(),method:'POST',body:{source}}),env);assert.equal(response.status,201);assert.notEqual((await response.json()).id,first.id);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS c FROM product_photos WHERE source_key = ?').bind('off:6001069000158:en:7').first()).c,2);
  env.sql.close();
});

test('photo requests reject bad references, cross-site posts, oversized bodies and unreadable or redirected images',async()=>{
  const env=environment();const me=owner();
  const source={provider:'off',code:'6001069000158',language:'en',revision:'7'};
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:'',method:'POST',body:{source}}),env)).status,401);
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',headers:{origin:'https://unrelated.test'},body:{source}}),env)).status,403);
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',headers:{'sec-fetch-site':'cross-site'},body:{source}}),env)).status,403);
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source:{...source,provider:'google'}}}),env)).status,400);
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source:{...source,revision:'7; DROP'}}}),env)).status,400);
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source:{...source,code:'6009999999999'}}}),env)).status,400);
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source,padding:'x'.repeat(5000)}}),env)).status,413);
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:'not json',headers:{'content-type':'application/json'}}),env)).status,400);
  assert.equal(calls.length,0);
  // Wrong content, mismatched type, missing and redirected images are all refused; nothing is stored.
  answer=()=>new Response('<html>',{headers:{'Content-Type':'text/html'}});
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source}}),env)).status,502);
  answer=()=>imageAnswer(jpeg(),'image/png');
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source}}),env)).status,502);
  answer=()=>new Response('',{status:404});
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source}}),env)).status,404);
  answer=(url,init)=>{if(init.redirect==='error')throw new TypeError('redirect not allowed');return imageAnswer();};
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source}}),env)).status,504);
  assert.equal(env.photos.size,0);assert.equal((await env.DB.prepare('SELECT COUNT(*) AS c FROM product_photos').bind().first()).c,0);
  assert.equal((await worker.fetch(request('/api/catalogue/photo',{owner:me,method:'POST',body:{source}},),{DB:env.DB})).status,503);
  env.sql.close();
});
