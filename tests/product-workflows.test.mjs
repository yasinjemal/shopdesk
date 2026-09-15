import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/items.js';
import '../public/poster.js';
import '../public/studio.js';
import '../public/pack.js';
import {validateWorkspace,validateStudio} from '../worker/index.js';
const item=(name='Rice',price='120.00')=>({name,size:'10 kg',price,photo:''});
const empty=()=>({name:'',size:'',price:'',photo:''});
const workspace=()=>({shop:{name:'My shop',phone:'0721234567',location:'Queenstown'},products:[],draft:{headline:'Our offers',date:'',showDate:false,template:'bold',theme:'red',format:'poster',items:[item()]}});

test('bulk parsing handles common lists, quoted names and South African prices without treating weights as prices',()=>{
  const cases=[['Rice, 10 kg, R120','Rice','10 kg','120.00'],['Rice\t10 kg\t1 299,95','Rice','10 kg','1299.95'],['Rice;10 kg;R120,50','Rice','10 kg','120.50'],['Rice | 10 kg | R1,299.95','Rice','10 kg','1299.95'],['Rice 10kg R120,50','Rice','10kg','120.50'],['Rice, 10 kg, R1,299.95','Rice','10 kg','1299.95'],['Rice,10 kg,R120,50','Rice','10 kg','120.50'],['"Samp, beans", 1 kg, R19.95','Samp, beans','1 kg','19.95'],['Haircut,80','Haircut','','80.00']];
  for(const [source,name,size,price] of cases){const row=ShopDeskItems.parse(source)[0];assert.deepEqual([row.name,row.size,row.price],[name,size,price],source);assert.equal(ShopDeskItems.error(row),'');}
  assert.equal(ShopDeskItems.parse('Name,Pack,Price\nRice,10kg,R120').length,1);
  assert.equal(ShopDeskItems.parse('Rice 10 kg')[0].price,'');
  for(const value of ['-120','R0','1e3','12.345','1,000,001'])assert.equal(ShopDeskItems.price(value),'');
  assert.throws(()=>ShopDeskItems.parse(''));
});

test('batch insertion fills empty cards, reuses empty reserved slots and never overwrites retained products',()=>{
  const original=Array.from({length:25},empty);original[0]=item('Existing');original[20]=item('Kept for later');original[1].featured=true;
  const before=structuredClone(original),incoming=Array.from({length:23},(_,i)=>item('Imported '+i));
  assert.equal(ShopDeskItems.room(original,3),23);
  const next=ShopDeskItems.insert(original,3,incoming);
  assert.equal(next.items.length,25);assert.equal(next.itemCount,24);assert.equal(next.items[0].name,'Existing');assert.equal(next.items.at(-1).name,'Kept for later');assert.equal(next.items.filter(i=>i.featured).length,1);
  assert.deepEqual(original,before);assert.equal(incoming[0].featured,undefined);
  assert.throws(()=>ShopDeskItems.insert(original,3,[...incoming,item('Too many')]));
  assert.throws(()=>ShopDeskItems.insert(original,3,[item('Good'),item('Bad','-1')]));
  assert.throws(()=>ShopDeskItems.insert([item()],1,[item('A'),item('B'),item('C')],3));
  assert.deepEqual(original,before);
});

test('saved-product selections copy flyer prices and framing without importing saved IDs or featured flags',()=>{
  const saved={id:'product-id',...item(),featured:true,photoScale:1.5,photoX:.2};
  const edited={...saved,price:'R99,95'};
  const next=ShopDeskItems.insert([empty()],1,[edited]);
  assert.equal(next.items[0].price,'99.95');assert.equal(next.items[0].photoScale,1.5);assert.equal(next.items[0].id,undefined);assert.equal(next.items[0].featured,undefined);assert.equal(saved.price,'120.00');
});

test('featured offers and photo framing survive server validation, duplicate projects and all export pages',()=>{
  const source=workspace();source.draft.items=Array.from({length:25},(_,i)=>({...item('Offer '+i),photoScale:1.5,photoX:-.5,photoY:.25}));source.draft.items[24].featured=true;
  const saved=validateStudio(ShopDeskStudio.duplicate(ShopDeskStudio.upgrade(validateWorkspace(source))));
  const {project}=ShopDeskStudio.active(saved),pages=ShopDeskPack.plan({...project.draft,shop:'My shop'});
  assert.deepEqual(project.draft.items,source.draft.items);
  assert.deepEqual(pages.slice(1).flatMap(page=>page.data.items),source.draft.items);
  for(const [key,value] of [['photoScale',2.1],['photoX',-1.1],['photoY','0'],['featured','yes']]){const bad=workspace();bad.draft.items[0][key]=value;assert.throws(()=>validateWorkspace(bad));}
  const duplicate=workspace();duplicate.draft.items=[{...item(),featured:true},{...item(),featured:true}];assert.throws(()=>validateWorkspace(duplicate));
});

test('featured layout keeps every offer separate and the chosen card larger in both formats',()=>{
  for(const format of ['poster','status'])for(let count=2;count<=25;count++)for(const featured of [0,count-1]){
    const layout=ShopDeskPoster.featuredGeometry(format,count,featured);assert.equal(layout.cards.length,count);
    const hero=layout.cards[featured];assert.equal(hero.featured,true);
    for(const [i,c] of layout.cards.entries()){
      assert.ok(c.w>0&&c.h>0&&c.x>=40&&c.x+c.w<=1040.01&&c.y>=layout.top&&c.y+c.h<=layout.bottom+.01);
      if(i!==featured)assert.ok(hero.w*hero.h>c.w*c.h);
      for(const other of layout.cards.slice(i+1))assert.ok(c.x+c.w<=other.x+.01||other.x+other.w<=c.x+.01||c.y+c.h<=other.y+.01||other.y+other.h<=c.y+.01);
    }
  }
});
