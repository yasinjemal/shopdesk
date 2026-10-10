import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {launch} from './launch.mjs';
import {startApp} from '../../scripts/local-server.mjs';

// Phones are the main device for busy shop owners: the first screen must reach the work quickly,
// the step bar must stay in reach, and the live flyer must be one tap away from any step.
for(const width of [320,390])test(`phone layout keeps steps, the live flyer and sharing within reach at ${width}px`,async()=>{
  const app=await startApp();let browser;
  try{
    browser=await launch();
    const page=await browser.newPage({viewport:{width,height:800},isMobile:true,hasTouch:true}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
    await page.goto(app.url);await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    // Gallery: the explanatory copy and step strip give way to the templates themselves.
    assert.equal(await page.locator('.gallery-hero>div>p:not(.eyebrow)').first().isHidden(),true);assert.equal(await page.locator('.gallery-hero .flow-strip').isHidden(),true);
    assert.ok((await page.locator('#library-grid').boundingBox()).y<1500,'templates start within two screens');
    await page.getByRole('button',{name:'Use Supermarket leaflet',exact:true}).click();
    await page.waitForFunction(()=>ShopDeskApp.page()==='promotion'&&document.querySelector('#save-status').textContent==='All changes saved');
    // Editor: compact heading, no duplicate jump button, floating live flyer while the preview is off screen.
    assert.equal(await page.locator('#page-promotion .page-heading>div>p:last-child').isHidden(),true);assert.equal(await page.locator('#jump-preview').isHidden(),true);
    assert.ok((await page.locator('.flow-steps').boundingBox()).y<700,'steps appear on the first screen');
    await page.waitForFunction(()=>!document.querySelector('#peek-preview').hidden);
    // The step bar sticks to the top while scrolling the long offers form.
    await page.evaluate(()=>window.scrollTo(0,900));await page.waitForTimeout(200);
    const steps=await page.locator('.flow-steps').boundingBox();assert.ok(steps.y>=-1&&steps.y<=2,'sticky steps at '+steps.y);
    // The floating flyer opens the full preview, with download and a note on what is still missing.
    await page.locator('#peek-preview').tap();await page.locator('#preview-dialog[open]').waitFor();
    assert.equal(await page.locator('#dialog-download').isDisabled(),true);assert.match(await page.locator('#dialog-preview-note').textContent(),/Enter the name/);
    const peekPixels=await page.locator('#peek-canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let dark=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]<600)dark++;return dark;});
    assert.ok(peekPixels>50,'the floating thumbnail shows the flyer');
    assert.equal(await page.locator('#share-promo').isHidden(),await page.evaluate(()=>{try{return !(typeof navigator.canShare==='function'&&navigator.canShare({files:[new File([new Uint8Array(8)],'x.png',{type:'image/png'})]}));}catch{return true;}}));
    await page.locator('#close-preview').tap();await page.waitForFunction(()=>!document.querySelector('#preview-dialog').open);
    // Once the real preview is on screen the floating button steps aside, and it never appears on desktop widths.
    await page.locator('#step-download').tap();await page.waitForFunction(()=>document.querySelector('#peek-preview').hidden);
    await page.setViewportSize({width:1280,height:900});await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(200);assert.equal(await page.locator('#peek-preview').isHidden(),true);
    await page.setViewportSize({width,height:800});
    await mkdir('.sites-runtime',{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`.sites-runtime/mobile-editor-${width}.png`,animations:'disabled'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  }finally{await browser?.close();await app.close();}
});
