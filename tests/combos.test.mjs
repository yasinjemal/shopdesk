import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/combos.js';
import '../public/items.js';
import '../public/studio.js';
import '../public/templates.js';
import '../public/poster.js';
import '../public/pack.js';
import {validateWorkspace} from '../worker/index.js';

const sample=()=>({shop:{name:'Local Grocery',phone:'',location:''},products:[],draft:{purpose:'combos',business:'grocery',template:'combo-board',theme:'red',format:'a4',headline:'Bundles for your basket',date:'2026-12-31',itemCount:20,combos:ShopDeskCombos.defaults().map((c,i)=>({...c,name:['Pantry','Breakfast','Cleaning','Fresh produce'][i],price:String(149+i*20)+'.99'})),items:Array.from({length:25},(_,i)=>({name:'Product '+(i+1),size:'1 kg',price:'19.99',photo:'',combo:i%4,quantity:i%3+1}))}});
test('20 visible combo products preserve all reserved products and prices through saves and copies',()=>{
  const source=sample(),value=validateWorkspace(source);assert.deepEqual(value.draft,source.draft);
  const state=ShopDeskStudio.upgrade(value,value),copy=ShopDeskStudio.duplicate(state);
  assert.deepEqual(ShopDeskStudio.active(copy).project.draft,value.draft);
  assert.equal(ShopDeskBusiness.visibleItems(value.draft).length,20);
  assert.equal(ShopDeskBusiness.visibleItems({...value.draft,purpose:'offers',itemCount:25}).length,25);
  assert.equal(ShopDeskCombos.error(value.draft),'');
  assert.throws(()=>validateWorkspace({...source,draft:{...source.draft,itemCount:21}}));
  for(const bad of [{combo:6},{quantity:0},{quantity:100},{combo:4}])assert.throws(()=>validateWorkspace({...source,draft:{...source.draft,items:[{...source.draft.items[0],...bad}],itemCount:1}}));
});
test('packs keep every combo intact with the exact bundle price and quantity in captions',()=>{
  const d=sample().draft,data={...d,shop:'Local Grocery',showDate:false},outputs=ShopDeskPack.plan(data),pages=outputs.slice(1);
  assert.equal(pages.length,4);assert.equal(outputs[0].data.format,'a4');
  assert.deepEqual(pages.flatMap(p=>p.data.items.map(i=>i.name)).sort(),d.items.slice(0,20).map(i=>i.name).sort());
  pages.forEach((p,i)=>{assert.equal(p.data.combos[0].price,d.combos[i].price);assert.equal(ShopDeskCombos.groups(p.data)[0].number,i+1);assert.ok(p.data.items.every(item=>item.combo===0));});
  const caption=ShopDeskPack.caption(data);assert.match(caption,/Combo 2 · Breakfast — R169.99 for the complete combo/);assert.match(caption,/2 × Product 2 · 1 kg/);assert.doesNotMatch(caption,/Product 21|19.99/);
  assert.match(ShopDeskCombos.error({...d,combos:d.combos.map(c=>({...c,price:''}))}),/bundle price/);
});
test('combo template reuse strips private fields and photos while retaining selected contents only',()=>{
  const d=sample().draft;d.items[0].photo=crypto.randomUUID();
  const content=ShopDeskTemplates.create(d,'Family groceries','',true),plain=ShopDeskTemplates.create(d,'Layout only','');
  assert.equal(content.design.items.length,20);assert.equal(content.design.items[0].photo,'');assert.deepEqual(content.design.combos,d.combos);assert.equal(content.design.items[0].quantity,1);
  assert.ok(plain.design.combos.every(c=>!c.price&&/^Combo \d$/.test(c.name)));assert.equal(plain.design.items,undefined);
  assert.deepEqual(ShopDeskTemplates.validate(content),content);
  assert.equal(ShopDeskCombos.groups(ShopDeskTemplates.draft(content)).length,4);
});
