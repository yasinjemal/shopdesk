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
  assert.equal(own.results[0].sizes[0],'25 kg');assert.deepEqual(own.results[0].own[0],{size:'25 kg',price:'219.99',photo:'',id:'a',icon:'',source:null});
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

test('exact pack sizes: a typed size is matched by quantity and unit, never by a different size',()=>{
  assert.equal(P.sameSize('10kg','10 kg'),true);assert.equal(P.sameSize('2L','2000 ml'),true);assert.equal(P.sameSize('12 × 1 L','12x1l'),true);assert.equal(P.sameSize('12,5 kg','12.5 kg'),true);
  assert.equal(P.sameSize('5 kg','10 kg'),false);assert.equal(P.sameSize('6 × 1 L','1 L'),false);assert.equal(P.sameSize('Per kg','per kg'),true);assert.equal(P.sameSize('',''),false);
  assert.deepEqual(P.parseSize('12.5 kg'),{count:1,amount:12.5,unit:'kg',base:'g',baseAmount:12500,rest:''});assert.equal(P.parseSize('Per kg'),null);
  assert.equal(P.sizeFromText('Ace Super Maize Meal 12,5kg'),'12.5 kg');assert.equal(P.sizeFromText('Coke 24 x 330ml'),'24 × 330 ml');assert.equal(P.sizeFromText('Sunflower Oil'),'');
  const ten=P.search('maize meal 10kg');assert.equal(ten.size,'10 kg');assert.equal(ten.results[0].name,'Maize meal');assert.equal(ten.results[0].sizes[0],'10 kg');assert.equal(ten.results[0].customSize,false);
  assert.ok(!ten.results.some(r=>r.sizes[0]==='5 kg'),'5 kg is never offered as the match for 10 kg');
  // A size the family does not list is kept exactly as typed and marked custom, not swapped for a near one.
  const seven=P.search('maize meal 7kg');assert.deepEqual(seven.results[0].sizes,['7 kg']);assert.equal(seven.results[0].customSize,true);
  // Products without measurable sizes drop out when a measurable size is typed.
  assert.ok(P.search('oil 2l').results.every(r=>r.sizes.every(s=>P.parseSize(s)||r.customSize)));
  assert.ok(!P.search('oil 2l').results.some(r=>r.name==='Car wash'));
  // Case packs parse from the common ways people type them.
  for(const [q,size] of [['milk 6x1l','6 × 1 L'],['12 x 1l milk','12 × 1 L'],['cooldrink 24 × 330 ml','24 × 330 ml'],['6 x 2 l oil','6 × 2 L']])assert.equal(P.parseQuery(q).size,size,q);
  assert.equal(P.search('milk 6x1l').results[0].name,'Full cream milk');assert.equal(P.search('milk 6x1l').results[0].sizes[0],'6 × 1 L');
  // Private saved products come before public records and keep their own size and price.
  const mine=P.search('maize meal 10kg',{saved:[{id:'s1',name:'Maize meal',size:'10 kg',price:'89.99',photo:'ph',icon:'sack',source:{provider:'off',code:'6001069000158',language:'en',revision:'7'}}]});
  assert.equal(mine.results[0].name,'Maize meal');assert.deepEqual(mine.results[0].own[0],{size:'10 kg',price:'89.99',photo:'ph',id:'s1',icon:'sack',source:{provider:'off',code:'6001069000158',language:'en',revision:'7'}});
});

test('aliases, one spelling slip and barcodes are understood without dragging in unrelated products',()=>{
  const top=q=>P.search(q).results[0]?.name,names=q=>P.search(q).results.map(r=>r.name);
  for(const [alias,name] of [['pap','Maize meal'],['maize meal','Maize meal'],['mielie meal','Maize meal'],['cooking oil','Sunflower oil'],['sunflower oil','Sunflower oil'],['cooldrink','Soft drinks'],['soft drink','Soft drinks'],['washing powder','Washing powder'],['laundry powder','Washing powder']])assert.equal(top(alias),name,alias);
  for(const [slip,name] of [['maize meel','Maize meal'],['sunflwer oil','Sunflower oil'],['bred','Brown bread'],['chiken','Chicken braai pack'],['washng powder','Washing powder']])assert.equal(top(slip),name,slip);
  assert.ok(!names('maize meel').some(n=>/milk|meat/i.test(n)),'one slip does not pull in unrelated words');assert.ok(names('sugr').every(n=>/sugar/i.test(n)),'sugr only finds sugar: '+names('sugr'));
  assert.ok(!names('rice').includes('Ice cream'),'short words keep their first letter');
  assert.equal(P.search('rce').results.length,0);assert.equal(P.search('zzqqxx').results.length,0);
  assert.equal(P.validBarcode('6001069000158'),true);assert.equal(P.validBarcode('6001069000159'),false);assert.equal(P.validBarcode('12345670'),true);assert.equal(P.validBarcode('600106900'),false);assert.equal(P.validBarcode('abc'),false);
  // A barcode is not a product name: local search stays quiet until it is looked up.
  assert.equal(P.search('6001069000158').results.length,0);
});
