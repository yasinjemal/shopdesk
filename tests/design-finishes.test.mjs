import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/poster.js';
import '../public/studio.js';
import '../public/pack.js';
import {validateStudio,validateWorkspace} from '../worker/index.js';
const workspace=()=>({shop:{name:'A business',phone:'0721234567',location:'Queenstown'},products:[],draft:{headline:'Our latest collection',date:'',showDate:false,format:'poster',theme:'red',template:'bold',items:Array.from({length:25},(_,i)=>({name:'Offer '+(i+1),size:'Each',price:'99.95',photo:''}))}});
test('personalised styles survive save, duplication and every promotion-pack page',()=>{
  for(const [template,design] of Object.entries(ShopDeskPoster.collection)){
    const original=workspace();Object.assign(original.draft,{template,theme:design.theme,typeface:'elegant',priceStyle:'outline'});
    const saved=validateStudio(ShopDeskStudio.duplicate(ShopDeskStudio.upgrade(validateWorkspace(original))));
    const {client,project}=ShopDeskStudio.active(saved);
    for(const page of ShopDeskPack.plan({...project.draft,shop:client.shop.name})){
      for(const key of ['template','theme','typeface','priceStyle'])assert.equal(page.data[key],original.draft[key]);
    }
    assert.equal(project.draft.items.length,25);
  }
});
test('old drafts keep their defaults and unsupported styling values are rejected',()=>{
  const original=workspace();assert.deepEqual(validateWorkspace(original),original);
  for(const theme of Object.keys(ShopDeskPoster.themes))assert.equal(validateWorkspace({...original,draft:{...original.draft,theme}}).draft.theme,theme);
  for(const [key,values] of [['typeface',['design','modern','elegant','geometric']],['priceStyle',['design','solid','outline','pill']]]){
    for(const value of values){const state=workspace();state.draft[key]=value;assert.equal(validateWorkspace(state).draft[key],value);}
    const invalid=workspace();invalid.draft[key]='unknown';assert.throws(()=>validateWorkspace(invalid));
  }
});
