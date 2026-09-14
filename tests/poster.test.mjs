import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/poster.js';
const {displayName,packWarning,contentBounds}=globalThis.ShopDeskPoster;
test('removes only matching pack weights and keeps conflicting or ambiguous names intact',()=>{
  assert.equal(displayName('12.5Kg Bluebird','12.5 kg'),'Bluebird');
  assert.equal(displayName('Chicken portions 2kg','2 kg'),'Chicken portions');
  assert.equal(displayName('1000g Brown sugar','1 kg'),'Brown sugar');
  assert.equal(displayName('10kg Golden Penny','19 kg'),'10kg Golden Penny');
  assert.match(packWarning('10kg Golden Penny','19 kg'),/10kg.*19 kg/);
  assert.equal(packWarning('12,5kg Maize meal','12.5 kg'),'');
  assert.equal(displayName('2 x 10kg Maize meal','10 kg'),'2 x 10kg Maize meal');
  assert.equal(displayName('10kg','10 kg'),'10kg');
  assert.equal(displayName('Sunflower oil','2 L'),'Sunflower oil');
});
test('fits white photo borders with padding and leaves coloured backgrounds or blank images whole',()=>{
  const width=100,height=100,data=new Uint8ClampedArray(width*height*4).fill(255),pixels={data,width,height};
  assert.equal(contentBounds(pixels),null);
  for(let y=30;y<70;y++)for(let x=35;x<65;x++){const i=(y*width+x)*4;data[i]=20;data[i+1]=90;data[i+2]=40;}
  const bounds=contentBounds(pixels);
  assert.ok(bounds.x<.35&&bounds.x+bounds.w>.65&&bounds.y<.3&&bounds.y+bounds.h>.7);
  assert.ok(bounds.w<.5&&bounds.h<.6);
  for(let x=0;x<width;x++){data[x*4]=30;data[x*4+1]=60;data[x*4+2]=20;}
  assert.equal(contentBounds(pixels),null);
});
