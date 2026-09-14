import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { validateWorkspace, validateStudio } from '../worker/index.js';

import '../public/business.js';
import '../public/studio.js';

function environment(){
  const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../drizzle/0000_quick_mandrill.sql',import.meta.url),'utf8'));
  const photos=new Map();
  const DB={prepare(query){
    const stmt=sql.prepare(query);
    return {bind(...args){
      return {async first(){return stmt.get(...args)??null;},async all(){return {results:stmt.all(...args)};},async run(){return stmt.run(...args);}};
    }};
  }};
  const BUCKET={async put(id,bytes){photos.set(id,bytes);},async get(id){return photos.has(id)?{body:photos.get(id)}:null;},async delete(id){photos.delete(id);}};
  return {DB,BUCKET,sql};
}
const sample=()=>({shop:{name:'Smiley grocery store',phone:'0607055533',location:'Mkomjana village'},products:[],draft:{headline:'Fresh deals. Everyday value.',date:'2026-09-19',theme:'green',format:'status',items:[{name:'Potatoes',size:'1 kg pack',price:'10.00',photo:''}]}});
function request(path,{owner='alice',method='GET',body,headers={}}={}){
  const h=new Headers(headers);if(owner)h.set('oai-authenticated-user-id',owner);if(body && typeof body!=='string' && !(body instanceof Uint8Array)){body=JSON.stringify(body);h.set('content-type','application/json');}return new Request('https://example.test'+path,{method,body,headers:h});
}
test('saves and reloads an account workspace and protects concurrent edits',async()=>{
  const env=environment();
  assert.deepEqual(await (await worker.fetch(request('/api/workspace'),env)).json(),{data:null,revision:0});
  let response=await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision:0,data:sample()}}),env);assert.equal(response.status,200);assert.equal((await response.json()).revision,1);
  const loaded=await (await worker.fetch(request('/api/workspace'),env)).json();assert.deepEqual(loaded.data,sample());
  response=await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision:0,data:sample()}}),env);assert.equal(response.status,409);
  const changed=sample();changed.shop.name='Changed name';response=await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision:1,data:changed}}),env);assert.equal((await response.json()).revision,2);
  assert.equal((await (await worker.fetch(request('/api/workspace',{owner:'bob'}),env)).json()).data,null);
  assert.equal((await (await worker.fetch(request('/api/workspace'),env)).json()).data.shop.name,'Changed name');env.sql.close();
});
test('rejects missing identity, cross-origin changes, invalid data and unavailable storage',async()=>{
  const env=environment();assert.equal((await worker.fetch(request('/api/workspace',{owner:''}),env)).status,401);
  assert.equal((await worker.fetch(request('/api/workspace',{method:'PUT',headers:{origin:'https://unrelated.test'},body:{revision:0,data:sample()}}),env)).status,403);
  const bad=sample();bad.draft.items[0].price='-5';assert.throws(()=>validateWorkspace(bad));
  assert.equal((await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision:0,data:bad}}),env)).status,400);
  const badPhoto=sample();badPhoto.draft.items[0].photo=crypto.randomUUID();assert.equal((await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision:0,data:badPhoto}}),env)).status,400);
  assert.equal((await worker.fetch(request('/api/workspace'),{})).status,503);env.sql.close();
});
test('stores photo bytes and restricts photo reads and references to their owner',async()=>{
  const env=environment();const image=new Uint8Array([255,216,255,224,0,16,255,217]);
  let response=await worker.fetch(request('/api/photos',{method:'POST',body:image,headers:{'content-type':'image/jpeg'}}),env);assert.equal(response.status,201);const {id}=await response.json();
  response=await worker.fetch(request('/api/photos/'+id),env);assert.equal(response.status,200);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),image);
  assert.equal((await worker.fetch(request('/api/photos/'+id,{owner:'bob'}),env)).status,404);
  const state=sample();state.draft.items[0].photo=id;assert.equal((await worker.fetch(request('/api/workspace',{owner:'bob',method:'PUT',body:{revision:0,data:state}}),env)).status,400);
  assert.equal((await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision:0,data:state}}),env)).status,200);
  assert.equal((await worker.fetch(request('/api/photos',{method:'POST',body:new Uint8Array([1,2,3,4]),headers:{'content-type':'image/jpeg'}}),env)).status,400);env.sql.close();
});
test('preserves partially edited drafts but validates reusable product names and layout choices',()=>{
  const state=sample();state.draft.items[0]={name:'',size:'',price:'',photo:''};assert.deepEqual(validateWorkspace(state),state);
  state.products=[{id:crypto.randomUUID(),name:'',size:'',price:'',photo:''}];assert.throws(()=>validateWorkspace(state));
  const bad=sample();bad.draft.format='square';assert.throws(()=>validateWorkspace(bad));
});
test('supports twelve retail offers and preserves the three-offer limit for older posters',async()=>{
  const state=sample();state.draft.items=Array.from({length:12},(_,i)=>({...state.draft.items[0],name:'Offer '+(i+1)}));
  assert.throws(()=>validateWorkspace(state));
  state.draft.template='retail';state.draft.theme='red';assert.deepEqual(validateWorkspace(state),state);
  const env=environment();assert.equal((await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision:0,data:state}}),env)).status,200);
  assert.deepEqual((await (await worker.fetch(request('/api/workspace'),env)).json()).data,state);
  state.draft.items.push({...state.draft.items[0]});assert.throws(()=>validateWorkspace(state));
  state.draft.items=state.draft.items.slice(0,3);state.draft.template='unknown';assert.throws(()=>validateWorkspace(state));env.sql.close();
});
test('saves a shop logo and refuses another account’s logo',async()=>{
  const env=environment(),image=new Uint8Array([255,216,255,224,0,16,255,217]);
  const uploaded=await worker.fetch(request('/api/photos',{method:'POST',body:image,headers:{'content-type':'image/jpeg'}}),env);const {id}=await uploaded.json();
  const state=sample();state.shop.logo=id;
  assert.equal((await worker.fetch(request('/api/workspace',{owner:'bob',method:'PUT',body:{revision:0,data:state}}),env)).status,400);
  assert.equal((await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision:0,data:state}}),env)).status,200);
  assert.equal((await (await worker.fetch(request('/api/workspace'),env)).json()).data.shop.logo,id);env.sql.close();
});
test('round-trips both new flyer designs and their optional finishing preferences',async()=>{
  const env=environment();let revision=0;
  for(const template of ['bold','market']){
    const state=sample();state.draft.template=template;state.draft.trimPhotos=true;state.draft.cleanNames=false;
    state.draft.items=Array.from({length:12},()=>({...state.draft.items[0]}));
    assert.equal((await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision,data:state}}),env)).status,200);revision++;
    assert.deepEqual((await (await worker.fetch(request('/api/workspace'),env)).json()).data,state);
    state.draft.items.push({...state.draft.items[0]});assert.throws(()=>validateWorkspace(state));
    state.draft.items.pop();state.draft.trimPhotos='yes';assert.throws(()=>validateWorkspace(state));
  }
  env.sql.close();
});

