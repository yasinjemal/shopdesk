import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {launch} from './launch.mjs';
import {startApp} from '../../scripts/local-server.mjs';

// The Worker runs inside this process, so its upstream calls land here. The
// open product database is answered by this stub; the browser never reaches
// it directly and every call it makes is recorded.
const realFetch=globalThis.fetch,upstream=[],mode={photoFail:false,searchFail:false};let jpegBytes=new Uint8Array([255,216,255,217]);
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const ace={code:'6001069000158',product_name:'Super Maize Meal',brands:'Ace',quantity:'12.5 kg',lang:'en',images:{1:{uploader:'thandi'},front_en:{rev:'7',imgid:'1'}}};
const iwisa={code:'6001275000010',product_name:'Maize Meal',brands:'Iwisa',quantity:'5 kg',lang:'en',images:{2:{uploader:'sipho'},front_en:{rev:'3',imgid:'2'}}};
const rice={code:'6009999999993',product_name:'Rice',brands:'Tastic',quantity:'',images:{}};
globalThis.fetch=async(url,init)=>{
  const u=new URL(String(url));
  if(u.hostname==='world.openfoodfacts.org'){
    upstream.push(u.href);if(mode.searchFail)return new Response('down',{status:503});
    if(u.pathname.startsWith('/api/v2/product/')){const code=u.pathname.match(/(\d+)\.json/)[1];return json(code==='6001069000158'?{status:1,product:ace}:{status:0});}
    const q=u.searchParams.get('search_terms')||'';
    if(q==='slow'){await new Promise(r=>setTimeout(r,900));return json({products:[{...rice,code:'4006381333931',product_name:'SLOW product',brands:''}]});}
    if(q==='fast')return json({products:[{...rice,code:'4006381333931',product_name:'FAST product',brands:''}]});
    return json({products:/maize|rice/.test(q)?[ace,iwisa,rice]:[]});
  }
  if(u.hostname==='images.openfoodfacts.org'){upstream.push(u.href);if(mode.photoFail)return new Response('',{status:503});return new Response(jpegBytes,{headers:{'Content-Type':'image/jpeg'}});}
  return realFetch(url,init);
};
const imageCalls=()=>upstream.filter(u=>u.includes('images.openfoodfacts.org')).length;
function pngText(file){const out=[];let offset=8;while(offset<file.length){const length=file.readUInt32BE(offset),type=file.toString('latin1',offset+4,offset+8);if(type==='tEXt'){const data=file.subarray(offset+8,offset+8+length),zero=data.indexOf(0);out.push([data.toString('latin1',0,zero),data.toString('latin1',zero+1)]);}offset+=12+length;}return out;}

