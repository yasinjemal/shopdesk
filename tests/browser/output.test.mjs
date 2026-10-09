import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {launch} from './launch.mjs';
import {startApp} from '../../scripts/local-server.mjs';

for(const width of [320,1280])test(`new designs, quality, shapes and print files work at ${width}px`,async()=>{
 const app=await startApp();let browser;
 try{
  browser=await launch();
  const page=await browser.newPage({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const click=s=>width<700?page.locator(s).tap():page.locator(s).click();
  await page.goto(app.url+'#promotion',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
  let previous='';
  for(const template of ['parade','shelf','paper']){
   await click(`[data-template="${template}"]`);assert.equal(await page.locator('#poster-template').inputValue(),template);
   const next=await page.locator('#promo-canvas').evaluate(c=>c.toDataURL());assert.notEqual(next,previous);previous=next;
  }
  // A detailed, transparent source larger than the previous 1000px upload cap.
  const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=3200;c.height=2400;const x=c.getContext('2d');x.fillStyle='#005b72';x.fillRect(200,200,2800,2000);x.fillStyle='white';x.font='bold 260px sans-serif';x.fillText('TEST PRODUCT',350,1200);return c.toDataURL().split(',')[1];});
  await click('#tab-content');await page.locator('[aria-label="Choose photo for item 1"]').setInputFiles({name:'detail.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
  await page.waitForFunction(()=>ShopDeskPromotion.itemState().ready&&ShopDeskPromotion.itemState().items[0].photo);
  const stored=await page.evaluate(async()=>{const id=ShopDeskPromotion.itemState().items[0].photo,b=await (await fetch('/api/photos/'+id)).blob(),i=await createImageBitmap(b),c=document.createElement('canvas');c.width=1;c.height=1;c.getContext('2d').drawImage(i,0,0);return {width:i.width,height:i.height,type:b.type,alpha:c.getContext('2d').getImageData(0,0,1,1).data[3]};});
  assert.equal(stored.width,3200);assert.equal(stored.height,2400);assert.equal(stored.alpha,0);assert.equal(stored.type,'image/webp');
  await click('#tab-style');await page.locator('#export-quality').selectOption('4k');
  for(const [format,w,h] of [['poster',3072,3840],['status',2160,3840],['square',3840,3840],['landscape',3840,2160],['a4',2480,3508],['a5',1748,2480]]){
   await click(`label:has(input[name="poster-format"][value="${format}"])`);
   assert.match(await page.locator('#download-hint').textContent(),new RegExp(`${w} × ${h}`));
   const downloaded=page.waitForEvent('download');await click('#download-promo');const download=await downloaded;
   const png=await readFile(await download.path());assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);
   await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
   if(format[0]==='a'){
    let found=false;for(let pos=8;pos<png.length;pos+=12+png.readUInt32BE(pos))if(png.toString('ascii',pos+4,pos+8)==='pHYs'){assert.equal(png.readUInt32BE(pos+8),11811);found=true;}assert.ok(found);
    assert.equal(await page.locator('#export-quality').isDisabled(),true);
    const printed=page.waitForEvent('download');await click('#download-print');const pdf=await readFile(await (await printed).path());
    assert.match(pdf.toString('latin1'),/^%PDF-1.4/);assert.match(pdf.toString('latin1'),format==='a4'?/MediaBox \[0 0 595.2756 841.8898\]/:/MediaBox \[0 0 419.5276 595.2756\]/);
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
   }
  }
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
  assert.equal(await page.locator('[name="poster-format"]:checked').inputValue(),'a5');assert.equal(await page.locator('#export-quality').inputValue(),'4k');assert.equal(await page.locator('#poster-template').inputValue(),'paper');
  await click('label:has(input[value="square"])');assert.equal(await page.locator('#export-quality').isEnabled(),true);
  await page.locator('#export-quality').selectOption('standard');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 }finally{await browser?.close();await app.close();}
});
