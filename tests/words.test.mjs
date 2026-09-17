import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/words.js';
import '../public/business.js';
import '../public/studio.js';
import '../public/pack.js';
import {validateWorkspace,validateStudio} from '../worker/index.js';

test('crafted wording fits every saved field and follows business and occasion',()=>{
  for(const business of ['grocery','fashion','food','beauty','services','general'])for(const purpose of ['offers','spotlight','event','opening']){
    const context={business,purpose,showDate:false},before=structuredClone(context),sets=ShopDeskWords.sets(context);
    assert.equal(sets.length,3);assert.deepEqual(context,before);
    for(const set of sets){assert.deepEqual(ShopDeskWords.validate(set.values),set.values);assert.equal(Object.keys(set.values).length,4);}
  }
  assert.match(ShopDeskWords.sets({business:'food'})[0].values.terms,/allergens/);
  assert.match(ShopDeskWords.sets({business:'beauty'})[0].values.cta,/appointments/);
  assert.match(ShopDeskWords.sets({business:'food',purpose:'event'})[0].values.terms,/venue/);
  assert.match(ShopDeskWords.sets({business:'grocery',purpose:'opening'})[0].values.headline,/beginning/);
  assert.throws(()=>ShopDeskWords.validate({price:'Free'}));
  assert.throws(()=>ShopDeskWords.validate({headline:'x'.repeat(46)}));
});

test('logo sizes and chosen wording persist in copies, shared styles and packs',()=>{
  const values=ShopDeskWords.sets({business:'beauty'})[2].values;
  for(const logoSize of ['compact','prominent']){
    const original={shop:{name:'Test salon',phone:'0721234567',location:'Main Street'},products:[],draft:{...values,date:'',showDate:false,logoSize,template:'arc',theme:'raspberry',format:'a4',business:'beauty',purpose:'offers',items:[{name:'Haircut',size:'Each',price:'100',photo:''}]}};
    assert.deepEqual(validateWorkspace(original),original);
    const copy=validateStudio(ShopDeskStudio.duplicate(ShopDeskStudio.upgrade(original)));
    const d=ShopDeskStudio.active(copy).project.draft;
    for(const [key,value] of Object.entries(values))assert.equal(d[key],value);
    for(const page of ShopDeskPack.plan({...d,shop:'Test salon'}))assert.equal(page.data.logoSize,logoSize);
    const template=ShopDeskTemplates.create(d,'Our style','A style to reuse');assert.equal(template.design.logoSize,logoSize);
    assert.ok(!('cta' in template.design));assert.ok(!('terms' in template.design));
    assert.equal(ShopDeskTemplates.draft(template).logoSize,logoSize);
  }
});
