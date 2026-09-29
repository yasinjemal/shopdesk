import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startApp} from '../../scripts/local-server.mjs';

const day=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const id=()=>crypto.randomUUID();
for(const width of [320,1280])test(`saved flyer search and independent new editions work at ${width}px`,async()=>{
 const app=await startApp();let browser;
 try{
  const headers={'x-shopdesk-test-user':'browser-test'};
  const uploaded=await fetch(app.url+'/api/photos',{method:'POST',headers:{...headers,'content-type':'image/png'},body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a12kAAAAASUVORK5CYII=','base64')});
  assert.equal(uploaded.status,201);const photo=(await uploaded.json()).id;
  const d={headline:'Weekly pantry deals',date:day(-1),startDate:day(-7),theme:'red',template:'mosaic',format:'square',exportQuality:'4k',typeface:'geometric',priceStyle:'pill',itemCount:1,purpose:'offers',showDate:true,business:'grocery',eyebrow:'SHOP SPECIALS',cta:'Contact us',terms:'While stocks last.',trimPhotos:false,cleanNames:false,keepColours:false,details:'',eventDate:'',eventTime:'',venue:'',heroPhoto:'',items:[{name:'Brown rice',size:'2 kg',price:'45',photo,photoScale:1.2,dealQuantity:2,featured:true},{name:'Reserved beans',size:'410 g',price:'15',photo:''}]};
  const source={id:id(),title:'Pantry specials',draft:d};
  const projects=[source,...Array.from({length:7},(_,i)=>({id:id(),title:['Bakery menu','Current basket','Draft flyer','Future weekend','Household offers','Summer sale','Value board'][i],draft:{...structuredClone(d),showDate:i!==0,startDate:i===3?day(5):day(),date:day(10),items:[{name:i===2?'':'Sunflower oil',price:'99',size:'5 litres',photo:''}],itemCount:1}}))];
  const clientId=id(),otherId=id(),otherProject={id:id(),title:'Beauty menu',draft:{...structuredClone(d),showDate:false,items:[{name:'Haircut',size:'',price:'70',photo:''}],itemCount:1}};
  const initial={schemaVersion:2,activeClientId:clientId,activeProjectId:source.id,clients:[{id:clientId,shop:{name:'North Market',phone:'0721234567',location:'Market Street'},products:[],projects},{id:otherId,shop:{name:'Quiet Salon',phone:'',location:''},products:[],projects:[otherProject]}]};
  const saved=await fetch(app.url+'/api/studio',{method:'PUT',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({revision:0,data:initial})});assert.equal(saved.status,200);
  browser=await chromium.launch({channel:process.env.SHOPDESK_BROWSER_CHANNEL||'chromium',headless:true});
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<700,hasTouch:width<700}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
  const click=s=>width<700?page.locator(s).tap():page.locator(s).click();
  await page.goto(app.url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.querySelector('#open-projects').disabled);
  await click('#open-projects');assert.equal(await page.locator('#projects-dialog').evaluate(el=>el.open),true);
  assert.equal(await page.locator('.project-card').count(),6);assert.match(await page.locator('#projects-count').textContent(),/9 saved flyers/);
  await click('#projects-next');assert.equal(await page.locator('.project-card').count(),3);assert.equal(await page.locator('#projects-page').textContent(),'Page 2 of 2');
  await page.locator('#projects-search').fill('north rice');assert.equal(await page.locator('.project-card').count(),1);assert.match(await page.locator('.project-badge').textContent(),/Expired/);
  await page.locator('#projects-search').fill('Reserved beans');assert.equal(await page.locator('.project-card').count(),0);assert.equal(await page.locator('#projects-empty').isVisible(),true);
  await click('#projects-clear');await page.locator('#projects-status-filter').selectOption('scheduled');assert.equal(await page.locator('.project-card').count(),1);assert.match(await page.locator('.project-card h3').textContent(),/Future weekend/);
  await page.locator('#projects-status-filter').selectOption('draft');assert.equal(await page.locator('.project-card').count(),1);assert.match(await page.locator('.project-card h3').textContent(),/Draft flyer/);
  await click('#projects-clear');await page.locator('#projects-client').selectOption(otherId);assert.equal(await page.locator('.project-card').count(),1);
  await click('.project-card-actions .primary');assert.equal(await page.locator('#projects-dialog').evaluate(el=>el.open),false);assert.equal(await page.locator('#shop-name').inputValue(),'Quiet Salon');
  await click('#open-projects');await click('#projects-clear');await page.locator('#projects-search').fill('Pantry specials');await click('.project-card-actions .secondary');
  assert.equal(await page.locator('#edition-dialog').evaluate(el=>el.open),true);assert.equal(await page.locator('#edition-start').inputValue(),day());assert.equal(await page.locator('#edition-end').inputValue(),day(6));
  await page.locator('#edition-name').fill('Next week pantry');await page.locator('#edition-end').fill(day(-1));await click('#create-edition');assert.match(await page.locator('#edition-error').textContent(),/start date/);
  await page.locator('#edition-start').fill(day(1));await page.locator('#edition-end').fill(day(7));await click('#create-edition');
  await page.waitForFunction(()=>!document.querySelector('#edition-dialog').open);assert.equal(await page.locator('#projects-dialog').evaluate(el=>el.open),false);
  assert.equal(await page.locator('#project-name').inputValue(),'Next week pantry');assert.equal(await page.locator('#shop-name').inputValue(),'North Market');assert.equal(await page.locator('#promo-start-date').inputValue(),day(1));assert.equal(await page.locator('#promo-date').inputValue(),day(7));
  assert.equal(await page.locator('#download-promo').isEnabled(),true);
  const items=await page.evaluate(()=>ShopDeskPromotion.itemState().items);assert.equal(items.length,2);assert.equal(items[0].photo,photo);assert.equal(items[0].photoScale,1.2);assert.equal(items[0].dealQuantity,2);
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
  let stored=await (await fetch(app.url+'/api/studio',{headers})).json();assert.deepEqual(stored.data.clients[0].projects[0],source);assert.equal(stored.data.clients[0].projects.length,9);assert.equal(stored.data.clients[1].projects.length,1);
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!document.querySelector('#open-projects').disabled);assert.equal(await page.locator('#project-name').inputValue(),'Next week pantry');
  await click('#open-projects');await page.locator('#projects-search').fill('Next week pantry');assert.equal(await page.locator('.project-card').count(),1);assert.equal(await page.locator('.project-current').textContent(),'In editor');
  assert.equal(await page.locator('#projects-dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 }finally{await browser?.close();await app.close();}
});
