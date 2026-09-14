import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/poster.js';
import '../public/pack.js';
import '../public/studio.js';
import {validateWorkspace,validateStudio} from '../worker/index.js';

const items=Array.from({length:25},(_,i)=>({name:'Product '+(i+1),size:'10 kg',price:String(50+i),photo:''}));
const workspace=()=>({shop:{name:'Test shop',phone:'',location:''},products:[],draft:{items:structuredClone(items),itemCount:25,template:'super',theme:'red',format:'poster',headline:'Our latest offers',date:'',showDate:false,purpose:'offers'}});

test('changing the selected count keeps reserved items through save, duplicate, and restore',()=>{
  let state=workspace();
  Object.assign(state.draft,ShopDeskBusiness.resizeItems(state.draft.items,9));
  state=validateWorkspace(state);
  assert.equal(state.draft.items.length,25);
  assert.equal(ShopDeskBusiness.visibleItems(state.draft).length,9);
  let studio=ShopDeskStudio.duplicate(ShopDeskStudio.upgrade(state));
  studio=validateStudio(studio);
  const draft=ShopDeskStudio.active(studio).project.draft;
  Object.assign(draft,ShopDeskBusiness.resizeItems(draft.items,25));
  assert.deepEqual(ShopDeskBusiness.visibleItems(draft),items);
  assert.equal(studio.clients[0].projects[0].draft.itemCount,9);
  const newProject=ShopDeskStudio.addProject(studio,'Next flyer','offers');
  assert.equal(ShopDeskStudio.active(newProject).project.draft.itemCount,1);
});

test('only selected products enter flyer pages and captions, including all 25 when restored',()=>{
  const data={...workspace().draft,shop:'Test shop',itemCount:9};
  const selected=ShopDeskPack.plan(data);
  assert.equal(selected[0].data.items.length,9);
  assert.deepEqual(selected.slice(1).flatMap(p=>p.data.items),items.slice(0,9));
  assert.ok(!ShopDeskPack.caption(data).includes('Product 10'));
  const all=ShopDeskPack.plan({...data,itemCount:25});
  assert.equal(all.length,8);
  assert.deepEqual(all.slice(1).flatMap(p=>p.data.items),items);
  for(const output of all)assert.equal(ShopDeskBusiness.visibleItems(output.data).length,output.data.items.length);
});

test('new styles and palettes persist, and invalid counts are rejected without truncation',()=>{
  for(const template of ['super','ribbon','signature'])for(const theme of ['red','teal','gold','berry']){
    const state=workspace();Object.assign(state.draft,{template,theme});
    assert.deepEqual(validateWorkspace(state),state);
  }
  for(const count of [0,26,2.5,'9']){
    const state=workspace();state.draft.itemCount=count;
    assert.throws(()=>validateWorkspace(state));
  }
  const bad=workspace();bad.draft.items.push({...items[0]});assert.throws(()=>validateWorkspace(bad));
  const simple=workspace();Object.assign(simple.draft,{template:'simple',itemCount:3});
  assert.equal(validateWorkspace(simple).draft.items.length,25);
  simple.draft.itemCount=4;assert.throws(()=>validateWorkspace(simple));
});

test('every count has separate cards inside the flyer, with a centred incomplete final row',()=>{
  for(const format of ['poster','status'])for(let count=1;count<=25;count++){
    const layout=ShopDeskPoster.catalogueGeometry(format,count);
    assert.equal(layout.cards.length,count);
    for(const [i,c] of layout.cards.entries()){
      assert.ok(c.w>0&&c.h>0&&c.x>=40&&c.x+c.w<=1040.01&&c.y>=layout.top&&c.y+c.h<=layout.bottom+.01);
      for(const other of layout.cards.slice(i+1))assert.ok(c.x+c.w<=other.x||other.x+other.w<=c.x||c.y+c.h<=other.y||other.y+other.h<=c.y);
    }
    const last=layout.cards.slice((layout.rows-1)*layout.columns);
    assert.ok(Math.abs(last[0].x-(1080-last.at(-1).x-last.at(-1).w))<.01);
  }
  assert.throws(()=>ShopDeskPoster.catalogueGeometry('poster',26));
});
