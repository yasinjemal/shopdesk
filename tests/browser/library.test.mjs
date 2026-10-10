import {test} from 'node:test';
import assert from 'node:assert/strict';
import {launch} from './launch.mjs';
import {startApp} from '../../scripts/local-server.mjs';

for(const width of [320,1280])test(`the template gallery opens first, filters starters and shares designs independently at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await launch();
    const context=await browser.newContext({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700,extraHTTPHeaders:{'x-shopdesk-test-user':'creator'}});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
    await page.goto(app.url);await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    const click=selector=>width<700?page.locator(selector).tap():page.locator(selector).click();
    // Grocery leads: the gallery is the opening page and starts on the grocery filter.
    assert.equal(await page.evaluate(()=>ShopDeskApp.page()),'templates');
    assert.equal(await page.locator('[data-library-business="grocery"]').getAttribute('aria-pressed'),'true');
    const grocery=await page.evaluate(()=>ShopDeskTemplates.starters.filter(t=>t.design.business==='grocery').length);
    assert.equal(await page.locator('.library-card').count(),grocery);
    await page.locator('#library-promotion').selectOption('butchery');
    const butchery=await page.locator('.library-card').evaluateAll(cards=>cards.map(c=>c.dataset.design));assert.ok(butchery.length>=1&&butchery.every(t=>['butcher','premiumdeli'].includes(t)),JSON.stringify(butchery));
    await page.locator('#library-promotion').selectOption('');await page.locator('#library-format').selectOption('status');
    assert.ok(await page.locator('.library-card').count()>=2);assert.ok((await page.locator('.library-meta').first().textContent()).includes('Status'));
    await click('#library-clear');
    assert.equal(await page.locator('.library-card').count(),await page.evaluate(()=>ShopDeskTemplates.starters.length));
    assert.equal(await page.locator('.library-card').first().evaluate(c=>c.querySelector('.library-meta').textContent.startsWith('Grocery')),true);
    await page.locator('#library-search').fill('The everyday menu');await click('#library-search-form button');
    assert.equal(await page.locator('.library-card').count(),1);
    await page.waitForFunction(()=>document.querySelector('.library-card canvas').width>0);
    await page.getByRole('button',{name:'Use The everyday menu',exact:true}).click();
    await page.waitForFunction(()=>ShopDeskApp.page()==='promotion');
    assert.equal(await page.locator('#project-picker option').count(),2);
    assert.equal(await page.locator('#project-name').inputValue(),'The everyday menu');
    assert.equal(await page.locator('#promo-items > details').count(),4);
    assert.equal(await page.locator('#flyer-promotion').inputValue(),'menu');
    assert.equal(await page.locator('#promo-headline').inputValue(),'What are you craving today?');
    await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
    await click('#open-share-template');
    await page.locator('#share-template-name').fill('Neighbourhood menu');
    await page.locator('#share-template-description').fill('A layout for a small takeaway.');
    assert.equal(await page.locator('#share-template-content').isChecked(),false);
    await click('#publish-template');
    await page.waitForFunction(()=>ShopDeskApp.page()==='templates'&&document.querySelector('#library-grid').textContent.includes('Neighbourhood menu'));
    assert.equal(await page.getByRole('button',{name:'Unlist template',exact:true}).count(),1);
    // Another account sees only the explicitly shared design and creates its own project.
    const recipientContext=await browser.newContext({viewport:{width,height:844},extraHTTPHeaders:{'x-shopdesk-test-user':'recipient'}});
    const recipient=await recipientContext.newPage();recipient.on('pageerror',e=>errors.push(e.message));recipient.setDefaultTimeout(10000);
    await recipient.goto(app.url);await recipient.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    await recipient.getByRole('button',{name:'Community',exact:true}).click();
    await recipient.waitForFunction(()=>!document.querySelector('#library-status').textContent.startsWith('Loading'));
    assert.equal(await recipient.locator('.library-card').count(),0);// a food template is outside the default grocery filter
    await recipient.locator('[data-library-business="food"]').click();
    await recipient.getByRole('button',{name:'Use Neighbourhood menu',exact:true}).click();
    await recipient.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
    assert.equal(await recipient.locator('#project-name').inputValue(),'Neighbourhood menu');
    assert.equal(await recipient.evaluate(()=>ShopDeskApp.page()),'promotion');
    await recipient.locator('#project-name').fill('My independent menu');
    await recipient.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
    await page.getByRole('button',{name:'Unlist template',exact:true}).click();
    await page.getByRole('button',{name:'List again',exact:true}).waitFor();
    await recipient.locator('#open-library').click();await recipient.getByRole('button',{name:'Community',exact:true}).click();await recipient.locator('[data-library-business=""]').click();
    await recipient.waitForFunction(()=>!document.querySelector('#library-status').textContent.startsWith('Loading'));
    assert.equal(await recipient.locator('.library-card').count(),0);
    await recipient.reload();await recipient.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    assert.equal(await recipient.locator('#project-name').inputValue(),'My independent menu');
    await click('.nav-item[data-page="promotion"]');assert.equal(await page.locator('#project-name').inputValue(),'The everyday menu');
    assert.equal(await page.locator('#project-picker option').count(),2);
    await click('#open-library');await page.getByRole('button',{name:'Ready-made',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
  }finally{await browser?.close();await app.close();}
});
