import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/studio.js';
import '../public/templates.js';
import {validateStudio} from '../worker/index.js';
import {startApp} from '../scripts/local-server.mjs';

const source=()=>({template:'warehouse',theme:'cobalt',format:'status',business:'grocery',purpose:'offers',itemCount:2,typeface:'geometric',priceStyle:'pill',trimPhotos:true,headline:'Weekend offers',eyebrow:'JUST THIS WEEK',phone:'private',location:'private',date:'2020-01-01',heroPhoto:crypto.randomUUID(),details:'private event',venue:'private venue',cta:'private number',terms:'private terms',items:[{name:'Rice',size:'2 kg',price:'40',photo:crypto.randomUUID()},{name:'Beans',size:'1 kg',price:'20',photo:''},{name:'Hidden item',size:'',price:'5',photo:''}]});
test('shared templates use an allowlist and omit private and hidden data',()=>{
  const draft=source(),before=structuredClone(draft),plain=ShopDeskTemplates.create(draft,'Shop specials','A reusable layout');
  assert.equal(plain.includeContent,false);assert.equal(plain.design.items,undefined);assert.equal(plain.design.headline,undefined);
  const content=ShopDeskTemplates.create(draft,'Shop specials','A reusable layout',true);
  assert.equal(content.design.items.length,2);assert.equal(content.design.items[0].photo,'');
  for(const key of ['phone','location','date','heroPhoto','details','venue','cta','terms'])assert.equal(content.design[key],undefined);
  assert.deepEqual(draft,before);
  const malicious={...content,owner:'another user',design:{...content.design,logo:'secret',items:content.design.items.map(i=>({...i,photo:crypto.randomUUID(),owner:'secret'}))}};
  assert.deepEqual(ShopDeskTemplates.validate(malicious),content);
  const event=ShopDeskTemplates.create({...draft,purpose:'event'},'Event','',true);
  assert.deepEqual(event.design.items,[{name:'',size:'',price:'',photo:''}]);
  assert.throws(()=>ShopDeskTemplates.validate({...content,formatVersion:100}));
  assert.throws(()=>ShopDeskTemplates.create({...draft,template:'unknown'},'Invalid',''));
  assert.throws(()=>ShopDeskTemplates.create({...draft,itemCount:30},'Invalid',''));
});

test('using a template creates an independent valid project with the recipient’s business',()=>{
  const workspace={shop:{name:'Recipient shop',phone:'0721111111',location:'My town'},products:[],draft:{headline:'Original',date:'',theme:'green',format:'poster',items:[{name:'Existing',size:'',price:'10',photo:''}]}};
  const state=ShopDeskStudio.upgrade(null,workspace),before=structuredClone(state);
  for(const template of [...ShopDeskTemplates.starters,ShopDeskTemplates.create(source(),'Shared offers','',true)]){
    const next=ShopDeskStudio.useTemplate(state,template),{client,project}=ShopDeskStudio.active(next);
    assert.equal(client.projects.length,2);assert.deepEqual(client.shop,workspace.shop);assert.deepEqual(state,before);
    assert.notEqual(project.id,state.activeProjectId);assert.equal(project.draft.heroPhoto,'');assert.equal(project.draft.eventDate,'');
    assert.deepEqual(validateStudio(next),next);assert.deepEqual(client.projects[0],before.clients[0].projects[0]);
  }
});

test('library sharing, paging and unlisting respect ownership without changing workspaces',async()=>{
  const app=await startApp();
  const request=async(path,user='alice',method='GET',body)=>{
    const response=await fetch(app.url+path,{method,headers:{'x-shopdesk-test-user':user,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};
  };
  try{
    const template=ShopDeskTemplates.create(source(),'Market specials','A grocery design'),id=crypto.randomUUID();
    assert.equal((await request('/api/templates','alice','POST',{id,template})).status,201);
    assert.equal((await request('/api/templates','alice','POST',{id,template})).status,200);
    let listed=await request('/api/templates','bob');assert.equal(listed.data.templates.length,1);assert.equal(listed.data.templates[0].mine,false);assert.equal(listed.data.templates[0].owner,undefined);
    assert.deepEqual(listed.data.templates[0].design,template.design);
    assert.equal((await request('/api/templates/'+id,'bob','PATCH',{listed:false})).status,404);
    assert.equal((await request('/api/templates/'+id,'alice','PATCH',{listed:false})).status,200);
    assert.equal((await request('/api/templates','bob')).data.templates.length,0);
    assert.equal((await request('/api/templates?mine=1','alice')).data.templates[0].listed,false);
    assert.equal((await request('/api/templates?mine=1','bob')).data.templates.length,0);
    assert.equal((await request('/api/templates/'+id,'alice','PATCH',{listed:true})).status,200);
    for(let i=0;i<13;i++)await request('/api/templates','alice','POST',{id:crypto.randomUUID(),template:{...template,title:'Design '+i}});
    const first=(await request('/api/templates','bob')).data,second=(await request('/api/templates?cursor='+encodeURIComponent(first.cursor),'bob')).data;
    assert.equal(first.templates.length,12);assert.equal(second.templates.length,2);assert.equal(new Set([...first.templates,...second.templates].map(t=>t.id)).size,14);
    assert.equal((await request('/api/templates?q=Market&category=grocery','bob')).data.templates.length,1);
    assert.equal((await request('/api/templates?q=Market&category=food','bob')).data.templates.length,0);
    assert.equal((await request('/api/studio','alice')).data.data,null);assert.equal((await request('/api/studio','bob')).data.data,null);
    assert.equal((await request('/api/templates','alice','POST',{id:crypto.randomUUID(),template:{...template,formatVersion:2}})).status,400);
  }finally{await app.close();}
});
