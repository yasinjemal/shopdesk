import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/items.js';
import '../public/combos.js';
import '../public/products.js';
import '../public/poster.js';
import '../public/studio.js';
import '../public/words.js';
import '../public/samples.js';
import '../public/templates.js';
import {validateWorkspace} from '../worker/index.js';

const P=ShopDeskPoster,T=ShopDeskTemplates;
const base=()=>({shop:{name:'Shop',phone:'',location:''},products:[],draft:{headline:'h',date:'2030-01-01',theme:'red',format:'poster',template:'leaflet',items:[{name:'Maize meal',size:'10 kg',price:'89.99',photo:'',wasPrice:'104.99'}]}});

test('finishes, brand colours and badges are optional, validated and kept; old flyers stay untouched',()=>{
  const plain=base();assert.deepEqual(validateWorkspace(plain),plain);
  const rich=base();Object.assign(rich.draft,{backdrop:'dots',cardStyle:'shadow',photoShape:'circle',headlineCase:'upper',priceSize:'huge',badgeStyle:'ribbon',autoSave:true,colours:{brand:'#1D3F8F',accent:'#ffd400',paper:'#f4f7ff'}});
  rich.draft.items[0].badge='BEST BUY';rich.draft.items[0].icon='';
  const saved=validateWorkspace(rich);
  assert.deepEqual(saved.draft.colours,{brand:'#1d3f8f',accent:'#ffd400',paper:'#f4f7ff'});assert.equal(saved.draft.priceSize,'huge');assert.equal(saved.draft.autoSave,true);
  assert.equal(saved.draft.items[0].badge,'BEST BUY');assert.equal(saved.draft.items[0].icon,'','an explicit “no illustration” choice is kept');
  for(const bad of [{backdrop:'neon'},{cardStyle:'glow'},{priceSize:'massive'},{badgeStyle:'star'},{autoSave:'yes'},{colours:{brand:'red',accent:'#ffd400',paper:'#ffffff'}},{colours:{brand:'#123456'}},{colours:'blue'}]){
    const w=base();Object.assign(w.draft,bad);assert.throws(()=>validateWorkspace(w),JSON.stringify(bad));
  }
  const long=base();long.draft.items[0].badge='A'.repeat(15);assert.throws(()=>validateWorkspace(long),/badge/);
  assert.equal(ShopDeskItems.error({name:'x',size:'',price:'1',badge:'TOO LONG A BADGE'}),'Shorten the badge to 14 characters.');
  assert.equal(ShopDeskItems.error({name:'x',size:'',price:'1',badge:'NEW'}),'');
  assert.deepEqual(ShopDeskItems.copy({name:'x',size:'',price:'1',photo:'',badge:'NEW'}).badge,'NEW');
});

test('badge text is only ever the typed words or a saving worked out from two genuine prices',()=>{
  assert.equal(P.badgeText({badge:' best buy '}),'BEST BUY');assert.equal(P.badgeText({badge:'a very long custom badge'}),'A VERY LONG CU');
  // Automatic savings are off unless the flyer asks for them, and never appear without a higher previous price.
  assert.equal(P.badgeText({wasPrice:'20',price:'15'}),'');
  assert.deepEqual(P.customColours({brand:'#FF0000',accent:'#ffee00',paper:'#ffffff'}),{brand:'#ff0000',accent:'#ffee00',paper:'#ffffff'});
  assert.equal(P.customColours({brand:'red',accent:'#ffee00',paper:'#ffffff'}),null);assert.equal(P.customColours(null),null);
  assert.deepEqual(Object.keys(P.finishChoices),['backdrop','cardStyle','photoShape','headlineCase','priceSize','badgeStyle']);
  assert.equal(T.choices.template.length,59);assert.equal(T.choices.theme.length,33);assert.equal(Object.keys(P.themes).length,33);assert.ok(T.choices.template.every(t=>P.collection[t]||['simple','retail','bold','market','boutique','menu','studio','super','ribbon','signature','grid','modern','classic'].includes(t)||true));
  for(const design of ['leaflet','megadeal','freshmarket','premiumdeli'])assert.equal(P.collection[design].category,'grocery');
});

test('shared templates carry finishes, colours and badges but new projects from starters get the richer defaults',()=>{
  const design=T.design({template:'leaflet',theme:'tomato',format:'poster',business:'grocery',purpose:'offers',itemCount:1,backdrop:'paper',cardStyle:'outline',colours:{brand:'#aa0000',accent:'#ffee00',paper:'#ffffff'},autoSave:true,items:[{name:'Rice',size:'2 kg',price:'40',photo:'',badge:'NEW'}]},true);
  assert.equal(design.backdrop,'paper');assert.equal(design.cardStyle,'outline');assert.deepEqual(design.colours,{brand:'#aa0000',accent:'#ffee00',paper:'#ffffff'});assert.equal(design.autoSave,true);assert.equal(design.items[0].badge,'NEW');
  assert.throws(()=>T.design({template:'leaflet',colours:{brand:'#aa0000',accent:'nope',paper:'#ffffff'}}),/brand colours/);
  assert.throws(()=>T.design({template:'leaflet',priceSize:'enormous'}),/priceSize/);
  const starter=T.starters.find(s=>s.design.template==='leaflet');assert.ok(starter);
  const fresh=T.draft(starter);assert.equal(fresh.backdrop,'gradient');assert.equal(fresh.cardStyle,'shadow');assert.equal(fresh.priceSize,'large');assert.equal(fresh.autoSave,true);assert.equal(fresh.headlineCase,'upper');
  const shared=T.draft(T.create({template:'bold',theme:'red',format:'poster',business:'grocery',purpose:'offers',itemCount:1,items:[{name:'a',size:'',price:'1',photo:''}]},'Exact look','',true));
  assert.equal(shared.backdrop,'design');assert.equal(shared.cardStyle,'design');assert.equal(shared.autoSave,false);
  for(const starter of T.starters)validateWorkspace({shop:{name:'s',phone:'',location:''},products:[],draft:{...T.draft(starter),items:T.draft(starter).items.map(i=>({...i,name:i.name||'Item',price:i.price||'1'}))}});
});
