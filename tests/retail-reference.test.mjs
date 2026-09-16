import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/items.js';
import '../public/poster.js';
import '../public/studio.js';
import '../public/templates.js';
import '../public/pack.js';
import {validateWorkspace,validateStudio} from '../worker/index.js';

const workspace=()=>({shop:{name:'Market store',phone:'',location:''},products:[],draft:{headline:'Weekend offers',date:'2027-09-21',startDate:'2027-09-18',showDate:true,template:'mosaic',theme:'teal',format:'poster',items:[{name:'Rice',size:'2 kg',price:'65',photo:'',dealQuantity:2},{name:'Beans',size:'1 kg',price:'25',photo:''}]}});
test('multi-buy quantities survive copying, saving, duplicates, template reuse and captions',()=>{
  const original=workspace();assert.deepEqual(validateWorkspace(original),original);
  assert.deepEqual(ShopDeskItems.copy(original.draft.items[0]),original.draft.items[0]);
  const state=validateStudio(ShopDeskStudio.duplicate(ShopDeskStudio.upgrade(original))),{project}=ShopDeskStudio.active(state);
  assert.equal(project.draft.items[0].dealQuantity,2);assert.equal(project.draft.startDate,'2027-09-18');
  const shared=ShopDeskTemplates.create(original.draft,'Market','',true);assert.equal(shared.design.items[0].dealQuantity,2);assert.equal(shared.design.startDate,undefined);
  assert.equal(ShopDeskTemplates.draft(shared).items[0].dealQuantity,2);
  assert.equal(ShopDeskTemplates.create(original.draft,'Private content','').design.items,undefined);
  const data={...project.draft,shop:'Market store',startDateText:'18 September 2027',dateText:'21 September 2027'};
  for(const page of ShopDeskPack.plan(data)){assert.equal(page.data.items[0].dealQuantity,2);assert.match(ShopDeskPack.caption(page.data),/Rice · 2 kg — 2 for R65[.,]00/);assert.match(ShopDeskPack.caption(page.data),/Valid 18 September 2027 – 21 September 2027/);}
  for(const qty of [1,0,100,2.5,'2',null]){const bad=workspace();bad.draft.items[0].dealQuantity=qty;assert.throws(()=>validateWorkspace(bad));assert.throws(()=>ShopDeskTemplates.create(bad.draft,'Bad','',true));}
});
test('retail layouts keep all 1–25 offers separate in both formats, with any lead offer',()=>{
  for(const format of ['poster','status'])for(const mode of ['wholesale','mosaic','fresh'])for(let count=1;count<=25;count++)for(const index of [-1,0,count-1]){
    const layout=ShopDeskPoster.merchantGeometry(format,count,mode,index);assert.equal(layout.cards.length,count);
    for(const [i,c] of layout.cards.entries()){
      assert.ok(c.x>=40&&c.y>=layout.top&&c.x+c.w<=1040.01&&c.y+c.h<=layout.bottom+.01&&c.h>0&&c.w>0);
      for(const d of layout.cards.slice(i+1))assert.ok(c.x+c.w<=d.x+.01||d.x+d.w<=c.x+.01||c.y+c.h<=d.y+.01||d.y+d.h<=c.y+.01);
    }
  }
});
