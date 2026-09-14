import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/poster.js';
import '../public/pack.js';

test('business presets preserve the current offer details and remain independent of the source draft',()=>{
  const draft={business:'grocery',template:'bold',headline:'My custom headline',date:'2026-09-30',format:'status',trimPhotos:false,items:[{name:'A service',size:'45 min',price:'120',photo:'original-photo'}]};
  const before=structuredClone(draft);
  for(const business of Object.keys(ShopDeskBusiness.profiles)){
    const next=ShopDeskBusiness.applyPreset(draft,business);
    assert.deepEqual(next.items,before.items);assert.equal(next.date,before.date);assert.equal(next.format,before.format);assert.equal(next.trimPhotos,false);
    assert.ok(next.headline.length<=45);assert.ok(next.eyebrow.length<=28);assert.ok(next.cta.length<=40);assert.ok(next.terms.length<=80);
  }
  assert.deepEqual(draft,before);
});

test('service wording, blank messages and hidden expiry are consistent across the whole promotion pack',()=>{
  const data={shop:'My salon',business:'beauty',template:'studio',format:'poster',headline:'Your time to shine',theme:'plum',date:'2020-01-01',dateText:'1 January 2020',showDate:false,cta:'WhatsApp to book',terms:'Appointments only.',phone:'072 123 4567',location:'Mkomjana village',items:Array.from({length:9},(_,i)=>({name:'Service '+(i+1),size:'45 min',price:'125.50',photo:''}))};
  for(const output of ShopDeskPack.plan(data)){
    const caption=ShopDeskPack.caption(output.data);
    assert.ok(caption.includes('WhatsApp to book: 072 123 4567'));assert.ok(caption.includes('Appointments only.'));
    assert.ok(!caption.includes('2020'));assert.ok(!caption.includes('stocks'));assert.ok(caption.includes('45 min — R125'));
    assert.deepEqual(ShopDeskBusiness.copy(output.data),ShopDeskBusiness.copy(data));
  }
  const blank=ShopDeskBusiness.copy({...data,eyebrow:'',cta:'',terms:''});
  assert.equal(blank.contact,data.phone);assert.equal(blank.eyebrow,'');assert.equal(blank.terms,'');assert.equal(blank.date,'');
  const legacy=ShopDeskBusiness.copy({dateText:'30 September 2026',phone:'0123'});
  assert.equal(legacy.date,'Valid until 30 September 2026');assert.equal(legacy.terms,'While stocks last.');assert.equal(legacy.contact,'Contact us: 0123');
});
