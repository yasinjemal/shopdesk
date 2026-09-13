import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { validateWorkspace } from '../worker/index.js';

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
