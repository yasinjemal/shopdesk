import {test} from 'node:test';
import assert from 'node:assert/strict';
import {launch} from './launch.mjs';
import {startApp} from '../../scripts/local-server.mjs';

for(const width of [320,1280])test(`retail designs, multi-buy totals and promotion dates work at ${width}px`,async()=>{
 const app=await startApp();let browser;
 try{
  browser=await launch();
  const page=await browser.newPage({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  const click=selector=>width<700?page.locator(selector).tap():page.locator(selector).click();
  await page.goto(app.url+'#promotion');await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
  await click('#tab-content');await click('#open-bulk');await page.locator('#bulk-source').fill('Rice, 2 kg, R40\nBeans, 410 g, R25\nMilk, 1 litre, R18');await click('#review-bulk');await click('#apply-bulk');await page.waitForFunction(()=>!document.querySelector('#bulk-dialog').open);
  await click('.offer-options > summary >> nth=0');await page.locator('.deal-quantity').first().selectOption('2');
  assert.match(await page.locator('.item-price').first().textContent(),/^2 for /);
  await page.locator('#promo-start-date').fill('2030-09-20');await page.locator('#promo-date').fill('2030-09-19');
  assert.equal(await page.locator('#download-promo').isDisabled(),true);assert.match(await page.locator('#promo-error').textContent(),/start date/);
  await click('#review-details');assert.equal(await page.locator('#promo-start-date').evaluate(el=>el===document.activeElement),true);
  await page.locator('#promo-date').fill('2030-09-25');assert.equal(await page.locator('#download-promo').isEnabled(),true);
  await click('.save-product >> nth=0');await click('#open-saved-grid');assert.match(await page.locator('#saved-product-grid').textContent(),/2 for the shown price/);
  await page.getByRole('checkbox',{name:'Select Potatoes',exact:true}).check();await page.getByRole('textbox',{name:'Flyer price for Potatoes'}).fill('20');await click('#apply-saved-selection');await page.waitForFunction(()=>!document.querySelector('#saved-grid-dialog').open);
  let state=await page.evaluate(()=>ShopDeskPromotion.itemState());assert.equal(state.items[4].dealQuantity,2);assert.equal(state.items[4].price,'20.00');assert.equal(state.products[0].price,'10.00');
  const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=450;c.height=600;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,450,600);ctx.fillStyle='#b3992b';ctx.fillRect(80,60,290,480);return c.toDataURL().split(',')[1];});
  await page.locator('[aria-label="Choose photo for item 1"]').setInputFiles({name:'test-product.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});await page.waitForFunction(()=>ShopDeskPromotion.itemState().ready&&ShopDeskPromotion.itemState().items[0].photo);
  await click('#tab-style');let previous=await page.locator('#promo-canvas').evaluate(c=>c.toDataURL());
  for(const template of ['wholesale','mosaic','fresh']){
   await click(`[data-template="${template}"]`);assert.equal(await page.locator('#poster-template').inputValue(),template);
   const next=await page.locator('#promo-canvas').evaluate(c=>c.toDataURL());assert.notEqual(next,previous);previous=next;
  }
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
  assert.equal(await page.locator('#poster-template').inputValue(),'fresh');assert.equal(await page.locator('#promo-start-date').inputValue(),'2030-09-20');assert.equal(await page.locator('#promo-date').inputValue(),'2030-09-25');
  state=await page.evaluate(()=>ShopDeskPromotion.itemState());assert.equal(state.items[0].dealQuantity,2);assert.ok(state.items[0].photo);assert.equal(state.products[0].dealQuantity,2);
  const download=page.waitForEvent('download');await click('#download-promo');assert.match((await download).suggestedFilename(),/\.png$/);
  await click('#create-pack-bottom');await page.waitForFunction(()=>!document.querySelector('#download-pack').disabled);
  const caption=await page.locator('#pack-caption-text').inputValue();assert.match(caption,/2 for R10[.,]00/);assert.match(caption,/2 for R20[.,]00/);assert.match(caption,/Valid Fri 20 September 2030 – Wed 25 September 2030/);
  await click('#close-pack');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 }finally{await browser?.close();await app.close();}
});
