import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startApp} from '../../scripts/local-server.mjs';

for(const width of [320,1280])test(`crafted copy, logo sizing and new styles work at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.SHOPDESK_BROWSER_CHANNEL?{channel:process.env.SHOPDESK_BROWSER_CHANNEL}:{})});
    const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700});page.setDefaultTimeout(10000);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));const click=s=>width<700?page.locator(s).tap():page.locator(s).click();
    await page.goto(app.url,{timeout:30000});await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    await click('#tab-content');await page.locator('#promo-headline').fill('My own headline');await page.locator('#promo-terms').fill('My own footer');
    const items=await page.evaluate(()=>ShopDeskPromotion.itemState().items);
    await click('#open-wording');assert.match(await page.locator('#wording-context').innerText(),/Grocery/);
    assert.equal(await page.locator('#wording-options article').count(),4);
    await page.getByRole('button',{name:'Use headline',exact:true}).click();
    assert.equal(await page.locator('#promo-headline').inputValue(),'Good things for your everyday.');assert.equal(await page.locator('#promo-terms').inputValue(),'My own footer');
    await click('#undo-wording');assert.equal(await page.locator('#promo-headline').inputValue(),'My own headline');
    await page.locator('#wording-tone').selectOption('bold');await click('#apply-wording-set');
    assert.equal(await page.locator('#promo-headline').inputValue(),'Fill your basket. Find your favourites.');
    assert.equal(await page.locator('#promo-terms').inputValue(),'Check pack sizes and prices before ordering.');
    await click('#undo-wording');assert.equal(await page.locator('#promo-headline').inputValue(),'My own headline');assert.equal(await page.locator('#promo-terms').inputValue(),'My own footer');
    assert.ok(await page.locator('#wording-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    if(process.env.SHOPDESK_VISUALS){await mkdir('.sites-runtime',{recursive:true});await page.locator('#wording-tone').selectOption('friendly');await page.locator('#wording-dialog').evaluate(el=>el.scrollTop=0);await page.screenshot({path:'.sites-runtime/wording-'+width+'.png',animations:'disabled'});}
    await click('#close-wording');await click('#tab-business');await page.locator('#business-type').selectOption('beauty');await click('#tab-content');
    assert.equal(await page.locator('#promo-headline').inputValue(),'My own headline');
    await click('#open-footer-wording');assert.match(await page.locator('#wording-context').innerText(),/Salon/);await click('#apply-wording-set');await click('#close-wording');
    assert.equal(await page.locator('#promo-cta').inputValue(),'Ask about appointments');
    await page.locator('#flyer-purpose').selectOption('event');await click('#open-wording');assert.match(await page.locator('#wording-context').innerText(),/Event invitation/);await click('#apply-wording-set');await click('#close-wording');
    assert.equal(await page.locator('#promo-headline').inputValue(),'You are invited. Come join us.');assert.match(await page.locator('#promo-terms').inputValue(),/venue/);
    await page.locator('#flyer-purpose').selectOption('offers');
    assert.deepEqual(await page.evaluate(()=>ShopDeskPromotion.itemState().items),items);
    await click('#tab-business');
    const logo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#b22164';ctx.fillRect(0,0,300,160);ctx.fillStyle='white';ctx.font='bold 68px sans-serif';ctx.fillText('LOCAL',25,106);return c.toDataURL().split(',')[1];});
    await page.locator('#logo-file').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from(logo,'base64')});
    await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled&&document.querySelector('#logo-thumb img')?.naturalWidth>0);
    const large=await page.locator('#promo-canvas').evaluate(el=>el.toDataURL());await page.locator('#logo-size').selectOption('compact');
    assert.notEqual(await page.locator('#promo-canvas').evaluate(el=>el.toDataURL()),large);
    await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    assert.equal(await page.locator('#logo-size').inputValue(),'compact');assert.equal(await page.locator('#promo-headline').inputValue(),'You are invited. Come join us.');
    for(const design of ['arc','ticket','terrace']){
      await click(`[data-template="${design}"]`);assert.equal(await page.locator('#poster-template').inputValue(),design);
      const previous=await page.locator('#promo-canvas').evaluate(el=>el.toDataURL());await click('[data-colour="petrol"]');assert.notEqual(await page.locator('#promo-canvas').evaluate(el=>el.toDataURL()),previous);
    }
    for(const colour of ['tangerine','raspberry','olive','indigo','cocoa']){await click(`[data-colour="${colour}"]`);assert.equal(await page.locator('#promo-theme').inputValue(),colour);}
    await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');await page.reload();await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    assert.equal(await page.locator('#poster-template').inputValue(),'terrace');assert.equal(await page.locator('#promo-theme').inputValue(),'cocoa');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  }finally{await browser?.close();await app.close();}
});

test('larger logos fit every design and new artwork renders in every shape',async()=>{
  const app=await startApp();let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.SHOPDESK_BROWSER_CHANNEL?{channel:process.env.SHOPDESK_BROWSER_CHANNEL}:{})});
    const page=await browser.newPage();await page.goto(app.url,{timeout:30000});await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    const result=await page.evaluate(async()=>{
      await document.fonts.ready;
      const logo=document.createElement('canvas');logo.width=300;logo.height=180;const g=logo.getContext('2d');g.fillStyle='#153b2e';g.fillRect(0,0,300,180);g.fillStyle='white';g.font='bold 54px sans-serif';g.fillText('LOCAL',48,107);
      const product=document.createElement('canvas');product.width=160;product.height=240;const p=product.getContext('2d');p.fillStyle='#bcc5bc';p.fillRect(22,10,116,220);p.fillStyle='#a64122';p.fillRect(22,55,116,150);p.fillStyle='#fff9ed';p.font='bold 27px sans-serif';p.fillText('PANTRY',26,107);p.font='22px sans-serif';p.fillText('Beans',48,148);
      const images=new Map([['logo',logo],['product',product]]),issues=[];
      const base={shop:'Neighbourhood Market',logo:'logo',business:'grocery',purpose:'offers',headline:'Good things for your everyday.',eyebrow:'YOUR LOCAL SHOP',cta:'Contact us to order',terms:'Ask in store about availability.',phone:'072 123 4567',location:'12 Market Street',showDate:false,items:Array.from({length:6},(_,i)=>({name:['Sugar beans','Pantry rice','Family flour','Cooking oil','Breakfast oats','Tea selection'][i],price:String(25+i*10)+'.99',size:'1 kg',photo:'product'}))};
      const templates=[...document.querySelector('#poster-template').options].map(o=>o.value);
      for(const template of templates)for(const format of Object.keys(ShopDeskPoster.formats)){
        const bounds=[];
        for(const logoSize of ['compact','prominent']){
          const c=document.createElement('canvas'),ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx);let box;
          ctx.drawImage=(img,...args)=>{if(img===logo)box=args.slice(-4);draw(img,...args);};
          const data={...base,template,format,logoSize,theme:ShopDeskPoster.collection[template]?.theme||'green',items:base.items.slice(0,template==='simple'?3:6)};
          const layout=ShopDeskPoster.draw(c,data,images,{width:480,height:Math.round(480*ShopDeskPoster.formats[format].height/ShopDeskPoster.formats[format].width)});
          if(!box||box[0]<0||box[1]<0||box[0]+box[2]>(layout.width||1080)||box[1]+box[3]>layout.top)issues.push(template+' '+format+' '+logoSize+' logo outside masthead');
          bounds.push(box);c.width=c.height=1;
        }
        if(Math.abs(bounds[1][2]/bounds[0][2]-1.25)>.001||Math.abs(bounds[1][3]/bounds[0][3]-1.25)>.001)issues.push(template+' '+format+' unchanged logo');
      }
      const sheet=document.createElement('canvas');sheet.width=1080;sheet.height=1390;const ctx=sheet.getContext('2d');ctx.fillStyle='#e7eeeb';ctx.fillRect(0,0,1080,1390);
      const hashes=new Set();
      ['arc','ticket','terrace'].forEach((template,index)=>{
        for(const [j,format] of ['poster','landscape','status'].entries()){
          const c=document.createElement('canvas'),d={...base,template,format,theme:ShopDeskPoster.collection[template].theme};ShopDeskPoster.draw(c,d,images);
          const h=340*c.height/c.width,y=[30,505,735][j];ctx.drawImage(c,index*360+10,y,340,h);ctx.fillStyle='#173b31';ctx.font='bold 15px sans-serif';ctx.fillText(ShopDeskPoster.collection[template].name+' · '+format,index*360+10,y-10);hashes.add(c.toDataURL());c.width=c.height=1;
        }
      });
      return {issues,distinct:hashes.size,sheet:sheet.toDataURL().split(',')[1]};
    });
    assert.deepEqual(result.issues,[]);assert.equal(result.distinct,9);
    if(process.env.SHOPDESK_VISUALS){await mkdir('.sites-runtime',{recursive:true});await writeFile('.sites-runtime/new-style-sheet.png',Buffer.from(result.sheet,'base64'));}
  }finally{await browser?.close();await app.close();}
});
