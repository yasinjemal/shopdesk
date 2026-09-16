import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/poster.js';
import '../public/studio.js';
import '../public/templates.js';
import '../public/pack.js';
import {validateWorkspace,validateStudio} from '../worker/index.js';

const sample=()=>({shop:{name:'Corner shop',phone:'',location:''},products:[],draft:{headline:'Weekly offers',date:'2030-09-25',template:'parade',theme:'red',format:'poster',exportQuality:'4k',items:[{name:'Rice',size:'2 kg',price:'40',photo:''}]}});
test('new sizes and quality survive save and duplication, while shared designs retain their shape',()=>{
  for(const format of Object.keys(ShopDeskPoster.formats))for(const template of ['parade','shelf','paper']){
    const data=sample();Object.assign(data.draft,{format,template});assert.deepEqual(validateWorkspace(data),data);
    const copy=ShopDeskStudio.active(validateStudio(ShopDeskStudio.duplicate(ShopDeskStudio.upgrade(data)))).project.draft;
    assert.equal(copy.format,format);assert.equal(copy.exportQuality,'4k');
    assert.equal(ShopDeskTemplates.draft(ShopDeskTemplates.create(copy,'A design','')).format,format);
    const pack=ShopDeskPack.plan(copy);assert.equal(pack[0].data.format,format==='status'?'poster':format);assert.equal(pack[0].data.exportQuality,'4k');
    assert.equal(pack[1].data.exportQuality,'standard');
  }
  const bad=sample();bad.draft.exportQuality='8k';assert.throws(()=>validateWorkspace(bad));
});
test('4K uses a 3840-pixel long edge and paper uses physical 300-dpi sizes',()=>{
  for(const [format,expected] of Object.entries({poster:[3072,3840],status:[2160,3840],square:[3840,3840],landscape:[3840,2160],a4:[2480,3508],a5:[1748,2480]})){
    const actual=ShopDeskPoster.outputSize(format,'4k');assert.deepEqual([actual.width,actual.height],expected);
  }
  assert.equal(ShopDeskPoster.outputSize('status').height,1920);
});
test('all new shapes keep 1–25 cards separate with first or last featured',()=>{
  for(const format of Object.keys(ShopDeskPoster.formats))for(const style of ['parade','shelf','paper'])for(let n=1;n<=25;n++)for(const index of [-1,0,n-1]){
    const l=ShopDeskPoster.flexibleGeometry(format,n,style,index);assert.equal(l.cards.length,n);
    for(const [i,c] of l.cards.entries()){
      assert.ok(c.w>0&&c.h>65&&c.x>=40&&c.y>=l.top&&c.x+c.w<=l.width-39.99&&c.y+c.h<=l.bottom+.01);
      for(const d of l.cards.slice(i+1))assert.ok(c.x+c.w<=d.x+.01||d.x+d.w<=c.x+.01||c.y+c.h<=d.y+.01||d.y+d.h<=c.y+.01);
    }
  }
});
