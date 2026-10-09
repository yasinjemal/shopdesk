(() => {
  'use strict';
  const $=id=>document.getElementById(id),model=ShopDeskTemplates;
  let source='starters',cursor=null,entries=[],loadRun=0,previewRun=0,using=false,sharing=false,shareId='',shareDraft=null,loaded=false;
  const filters={business:'grocery',promotion:'',style:'',format:'',query:''};
  const businessLabels={grocery:'Grocery & supermarket',food:'Restaurant & bakery',beauty:'Beauty & salon',fashion:'Fashion',services:'Services',general:'Other'};
  function error(id,message){$(id).textContent=message;$(id).hidden=!message;}
  async function api(path,options={}){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{const response=await fetch(path,{...options,credentials:'same-origin',signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'Please try again.');return data;}
    catch(e){if(e.name==='AbortError')throw new Error('The library took too long to respond. Please try again.');throw e;}finally{clearTimeout(timeout);}
  }
  // Example previews: realistic sample products so people can judge the finished
  // result. No live workspace fields or image IDs are consulted, and the
  // examples never enter a project.
  function previewData(template){
    const draft=model.draft(template),promotion=template.promotion||draft.promotion||'';
    const samples=ShopDeskSamples.items(draft.business,promotion,draft.itemCount);
    draft.items=draft.items.map((item,i)=>({...item,name:item.name||samples[i%samples.length].name,size:item.size||samples[i%samples.length].size,price:item.price||samples[i%samples.length].price}));
    if(draft.purpose==='combos'){const combos=ShopDeskSamples.combos();draft.combos=(draft.combos||combos).map((c,i)=>({name:c.name||combos[i%combos.length].name,price:c.price||combos[i%combos.length].price}));}
    if(!template.includeContent){draft.headline=ShopDeskSamples.headline(draft.business,promotion);draft.eyebrow=ShopDeskSamples.eyebrow(draft.business,promotion);}
    return {...draft,shop:'Your business name',phone:'072 000 0000',location:'Your street, your town',logo:'',dateText:'Your end date',startDateText:'',eventDateText:'Your event date',details:draft.purpose==='spotlight'?'Your own description goes here.':''};
  }
  function preview(canvas,template,width=300){
    const full=document.createElement('canvas');ShopDeskPoster.draw(full,previewData(template));
    canvas.width=width;canvas.height=Math.round(full.height/full.width*width);canvas.getContext('2d').drawImage(full,0,0,canvas.width,canvas.height);full.width=1;full.height=1;
  }
  function button(text,action,cls='button secondary'){const el=document.createElement('button');el.type='button';el.className=cls;el.textContent=text;el.addEventListener('click',action);return el;}
  function navigateToEditor(){window.ShopDeskApp?.navigate('promotion');}
  function visibleEntries(){
    const query=filters.query.trim().toLowerCase();
    let list=entries.filter(entry=>{
      const d=entry.design;
      if(filters.business&&d.business!==filters.business)return false;
      if(filters.format&&d.format!==filters.format)return false;
      const promotion=entry.promotion||d.promotion||'';
      if(filters.promotion&&promotion!==filters.promotion)return false;
      if(filters.style&&entry.style&&entry.style!==filters.style)return false;
      if(query){
        const text=[entry.title,entry.description,model.promotions[promotion]||'',ShopDeskPoster.collection[d.template]?.name||d.template,businessLabels[d.business]||'',model.styles[entry.style]||''].join(' ').toLowerCase();
        if(!query.split(/\s+/).every(word=>text.includes(word)))return false;
      }
      return true;
    });
    if(!filters.business)list=[...list].sort((a,b)=>Number(b.design.business==='grocery')-Number(a.design.business==='grocery'));
    return list;
  }
  function render(){
    const run=++previewRun,visible=visibleEntries();
    $('library-grid').replaceChildren();$('library-empty').hidden=visible.length>0;
    for(const entry of visible){
      const card=document.createElement('article');card.className='library-card';card.dataset.design=entry.design.template;
      const visual=document.createElement('div');visual.className='library-card-visual';visual.dataset.format=entry.design.format;const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',entry.title+' example preview');visual.append(canvas);
      const content=document.createElement('div');content.className='library-card-content';
      const badges=document.createElement('div');badges.className='library-badges';
      const badge=document.createElement('span');badge.className='library-badge';badge.textContent=entry.starter?'Handbill starter':entry.listed===false?'Unlisted · only you':'Shared template';badges.append(badge);
      const promotion=entry.promotion||entry.design.promotion;if(model.promotions[promotion]){const tag=document.createElement('span');tag.className='library-tag';tag.textContent=model.promotions[promotion];badges.append(tag);}
      const title=document.createElement('h3');title.textContent=entry.title;const description=document.createElement('p');description.textContent=entry.description;
      const meta=document.createElement('p');meta.className='library-meta';
      const count=entry.design.purpose==='combos'?entry.design.itemCount+' products in '+(entry.design.combos?.length||4)+' combos':['event','opening'].includes(entry.design.purpose)?'Announcement':entry.design.itemCount+' '+(entry.design.itemCount===1?'offer':'offers');
      meta.textContent=[businessLabels[entry.design.business],ShopDeskPoster.formats[entry.design.format]?.label||'Portrait',count,entry.style?model.styles[entry.style]:''].filter(Boolean).join(' · ');
      const use=button('Use this template',async()=>{
        if(using)return;using=true;error('library-error','');render();
        try{await ShopDeskPromotion.useTemplate(entry);navigateToEditor();}catch(e){error('library-error',e.message);$('library-error').scrollIntoView({block:'nearest'});}finally{using=false;render();}
      },'button primary');use.disabled=using;use.setAttribute('aria-label','Use '+entry.title);
      content.append(badges,title,description,meta,use);
      if(entry.mine)content.append(button(entry.listed?'Unlist template':'List again',async event=>{
        const target=event.currentTarget;target.disabled=true;error('library-error','');
        try{const result=await api('/api/templates/'+entry.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({listed:!entry.listed})});entry.listed=result.listed;render();$('library-status').textContent=result.listed?'Your template is available in Community.':'Template unlisted. Existing copies are unchanged.';}catch(e){error('library-error',e.message);target.disabled=false;}
      },'text-button'));
      card.append(visual,content);$('library-grid').append(card);
    }
    // Draw previews progressively so a long gallery stays responsive.
    const canvases=[...$('library-grid').querySelectorAll('canvas')];
    (async()=>{for(const [i,canvas] of canvases.entries()){if(run!==previewRun)return;await new Promise(requestAnimationFrame);if(run!==previewRun)return;try{preview(canvas,visible[i]);}catch{canvas.hidden=true;canvas.parentElement.textContent='Preview unavailable';}}})();
    const total=visible.length;
    $('library-status').textContent=total?total+' '+(total===1?'template':'templates')+' · each one becomes your own flyer':'';
    $('library-more').hidden=!cursor||source==='starters';
  }
  async function load(more=false){
    const run=++loadRun;error('library-error','');$('retry-library').hidden=true;$('library-more').hidden=true;
    if(!more){entries=[];cursor=null;}
    $('library-status').textContent='Loading templates…';
    try{
      if(source==='starters'){entries=model.starters;}
      else{const params=new URLSearchParams({q:filters.query.trim().toLowerCase(),category:filters.business,mine:source==='mine'?'1':'0'});if(more&&cursor)params.set('cursor',cursor);const data=await api('/api/templates?'+params);if(run!==loadRun)return;entries.push(...data.templates);cursor=data.cursor;}
      if(run!==loadRun)return;loaded=true;render();
      if(!entries.length)$('library-status').textContent=source==='mine'?'You have not shared any designs yet. Use “Share this design” beside your download buttons.':source==='community'?'Be the first to share a useful design. Ready-made templates are in the first tab.':'';
    }catch(e){if(run!==loadRun)return;error('library-error',e.message);$('library-status').textContent='Your flyers are safe. The shared library could not load.';$('retry-library').hidden=false;}
  }
  function syncControls(){
    document.querySelectorAll('[data-library-business]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.libraryBusiness===filters.business)));
    $('library-category').value=filters.business;$('library-promotion').value=filters.promotion;$('library-style').value=filters.style;$('library-format').value=filters.format;$('library-search').value=filters.query;
    const community=source!=='starters';$('library-style').disabled=community;$('library-style').title=community?'Shared templates are not tagged by style.':'';
  }
  function apply(changes,reload=false){
    Object.assign(filters,changes);syncControls();
    if(reload||source!=='starters')load();else render();
  }
  function selectSource(value){source=value;document.querySelectorAll('[data-library-source]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.librarySource===source)));syncControls();load();}
  document.querySelectorAll('[data-library-source]').forEach(b=>b.addEventListener('click',()=>selectSource(b.dataset.librarySource)));
  document.querySelectorAll('[data-library-business]').forEach(b=>b.addEventListener('click',()=>apply({business:b.dataset.libraryBusiness})));
  $('library-category').addEventListener('change',()=>apply({business:$('library-category').value}));
  $('library-promotion').addEventListener('change',()=>apply({promotion:$('library-promotion').value}));
  $('library-style').addEventListener('change',()=>apply({style:$('library-style').value}));
  $('library-format').addEventListener('change',()=>apply({format:$('library-format').value}));
  $('library-search-form').addEventListener('submit',e=>{e.preventDefault();apply({query:$('library-search').value});});
  $('library-search').addEventListener('input',()=>{if(source==='starters')apply({query:$('library-search').value});});
  $('library-clear').addEventListener('click',()=>{apply({business:'',promotion:'',style:'',format:'',query:''});$('library-search').focus();});
  $('retry-library').addEventListener('click',()=>load());$('library-more').addEventListener('click',()=>load(true));
  // The gallery is the opening page; reopening it refreshes shared sources only.
  window.addEventListener('shopdesk:page',event=>{if(event.detail.page!=='templates')return;if(!loaded||source!=='starters')load();});
  syncControls();if(window.ShopDeskApp?.page()==='templates'||!document.querySelector('.page:not([hidden])'))load();
  function sharedValue(){return model.create(shareDraft,$('share-template-name').value||'Untitled template',$('share-template-description').value,$('share-template-content').checked);}
  function updateShare(){
    if(!shareDraft)return;const template=sharedValue();preview($('share-template-canvas'),template,240);
    $('share-template-summary').textContent=template.includeContent?'Your headline, small heading and '+template.design.itemCount+' visible item(s)'+(template.design.purpose==='combos'?' and combo names and bundle prices':'')+', plus the design.':'Design, colours, typeface and layout only. Example products in this preview are placeholders.';
  }
  $('open-share-template').addEventListener('click',()=>{
    try{shareDraft=ShopDeskPromotion.templateSnapshot();shareId=crypto.randomUUID();$('share-template-name').value='';$('share-template-description').value='';$('share-template-content').checked=false;error('share-template-error','');updateShare();$('share-template-dialog').showModal();$('share-template-name').focus();}catch(e){$('editor-action-error').textContent=e.message;$('editor-action-error').hidden=false;}
  });
  $('close-share-template').addEventListener('click',()=>{if(!sharing)$('share-template-dialog').close();});
  $('share-template-dialog').addEventListener('cancel',e=>{if(sharing)e.preventDefault();});
  $('share-template-content').addEventListener('change',()=>{try{updateShare();}catch(e){error('share-template-error',e.message);}});
  $('share-template-form').addEventListener('submit',async e=>{
    e.preventDefault();if(sharing)return;error('share-template-error','');
    if(!$('share-template-name').value.trim()){error('share-template-error','Name your template first.');$('share-template-name').focus();return;}
    sharing=true;$('publish-template').disabled=true;$('close-share-template').disabled=true;$('publish-template').textContent='Sharing…';
    const controls=[...$('share-template-form').querySelectorAll('input,textarea')];controls.forEach(el=>el.disabled=true);
    try{await api('/api/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:shareId,template:sharedValue()})});$('share-template-dialog').close();apply({query:'',business:''});window.ShopDeskApp?.navigate('templates');selectSource('mine');}
    catch(e){error('share-template-error',e.message);}
    finally{sharing=false;$('publish-template').disabled=false;$('close-share-template').disabled=false;$('publish-template').textContent='Share template';controls.forEach(el=>el.disabled=false);}
  });
})();
