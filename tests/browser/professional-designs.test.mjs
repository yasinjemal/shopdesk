import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startApp} from '../../scripts/local-server.mjs';

const styles=['gazette','harvest','ledger','midnight','diagonal'];
for(const width of [320,1280])test(`professional designs respond, save and export at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await chromium.launch({headless:true,channel:process.env.SHOPDESK_BROWSER_CHANNEL||'chrome'});
    const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    const click=s=>width<700?page.locator(s).tap():page.locator(s).click();
    await page.goto(app.url);await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    await click('#tab-content');await click('#open-bulk');
    await page.locator('#bulk-source').fill('Sugar beans, 1 kg, R29.99\nLong grain rice, 10 kg, R119.99\nCake flour, 2 kg, R34.99\nCooking oil, 5 L, R129.99\nRolled oats, 1 kg, R44.99\nTea selection, 100 bags, R39.99');
    await click('#review-bulk');await click('#apply-bulk');await page.waitForFunction(()=>!document.querySelector('#bulk-dialog').open);
    await page.locator('#product-count').selectOption('6');
    const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=800;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,600,800);x.fillStyle='#bc6335';x.fillRect(80,20,440,740);x.fillStyle='#133e32';x.fillRect(80,200,440,380);x.fillStyle='white';x.font='bold 60px sans-serif';x.fillText('PANTRY',150,355);x.font='50px sans-serif';x.fillText('Beans',215,440);return c.toDataURL().split(',')[1];});
    await page.locator('[aria-label="Choose photo for item 1"]').setInputFiles({name:'beans.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
    await page.waitForFunction(()=>ShopDeskPromotion.itemState().ready&&ShopDeskPromotion.itemState().items[0].photo);
    const card=page.locator('#promo-items > details').first();if(!await card.evaluate(c=>c.open))await card.locator('summary').click();
    await card.locator('.offer-options summary').click();await card.locator('.deal-quantity').selectOption('2');
    const before=await page.evaluate(()=>ShopDeskPromotion.itemState().items);
    await click('#tab-style');const images=[];
    for(const template of styles){
      await click(`[data-template="${template}"]`);assert.equal(await page.locator('#poster-template').inputValue(),template);
      assert.equal(await page.locator(`[data-template="${template}"]`).getAttribute('aria-pressed'),'true');
      images.push(await page.locator('#promo-canvas').evaluate(c=>c.toDataURL()));
      await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
      await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
      assert.equal(await page.locator('#poster-template').inputValue(),template);assert.deepEqual(await page.evaluate(()=>ShopDeskPromotion.itemState().items),before);
    }
    assert.equal(new Set(images).size,5);
    await page.locator('#keep-colours').check();await click('[data-colour="aqua"]');await click('[data-template="gazette"]');assert.equal(await page.locator('#promo-theme').inputValue(),'aqua');
    await page.locator('#poster-typeface').selectOption('geometric');await page.locator('#price-style').selectOption('pill');
    await page.locator('#export-quality').selectOption('4k');
    await click('label:has(input[value="square"])');let download=page.waitForEvent('download');await click('#download-promo');let file=await readFile(await (await download).path());assert.equal(file.readUInt32BE(16),3840);assert.equal(file.readUInt32BE(20),3840);
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    await click('label:has(input[value="a4"])');download=page.waitForEvent('download');await click('#download-print');file=await readFile(await (await download).path());assert.match(file.toString('latin1'),/^%PDF-1.4/);
    await page.waitForFunction(()=>!document.querySelector('#download-promo').disabled);
    await click('#create-pack-bottom');await page.waitForFunction(()=>!document.querySelector('#download-pack').disabled);assert.ok(await page.locator('#pack-previews canvas, #pack-previews img').count()>0);await click('#close-pack');
    await click('label:has(input[value="poster"])');await page.locator('#export-quality').selectOption('standard');
    await mkdir('.sites-runtime',{recursive:true});await page.locator('#template-gallery').scrollIntoViewIfNeeded();await page.screenshot({path:`.sites-runtime/professional-editor-${width}.png`,animations:'disabled'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  }finally{await browser?.close();await app.close();}
});

test('five professional styles remain distinct in the same colour and render dense and featured shapes',async()=>{
  const app=await startApp();let browser;
  try{
    browser=await chromium.launch({headless:true,channel:process.env.SHOPDESK_BROWSER_CHANNEL||'chrome'});const page=await browser.newPage();await page.goto(app.url);
    await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    const result=await page.evaluate(async(styles)=>{
      await document.fonts.ready;
      const names=['Sugar beans','Pantry rice','Family flour','Cooking oil','Breakfast oats','Tea selection'];
      const images=new Map(names.map((name,i)=>{const c=document.createElement('canvas');c.width=160;c.height=240;const g=c.getContext('2d');g.fillStyle='white';g.fillRect(0,0,160,240);g.fillStyle=['#a44824','#b7ae63','#bb414c','#dfb53b','#416e44','#356c86'][i];g.fillRect(24,8,112,224);g.fillStyle='#ffffed';g.fillRect(24,68,112,84);g.fillStyle='#26352d';g.font='bold 21px sans-serif';g.fillText(['BEANS','RICE','FLOUR','OIL','OATS','TEA'][i],32,116);return [name,c];}));
      const logo=document.createElement('canvas');logo.width=240;logo.height=120;const g=logo.getContext('2d');g.fillStyle='#153b2e';g.fillRect(0,0,240,120);g.fillStyle='white';g.font='bold 42px sans-serif';g.fillText('LOCAL',35,75);images.set('logo',logo);
      const base={shop:'Neighbourhood Market',logo:'logo',business:'grocery',purpose:'offers',headline:'Good food. Everyday value.',eyebrow:'YOUR LOCAL GROCERY',cta:'Contact us to order',terms:'While stocks last.',phone:'072 123 4567',location:'12 Market Street',showDate:false};
      const issues=[],hashes=[];const sheet=document.createElement('canvas');sheet.width=1800;sheet.height=510;const ctx=sheet.getContext('2d');ctx.fillStyle='#e7eeeb';ctx.fillRect(0,0,1800,510);
      for(const [j,template] of styles.entries()){
        for(const format of Object.keys(ShopDeskPoster.formats))for(const n of [1,6,25])for(const featured of [false,true]){
          const data={...base,template,format,theme:ShopDeskPoster.collection[template].theme,items:Array.from({length:n},(_,i)=>({name:names[i%6],size:'1 kg',price:String(29+i*5)+'.99',photo:names[i%6],...(i===0?{dealQuantity:2}:{}),...(featured&&i===n-1?{featured:true}:{})}))};
          const c=document.createElement('canvas'),drawing=c.getContext('2d'),photos=[],labels=[];
          const drawImage=drawing.drawImage.bind(drawing),fillText=drawing.fillText.bind(drawing);
          drawing.drawImage=(image,...args)=>{if(image!==logo)photos.push(args.slice(-4));drawImage(image,...args);};
          drawing.fillText=(text,x,y,maxWidth)=>{const m=drawing.measureText(text);labels.push({text,x,y,top:y-m.actualBoundingBoxAscent,bottom:y+m.actualBoundingBoxDescent,w:Math.min(maxWidth,m.width)});fillText(text,x,y,maxWidth);};
          const l=ShopDeskPoster.draw(c,data,images,{width:480,height:Math.round(480*ShopDeskPoster.formats[format].height/ShopDeskPoster.formats[format].width)});
          if(l.cards.length!==n||l.cards.some(b=>b.w<=0||b.h<=0))issues.push(template+' '+format+' '+n);
          for(const card of l.cards){
            const inside=labels.filter(b=>b.x>=card.x&&b.x<card.x+card.w&&b.y>=card.y&&b.y<=card.y+card.h);
            for(const [i,a] of inside.entries())for(const b of inside.slice(i+1))if(a.x<b.x+b.w-1&&a.x+a.w>b.x+1&&a.top<b.bottom-1&&a.bottom>b.top+1)issues.push(template+' '+format+' '+n+' labels overlap: '+a.text+' / '+b.text);
          }
          for(const [x,y,w,h] of photos){
            const card=l.cards.find(b=>x>=b.x-.01&&y>=b.y-.01&&x+w<=b.x+b.w+.01&&y+h<=b.y+b.h+.01);
            if(!card)issues.push(template+' '+format+' '+n+' photo escaped its panel');
            for(const label of labels)if(label.x<x+w-1&&label.x+label.w>x+1&&label.top<y+h-1&&label.bottom>y+1)issues.push(template+' '+format+' '+n+' photo overlaps '+label.text);
          }
          if(format==='poster'&&n===6&&!featured){const y=46;ctx.drawImage(c,j*360+10,y,340,425);ctx.fillStyle='#173b31';ctx.font='bold 18px sans-serif';ctx.fillText(ShopDeskPoster.collection[template].name,j*360+10,29);}
          if(format==='poster'&&n===6&&!featured){data.theme='red';ShopDeskPoster.draw(c,data,images,{width:360,height:450});hashes.push(c.toDataURL());}
          c.width=c.height=1;
        }
      }
      return {issues,distinct:new Set(hashes).size,sheet:sheet.toDataURL().split(',')[1]};
    },styles);
    assert.deepEqual(result.issues,[]);assert.equal(result.distinct,5);
    await mkdir('.sites-runtime',{recursive:true});await writeFile('.sites-runtime/professional-design-sheet.png',Buffer.from(result.sheet,'base64'));
  }finally{await browser?.close();await app.close();}
});
