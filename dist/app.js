(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const money = (n) => 'R' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateISO = (d = new Date()) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  const cashKeys = ['opening','sales','added','expenses','refunds','withdrawn','counted'];
  const priceKeys = ['cost','extras','bulk','pack','waste','target','round'];
  let currentPrice = null, currentCash = null, toastTimer;
  let items = [{ name: 'Potatoes', size: '1 kg pack', price: '10.00' }];
  const pageNames = {pricing:'Product pricing',promotion:'Promotion maker',cash:'Daily cash closing'};
  function navigate(page, updateHash = true) {
    if (!Object.hasOwn(pageNames, page)) page = 'pricing';
    document.querySelectorAll('.page').forEach(el => {el.hidden = el.id !== 'page-' + page;el.classList.toggle('active', !el.hidden);});
    document.querySelectorAll('[data-page]').forEach(el => {const active = el.dataset.page === page;el.classList.toggle('active',active);if(active) el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    $('current-tool').textContent = pageNames[page];
    if(updateHash && location.hash !== '#' + page) history.replaceState(null, '', '#' + page);
    if(page === 'promotion') drawPoster();
  }
  document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.page)));
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1), false));
  document.querySelector('.brand').addEventListener('click', () => navigate('pricing'));
  document.querySelectorAll('form').forEach(form => form.addEventListener('submit', event => event.preventDefault()));
  function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }
  function priceInput() {return {...Object.fromEntries(priceKeys.map(k => [k,$(k).value])), basis:document.querySelector('input[name="basis"]:checked').value};}
  function updatePricing() {
    const input = priceInput();
    $('target-label').textContent = input.basis === 'margin' ? 'Target gross margin' : 'Target markup';
    $('basis-help').textContent = input.basis === 'margin' ? 'Margin is the share of your selling price left after product costs.' : 'Markup is the percentage you add on top of your product cost. A 30% markup is a 23.1% margin before rounding.';
    $('target').max = input.basis === 'margin' ? '99.9' : '1000';
    try {
      const r = ShopDeskLogic.pricing(input); currentPrice = r;
      $('price-error').hidden = true; $('use-price').disabled = false;
      $('selling-price').textContent = money(r.price);
      const name = $('product').value.trim() || 'your product';
      $('price-caption').textContent = `for each ${r.pack} kg pack of ${name}`;
      $('unit-cost').textContent = money(r.unitCost); $('unit-profit').textContent = money(r.unitProfit);
      $('actual-margin').textContent = r.margin.toFixed(1) + '%'; $('actual-markup').textContent = r.markup.toFixed(1) + '%';
      $('cost-bar').style.width = Math.max(0,Math.min(100,100-r.margin)) + '%';
      $('batch-weight').textContent = r.bulk + ' kg purchased'; $('packs').textContent = r.units.toLocaleString('en-ZA');
      $('revenue').textContent = money(r.revenue); $('batch-profit').textContent = money(r.batchProfit);
    } catch (error) {
      currentPrice = null; $('price-error').textContent = error.message; $('price-error').hidden = false; $('use-price').disabled = true;
      ['selling-price','unit-cost','unit-profit','actual-margin','actual-markup','packs','revenue','batch-profit'].forEach(id => $(id).textContent = '—');
      $('price-caption').textContent = 'Check the highlighted message below.'; $('batch-weight').textContent = 'Awaiting valid quantities'; $('cost-bar').style.width = '0%';
    }
    return currentPrice;
  }
  $('pricing-form').addEventListener('input',updatePricing);$('pricing-form').addEventListener('change',updatePricing);
  $('example').addEventListener('click', () => {
    const example={product:'Potatoes',cost:'240',extras:'20',bulk:'40',pack:'1',waste:'5',target:'30',round:'0.5'};
    for(const [key,value] of Object.entries(example)) $(key).value=value;
    document.querySelector('input[name="basis"][value="margin"]').checked=true;updatePricing();toast('Potato example loaded. Change any amount to try your own.');
  });
  $('use-price').addEventListener('click', () => {
    if(!currentPrice)return;
    items=[{name:$('product').value.trim() || 'Product special',size:currentPrice.pack+' kg pack',price:currentPrice.price.toFixed(2)}];
    renderItems();navigate('promotion');$('promotion-title').scrollIntoView({block:'start',behavior:'auto'});toast('Your product and price are ready in the poster.');
  });
  function createField(label, value, type, change, maxLength) {
    const field=document.createElement('label');field.className='field';field.append(document.createTextNode(label));
    const input=document.createElement('input');input.type=type;input.value=value;if(maxLength)input.maxLength=maxLength;
    if(type==='number'){input.min='0.01';input.max='1000000';input.step='0.01';input.inputMode='decimal';}
    input.addEventListener('input',()=>{change(input.value);drawPoster();});field.append(input);return field;
  }
  function renderItems() {
    const list=$('promo-items');list.replaceChildren();
    items.forEach((item,index)=>{
      const box=document.createElement('div');box.className='promo-item';
      const heading=document.createElement('div');heading.className='item-heading';heading.textContent='PRODUCT '+(index+1);
      if(items.length>1){const remove=document.createElement('button');remove.type='button';remove.className='remove-item';remove.textContent='Remove';remove.setAttribute('aria-label','Remove product '+(index+1));remove.addEventListener('click',()=>{items.splice(index,1);renderItems();drawPoster();});heading.append(remove);}
      const name=createField('Product name',item.name,'text',v=>item.name=v,50);name.classList.add('full');
      const row=document.createElement('div');row.className='field-row';row.append(createField('Pack / quantity',item.size,'text',v=>item.size=v,25),createField('Selling price (R)',item.price,'number',v=>item.price=v));
      box.append(heading,name,row);list.append(box);
    });
    $('add-item').disabled=items.length>=3;
  }
  $('add-item').addEventListener('click',()=>{if(items.length<3){items.push({name:'',size:'',price:''});renderItems();drawPoster();}});
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+7);$('promo-date').value=dateISO(tomorrow);$('cash-date').value=dateISO();
  $('promo-form').addEventListener('input',drawPoster);$('promo-form').addEventListener('change',drawPoster);
  function promoData() {
    const data={shop:$('shop-name').value.trim(),headline:$('promo-headline').value.trim(),date:$('promo-date').value,phone:$('promo-phone').value.trim(),location:$('promo-location').value.trim(),items:items.map(i=>({...i}))};
    if(!data.shop)throw new Error('Enter your shop name.');
    if(!data.headline)throw new Error('Enter a headline for your offer.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date))throw new Error('Choose the offer end date.');
    if(data.date<dateISO())throw new Error('Choose today or a future date for the offer.');
    for(const [index,item] of data.items.entries()){if(!item.name.trim())throw new Error('Enter the name for product '+(index+1)+'.');ShopDeskLogic.number(item.price,'Price for product '+(index+1),.01,1000000);}
    return data;
  }
  function dateText(value){if(!value)return 'Choose an end date';const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?'Choose an end date':d.toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});}
  function fitText(ctx,text,x,y,maxWidth,size,color,weight=700) {ctx.fillStyle=color;ctx.font=`${weight} ${size}px "DM Sans", sans-serif`;while(ctx.measureText(text).width>maxWidth && size>14){size-=1;ctx.font=`${weight} ${size}px "DM Sans", sans-serif`;}ctx.fillText(text,x,y);}
  function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=2) {
    let line='',lines=0;
    const words=text.split(/\s+/);
    for(let i=0;i<words.length;i++){const trial=line+(line?' ':'')+words[i];if(ctx.measureText(trial).width>maxWidth && line){ctx.fillText(line,x,y+lines*lineHeight);lines++;line=words[i];if(lines>=maxLines-1){line=[line,...words.slice(i+1)].join(' ');while(ctx.measureText(line).width>maxWidth&&line.length>1)line=line.slice(0,-1);if(i<words.length-1)line=line.trim().slice(0,-1)+'…';break;}}else line=trial;}
    while(ctx.measureText(line).width>maxWidth&&line.length>1)line=line.slice(0,-1);
    ctx.fillText(line,x,y+lines*lineHeight);
  }
  function drawPoster() {
    const canvas=$('promo-canvas');if(!canvas)return;
    let data;try{data=promoData();$('promo-error').hidden=true;$('download-promo').disabled=false;$('copy-promo').disabled=false;}catch(e){$('promo-error').textContent=e.message;$('promo-error').hidden=false;$('download-promo').disabled=true;$('copy-promo').disabled=true;}
    const ctx=canvas.getContext('2d');if(!ctx){$('promo-error').textContent='Your browser cannot create the poster preview.';$('promo-error').hidden=false;$('download-promo').disabled=true;return;}
    const themes={green:['#103e35','#c6f39b','#eff5e9'],blue:['#182c5c','#d9ecff','#f0f4ff'],orange:['#713719','#ffe08c','#fff5e4']};
    const [bg,accent,paper]=themes[$('promo-theme').value]||themes.green;
    ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
    ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(35,35,1010,1280);
    fitText(ctx,$('shop-name').value.trim()||'Your shop',72,118,925,42,accent,600);
    ctx.fillStyle=accent;ctx.fillRect(74,159,72,6);
    ctx.fillStyle='#fff';ctx.font='800 84px "Manrope", sans-serif';wrapText(ctx,$('promo-headline').value.trim()||'Your special offer',70,287,940,98,2);
    fitText(ctx,'SPECIAL OFFERS',74,455,800,23,accent,700);
    const top=495, height=items.length===1?430:items.length===2?269:177,gap=22;
    items.forEach((item,index)=>{
      const y=top+index*(height+gap);ctx.fillStyle=paper;ctx.fillRect(70,y,940,height);
      if(items.length===1){fitText(ctx,item.name.trim()||'Product name',111,y+83,845,62,bg,700);fitText(ctx,item.size.trim()||'Pack / quantity',113,y+134,820,30,bg,400);fitText(ctx,item.price!==''&&Number.isFinite(Number(item.price))&&Number(item.price)>0?money(Number(item.price)):'R —',107,y+313,844,142,bg,800);fitText(ctx,'EACH',115,y+368,800,25,bg,600);}
      else if(items.length===2){fitText(ctx,item.name.trim()||'Product name',107,y+66,843,48,bg,700);fitText(ctx,item.size.trim()||'Pack / quantity',109,y+105,800,26,bg,400);fitText(ctx,item.price!==''&&Number.isFinite(Number(item.price))&&Number(item.price)>0?money(Number(item.price)):'R —',105,y+222,839,104,bg,800);}
      else{fitText(ctx,item.name.trim()||'Product name',103,y+66,485,43,bg,700);fitText(ctx,item.size.trim()||'Pack / quantity',105,y+111,470,26,bg,400);const price=item.price!==''&&Number.isFinite(Number(item.price))&&Number(item.price)>0?money(Number(item.price)):'R —';fitText(ctx,price,624,y+105,346,67,bg,800);}
    });
    fitText(ctx,'Valid until '+dateText($('promo-date').value),74,1140,930,28,'#ffffff',500);
    const contact=[$('promo-location').value.trim(),$('promo-phone').value.trim()].filter(Boolean).join('  •  ');
    if(contact)fitText(ctx,contact,74,1200,925,30,accent,500);
    fitText(ctx,'While stocks last.',74,1264,700,23,'#ffffff',400);
    ctx.textAlign='right';fitText(ctx,'ShopDesk',1004,1264,300,23,accent,600);ctx.textAlign='left';
  }
  function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  $('download-promo').addEventListener('click',()=>{try{promoData();drawPoster();$('promo-canvas').toBlob(blob=>{if(!blob){toast('Could not create your poster. Please try again.');return;}download(blob,'shopdesk-special-'+dateISO()+'.png');toast('Poster downloaded. It is ready to share.');},'image/png');}catch(e){toast(e.message);}});
  $('copy-promo').addEventListener('click',async()=>{
    try{const d=promoData();const text=[d.shop,d.headline,'',...d.items.map(i=>`${i.name}${i.size?' · '+i.size:''} — ${money(Number(i.price))}`),'','Valid until '+dateText(d.date),d.location,d.phone,'While stocks last.'].filter(v=>v!==undefined).join('\n');
      if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);toast('Offer text copied. Paste it into your customer message.');return;}catch{}}
      download(new Blob([text],{type:'text/plain;charset=utf-8'}),'shopdesk-offer.txt');toast('Copy is unavailable in this browser. Offer text downloaded instead.');
    }catch(e){toast(e.message);}
  });
  function cashInput(){return Object.fromEntries(cashKeys.map(k=>[k,$(k).value]));}
  function updateCash(){
    try{const r=ShopDeskLogic.cash(cashInput());currentCash=r;$('cash-error').hidden=true;$('download-cash').disabled=false;
      $('expected').textContent=money(r.expected);$('actual-cash').textContent=money(r.counted);$('cash-difference').textContent=(r.difference>0?'+':r.difference<0?'−':'')+money(Math.abs(r.difference));
      $('cash-status').className='cash-status'+(r.status==='balanced'?'':' '+r.status);
      $('cash-status-icon').textContent=r.status==='balanced'?'✓':'!';
      $('cash-status-title').textContent=r.status==='balanced'?'Your till balances':r.status==='short'?'Your till is '+money(-r.difference)+' short':'Your till has '+money(r.difference)+' extra';
      $('cash-status-description').textContent=r.status==='balanced'?'Cash counted matches expected cash.':'Recount the till and check recorded sales, refunds and cash movements.';
    }catch(e){currentCash=null;$('cash-error').textContent=e.message;$('cash-error').hidden=false;$('download-cash').disabled=true;['expected','actual-cash','cash-difference'].forEach(id=>$(id).textContent='—');$('cash-status').className='cash-status over';$('cash-status-icon').textContent='!';$('cash-status-title').textContent='Check your cash entries';$('cash-status-description').textContent='Fix the amounts to see your closing result.';}
    return currentCash;
  }
  $('cash-form').addEventListener('input',updateCash);
  $('download-cash').addEventListener('click',()=>{
    const r=updateCash();if(!r)return;if(!$('cash-date').value){toast('Choose a trading date for your summary.');$('cash-date').focus();return;}
    const labels={opening:'Opening till float',sales:'Cash sales collected',added:'Other cash added',expenses:'Expenses paid from till',refunds:'Cash refunds',withdrawn:'Cash taken out / banked',counted:'Actual cash counted'};
    const text=['SHOPDESK — DAILY CASH CLOSING','Trading date: '+dateText($('cash-date').value),'',...cashKeys.map(k=>labels[k]+': '+money(r.amounts[k])),'','Expected cash: '+money(r.expected),'Difference: '+(r.difference<0?'-':r.difference>0?'+':'')+money(Math.abs(r.difference)),'Status: '+r.status.toUpperCase(),'','Closing note: '+($('cash-note').value.trim()||'None'),'','Cash reconciliation only. This summary does not calculate business profit.'].join('\n');
    download(new Blob([text],{type:'text/plain;charset=utf-8'}),'shopdesk-cash-'+$('cash-date').value+'.txt');toast('Closing summary downloaded.');
  });
  function registerTools(){
    const context=document.modelContext;if(!context?.registerTool)return;
    const controller=new AbortController();window.addEventListener('pagehide',()=>controller.abort(),{once:true});
    const numeric={type:'number',minimum:0};
    const tools=[{
      name:'configure_product_pricing',title:'Calculate a product selling price',description:'Set the visible product pricing fields and return selling price, pack count, margin and batch profit. Does not save records or create a promotion.',
      inputSchema:{type:'object',properties:{product:{type:'string',minLength:1,maxLength:60},cost:numeric,extras:numeric,bulk:{type:'number',exclusiveMinimum:0},pack:{type:'number',exclusiveMinimum:0},waste:{type:'number',minimum:0,maximum:99.9},target:numeric,basis:{enum:['margin','markup']},round:{enum:[0.01,0.5,1]}},required:['product',...priceKeys,'basis'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(input){if(!input||typeof input.product!=='string'||!input.product.trim()||input.product.length>60)throw new Error('A product name is required, up to 60 characters.');const result=ShopDeskLogic.pricing(input);for(const key of priceKeys)$(key).value=String(input[key]);$('product').value=input.product;document.querySelector('input[name="basis"][value="'+input.basis+'"]').checked=true;updatePricing();navigate('pricing');return result;}
    },{
      name:'configure_cash_closing',title:'Reconcile the till',description:'Set the visible cash amounts and return expected cash and the difference. Does not save or download the closing summary.',
      inputSchema:{type:'object',properties:Object.fromEntries(cashKeys.map(k=>[k,numeric])),required:cashKeys,additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(input){const result=ShopDeskLogic.cash(input);for(const key of cashKeys)$(key).value=String(input[key]);updateCash();navigate('cash');return result;}
    }];
    tools.forEach(tool=>{try{Promise.resolve(context.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{}});
  }
  renderItems();updatePricing();updateCash();navigate(location.hash.slice(1)||'pricing',false);drawPoster();registerTools();
  if(document.fonts?.ready)document.fonts.ready.then(drawPoster);
})();
