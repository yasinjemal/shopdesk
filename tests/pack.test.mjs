import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/poster.js';
import '../public/pack.js';
const {plan,caption,zip,crc32}=globalThis.ShopDeskPack;
const sample=count=>({shop:'Smiley Grocery Shop',logo:'logo-photo',headline:'Fresh deals. Everyday value.',date:'2026-09-30',dateText:'30 September 2026',phone:'+27607055533',location:'Mkomjana village',format:'status',theme:'red',template:'bold',trimPhotos:true,cleanNames:true,items:Array.from({length:count},(_,i)=>({name:'Offer '+(i+1),size:'12.5 kg',price:String(100+i),photo:'photo-'+i}))});
test('every offer appears exactly once across balanced Status pages, with a full portrait flyer',()=>{
  for(let count=1;count<=12;count++){
    const input=sample(count),original=structuredClone(input),outputs=plan(input),pages=outputs.slice(1);
    assert.deepEqual(input,original);assert.equal(outputs[0].data.format,'poster');assert.deepEqual(outputs[0].data.items,input.items);
    assert.equal(pages.length,Math.ceil(count/4));assert.deepEqual(pages.flatMap(page=>page.data.items),input.items);
    assert.equal(new Set(outputs.map(o=>o.name)).size,outputs.length);
    for(const [index,page] of pages.entries()){
      assert.ok(page.data.items.length>=1&&page.data.items.length<=4);assert.equal(page.data.format,'status');assert.deepEqual(page.data.packPage,{index:index+1,total:pages.length});
      for(const key of ['shop','logo','headline','date','dateText','phone','location','theme','template','trimPhotos','cleanNames'])assert.equal(page.data[key],input[key]);
    }
    assert.ok(Math.max(...pages.map(p=>p.data.items.length))-Math.min(...pages.map(p=>p.data.items.length))<=1);
  }
  assert.throws(()=>plan(sample(0)));assert.throws(()=>plan(sample(13)));assert.throws(()=>plan({...sample(4),template:'simple'}));
  assert.equal(plan({...sample(3),template:'simple'}).length,2);
});
test('caption uses the same names, pack sizes, prices and expiry as the images',()=>{
  const data=sample(1);data.items=[{name:'1kg Potatoes',size:'1 kg',price:'10.00',photo:''}];
  const text=caption(data);assert.match(text,/Potatoes · 1 kg — R10[,.]00/);assert.ok(!text.includes('1kg Potatoes'));
  assert.ok(text.startsWith(data.shop+'\n'+data.headline));assert.ok(text.includes('Valid until 30 September 2026'));assert.ok(text.includes(data.phone));assert.ok(text.includes(data.location));
  data.items[0].size='2 kg';assert.ok(caption(data).includes('1kg Potatoes · 2 kg'));
});
test('ZIP entries keep exact bytes, CRC checksums and central directory offsets',async()=>{
  const encoder=new TextEncoder();assert.equal(crc32(encoder.encode('123456789')),0xcbf43926);
  const files=[{name:'01-full-flyer.png',blob:new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,255])],{type:'image/png'})},{name:'caption.txt',blob:new Blob(['Smiley · R99,00\nThank you — Galatoomi!'])}];
  const blob=await zip(files,new Date(2026,8,13)),bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer);let offset=0;
  for(const file of files){const payload=new Uint8Array(await file.blob.arrayBuffer()),nameLength=view.getUint16(offset+26,true);assert.equal(view.getUint32(offset,true),0x04034b50);assert.equal(view.getUint32(offset+14,true),crc32(payload));assert.equal(view.getUint32(offset+18,true),payload.length);assert.equal(new TextDecoder().decode(bytes.slice(offset+30,offset+30+nameLength)),file.name);assert.deepEqual(bytes.slice(offset+30+nameLength,offset+30+nameLength+payload.length),payload);offset+=30+nameLength+payload.length;}
  const end=bytes.length-22;assert.equal(view.getUint32(end,true),0x06054b50);assert.equal(view.getUint16(end+10,true),files.length);assert.equal(view.getUint32(end+16,true),offset);assert.equal(view.getUint32(offset,true),0x02014b50);assert.equal(view.getUint32(offset+42,true),0);
  await assert.rejects(zip([{name:'../photo.png',blob:files[0].blob}]));await assert.rejects(zip([files[0],files[0]]));
});
