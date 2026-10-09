import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/items.js';
import '../public/combos.js';
import '../public/poster.js';
import '../public/studio.js';
import '../public/words.js';
import '../public/samples.js';
import '../public/templates.js';
import '../public/pack.js';
import {validateWorkspace,validateStudio} from '../worker/index.js';

const item=(name,extra={})=>({name,size:'2 kg',price:'89.99',photo:'',...extra});
const workspace=items=>({shop:{name:'Local grocery',phone:'',location:''},products:[],draft:{headline:'Month-end specials',date:'2030-10-21',startDate:'2030-10-08',theme:'tomato',format:'a4',template:'circular',business:'grocery',purpose:'offers',promotion:'monthend',printPages:'catalogue',items}});

test('previous prices and section labels are optional, validated and kept through saving, sharing and captions',()=>{
  const items=[item('Chicken braai pack',{wasPrice:'109.99',section:'Butchery'}),item('Washing powder',{section:'Household'}),item('Rice')];
  const saved=workspace(items),before=structuredClone(saved);
  assert.deepEqual(validateWorkspace(saved),saved);assert.deepEqual(saved,before);
  assert.deepEqual(validateStudio(ShopDeskStudio.upgrade(saved)).clients[0].projects[0].draft.items,items);
  assert.throws(()=>validateWorkspace(workspace([item('Bad',{wasPrice:'-5'})])),/Previous prices/);
  assert.throws(()=>validateWorkspace(workspace([item('Bad',{section:'A label that is far too long to fit'})])),/section label/);
  assert.throws(()=>validateWorkspace({...workspace(items),draft:{...workspace(items).draft,printPages:'booklet'}}),/design finish/);
  // Blank values are dropped rather than stored.
  assert.deepEqual(validateWorkspace(workspace([item('Rice',{wasPrice:'',section:''})])).draft.items[0],item('Rice'));
  assert.equal(ShopDeskItems.error(item('Rice',{wasPrice:'abc'})),'Enter a valid previous price, or leave it blank.');
  assert.equal(ShopDeskItems.error(item('Rice',{wasPrice:'99.99',section:'Pantry'})),'');
  assert.deepEqual(ShopDeskItems.copy(items[0],false),items[0]);
  const shared=ShopDeskTemplates.create(saved.draft,'Month-end','',true);
  assert.deepEqual(shared.design.items[0],{name:'Chicken braai pack',size:'2 kg',price:'89.99',photo:'',wasPrice:'109.99',section:'Butchery'});
  assert.equal(shared.design.items[2].wasPrice,undefined);
  const caption=ShopDeskPack.caption({...saved.draft,shop:'Local grocery',dateText:'Wed 21 October 2030'});
  assert.match(caption,/Butchery: Chicken braai pack · 2 kg — R89[.,]99 \(was R109[.,]99\)\n/);
  assert.match(caption,/Household: Washing powder · 2 kg — R89[.,]99\n/);
  assert.match(caption,/\nRice · 2 kg — R89[.,]99\n/);
});

test('catalogue pages split offers into numbered pages that keep the design and business details',()=>{
  const items=Array.from({length:25},(_,i)=>item('Product '+(i+1)));
  const data={...workspace(items).draft,shop:'Local grocery',itemCount:25};
  const pages=ShopDeskPack.catalogue(data,12);
  assert.equal(pages.length,3);assert.deepEqual(pages.map(p=>p.items.length),[9,8,8]);
  assert.deepEqual(ShopDeskPack.catalogue({...data,items:items.slice(0,16),itemCount:16},12).map(p=>p.items.length),[8,8]);
  assert.deepEqual(pages.map(p=>p.packPage),[{index:1,total:3},{index:2,total:3},{index:3,total:3}]);
  for(const page of pages){assert.equal(page.template,'circular');assert.equal(page.shop,'Local grocery');assert.equal(page.itemCount,page.items.length);assert.equal(page.headline,data.headline);}
  assert.equal(pages[2].items[7].name,'Product 25');assert.equal(pages[0].items[0].name,'Product 1');
  assert.equal(ShopDeskPack.catalogue({...data,itemCount:10},12).length,1);
  assert.throws(()=>ShopDeskPack.catalogue({...data,purpose:'combos',combos:[{name:'A',price:'10'}]}),/Catalogue pages/);
  assert.throws(()=>ShopDeskPack.catalogue({...data,purpose:'event'}),/Catalogue pages/);
});

test('catalogue-style starters, promotion types and samples validate', ()=>{
  assert.ok(ShopDeskTemplates.starters.length>=73);
  for(const key of ['monthend','seasonal','hardware'])assert.ok(ShopDeskTemplates.promotions[key]&&ShopDeskWords.promotions[key].length===3,key);
  const monthEnd=ShopDeskTemplates.starters.find(s=>s.title==='Month-end specials catalogue');
  assert.equal(monthEnd.design.format,'a4');assert.equal(monthEnd.design.promotion,'monthend');assert.equal(monthEnd.design.itemCount,16);
  const state=ShopDeskStudio.upgrade(null,workspace([item('Existing')]));
  for(const starter of ShopDeskTemplates.starters.slice(63)){
    const next=ShopDeskStudio.useTemplate(state,starter);assert.deepEqual(validateStudio(next),next);
    assert.ok(ShopDeskStudio.active(next).project.draft.headline.length<=45,starter.title);
  }
  const samples=ShopDeskSamples.items('grocery','monthend',16);
  assert.ok(samples.every(s=>s.section&&s.name&&Number(s.price)>0));
  assert.equal(ShopDeskSamples.items('general','hardware',3)[0].name,'Cement');
  assert.equal(ShopDeskSamples.items('food','monthend',2)[0].name,'Quarter chicken & chips');
});
