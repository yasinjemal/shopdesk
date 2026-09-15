(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const money = (n) => 'R' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateISO = (d = new Date()) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  const cashKeys = ['opening','sales','added','expenses','refunds','withdrawn','counted'];
  const priceKeys = ['cost','extras','bulk','pack','waste','target','round'];
  let currentPrice = null, currentCash = null, toastTimer;
  const drawPoster = () => ShopDeskPromotion.draw();
  const pageNames = {pricing:'Product pricing',promotion:'Flyer studio',cash:'Daily cash closing'};
  function navigate(page, updateHash = true) {
    if (!Object.hasOwn(pageNames, page)) page = 'promotion';
    document.querySelectorAll('.page').forEach(el => {el.hidden = el.id !== 'page-' + page;el.classList.toggle('active', !el.hidden);});
    document.querySelectorAll('[data-page]').forEach(el => {const active = el.dataset.page === page;el.classList.toggle('active',active);if(active) el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    $('current-tool').textContent = pageNames[page];
    if(updateHash && location.hash !== '#' + page) history.replaceState(null, '', '#' + page);
    if(page === 'promotion') drawPoster();
  }
  document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.page)));
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1), false));
  document.querySelector('.brand').addEventListener('click', () => navigate('promotion'));
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
    if(ShopDeskPromotion.addProduct({name:$('product').value.trim().slice(0,50)||'Product special',size:currentPrice.pack+' kg pack',price:currentPrice.price.toFixed(2)})){navigate('promotion');window.ShopDeskInterface?.showTab('content');}
  });
  $('cash-date').value=dateISO();
  function dateText(value){const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});}
  function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
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
  updatePricing();updateCash();navigate(location.hash.slice(1)||'promotion',false);drawPoster();registerTools();
  if(document.fonts?.ready)document.fonts.ready.then(drawPoster);
})();
