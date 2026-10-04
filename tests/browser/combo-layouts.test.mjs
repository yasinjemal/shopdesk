import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startApp} from '../../scripts/local-server.mjs';

test('combo frames and product labels stay bounded across every size and crowded grouping',async()=>{
  const app=await startApp();let browser;
  try{
    browser=await chromium.launch({headless:true,channel:process.env.SHOPDESK_BROWSER_CHANNEL||'chrome'});const page=await browser.newPage();await page.goto(app.url,{timeout:30000});await page.waitForFunction(()=>!document.querySelector('#promo-fields').disabled);
    const result=await page.evaluate(async()=>{
      await document.fonts.ready;
      const makePhoto=(name,colour)=>{const c=document.createElement('canvas');c.width=180;c.height=260;const g=c.getContext('2d');g.fillStyle='#f5e4b7';g.fillRect(25,8,130,240);g.fillStyle=colour;g.fillRect(25,74,130,140);g.fillStyle='white';g.font='bold 24px sans-serif';g.fillText('MARKET',36,122);g.font='20px sans-serif';g.fillText(name,38,164);return c;};
      const images=new Map([['rice',makePhoto('Rice','#b92336')],['beans',makePhoto('Beans','#194b38')],['sugar',makePhoto('Sugar','#254779')],['flour',makePhoto('Flour','#a37b17')],['oats',makePhoto('Oats','#732a52')]]);
      const base={shop:'Neighbourhood Grocery',purpose:'combos',business:'grocery',headline:'Everyday essentials. Better together.',eyebrow:'GROCERY COMBOS',theme:'red',dateText:'12 October 2026',startDateText:'5 October 2026',startDate:'2026-10-05',showDate:true,phone:'072 123 4567',location:'12 Market Street',cta:'Contact us to order',terms:'Price is for all items in each combo. While stocks last.'};
      const canvas=document.createElement('canvas'),issues=[],pictures={};
      for(const template of ShopDeskCombos.styles)for(const format of Object.keys(ShopDeskPoster.formats))for(const number of [1,2,4,6])for(const dense of [false,true]){
        const combos=Array.from({length:number},(_,i)=>({name:['Family pantry','Breakfast basket','Cleaning essentials','Weekend top-up','Fresh produce','School lunches'][i],price:String(149+i*20)+'.99'}));
        const items=Array.from({length:20},(_,i)=>({name:['Long grain rice','Sugar beans','Brown sugar','Cake wheat flour','Breakfast oats'][i%5],size:'1 kg pack',price:'',photo:['rice','beans','sugar','flour','oats'][i%5],combo:dense?i<number-1?i:number-1:i%number,quantity:i%4===0?2:1}));
        const data={...base,template,format,combos,items,itemCount:20},layout=ShopDeskPoster.draw(canvas,data,images);
        if(layout.cards.length!==20)issues.push(template+' '+format+' missing products');
        for(const c of layout.cards){const frame=layout.frames.find(f=>f.group.items.some(item=>item.sourceIndex===c.item.sourceIndex));if(!frame||c.x<frame.x||c.y<frame.y||c.x+c.w>frame.x+frame.w+.1||c.y+c.h>frame.y+frame.h+.1||c.h<42)issues.push(template+' '+format+' '+number+' dense='+dense+' too small '+Math.round(c.h));}
        if(format==='a4'&&number===4&&!dense)pictures[template]=canvas.toDataURL().split(',')[1];
        if(format==='square'&&number===6&&dense)pictures[template+'-dense']=canvas.toDataURL().split(',')[1];
      }
      return {issues,pictures};
    });
    await mkdir('.sites-runtime',{recursive:true});for(const [name,data] of Object.entries(result.pictures))await writeFile('.sites-runtime/'+name+'.png',Buffer.from(data,'base64'));assert.deepEqual(result.issues,[]);
  }finally{await browser?.close();await app.close();}
});
