import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/studio.js';
import '../public/poster.js';
import '../public/pack.js';
const original=()=>({shop:{name:'Smiley Grocery',phone:'0607055533',location:'Mkomjana',logo:'logo'},products:[{id:'saved',name:'Maize',size:'10 kg',price:'89',photo:'maize'}],draft:{headline:'Fresh deals',date:'2026-09-30',theme:'red',template:'bold',business:'grocery',format:'poster',items:[{name:'Maize',size:'10 kg',price:'89',photo:'maize'}]}});
test('editing a duplicate leaves original offers intact and client switching never mixes saved items',()=>{
  let state=ShopDeskStudio.upgrade(original()),firstClient=state.activeClientId,firstProject=state.activeProjectId;
  state=ShopDeskStudio.duplicate(state);const copyProject=state.activeProjectId;
  const edited=original();edited.draft.items[0].price='79';state=ShopDeskStudio.capture(state,edited,'Next week');
  assert.equal(state.clients[0].projects[0].draft.items[0].price,'89');assert.equal(state.clients[0].projects[1].draft.items[0].price,'79');
  state=ShopDeskStudio.addClient(state,'New Salon','beauty','offers','Service list');
  let selected=ShopDeskStudio.active(state);assert.equal(selected.client.shop.name,'New Salon');assert.equal(selected.client.shop.logo,'');assert.deepEqual(selected.client.products,[]);assert.equal(selected.project.draft.items[0].photo,'');
  state=ShopDeskStudio.select(state,firstClient,firstProject);selected=ShopDeskStudio.active(state);assert.equal(selected.project.draft.items[0].price,'89');assert.deepEqual(selected.client.products,original().products);
  state=ShopDeskStudio.select(state,firstClient,copyProject);assert.equal(ShopDeskStudio.active(state).project.title,'Next week');
  assert.deepEqual(ShopDeskStudio.upgrade(state),state);
});
test('events export dates and venue without requiring product prices or inheriting grocery terms',()=>{
  let state=ShopDeskStudio.upgrade(original());state=ShopDeskStudio.addProject(state,'Launch','opening');
  const {client,project}=ShopDeskStudio.active(state);Object.assign(project.draft,{eventDate:'2026-10-01',eventTime:'10:00',venue:'Community Hall',details:'Come celebrate with us.'});
  const data={...project.draft,shop:client.shop.name,location:client.shop.location,phone:client.shop.phone,eventDateText:'1 October 2026'};
  const outputs=ShopDeskPack.plan(data);assert.equal(outputs.length,2);assert.deepEqual(outputs.map(p=>p.data.format),['poster','status']);
  const caption=ShopDeskPack.caption(data);assert.ok(caption.includes('1 October 2026 · 10:00'));assert.ok(caption.includes('Community Hall'));assert.ok(caption.includes('Come celebrate with us.'));assert.ok(!caption.includes('stocks'));assert.ok(!caption.includes('R0'));assert.ok(!caption.includes('Maize'));
  assert.throws(()=>ShopDeskPack.plan({...data,purpose:'spotlight',items:[...data.items,...data.items]}));
});