for(const width of [320,390,1280])test(`find product & photo: local first, online on request, exact packs, photos with credits, replacement and combos at ${width}px`,async()=>{
  const app=await startApp();let browser;upstream.length=0;
  try{
    browser=await launch();
    const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700,extraHTTPHeaders:{'x-shopdesk-test-user':'finder-'+width}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    const click=s=>width<700?page.locator(s).tap():page.locator(s).click();
    const items=()=>page.evaluate(()=>ShopDeskPromotion.itemState().items);
    const saved=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
    const fillPrices=()=>page.evaluate(()=>{document.querySelectorAll('#promo-items > details').forEach(card=>{card.open=true;const input=card.querySelector('input[type="number"]');if(input&&!input.value){input.value='9.99';input.dispatchEvent(new Event('input',{bubbles:true}));}});});
    const dialogClosed=()=>page.waitForFunction(()=>!document.querySelector('#finder-dialog').open);
    const results=page.locator('#finder-results');
    const openFinder=async()=>{await click('#quick-add-find');await page.locator('#finder-dialog[open]').waitFor();};
    await page.goto(app.url+'#promotion');await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    jpegBytes=new Uint8Array(Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=400;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,400,400);x.fillStyle='#d35400';x.fillRect(60,40,280,320);return c.toDataURL('image/jpeg',.9).split(',')[1];}),'base64'));
    await click('#tab-content');
    // Flyers without catalogue photos export exactly as before: no credit metadata at all.
    await fillPrices();await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    let download=page.waitForEvent('download');await click('#download-promo');let file=await readFile(await (await download).path());
    assert.ok(!pngText(file).some(([k])=>k==='Comment'||k==='Copyright'));assert.ok(!file.toString('latin1').includes('Open Food Facts'));
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    const startCount=(await items()).length;
    // 1. Local results are instant and private; nothing goes online until asked.
    await openFinder();await page.locator('#finder-query').fill('maize meal 10kg');
    await results.getByRole('button',{name:'Maize meal 10 kg',exact:true}).waitFor();
    assert.ok((await page.locator('#finder-status').textContent()).includes('local match'));
    await page.waitForTimeout(500);assert.equal(upstream.length,0,'typing never calls the provider');
    await click('#finder-search-online');await page.locator('.finder-group h3',{hasText:'Online results'}).waitFor();
    assert.equal(upstream.length,1);assert.match(upstream[0],/^https:\/\/world\.openfoodfacts\.org\/cgi\/search\.pl\?/);
    // A 10 kg request never shows 5 kg or 12.5 kg records; unsized records stay available.
    assert.equal(await results.getByText('Iwisa Maize Meal').count(),0);assert.equal(await results.getByText('Ace Super Maize Meal').count(),0);
    await results.getByText('Tastic Rice').waitFor();assert.ok((await page.locator('.finder-result',{hasText:'Tastic Rice'}).textContent()).includes('Pack size not listed'));
    // 2. Pick an online product, choose the exact pack, add your price and the photo.
    await page.locator('#finder-query').fill('maize meal');assert.equal(await page.locator('.finder-group h3',{hasText:'Online results'}).count(),0);
    await click('#finder-search-online');await results.getByText('Ace Super Maize Meal').waitFor();
    assert.ok((await page.locator('.finder-result',{hasText:'Iwisa Maize Meal'}).textContent()).includes('Pack: 5 kg'));
    await page.locator('.finder-result',{hasText:'Ace Super Maize Meal'}).locator('.finder-result-name').click();
    await page.locator('#finder-detail:not([hidden])').waitFor();
    assert.equal(await page.locator('#finder-detail-title').textContent(),'Ace Super Maize Meal');
    assert.equal(await page.locator('#finder-sizes .size-chip[aria-pressed="true"]').textContent(),'12.5 kg');assert.equal(await page.locator('#finder-size').inputValue(),'12.5 kg');
    assert.equal(await page.locator('#finder-photo-line').isHidden(),false);assert.equal(await page.locator('#finder-photo').isChecked(),true);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'finder-price');
    assert.match(await page.locator('#finder-detail-meta').textContent(),/Photo by thandi/);
    await page.locator('#finder-price').fill('119.99');await click('#finder-add');await dialogClosed();
    let state=await items();let ace1=state.find(i=>i.name==='Ace Super Maize Meal');
    assert.equal(ace1.size,'12.5 kg');assert.equal(ace1.price,'119.99');assert.match(ace1.photo,/^[0-9a-f-]{36}$/);assert.equal(ace1.icon,undefined);
    assert.deepEqual(ace1.source,{provider:'off',code:'6001069000158',title:'Ace Super Maize Meal',author:'thandi',language:'en',revision:'7',url:'https://world.openfoodfacts.org/product/6001069000158'});
    assert.equal(imageCalls(),1);assert.match(upstream.at(-1),/^https:\/\/images\.openfoodfacts\.org\/images\/products\/600\/106\/900\/0158\/front_en\.7\.400\.jpg$/);
    await saved();
    const mine=await page.evaluate(()=>ShopDeskPromotion.itemState().products);assert.ok(mine.some(p=>p.name==='Ace Super Maize Meal'&&p.photo===ace1.photo&&p.source?.code==='6001069000158'),'remembered privately');
    // 3. Next time the private saved product comes first and reuses its photo.
    await openFinder();await page.locator('#finder-query').fill('ace');
    const firstGroup=page.locator('.finder-group').first();assert.equal(await firstGroup.locator('h3').textContent(),'Your saved products · private');
    assert.equal(await firstGroup.locator('.size-chip').first().textContent(),'12.5 kg · R119.99');
    await firstGroup.locator('.finder-result-name').first().click();await page.locator('#finder-detail:not([hidden])').waitFor();
    assert.equal(await page.locator('#finder-price').inputValue(),'119.99');assert.equal(await page.locator('#finder-remember').isChecked(),false);
    assert.match(await page.locator('#finder-photo-note').textContent(),/already saved/);
    await click('#finder-add');await dialogClosed();state=await items();
    assert.equal(state.filter(i=>i.photo===ace1.photo).length,2);assert.equal(imageCalls(),1,'saved photos are reused, not downloaded again');
    // 4. A failed photo download keeps the dialog open and offers a way through.
    mode.photoFail=true;await openFinder();await page.locator('#finder-query').fill('maize meal');await click('#finder-search-online');
    await page.locator('.finder-result',{hasText:'Iwisa Maize Meal'}).locator('.finder-result-name').click();await page.locator('#finder-price').fill('59.99');await click('#finder-add');
    await page.locator('#finder-error:not([hidden])').waitFor();assert.match(await page.locator('#finder-error').textContent(),/without a photo/);
    assert.equal(await page.locator('#finder-dialog').evaluate(d=>d.open),true);assert.equal(await page.locator('#finder-photo').isChecked(),false);assert.equal(await page.locator('#finder-add').isDisabled(),false);
    await click('#finder-add');await dialogClosed();state=await items();const iwisaItem=state.find(i=>i.name==='Iwisa Maize Meal');
    assert.equal(iwisaItem.size,'5 kg');assert.equal(iwisaItem.photo,'');assert.equal(iwisaItem.icon,'sack');assert.equal(iwisaItem.source,undefined);mode.photoFail=false;
    // 5. When the provider is down, local matches and manual entry still work.
    mode.searchFail=true;await openFinder();await page.locator('#finder-query').fill('rice');await click('#finder-search-online');
    await page.waitForFunction(()=>document.querySelector('#finder-status').classList.contains('validation'));assert.match(await page.locator('#finder-status').textContent(),/unavailable/);
    await results.getByRole('button',{name:'Rice 2 kg',exact:true}).click();await page.locator('#finder-price').fill('40');await click('#finder-add');await dialogClosed();
    state=await items();assert.ok(state.some(i=>i.name==='Rice'&&i.size==='2 kg'&&i.price==='40'&&i.icon==='sack'));mode.searchFail=false;
    // 6. A slow older search never overwrites a newer one.
    await openFinder();await page.locator('#finder-query').fill('slow');await click('#finder-search-online');
    await page.locator('#finder-query').fill('fast');await click('#finder-search-online');await results.getByText('FAST product').waitFor();
    await page.waitForTimeout(1200);assert.equal(await results.getByText('SLOW product').count(),0);assert.equal(await results.getByText('FAST product').count(),1);
    // 7. Barcodes are checked before anything is sent.
    const before=upstream.length;await page.locator('#finder-query').fill('6001069000159');assert.match(await page.locator('#finder-status').textContent(),/check digit/);
    await click('#finder-search-online');await page.waitForTimeout(300);assert.equal(upstream.length,before);
    await page.locator('#finder-query').fill('6001069000158');assert.match(await page.locator('#finder-status').textContent(),/looks like a barcode/);
    await click('#finder-search-online');await results.getByText('Ace Super Maize Meal').waitFor();assert.match(upstream.at(-1),/\/api\/v2\/product\/6001069000158\.json/);
    // 8. No match? Add it manually with the typed size and price.
    await page.locator('#finder-query').fill('Gogo special 2kg R20');await page.waitForFunction(()=>document.querySelector('#finder-status').textContent.includes('No local match'));
    await click('#finder-manual');await dialogClosed();state=await items();assert.ok(state.some(i=>i.name==='Gogo special'&&i.size==='2 kg'&&i.price==='20'));
    // 9. Wholesale case quantity is optional and draws as a case.
    const plain=await page.locator('#promo-canvas').evaluate(c=>c.toDataURL());
    await openFinder();await page.locator('#finder-query').fill('sunflower oil');await results.getByRole('button',{name:'Sunflower oil 2 L',exact:true}).click();
    await page.locator('.finder-advanced summary').click();await page.locator('#finder-case').fill('12');await page.locator('#finder-price').fill('699.99');await click('#finder-add');await dialogClosed();
    state=await items();const oil=state.find(i=>i.name==='Sunflower oil');assert.equal(oil.caseQuantity,12);assert.equal(oil.size,'2 L');
    assert.notEqual(await page.locator('#promo-canvas').evaluate(c=>c.toDataURL()),plain);
    // 10. Replacing an offer keeps its place and featured state.
    const first=page.locator('#promo-items > details[data-index="0"]');await page.evaluate(()=>{document.querySelector('#promo-items > details[data-index="0"]').open=true;});
    await first.locator('.feature-offer').click();assert.equal((await items())[0].featured,true);
    await first.locator('.find-product').click();await page.locator('#finder-dialog[open]').waitFor();assert.match(await page.locator('#finder-title').textContent(),/offer 1/);
    assert.equal(await page.locator('#finder-manual').textContent(),'Keep what you typed');
    await page.locator('#finder-query').fill('bread');await results.getByRole('button',{name:'Brown bread 700 g',exact:true}).click();
    assert.equal(await page.locator('#finder-add').textContent(),'Use for this item');await page.locator('#finder-price').fill('18.99');await click('#finder-add');await dialogClosed();
    const countBefore=state.length;state=await items();assert.equal(state.length,countBefore);assert.equal(state[0].name,'Brown bread');assert.equal(state[0].size,'700 g');assert.equal(state[0].featured,true);
    // 11. Exports carry credits in file metadata, captions and the pack, never on the flyer.
    await fillPrices();await saved();await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    download=page.waitForEvent('download');await click('#download-promo');file=await readFile(await (await download).path());
    const texts=pngText(file);const comment=texts.find(([k,v])=>k==='Comment'&&v.includes('6001069000158'));
    assert.ok(comment,'PNG tEXt credit');assert.match(comment[1],/Ace Super Maize Meal - Photo: thandi via Open Food Facts, CC BY-SA 3\.0, https:\/\/world\.openfoodfacts\.org\/product\/6001069000158 \(code 6001069000158, lang en, rev 7\)/);
    assert.ok(texts.some(([k,v])=>k==='Copyright'&&v.includes('CC BY-SA 3.0')));assert.equal(texts.filter(([k,v])=>k==='Comment'&&v.includes('6001069000158')).length,1,'one credit per photo');
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    await click('#tab-style');await click('label:has(input[value="a4"])');download=page.waitForEvent('download');await click('#download-print');file=await readFile(await (await download).path());
    const pdf=file.toString('latin1');assert.match(pdf,/\/Subject \(Photo credits: .*thandi via Open Food Facts/);assert.match(pdf,/\/Keywords \(Open Food Facts, CC BY-SA 3\.0\)/);assert.match(pdf,/\/Producer \(Handbill\)/);
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    const caption=await page.evaluate(()=>ShopDeskPack.caption({...ShopDeskPromotion.templateSnapshot(),shop:'x',items:ShopDeskPromotion.itemState().items}));
    assert.ok(caption.includes('Photo credits:')&&caption.includes('rev 7'));assert.ok(caption.indexOf('Photo credits:')>caption.indexOf('Ace Super Maize Meal'));
    await click('#create-pack-bottom');await page.waitForFunction(()=>!document.querySelector('#download-pack').disabled);
    assert.ok((await page.locator('#pack-caption-text').inputValue()).includes('Photo credits:'));
    download=page.waitForEvent('download');await click('#download-pack');file=await readFile(await (await download).path());
    assert.ok(file.toString('latin1').includes('caption.txt')&&file.toString('latin1').includes('Photo credits:'));await click('#close-pack');
    // 12. Everything survives a reload through the server's validation.
    const persisted=await items();await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    assert.deepEqual(await items(),persisted);
    // 13. In combo mode new products join the active combo; replacing keeps combo and pack count.
    await click('#tab-content');await page.locator('#flyer-purpose').selectOption('combos');await page.waitForFunction(()=>!document.querySelector('#combo-editor').hidden);
    await page.evaluate(()=>ShopDeskPromotion.selectCombo(1));
    await openFinder();assert.match(await page.locator('#finder-status').textContent(),/saved products/);
    await page.locator('#finder-query').fill('cooldrink');await results.getByRole('button',{name:'Soft drinks 2 L',exact:true}).click();
    assert.match(await page.locator('#finder-add').textContent(),/^Add to /);await page.locator('#finder-price').fill('19.99');await click('#finder-add');await dialogClosed();
    state=await items();const drink=state.findIndex(i=>i.name==='Soft drinks');assert.equal(state[drink].combo,1);
    const drinkCard=page.locator(`.promo-item[data-index="${drink}"]`);await page.evaluate(i=>{document.querySelector(`.promo-item[data-index="${i}"]`).open=true;},drink);
    await drinkCard.locator('[data-combo-quantity]').fill('3');await drinkCard.locator('[data-combo-quantity]').dispatchEvent('input');await page.waitForFunction(i=>ShopDeskPromotion.itemState().items[i].quantity===3,drink);
    await drinkCard.locator('.find-product').click();await page.locator('#finder-dialog[open]').waitFor();
    await page.locator('#finder-query').fill('milk');await results.getByRole('button',{name:'Full cream milk 1 L',exact:true}).click();await page.locator('#finder-price').fill('21.99');await click('#finder-add');await dialogClosed();
    state=await items();assert.equal(state[drink].name,'Full cream milk');assert.equal(state[drink].combo,1);assert.equal(state[drink].quantity,3);
    await saved();
    await mkdir('.sites-runtime',{recursive:true});await openFinder();await page.locator('#finder-query').fill('maize meal');await click('#finder-search-online');await results.getByText('Ace Super Maize Meal').first().waitFor();
    await page.screenshot({path:`.sites-runtime/finder-${width}.png`,animations:'disabled'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('#finder-dialog').evaluate(d=>d.scrollWidth>d.clientWidth),false);
    await click('#close-finder');assert.deepEqual(errors,[]);
  }finally{await browser?.close();await app.close();}
});
