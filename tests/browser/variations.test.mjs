import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startApp} from '../../scripts/local-server.mjs';

for(const width of [320,390,1280])test(`new designs, colour lock, ordering and undo work at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.SHOPDESK_BROWSER_CHANNEL?{channel:process.env.SHOPDESK_BROWSER_CHANNEL}:{})});
    const page=await browser.newPage({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700});
    page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(app.url);await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    await page.evaluate(()=>document.fonts.ready);
    const click=selector=>width<700?page.locator(selector).tap():page.locator(selector).click();
    assert.equal(await page.locator('[data-template]').count(),47);
    assert.equal(await page.locator('[data-colour]').count(),27);
    let previous=await page.locator('#promo-canvas').evaluate(el=>el.toDataURL());
    for(const template of ['sunburst','botanical','blueprint','scrapbook','candy','mono']){
      await click(`[data-template="${template}"]`);
      assert.equal(await page.locator('#poster-template').inputValue(),template);
      assert.equal(await page.locator(`[data-template="${template}"]`).getAttribute('aria-pressed'),'true');
      const next=await page.locator('#promo-canvas').evaluate(el=>el.toDataURL());assert.notEqual(next,previous);previous=next;
    }
    for(const colour of ['sage','terracotta','lavender','peach','lemon','aqua','burgundy','slate']){
      await click(`[data-colour="${colour}"]`);assert.equal(await page.locator('#promo-theme').inputValue(),colour);
      const next=await page.locator('#promo-canvas').evaluate(el=>el.toDataURL());assert.notEqual(next,previous);previous=next;
    }
    await page.locator('#keep-colours').check();await click('[data-colour="aqua"]');await click('[data-template="botanical"]');
    assert.equal(await page.locator('#promo-theme').inputValue(),'aqua');
    await page.locator('#keep-colours').uncheck();await click('[data-template="blueprint"]');
    assert.equal(await page.locator('#promo-theme').inputValue(),'slate');
    await page.locator('#keep-colours').check();await click('[data-template="candy"]');
    await page.locator('#poster-typeface').selectOption('geometric');await page.locator('#price-style').selectOption('outline');
    await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
    await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    assert.equal(await page.locator('#keep-colours').isChecked(),true);
    assert.equal(await page.locator('#poster-template').inputValue(),'candy');assert.equal(await page.locator('#promo-theme').inputValue(),'slate');
    assert.equal(await page.locator('#poster-typeface').inputValue(),'geometric');assert.equal(await page.locator('#price-style').inputValue(),'outline');
    await click('#tab-content');await click('#open-bulk');await page.locator('#bulk-source').fill('Rice, 2 kg, R40\nBeans, 1 kg, R25');await click('#review-bulk');await click('#apply-bulk');
    await page.waitForFunction(()=>!document.querySelector('#bulk-dialog').open);
    await click('.feature-offer >> nth=0');
    const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=400;const ctx=c.getContext('2d');ctx.fillStyle='#f88842';ctx.fillRect(30,30,340,340);return c.toDataURL().split(',')[1];});
    await page.locator('[aria-label="Choose photo for item 1"]').setInputFiles({name:'product.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
    await page.waitForFunction(()=>ShopDeskPromotion.itemState().ready&&ShopDeskPromotion.itemState().items[0].photo);
    const original=await page.evaluate(()=>ShopDeskPromotion.itemState().items[0]);
    await click('[aria-label="Move down item 1"]');
    let state=await page.evaluate(()=>ShopDeskPromotion.itemState());
    assert.deepEqual(state.items.map(i=>i.name),['Rice','Potatoes','Beans']);assert.deepEqual(state.items[1],original);
    assert.equal(await page.locator('#promo-items > details').nth(1).evaluate(el=>el.open),true);
    await click('#promo-items > details >> nth=1 >> .remove-item');
    assert.equal(await page.locator('#item-undo').isVisible(),true);
    if(!await page.locator('#promo-items > details').first().evaluate(el=>el.open))await page.locator('#promo-items > details').first().locator('summary').click();
    await page.locator('#promo-items > details').first().locator('input[type="number"]').fill('45.50');
    await click('#undo-remove-item');
    state=await page.evaluate(()=>ShopDeskPromotion.itemState());
    assert.equal(state.items[0].price,'45.50');assert.deepEqual(state.items[1],original);
    assert.equal(await page.locator('#item-undo').isVisible(),false);
    // Restore into a project that already holds 25 items, with most currently hidden.
    await click('#open-bulk');await page.locator('#bulk-source').fill(Array.from({length:22},(_,i)=>`Extra ${i+1}, each, R5`).join('\n'));
    await click('#review-bulk');await click('#apply-bulk');await page.waitForFunction(()=>!document.querySelector('#bulk-dialog').open);
    await page.locator('#product-count').selectOption('3');
    const retained=await page.evaluate(()=>ShopDeskPromotion.itemState().items);
    await click('#promo-items > details >> nth=1 >> .remove-item');await click('#undo-remove-item');
    assert.deepEqual(await page.evaluate(()=>ShopDeskPromotion.itemState().items),retained);
    assert.equal(await page.evaluate(()=>ShopDeskPromotion.itemState().count),3);
    await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
    await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    assert.deepEqual(await page.evaluate(()=>ShopDeskPromotion.itemState().items),retained);
    const download=page.waitForEvent('download');await click('#download-promo');assert.match((await download).suggestedFilename(),/\.png$/);
    await click('#create-pack-bottom');await page.waitForFunction(()=>!document.querySelector('#download-pack').disabled);
    assert.equal(await page.locator('#pack-previews canvas, #pack-previews img').count()>0,true);await click('#close-pack');
    await click('#tab-content');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if(process.env.SHOPDESK_SCREENSHOTS)await page.screenshot({path:`.sites-runtime/variations-${width}.png`});
    assert.deepEqual(errors,[]);
  }finally{await browser?.close();await app.close();}
});

test('new palettes change the artwork in older designs and every flyer purpose',async()=>{
  const app=await startApp();let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.SHOPDESK_BROWSER_CHANNEL?{channel:process.env.SHOPDESK_BROWSER_CHANNEL}:{})});
    const page=await browser.newPage();await page.goto(app.url);await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);await page.evaluate(()=>document.fonts.ready);
    for(const template of ['retail','bold','market','boutique','menu','studio']){
      await page.locator(`[data-template="${template}"]`).click();await page.locator('[data-colour="sage"]').click();
      const before=await page.locator('#promo-canvas').evaluate(c=>c.toDataURL());await page.locator('[data-colour="aqua"]').click();
      assert.notEqual(await page.locator('#promo-canvas').evaluate(c=>c.toDataURL()),before,template+' should honour new colours');
    }
    for(const purpose of ['spotlight','event','opening']){
      await page.locator('#tab-content').click();await page.locator('#flyer-purpose').selectOption(purpose);await page.locator('#tab-style').click();
      await page.locator('[data-colour="sage"]').click();const before=await page.locator('#promo-canvas').evaluate(c=>c.toDataURL());await page.locator('[data-colour="aqua"]').click();
      assert.notEqual(await page.locator('#promo-canvas').evaluate(c=>c.toDataURL()),before,purpose+' should honour new colours');
    }
  }finally{await browser?.close();await app.close();}
});
