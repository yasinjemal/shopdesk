import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {launch} from './launch.mjs';
import {startApp} from '../../scripts/local-server.mjs';

// The open product database is answered here, in the process that runs the Worker: names and sizes only, never photos.
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{
  const u=new URL(String(url));if(u.hostname!=='world.openfoodfacts.org')return realFetch(url,init);
  const code=u.pathname.match(/product\/(\d+)/)?.[1];
  return new Response(JSON.stringify(code==='6001069000158'?{status:1,product:{code,product_name:'Super Maize Meal',quantity:'12.5 kg',brands:'Ace, Example'}}:{status:0}),{headers:{'Content-Type':'application/json'}});
};

for(const width of [320,1280])test(`products are added in one tap with sizes, illustrations, barcodes and pasted lists at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await launch();
    const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    const click=s=>width<700?page.locator(s).tap():page.locator(s).click();
    await page.goto(app.url+'#promotion');await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    await click('#tab-content');
    const items=()=>page.evaluate(()=>ShopDeskPromotion.itemState().items.map(i=>({name:i.name,size:i.size,price:i.price,icon:i.icon||'',section:i.section||'',photo:i.photo})));
    // 1. Type a word, tap a size chip.
    await page.locator('#quick-add-input').fill('mielie');
    await page.locator('.product-suggestion').first().waitFor();
    assert.equal(await page.locator('.product-suggestion-name').first().textContent(),'Maize meal');
    await page.getByRole('button',{name:'Maize meal 12.5 kg',exact:true}).click();
    let state=await items();assert.deepEqual(state[1],{name:'Maize meal',size:'12.5 kg',price:'',icon:'sack',section:'Pantry',photo:''});
    assert.equal(await page.locator('#quick-add-input').inputValue(),'');
    await page.waitForFunction(()=>document.activeElement?.type==='number');
    // 2. Type everything at once, including the price.
    await page.locator('#quick-add-input').fill('chicken braai pack 5kg R89.99');await page.keyboard.press('Enter');
    state=await items();assert.deepEqual(state[2],{name:'Chicken braai pack',size:'5 kg',price:'89.99',icon:'chicken',section:'Butchery',photo:''});
    // 3. Anything unknown is kept exactly as typed, with the parsed size and price.
    await page.locator('#quick-add-input').fill('Gogo’s special mix 2kg R20');await click('#quick-add-button');
    state=await items();assert.deepEqual(state[3],{name:'Gogo’s special mix',size:'2 kg',price:'20',icon:'',section:'',photo:''});
    // 4. Suggestions inside a product card fix a slip and fill the size.
    await page.evaluate(()=>{const card=document.querySelector('#promo-items > details[data-index="3"]');card.open=true;});
    const card=page.locator('#promo-items > details[data-index="3"]');
    await card.getByLabel('Product name').fill('sunflwer oil');await card.locator('.product-suggestion').first().waitFor();
    await card.getByRole('button',{name:'Sunflower oil 2 L',exact:true}).click();
    state=await items();assert.equal(state[3].name,'Sunflower oil');assert.equal(state[3].size,'2 L');assert.equal(state[3].icon,'bottle');assert.equal(state[3].price,'20');
    // 5. Illustrations draw on the flyer and can be changed or removed; a photo always wins.
    const withIcons=await page.locator('#promo-canvas').evaluate(c=>c.toDataURL());
    const firstCard=page.locator('#promo-items > details[data-index="0"]');await page.evaluate(()=>{document.querySelector('#promo-items > details[data-index="0"]').open=true;});
    await firstCard.getByRole('button',{name:'Choose an illustration'}).click();
    await page.locator('#illustration-dialog').waitFor();await page.getByRole('button',{name:'potato',exact:true}).click();
    state=await items();assert.equal(state[0].icon,'potato');
    const changed=await page.locator('#promo-canvas').evaluate(c=>c.toDataURL());assert.notEqual(changed,withIcons);
    await firstCard.getByRole('button',{name:'Change illustration'}).click();await click('#remove-illustration');
    state=await items();assert.equal(state[0].icon,'');
    const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=300;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,300,300);x.fillStyle='#1b7';x.fillRect(40,40,220,220);return c.toDataURL('image/png').split(',')[1];});
    await page.locator('[aria-label="Choose photo for item 2"]').setInputFiles({name:'maize.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
    await page.waitForFunction(()=>ShopDeskPromotion.itemState().items[1].photo);
    state=await items();assert.equal(state[1].icon,'sack');assert.ok(state[1].photo);
    // 6. Barcode lookup through the finder fills the name and size; unknown codes fall back to typing.
    await click('#quick-add-find');await page.locator('#finder-dialog[open]').waitFor();
    await page.locator('#finder-query').fill('6001069000158');await click('#finder-search-online');
    await page.getByText('Ace Super Maize Meal').waitFor();await page.locator('.finder-result-name',{hasText:'Ace Super Maize Meal'}).click();
    assert.equal(await page.locator('#finder-detail-title').textContent(),'Ace Super Maize Meal');assert.equal(await page.locator('#finder-size').inputValue(),'12.5 kg');
    assert.equal(await page.locator('#finder-photo-line').isHidden(),true,'no photo offered when the record has none');
    await click('#finder-add');await page.waitForFunction(()=>!document.querySelector('#finder-dialog').open);
    state=await items();assert.deepEqual(state[4],{name:'Ace Super Maize Meal',size:'12.5 kg',price:'',icon:'sack',section:'Pantry',photo:''});
    await click('#quick-add-find');await page.locator('#finder-query').fill('6009999999993');await click('#finder-search-online');
    await page.waitForFunction(()=>document.querySelector('#finder-status').textContent.includes('Nothing found online'));await click('#close-finder');
    // 7. Pasted lists pick up illustrations and departments without changing text.
    await click('#open-bulk');await page.locator('#bulk-source').fill('Washing powder, 2 kg, R69.99\nMystery item, 1 each, R5');await click('#review-bulk');await click('#apply-bulk');
    await page.waitForFunction(()=>!document.querySelector('#bulk-dialog').open);
    state=await items();assert.deepEqual(state[5],{name:'Washing powder',size:'2 kg',price:'69.99',icon:'box',section:'Household',photo:''});assert.equal(state[6].icon,'');assert.equal(state[6].name,'Mystery item');
    // 8. Everything persists and exports with the illustrations drawn.
    await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
    await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    const after=await items();assert.equal(after.length,7);assert.equal(after[2].icon,'chicken');assert.equal(after[1].icon,'sack');
    // Prices are never filled in for the person; add them before exporting.
    await page.evaluate(()=>{document.querySelectorAll('#promo-items > details').forEach(card=>{card.open=true;const input=card.querySelector('input[type="number"]');if(input&&!input.value){input.value='9.99';input.dispatchEvent(new Event('input',{bubbles:true}));}});});
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    const download=page.waitForEvent('download');await click('#download-promo');const file=await readFile(await (await download).path());
    assert.deepEqual(file.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  }finally{await browser?.close();await app.close();}
});
