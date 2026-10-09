import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/poster.js';
import '../public/studio.js';
import '../public/templates.js';
import '../public/pack.js';
import {validateWorkspace,validateStudio} from '../worker/index.js';

const originalStyles=['gazette','harvest','ledger','midnight','diagonal'];
const retailStyles=['circular','frontpage','aisle','price-blocks','fresh-cut','split-banner'];
const styles=[...originalStyles,...retailStyles];
test('professional grocery styles survive save, duplicate, sharing and promotion packs',()=>{
  for(const template of styles){
    const draft={headline:'Weekly grocery offers',date:'2030-10-15',template,theme:ShopDeskPoster.collection[template].theme,format:'a4',exportQuality:'4k',business:'grocery',purpose:'offers',itemCount:1,typeface:'geometric',priceStyle:'pill',keepColours:true,items:[{name:'Rice',size:'2 kg',price:'49.99',photo:crypto.randomUUID(),photoScale:1.2,photoX:.2,dealQuantity:2,featured:true},{name:'Reserved beans',size:'410 g',price:'15',photo:''}]};
    const workspace={shop:{name:'Local grocery',phone:'0721234567',location:'Main Street'},products:[],draft},before=structuredClone(workspace);
    assert.deepEqual(validateWorkspace(workspace),workspace);
    const next=validateStudio(ShopDeskStudio.duplicate(ShopDeskStudio.upgrade(workspace))),copy=ShopDeskStudio.active(next).project.draft;
    assert.deepEqual(copy,draft);assert.deepEqual(workspace,before);
    const shared=ShopDeskTemplates.create(draft,'Weekly design','',true);
    assert.equal(shared.design.template,template);assert.equal(shared.design.items.length,1);assert.equal(shared.design.items[0].photo,'');assert.equal(shared.design.items[0].dealQuantity,2);
    for(const page of ShopDeskPack.plan(copy))assert.equal(page.data.template,template);
  }
  // Append starters: saved favourites keep the same identifiers and contents.
  assert.ok(ShopDeskTemplates.starters.length>=63);
  assert.equal(ShopDeskTemplates.starters[0].id,'starter-0');assert.equal(ShopDeskTemplates.starters[0].design.template,'warehouse');
  assert.equal(ShopDeskTemplates.starters[29].id,'starter-29');assert.equal(ShopDeskTemplates.starters[29].design.template,'combo-fresh');
  assert.deepEqual(ShopDeskTemplates.starters.slice(30,35).map(t=>t.design.template),originalStyles);
  assert.deepEqual(ShopDeskTemplates.starters.slice(35,43).map(t=>t.design.template),[...retailStyles,'combo-circular','combo-receipt']);
  for(const starter of ShopDeskTemplates.starters.slice(35))assert.equal(validateWorkspace({shop:{name:'Local grocery',phone:'',location:''},products:[],draft:ShopDeskTemplates.draft(starter)}).draft.template,starter.design.template);
});
test('professional layouts keep all 1–25 products inside six shapes without overlap',()=>{
  for(const format of Object.keys(ShopDeskPoster.formats))for(const style of styles)for(let count=1;count<=25;count++)for(const index of [-1,0,count-1]){
    const l=ShopDeskPoster.professionalGeometry(format,count,style,index);assert.equal(l.cards.length,count);
    for(const [i,c] of l.cards.entries()){
      assert.ok(c.w>90&&c.h>65&&c.x>=40&&c.y>=l.top&&c.x+c.w<=l.width-39.99&&c.y+c.h<=l.bottom+.01,`${style} ${format} ${count}`);
      for(const other of l.cards.slice(i+1))assert.ok(c.x+c.w<=other.x+.01||other.x+other.w<=c.x+.01||c.y+c.h<=other.y+.01||other.y+other.h<=c.y+.01);
    }
  }
});
