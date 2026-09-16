import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startApp} from '../../scripts/local-server.mjs';

for(const width of [320,1280])test(`people can share and independently reuse a template at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.SHOPDESK_BROWSER_CHANNEL?{channel:process.env.SHOPDESK_BROWSER_CHANNEL}:{})});
    const context=await browser.newContext({viewport:{width,height:844},isMobile:width<700,hasTouch:width<700,extraHTTPHeaders:{'x-shopdesk-test-user':'creator'}});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
    await page.goto(app.url);await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    const click=selector=>width<700?page.locator(selector).tap():page.locator(selector).click();
    await click('#open-library');assert.equal(await page.locator('.library-card').count(),6);
    await page.locator('#library-search').fill('menu');await click('#library-search-form button');
    assert.equal(await page.locator('.library-card').count(),1);
    await page.getByRole('button',{name:'Use The everyday menu',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('#library-dialog').open);
    assert.equal(await page.locator('#project-picker option').count(),2);
    assert.equal(await page.locator('#project-name').inputValue(),'The everyday menu');
    assert.equal(await page.locator('#promo-items > details').count(),4);
    await click('#open-share-template');
    await page.locator('#share-template-name').fill('Neighbourhood menu');
    await page.locator('#share-template-description').fill('A layout for a small takeaway.');
    assert.equal(await page.locator('#share-template-content').isChecked(),false);
    await click('#publish-template');
    await page.waitForFunction(()=>document.querySelector('#library-grid').textContent.includes('Neighbourhood menu'));
    assert.equal(await page.getByRole('button',{name:'Unlist template',exact:true}).count(),1);
    // Another account sees only the explicitly shared design and creates its own project.
    const recipientContext=await browser.newContext({viewport:{width,height:844},extraHTTPHeaders:{'x-shopdesk-test-user':'recipient'}});
    const recipient=await recipientContext.newPage();recipient.on('pageerror',e=>errors.push(e.message));recipient.setDefaultTimeout(10000);
    await recipient.goto(app.url);await recipient.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    await recipient.locator('#open-library').click();await recipient.getByRole('button',{name:'Community',exact:true}).click();
    await recipient.getByRole('button',{name:'Use Neighbourhood menu',exact:true}).click();
    await recipient.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
    assert.equal(await recipient.locator('#project-name').inputValue(),'Neighbourhood menu');
    await recipient.locator('#project-name').fill('My independent menu');
    await recipient.waitForFunction(()=>document.querySelector('#save-status').textContent==='All changes saved');
    await page.getByRole('button',{name:'Unlist template',exact:true}).click();
    await page.getByRole('button',{name:'List again',exact:true}).waitFor();
    await recipient.locator('#open-library').click();await recipient.getByRole('button',{name:'Community',exact:true}).click();
    await recipient.waitForFunction(()=>!document.querySelector('#library-status').textContent.startsWith('Loading'));
    assert.equal(await recipient.locator('.library-card').count(),0);
    await recipient.locator('#close-library').click();await recipient.reload();
    await recipient.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    assert.equal(await recipient.locator('#project-name').inputValue(),'My independent menu');
    await click('#close-library');assert.equal(await page.locator('#project-name').inputValue(),'The everyday menu');
    assert.equal(await page.locator('#project-picker option').count(),2);
    await click('#open-library');await page.getByRole('button',{name:'Ready to use',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('#library-dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);
    assert.deepEqual(errors,[]);
  }finally{await browser?.close();await app.close();}
});
