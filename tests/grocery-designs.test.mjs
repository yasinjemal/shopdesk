import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/poster.js';
import '../public/studio.js';
import '../public/words.js';
import '../public/samples.js';
import '../public/templates.js';
import '../public/pack.js';
import {validateWorkspace,validateStudio} from '../worker/index.js';

const styles=['weekend','butcher','bakery','household','bigprice','cashcarry','crate','tagsale'];
test('grocery designs and promotion types survive save, duplicate, sharing and promotion packs',()=>{
  assert.equal(ShopDeskPoster.brandName,'Handbill');
  for(const template of styles){
    assert.equal(ShopDeskPoster.collection[template].category,'grocery');
    const draft={headline:'Weekend specials',date:'2030-10-15',template,theme:ShopDeskPoster.collection[template].theme,format:'a5',exportQuality:'4k',business:'grocery',purpose:'offers',promotion:'weekend',itemCount:1,typeface:'modern',priceStyle:'solid',items:[{name:'Boerewors',size:'Per kg',price:'109.99',photo:crypto.randomUUID(),dealQuantity:2,featured:true},{name:'Reserved rolls',size:'6 pack',price:'14.99',photo:''}]};
    const workspace={shop:{name:'Local grocery',phone:'0721234567',location:'Main Street'},products:[],draft},before=structuredClone(workspace);
    assert.deepEqual(validateWorkspace(workspace),workspace);
    const next=validateStudio(ShopDeskStudio.duplicate(ShopDeskStudio.upgrade(workspace))),copy=ShopDeskStudio.active(next).project.draft;
    assert.deepEqual(copy,draft);assert.deepEqual(workspace,before);
    const shared=ShopDeskTemplates.create(draft,'Weekend design','',true);
    assert.equal(shared.design.template,template);assert.equal(shared.design.promotion,'weekend');assert.equal(shared.design.items[0].photo,'');
    for(const page of ShopDeskPack.plan(copy))assert.equal(page.data.template,template);
  }
  assert.throws(()=>validateWorkspace({shop:{name:'x',phone:'',location:''},products:[],draft:{headline:'h',date:'',template:'weekend',theme:'tomato',format:'poster',promotion:'nonsense',items:[{name:'a',size:'',price:'1',photo:''}]}}));
  // Older drafts without a promotion type remain valid and unchanged.
  const legacy={shop:{name:'Old shop',phone:'',location:''},products:[],draft:{headline:'Fresh deals.',date:'2030-01-01',theme:'green',format:'status',items:[{name:'Potatoes',size:'1 kg',price:'10.00',photo:''}]}};
  assert.deepEqual(validateWorkspace(legacy),legacy);
});

test('every starter creates a valid project, and promotion starters seed crafted wording without touching existing text',()=>{
  const workspace={shop:{name:'Recipient',phone:'',location:''},products:[],draft:{headline:'Original',date:'',theme:'green',format:'poster',items:[{name:'Existing',size:'',price:'10',photo:''}]}};
  const state=ShopDeskStudio.upgrade(null,workspace);
  assert.ok(ShopDeskTemplates.starters.length>=63);
  for(const [i,starter] of ShopDeskTemplates.starters.entries()){
    assert.equal(starter.id,'starter-'+i);assert.ok(ShopDeskTemplates.promotions[starter.promotion],starter.title);assert.ok(ShopDeskTemplates.styles[starter.style],starter.title);
    const next=ShopDeskStudio.useTemplate(state,starter),{client,project}=ShopDeskStudio.active(next);
    assert.deepEqual(validateStudio(next),next);assert.equal(client.projects[0].draft.headline,'Original');
    assert.deepEqual(project.draft.items.map(i=>i.name),project.draft.items.map(()=>''));
  }
  const weekend=ShopDeskTemplates.starters.find(s=>s.design.template==='weekend');
  const draft=ShopDeskTemplates.draft(weekend);
  assert.equal(draft.headline,ShopDeskWords.promotions.weekend[0][0]);assert.equal(draft.eyebrow,ShopDeskWords.promotions.weekend[0][1]);assert.equal(draft.promotion,'weekend');
  const combos=ShopDeskTemplates.draft(ShopDeskTemplates.starters[27]);assert.equal(combos.headline,'Everyday essentials. Better together.');
});

test('promotion wording and samples stay within field limits and never invent claims',()=>{
  const banned=/\b(free|guarantee|cheapest|lowest|delivery|save \d|off\b|discount)/i;
  for(const [promotion,tones] of Object.entries(ShopDeskWords.promotions)){
    assert.equal(tones.length,3,promotion);
    for(const [headline,eyebrow] of tones){assert.ok(headline.length<=45&&eyebrow.length<=28,promotion);assert.doesNotMatch(headline+' '+eyebrow,banned,promotion);}
    const sets=ShopDeskWords.sets({business:'grocery',purpose:'offers',promotion});
    assert.equal(sets[0].values.headline,tones[0][0]);assert.equal(sets[2].values.cta,'Enquire about our selection');
  }
  assert.equal(ShopDeskWords.sets({business:'grocery',purpose:'combos',promotion:'weekend'})[0].values.headline,'Everyday essentials. Better together.');
  const items=ShopDeskSamples.items('grocery','butchery',12);assert.equal(items.length,12);assert.ok(items.every(i=>i.name&&i.size&&Number(i.price)>0&&i.photo===''));
  assert.equal(ShopDeskSamples.items('beauty','',3)[0].name,'Haircut & style');
});

test('grocery geometry keeps 1–25 cards inside six shapes without overlap',()=>{
  for(const format of Object.keys(ShopDeskPoster.formats))for(const style of styles)for(let count=1;count<=25;count++)for(const index of [-1,0,count-1]){
    const l=ShopDeskPoster.grocerGeometry(format,count,style,index);assert.equal(l.cards.length,count);
    for(const [i,c] of l.cards.entries()){
      assert.ok(c.w>90&&c.h>60&&c.x>=39.99&&c.y>=l.top-.01&&c.x+c.w<=l.width-39.99&&c.y+c.h<=l.bottom+.01,`${style} ${format} ${count}`);
      for(const other of l.cards.slice(i+1))assert.ok(c.x+c.w<=other.x+.01||other.x+other.w<=c.x+.01||c.y+c.h<=other.y+.01||other.y+other.h<=c.y+.01);
    }
  }
});
