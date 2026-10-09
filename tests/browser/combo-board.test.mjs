import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {launch} from './launch.mjs';
import {startApp} from '../../scripts/local-server.mjs';

for(const width of [320,1280])test(`basket board supports touch quantities, reuse, independent variations and targeted bulk additions at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await launch();
    const page=await browser.newPage({viewport:{width,height:1000},isMobile:width<700,hasTouch:width<700});page.setDefaultTimeout(10000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));const click=async s=>width<700?page.locator(s).tap():page.locator(s).click();
    const panel='.combo-control:not([hidden])',card=panel+' .promo-item';
    await page.goto(app.url+'#promotion',{timeout:30000});await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);await click('#tab-content');
    await page.locator('#promo-items .promo-item input[type=text]').first().fill('Long grain rice');await page.locator('#promo-items .promo-item').getByLabel('Pack / quantity',{exact:true}).fill('5 kg');
    await click('#promo-items .save-product');
    await page.locator('#flyer-purpose').selectOption('combos');await click(panel+' .combo-name-ideas > summary');await page.getByRole('button',{name:'Family pantry',exact:true}).click();await page.locator(panel+' .combo-price').fill('149.99');
    await page.locator(card+' .item-heading').click();assert.equal(await page.locator(card).getAttribute('open'),null);
    await click(card+' .quantity-step[data-quantity-step="1"]');assert.equal(await page.locator(card).getAttribute('open'),null);assert.equal(await page.locator(card+' [data-combo-quantity]').inputValue(),'2');
    await click(card+' .quantity-step[data-quantity-step="-1"]');assert.equal(await page.locator(card+' [data-combo-quantity]').inputValue(),'1');assert.ok(await page.locator(card+' .quantity-step[data-quantity-step="-1"]').isDisabled());
    // Clone a real uploaded photo so duplication and reuse exercise both editor and R2 references.
    await click(card+' .item-heading');
    const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=600;const g=c.getContext('2d');g.fillStyle='#eedca8';g.fillRect(30,10,340,570);g.fillStyle='#17633f';g.fillRect(30,180,340,230);g.fillStyle='white';g.font='bold 52px sans-serif';g.fillText('RICE',120,315);return c.toDataURL().split(',')[1];});
    await page.locator(card+' input[type=file]').setInputFiles({name:'rice.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    await click(panel+' .duplicate-combo');assert.equal(await page.locator(panel+' .combo-name').inputValue(),'Family pantry (copy)');
    await page.locator(panel+' .combo-name').fill('Weekend pantry');await page.locator(panel+' .combo-price').fill('129.99');await click(card+' .quantity-step[data-quantity-step="1"]');
    let state=await page.evaluate(()=>ShopDeskPromotion.templateSnapshot());assert.equal(state.combos[0].name,'Family pantry');assert.equal(state.combos[0].price,'149.99');assert.equal(state.items[0].quantity,1);assert.equal(state.items[1].quantity,2);assert.equal(state.items[0].photo,state.items[1].photo);
    await click(panel+' .reuse-combo-product');await page.locator('#combo-product-search').fill('rice');assert.equal(await page.locator('.combo-reuse-choice').count(),3);await page.locator('.combo-reuse-choice').first().click();
    // The first matching result is an on-flyer copy; add only that row.
    assert.match(await page.locator('#combo-product-feedback').innerText(),/added to Weekend pantry/);await click('#close-combo-products');
    state=await page.evaluate(()=>ShopDeskPromotion.templateSnapshot());assert.equal(state.itemCount,3);assert.equal(state.items[2].combo,4);assert.equal(state.items[2].photo,state.items[0].photo);
    await click(panel+' .add-combo-product');await page.locator(card+'[data-index="3"] input[type=text]').first().fill('Sugar');await page.locator(card+'[data-index="3"]').getByLabel('Pack / quantity',{exact:true}).fill('2 kg');
    await page.locator(card+'[data-index="3"] .combo-assignment').selectOption('1');assert.equal(await page.locator('[data-combo-choice="1"]').getAttribute('aria-pressed'),'true');
    await page.locator(panel+' .combo-price').fill('49.99');
    await click('#product-tools > summary');await click('#open-bulk');await page.locator('#bulk-source').fill('Cooking oil | 2 L | 45.99');await click('#review-bulk');await click('#apply-bulk');
    state=await page.evaluate(()=>ShopDeskPromotion.templateSnapshot());assert.equal(state.items[4].combo,1);assert.equal(state.items[4].name,'Cooking oil');assert.equal(state.items[4].price,'45.99');
    await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);await click('#tab-content');
    state=await page.evaluate(()=>ShopDeskPromotion.templateSnapshot());assert.equal(state.combos[4].name,'Weekend pantry');assert.equal(state.combos[4].price,'129.99');assert.equal(state.items[1].quantity,2);assert.equal(state.items[4].combo,1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
    await click('[data-combo-choice="4"]');for(const product of await page.locator(panel+' .promo-item[open]').all())await product.locator('.item-heading').click();
    await mkdir('.sites-runtime',{recursive:true});await page.locator('#combo-editor').scrollIntoViewIfNeeded();await page.screenshot({path:'.sites-runtime/combo-board-editor-'+width+'.png',animations:'disabled'});
  }finally{await browser?.close();await app.close();}
});
