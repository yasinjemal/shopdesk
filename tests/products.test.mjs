import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/items.js';
import '../public/products.js';
import '../public/studio.js';
import '../public/words.js';
import '../public/samples.js';
import '../public/templates.js';
import {validateWorkspace} from '../worker/index.js';

const P=ShopDeskProducts;
test('the product catalogue covers every business with sizes, departments and illustrations',()=>{
  assert.ok(P.catalogue.length>=250);
  const names=new Set();
  for(const entry of P.catalogue){
    assert.ok(entry.name&&entry.sizes.length>=1&&entry.section&&entry.icon&&entry.business,entry.name);
    assert.ok(!names.has(entry.name.toLowerCase()),'duplicate '+entry.name);names.add(entry.name.toLowerCase());
    assert.ok(entry.name.length<=50&&entry.sizes.every(s=>s.length<=25),entry.name);
    if(entry.section!=='Airtime & data')assert.doesNotMatch(entry.name+' '+entry.sizes.join(' '),/\bR\s?\d|\d+[.,]\d{2}(?!\s?(?:kg|L|l|m))\b/,'no prices in the catalogue: '+entry.name);
  }
  for(const business of ['grocery','food','beauty','fashion','services','general'])assert.ok(P.catalogue.some(e=>e.business===business),business);
  assert.ok(P.sections.includes('Butchery')&&P.sections.includes('Hardware')&&P.sections.includes('Takeaway'));
});

test('search understands what shop owners type: synonyms, slips, sizes and prices',()=>{
  const top=(q,ctx={})=>P.search(q,ctx).results[0]?.name;
  assert.equal(top('maize'),'Maize meal');assert.equal(top('mielie meal'),'Maize meal');assert.equal(top('pap'),'Maize meal');
  assert.equal(top('sunflwer oil'),'Sunflower oil');assert.equal(top('cooldrink'),'Soft drinks');assert.equal(top('jik'),'Bleach');
  assert.equal(top('toilet rolls'),'Toilet paper');assert.equal(top('kota'),'Kota');assert.equal(top('fade'),'Haircut');assert.equal(top('box braids'),'Braids');
  assert.equal(top('cement'),'Cement');assert.equal(top('pampers'),'Nappies');assert.equal(top('full valet'),'Car wash');
  const parsed=P.search('mielie meal 12.5kg 119.99');
  assert.equal(parsed.query,'mielie meal');assert.equal(parsed.size,'12.5 kg');assert.equal(parsed.price,'119.99');assert.equal(parsed.results[0].sizes[0],'12.5 kg');
  assert.deepEqual(P.parseQuery('rice 10 kg R159.99'),{query:'rice',size:'10 kg',price:'159.99',name:'Rice'});
  assert.equal(P.parseQuery('Gogo’s Special MIX 2kg R20').name,'Gogo’s Special MIX');
  assert.deepEqual(P.parseQuery('eggs 30 tray'),{query:'eggs',size:'30 tray',price:'',name:'Eggs'});
  assert.deepEqual(P.parseQuery('cooldrink 2l'),{query:'cooldrink',size:'2 L',price:'',name:'Cooldrink'});
  assert.deepEqual(P.parseQuery('Nappies size 3'),{query:'nappies',size:'Size 3',price:'',name:'Nappies'});
  assert.deepEqual(P.parseQuery('chicken per kg'),{query:'chicken',size:'Per kg',price:'',name:'Chicken'});
  assert.equal(P.search('x').results.length,0);assert.equal(P.search('').results.length,0);
  assert.ok(P.search('zzqqxx').results.length===0);
  // The person's own saved items and recent picks rank first and carry their sizes and prices.
  const own=P.search('maize',{saved:[{id:'a',name:'Maize meal',size:'25 kg',price:'219.99',photo:''}],recent:['Maize meal']});
  assert.equal(own.results[0].sizes[0],'25 kg');assert.deepEqual(own.results[0].own[0],{size:'25 kg',price:'219.99',photo:'',id:'a'});
  const custom=P.search('gogo special',{saved:[{id:'b',name:'Gogo special',size:'Each',price:'15',photo:''}]});
  assert.equal(custom.results[0].name,'Gogo special');assert.equal(custom.results[0].kind,'saved');
  // Business context pulls the right trade forward without hiding the rest.
  assert.equal(P.search('wings',{business:'food'}).results[0].name,'Hot wings');assert.equal(P.search('wings',{business:'grocery'}).results[0].name,'Chicken wings');
  assert.equal(P.search('nails',{business:'beauty'}).results[0].name,'Manicure');
  assert.equal(P.search('nails',{business:'general'}).results[0].name,'Nails');
});

test('identify and enrich attach an illustration and department without changing text or prices',()=>{
  assert.equal(P.identify('Long grain rice').name,'Rice');assert.equal(P.identify('Ace Super Maize Meal').name,'Maize meal');assert.equal(P.identify('Something unknown'),null);
  const row={name:'Sunflower oil',size:'2 L',price:'64.99',photo:''};
  assert.deepEqual(P.enrich(row),{...row,icon:'bottle',section:'Pantry'});assert.deepEqual(row,{name:'Sunflower oil',size:'2 L',price:'64.99',photo:''});
  assert.deepEqual(P.enrich({...row,section:'Specials'}),{...row,section:'Specials',icon:'bottle'});
  assert.deepEqual(P.enrich({...row,photo:'abc'}),{...row,photo:'abc'});
  assert.deepEqual(P.enrich({name:'Something unknown',size:'',price:'',photo:''}),{name:'Something unknown',size:'',price:'',photo:''});
  assert.equal(P.distance('kitten','sitting',3),3);assert.equal(P.distance('maize','maiez',1),1);
});

test('illustration ids save, share and validate, and never replace a real photo',()=>{
  const items=[{name:'Maize meal',size:'12.5 kg',price:'119.99',photo:'',icon:'sack',section:'Pantry'},{name:'Rice',size:'2 kg',price:'40',photo:crypto.randomUUID(),icon:'sack'}];
  const workspace={shop:{name:'Shop',phone:'',location:''},products:[{id:crypto.randomUUID(),name:'Maize meal',size:'12.5 kg',price:'119.99',photo:'',icon:'sack'}],draft:{headline:'h',date:'2030-01-01',theme:'red',format:'poster',template:'bold',items}};
  assert.deepEqual(validateWorkspace(workspace),workspace);
  assert.throws(()=>validateWorkspace({...workspace,draft:{...workspace.draft,items:[{...items[0],icon:'<script>'}]}}),/illustration/);
  assert.equal(ShopDeskItems.error({name:'x',size:'',price:'1',icon:'Bad Icon'}),'Choose a valid illustration.');
  assert.deepEqual(ShopDeskItems.copy(items[0]),items[0]);
  const shared=ShopDeskTemplates.create({...workspace.draft,business:'grocery',purpose:'offers',itemCount:2},'Shared','',true);
  assert.equal(shared.design.items[0].icon,'sack');assert.equal(shared.design.items[1].icon,'sack');assert.equal(shared.design.items[1].photo,'');
});