test('saves business designs and custom wording without changing legacy workspaces',async()=>{
  const env=environment();let revision=0;
  for(const [template,business,theme] of [['boutique','fashion','charcoal'],['menu','food','orange'],['studio','beauty','plum']]){
    const state=sample();Object.assign(state.draft,{template,business,theme,eyebrow:'OUR PRICES',cta:'Book on WhatsApp',terms:'',showDate:false,date:''});
    state.draft.items=Array.from({length:12},(_,i)=>({name:'Offer '+(i+1),size:'45 min',price:'150',photo:''}));
    const saved=await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision,data:state}}),env);
    assert.equal(saved.status,200);revision++;
    assert.deepEqual((await (await worker.fetch(request('/api/workspace'),env)).json()).data,state);
    for(const [key,value] of [['business','unknown'],['cta','x'.repeat(41)],['terms','x'.repeat(81)],['eyebrow','x'.repeat(29)],['showDate','false']]){
      const bad=structuredClone(state);bad.draft[key]=value;assert.throws(()=>validateWorkspace(bad));
    }
  }
  assert.deepEqual(validateWorkspace(sample()),sample());env.sql.close();
});

test('upgrades a legacy workspace, retains all clients and projects, and rejects stale or old-editor writes',async()=>{
  const env=environment(),old=sample();
  await worker.fetch(request('/api/workspace',{method:'PUT',body:{revision:0,data:old}}),env);
  const imported=await (await worker.fetch(request('/api/studio'),env)).json();assert.deepEqual(imported.data,old);
  let state=ShopDeskStudio.upgrade(imported.data),first=structuredClone(state.clients[0]);
  state=ShopDeskStudio.addClient(state,'New Salon','beauty','event','Launch day');
  const {client,project}=ShopDeskStudio.active(state);project.draft.eventDate='2026-10-01';project.draft.eventTime='09:00';project.draft.venue='Town Hall';project.draft.details='Join our opening celebration.';
  state=ShopDeskStudio.duplicate(state);assert.deepEqual(state.clients[0],first);assert.equal(state.clients[1].projects.length,2);
  const put=(data,revision,owner='alice',path='/api/studio')=>worker.fetch(request(path,{owner,method:'PUT',body:{revision,data}}),env);
  assert.equal((await put(state,1)).status,200);assert.deepEqual((await (await worker.fetch(request('/api/studio'),env)).json()).data,state);
  assert.equal((await put(state,1)).status,409);assert.equal((await put(old,2,'alice','/api/workspace')).status,409);
  assert.equal((await worker.fetch(request('/api/workspace'),env)).status,409);
  assert.equal((await (await worker.fetch(request('/api/studio',{owner:'bob'}),env)).json()).data,null);
  const mismatch=structuredClone(state);mismatch.activeClientId=first.id;assert.throws(()=>validateStudio(mismatch));
  const duplicate=structuredClone(state);duplicate.clients[1].projects[0].id=first.projects[0].id;assert.throws(()=>validateStudio(duplicate));
  const cross=await put(state,2,'alice');assert.equal(cross.status,200);
  assert.equal((await worker.fetch(request('/api/studio',{method:'PUT',headers:{origin:'https://unrelated.test'},body:{revision:3,data:state}}),env)).status,403);
  env.sql.close();
});
test('validates photo ownership in inactive clients and event main photos',async()=>{
  const env=environment(),image=new Uint8Array([255,216,255,224,0,16,255,217]);
  const {id}=await (await worker.fetch(request('/api/photos',{owner:'bob',method:'POST',body:image,headers:{'content-type':'image/jpeg'}}),env)).json();
  let state=ShopDeskStudio.upgrade(sample());state.clients[0].projects[0].draft.heroPhoto=id;
  state=ShopDeskStudio.addClient(state,'Other client','general','opening','Opening');
  assert.equal((await worker.fetch(request('/api/studio',{method:'PUT',body:{revision:0,data:state}}),env)).status,400);
  assert.equal((await (await worker.fetch(request('/api/studio'),env)).json()).data,null);env.sql.close();
});
