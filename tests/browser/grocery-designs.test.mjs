import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {launch} from './launch.mjs';
import {startApp} from '../../scripts/local-server.mjs';

const styles=['weekend','butcher','bakery','household','bigprice','cashcarry','crate','tagsale'];
for(const width of [320,1280])test(`grocery designs respond, save, export and keep photos at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await launch();
    const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    const click=s=>width<700?page.locator(s).tap():page.locator(s).click();
    await page.goto(app.url);await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    await page.getByRole('button',{name:'Use Weekend burst specials',exact:true}).click();
    await page.waitForFunction(()=>ShopDeskApp.page()==='promotion'&&document.querySelector('#save-status').textContent==='All changes saved');
    assert.equal(await page.locator('#poster-template').inputValue(),'weekend');
    assert.equal(await page.locator('#promo-headline').inputValue(),'Your weekend shop, sorted.');
    await click('#open-bulk');
    await page.locator('#bulk-source').fill('Chicken braai pack, 2 kg, R89.99\nBoerewors, Per kg, R109.99\nCharcoal, 4 kg, R59.99\nSoft drinks, 2 L, R19.99\nRolls, 6 pack, R14.99\nIce cream, 2 L, R49.99');
    await click('#review-bulk');await click('#apply-bulk');await page.waitForFunction(()=>!document.querySelector('#bulk-dialog').open);
    const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=600;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,600,600);x.fillStyle='#c0392b';x.beginPath();x.arc(300,300,220,0,Math.PI*2);x.fill();return c.toDataURL('image/png').split(',')[1];});
    await page.locator('[aria-label="Choose photo for item 1"]').setInputFiles({name:'braai.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
    await page.waitForFunction(()=>ShopDeskPromotion.itemState().ready&&ShopDeskPromotion.itemState().items[0].photo);
    const before=await page.evaluate(()=>ShopDeskPromotion.itemState().items);
    await click('#tab-style');const images=[];
    for(const template of styles){
      await click(`[data-template="${template}"]`);assert.equal(await page.locator('#poster-template').inputValue(),template);
      images.push(await page.locator('#promo-canvas').evaluate(c=>c.toDataURL()));
      await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
    }
    assert.equal(new Set(images).size,styles.length);
    await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    assert.equal(await page.locator('#poster-template').inputValue(),'tagsale');assert.deepEqual(await page.evaluate(()=>ShopDeskPromotion.itemState().items),before);
    assert.equal(await page.locator('#flyer-promotion').inputValue(),'weekend');
    // A coordinated look sets palette, typeface and price labels together and stays editable.
    await click('[data-look="market"]');
    assert.equal(await page.locator('#promo-theme').inputValue(),'mint');assert.equal(await page.locator('#poster-typeface').inputValue(),'geometric');assert.equal(await page.locator('#price-style').inputValue(),'pill');
    assert.equal(await page.locator('[data-look="market"]').getAttribute('aria-pressed'),'true');
    await page.locator('#price-style').selectOption('solid');assert.equal(await page.locator('[data-look="market"]').getAttribute('aria-pressed'),'false');
    await page.locator('#export-quality').selectOption('4k');
    await click('label:has(input[value="landscape"])');let download=page.waitForEvent('download');await click('#download-promo');let file=await readFile(await (await download).path());assert.equal(file.readUInt32BE(16),3840);assert.equal(file.readUInt32BE(20),2160);
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    await click('label:has(input[value="a5"])');download=page.waitForEvent('download');await click('#download-print');file=await readFile(await (await download).path());assert.match(file.toString('latin1'),/^%PDF-1.4/);assert.match(file.toString('latin1'),/MediaBox \[0 0 419\.5276 595\.2756\]/);
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    await click('label:has(input[value="status"])');await page.locator('#export-quality').selectOption('standard');
    await click('#create-pack-bottom');await page.waitForFunction(()=>!document.querySelector('#download-pack').disabled);
    assert.equal(await page.locator('#pack-previews img').count(),3);await click('#close-pack');
    // Step buttons keep an obvious next action and the download step reflects readiness.
    await click('#editor-style [data-next-step="content"]');assert.equal(await page.locator('#tab-content').getAttribute('aria-selected'),'true');
    await click('#editor-content [data-next-step="business"]');assert.equal(await page.locator('#editor-business').isHidden(),false);
    assert.equal(await page.locator('#step-download').evaluate(el=>el.classList.contains('is-ready')),true);
    await click('#step-finish');await page.waitForFunction(()=>document.querySelector('#step-download').classList.contains('is-active'));
    await mkdir('.sites-runtime',{recursive:true});await page.screenshot({path:`.sites-runtime/grocery-editor-${width}.png`,animations:'disabled'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  }finally{await browser?.close();await app.close();}
});

test('grocery designs keep every card inside the page for all shapes, counts and purposes',async()=>{
  const app=await startApp();let browser;
  try{
    browser=await launch();const page=await browser.newPage();await page.goto(app.url+'#promotion');
    await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    const result=await page.evaluate(async(styles)=>{
      await document.fonts.ready;const problems=[],hashes=new Set();
      const image=document.createElement('canvas');image.width=300;image.height=300;const g=image.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,300,300);g.fillStyle='#2a7';g.fillRect(40,40,220,220);
      for(const template of styles)for(const format of Object.keys(ShopDeskPoster.formats))for(const count of [1,3,6,12,25])for(const featured of [false,true]){
        const items=ShopDeskSamples.items('grocery','weekly',count).map((item,i)=>({...item,photo:i%2?'p':'',...(i===1?{dealQuantity:3}:{}),...(featured&&i===0&&count>1?{featured:true}:{})}));
        const data={template,theme:ShopDeskPoster.collection[template].theme,format,purpose:count===1&&template==='bigprice'?'spotlight':'offers',business:'grocery',shop:'Test grocer',headline:'A very long headline that must wrap neatly across two lines without ever leaving the page',eyebrow:'WEEKLY SPECIALS',showDate:true,dateText:'16 October 2026',phone:'072 123 4567',location:'Main Road',cta:'Order on WhatsApp',terms:'While stocks last.',details:'Details for a single product.',items,itemCount:count};
        const canvas=document.createElement('canvas');let layout;
        try{layout=ShopDeskPoster.draw(canvas,data,new Map([['p',image]]));}catch(e){problems.push(template+' '+format+' '+count+': '+e.message);continue;}
        const f=ShopDeskPoster.formats[format];
        if(layout.cards.length!==count)problems.push(template+' '+format+' '+count+' cards');
        for(const [i,c] of layout.cards.entries()){
          if(!(c.w>90&&c.h>60&&c.x>=39.99&&c.x+c.w<=f.width-39.99&&c.y>=layout.top-.01&&c.y+c.h<=layout.bottom+.01))problems.push(template+' '+format+' '+count+' bounds '+i);
          for(const o of layout.cards.slice(i+1))if(!(c.x+c.w<=o.x+.01||o.x+o.w<=c.x+.01||c.y+c.h<=o.y+.01||o.y+o.h<=c.y+.01))problems.push(template+' '+format+' '+count+' overlap');
        }
        if(format==='poster'&&count===6&&!featured)hashes.add(canvas.toDataURL().length+':'+template);
      }
      return {problems,distinct:hashes.size};
    },styles);
    assert.deepEqual(result.problems,[]);assert.equal(result.distinct,styles.length);
  }finally{await browser?.close();await app.close();}
});
