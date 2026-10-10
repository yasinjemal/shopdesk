import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {launch} from './launch.mjs';
import {startApp} from '../../scripts/local-server.mjs';

const designs=['leaflet','megadeal','freshmarket','premiumdeli'];
for(const width of [320,1280])test(`customise controls change every design, persist, reset and export at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await launch();
    const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    const click=s=>width<700?page.locator(s).tap():page.locator(s).click();
    const canvas=()=>page.locator('#promo-canvas').evaluate(c=>c.toDataURL());
    const saved=async()=>{await page.waitForFunction(()=>['All changes saved','Changes not saved'].includes(document.querySelector('#save-status').textContent));assert.equal(await page.locator('#save-status').textContent(),'All changes saved',await page.locator('#workspace-error').textContent());};
    await page.goto(app.url);await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    // A starter opens with the richer defaults already applied.
    await page.getByRole('button',{name:'Use Supermarket leaflet',exact:true}).click();
    await page.waitForFunction(()=>ShopDeskApp.page()==='promotion'&&document.querySelector('#save-status').textContent==='All changes saved');
    assert.equal(await page.locator('#poster-template').inputValue(),'leaflet');await click('#tab-style');
    assert.equal(await page.locator('#backdrop').inputValue(),'gradient');assert.equal(await page.locator('#card-style').inputValue(),'shadow');assert.equal(await page.locator('#price-size').inputValue(),'large');assert.equal(await page.locator('#auto-save-badge').isChecked(),true);assert.equal(await page.locator('#headline-case').inputValue(),'upper');
    // Give the first offer a real photo so photo shapes have something to clip, and names so the flyer can export.
    await click('#tab-content');
    const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=400;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,400,400);x.fillStyle='#2a7';x.fillRect(30,30,340,340);return c.toDataURL('image/png').split(',')[1];});
    await page.locator('[aria-label="Choose photo for item 1"]').setInputFiles({name:'item.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
    await page.waitForFunction(()=>ShopDeskPromotion.itemState().ready&&ShopDeskPromotion.itemState().items[0].photo);
    await page.evaluate(()=>{document.querySelectorAll('#promo-items > details').forEach((card,i)=>{card.open=true;for(const input of card.querySelectorAll('input[type="text"],input[type="number"]'))if(!input.value&&!input.closest('.offer-options')){input.value=input.type==='number'?'9.99':'Item '+(i+1);input.dispatchEvent(new Event('input',{bubbles:true}));}});});
    await saved();await click('#tab-style');
    // Each control changes the artwork.
    let previous=await canvas();
    for(const [id,value] of [['backdrop','dots'],['card-style','outline'],['photo-shape','circle'],['price-size','huge'],['headline-case','design']]){
      await page.locator('#'+id).selectOption(value);await page.waitForFunction(()=>document.querySelector('#save-status').textContent!=='All changes saved');
      const next=await canvas();assert.notEqual(next,previous,id+' changes the flyer');previous=next;
    }
    // Brand colours start from the chosen palette and then follow the pickers.
    await click('#use-custom-colours');assert.equal(await page.locator('#colour-inputs').isHidden(),false);
    assert.equal(await page.locator('#colour-brand').inputValue(),'#b7261b');
    await page.locator('#colour-brand').evaluate(input=>{input.value='#1d3f8f';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await saved();const blue=await canvas();assert.notEqual(blue,previous);previous=blue;
    // A badge typed on an offer and an automatic saving badge both draw; the saving needs a genuine previous price.
    await click('#tab-content');const first=page.locator('#promo-items > details').first();await page.evaluate(()=>{document.querySelector('#promo-items > details').open=true;});
    if(!await first.locator('.offer-options').evaluate(d=>d.open))await first.locator('.offer-options summary').click();
    await first.getByLabel('Badge (optional)').fill('BEST BUY');await saved();const badged=await canvas();assert.notEqual(badged,previous);previous=badged;
    await click('#tab-style');await page.locator('#badge-style').selectOption('pill');await saved();assert.notEqual(await canvas(),previous,'badge style changes the sticker');previous=await canvas();await click('#tab-content');
    await first.getByLabel('Previous price (optional)').fill('999.99');await saved();assert.notEqual(await canvas(),previous);previous=await canvas();
    // Everything survives a reload through the Worker's validation.
    await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    assert.deepEqual(await page.evaluate(()=>{const s=ShopDeskPromotion.templateSnapshot();return [s.backdrop,s.cardStyle,s.photoShape,s.priceSize,s.headlineCase,s.badgeStyle,s.autoSave,s.colours,ShopDeskPromotion.itemState().items[0].badge];}),['dots','outline','circle','huge',undefined,'pill',true,{brand:'#1d3f8f',accent:'#ffd23f',paper:'#fff7ee'},'BEST BUY']);
    assert.equal(await canvas(),previous,'the reloaded flyer is pixel-identical');
    // Every new design renders with the finishes and exports.
    await click('#tab-style');const seen=new Set();
    for(const template of designs){await click(`[data-template="${template}"]`);assert.equal(await page.locator('#poster-template').inputValue(),template);seen.add(await canvas());await saved();}
    assert.equal(seen.size,designs.length);
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    const download=page.waitForEvent('download');await click('#download-promo');const file=await readFile(await (await download).path());
    assert.deepEqual(file.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    // The reset link returns the design's original look, including the finishes.
    await click('#reset-design-finishes');await saved();
    assert.deepEqual(await page.evaluate(()=>{const s=ShopDeskPromotion.templateSnapshot();return [s.backdrop,s.cardStyle,s.priceSize,s.autoSave,s.colours,Object.keys(s).some(k=>['backdrop','cardStyle','photoShape','headlineCase','priceSize','badgeStyle','autoSave','colours'].includes(k))];}),[undefined,undefined,undefined,undefined,undefined,false],'defaults are not stored');
    await mkdir('.sites-runtime',{recursive:true});await page.screenshot({path:`.sites-runtime/customise-${width}.png`,animations:'disabled'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  }finally{await browser?.close();await app.close();}
});
