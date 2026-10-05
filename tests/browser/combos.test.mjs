import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startApp} from '../../scripts/local-server.mjs';

for(const width of [320,1280])test(`grocery bundles can be edited, saved and exported at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await chromium.launch({headless:true,channel:process.env.SHOPDESK_BROWSER_CHANNEL||'chrome'});
    const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});page.setDefaultTimeout(10000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));const click=s=>width<700?page.locator(s).tap():page.locator(s).click();
    await page.goto(app.url,{timeout:30000});await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    await click('#tab-content');await page.locator('#product-count').selectOption('25');
    // Real editor inputs establish the retained normal flyer, without a test-only model setter.
    for(let i=0;i<25;i++){
      const card=page.locator('#promo-items > details').nth(i);if(await card.getAttribute('open')===null)await card.locator('.item-heading').click();
      await card.getByLabel('Product name',{exact:true}).fill(['Rice','Cooking oil','Sugar','Flour','Beans'][i%5]+' '+(i+1));
      await card.getByLabel('Pack / quantity',{exact:true}).fill('1 kg');await card.getByLabel('Price (R)',{exact:true}).fill('29.99');
    }
    await page.locator('#flyer-purpose').selectOption('combos');assert.equal(await page.locator('#promo-items .promo-item').count(),20);assert.equal(await page.locator('#product-count').inputValue(),'20');
    assert.match(await page.locator('#promo-error').innerText(),/bundle price/);
    for(let i=0;i<4;i++){await click('[data-combo-choice="'+i+'"]');await page.locator('.combo-name').nth(i).fill(['Family pantry','Breakfast basket','Cleaning essentials','Weekend top-up'][i]);await page.locator('.combo-price').nth(i).fill(String(149+i*20)+'.99');}
    await click('[data-combo-choice="0"]');const first=page.locator('#promo-items .promo-item[data-index="0"]');if(await first.getAttribute('open')===null)await first.locator('.item-heading').click();
    await first.getByLabel('Packs in this combo',{exact:true}).fill('2');await first.locator('.combo-assignment').selectOption('1');
    await click('#add-combo');await click('#add-combo');assert.equal(await page.locator('#add-combo').isDisabled(),true);
    await page.locator('.combo-control:not([hidden]) .remove-combo').click();await page.locator('.combo-control:not([hidden]) .remove-combo').click();assert.equal(await page.locator('.combo-control').count(),4);
    await click('[data-combo-choice="1"]');await first.locator('.move-item').last().click();assert.match(await page.locator('#promo-items .promo-item[data-index="1"]').locator('.item-heading').innerText(),/2 ×/);
    await page.locator('#promo-items .promo-item[data-index="1"]').locator('.remove-item').click();await click('#undo-remove-item');assert.equal(await page.locator('#promo-items .promo-item').count(),20);
    assert.match(await page.locator('#promo-items .promo-item[data-index="1"]').locator('.item-heading').innerText(),/2 ×/);
    const card=page.locator('#promo-items .promo-item[data-index="1"]');if(await card.getAttribute('open')===null)await card.locator('.item-heading').click();
    const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=900;const g=c.getContext('2d');g.fillStyle='white';g.fillRect(0,0,600,900);g.fillStyle='#dfbc68';g.fillRect(80,45,440,780);g.fillStyle='#176b42';g.fillRect(80,220,440,370);g.fillStyle='white';g.font='bold 90px sans-serif';g.fillText('PANTRY',90,360);g.font='70px sans-serif';g.fillText('Rice',180,485);return c.toDataURL().split(',')[1];});
    await card.locator('input[type=file]').setInputFiles({name:'grocery.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    await click('#tab-content');assert.equal(await page.locator('.combo-name').first().inputValue(),'Family pantry');assert.equal(await page.locator('.combo-price').nth(1).inputValue(),'169.99');
    const itemState=await page.evaluate(()=>ShopDeskPromotion.itemState());assert.equal(itemState.items.length,25);assert.equal(itemState.items[1].quantity,2);assert.equal(itemState.items[1].combo,1);assert.equal(itemState.items[24].price,'29.99');
    await click('#open-wording');assert.match(await page.locator('#wording-context').innerText(),/combo/);await click('#apply-wording-set');await click('#close-wording');
    await click('#tab-style');const pictures=[];for(const template of ['combo-board','combo-ticket','combo-fresh']){await click(`[data-template="${template}"]`);pictures.push(await page.locator('#promo-canvas').evaluate(c=>c.toDataURL()));}assert.equal(new Set(pictures).size,3);
    await click('[data-colour="petrol"]');await page.locator('[name=poster-format][value=square]').check();await page.locator('#export-quality').selectOption('4k');
    const download=page.waitForEvent('download');await click('#download-promo');const png=await readFile(await(await download).path());assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),3840);
    await page.locator('[name=poster-format][value=a4]').check();const pdfDownload=page.waitForEvent('download');await click('#download-print');const pdf=await readFile(await(await pdfDownload).path());assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
    await click('#create-pack');await page.waitForFunction(()=>!document.querySelector('#download-pack').disabled);
    assert.equal(await page.locator('#pack-previews article').count(),5);assert.match(await page.locator('#pack-caption-text').inputValue(),/Combo 2 · Breakfast basket — R169.99/);assert.match(await page.locator('#pack-caption-text').inputValue(),/2 × Rice 1/);await click('#close-pack');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
    await mkdir('.sites-runtime',{recursive:true});await page.locator('#promo-canvas').screenshot({path:'.sites-runtime/combo-flyer-'+width+'.png'});await page.screenshot({path:'.sites-runtime/combo-editor-'+width+'.png',animations:'disabled'});
    await click('#tab-content');await page.locator('#flyer-purpose').selectOption('offers');await page.locator('#product-count').selectOption('25');assert.equal(await page.locator('#promo-items > details').count(),25);assert.equal(await page.locator('#promo-items > details').last().getByLabel('Price (R)',{exact:true}).inputValue(),'29.99');
  }finally{await browser?.close();await app.close();}
});
