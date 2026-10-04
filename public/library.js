(() => {
  'use strict';
  const $=id=>document.getElementById(id),model=ShopDeskTemplates;
  let source='starters',cursor=null,entries=[],loadRun=0,using=false,sharing=false,shareId='',shareDraft=null;
  function error(id,message){$(id).textContent=message;$(id).hidden=!message;}
  async function api(path,options={}){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{const response=await fetch(path,{...options,credentials:'same-origin',signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'Please try again.');return data;}
    catch(e){if(e.name==='AbortError')throw new Error('The library took too long to respond. Please try again.');throw e;}finally{clearTimeout(timeout);}
  }
  function preview(canvas,template){
    const draft=model.draft(template),p=ShopDeskBusiness.get(draft.business);
    draft.items=draft.items.map((item,i)=>({...item,name:item.name||p.item+' '+(i+1),size:item.size||p.unit,price:item.price||'10.00'}));
    // Anonymous preview; no live workspace fields or image IDs are consulted.
    const full=document.createElement('canvas');ShopDeskPoster.draw(full,{...draft,shop:'Your business',phone:'',location:'',logo:'',dateText:'Your next offer',eventDateText:'Your event date'});
    canvas.width=240;canvas.height=Math.round(full.height/full.width*240);canvas.getContext('2d').drawImage(full,0,0,canvas.width,canvas.height);
  }
  function button(text,action,cls='button secondary'){const el=document.createElement('button');el.type='button';el.className=cls;el.textContent=text;el.addEventListener('click',action);return el;}
  function render(){
    $('library-grid').replaceChildren();
    for(const entry of entries){
      const card=document.createElement('article');card.className='library-card';
      const visual=document.createElement('div');visual.className='library-card-visual';const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',entry.title+' preview');preview(canvas,entry);visual.append(canvas);
      const content=document.createElement('div');content.className='library-card-content';
      const badge=document.createElement('span');badge.className='library-badge';badge.textContent=entry.starter?'ShopDesk starter':entry.listed===false?'Unlisted · only you':'Shared template';
      const title=document.createElement('h3');title.textContent=entry.title;const description=document.createElement('p');description.textContent=entry.description;
      const use=button('Use template',async()=>{
        if(using)return;using=true;error('library-error','');render();
        try{await ShopDeskPromotion.useTemplate(entry);$('library-dialog').close();}catch(e){error('library-error',e.message);$('library-error').scrollIntoView({block:'nearest'});}finally{using=false;render();}
      },'button primary');use.disabled=using;use.setAttribute('aria-label','Use '+entry.title);
      content.append(badge,title,description,use);
      if(entry.mine)content.append(button(entry.listed?'Unlist template':'List again',async event=>{
        const target=event.currentTarget;target.disabled=true;error('library-error','');
        try{const result=await api('/api/templates/'+entry.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({listed:!entry.listed})});entry.listed=result.listed;render();$('library-status').textContent=result.listed?'Your template is available in Community.':'Template unlisted. Existing copies are unchanged.';}catch(e){error('library-error',e.message);target.disabled=false;}
      },'text-button'));
      card.append(visual,content);$('library-grid').append(card);
    }
  }
  async function load(more=false){
    const run=++loadRun;error('library-error','');$('retry-library').hidden=true;$('library-more').hidden=true;
    if(!more){entries=[];cursor=null;$('library-grid').replaceChildren();}
    $('library-status').textContent='Loading templates…';
    const query=$('library-search').value.trim().toLowerCase(),category=$('library-category').value;
    try{
      if(source==='starters'){entries=model.starters.filter(t=>(!category||t.design.business===category)&&(!query||(t.title+' '+t.description).toLowerCase().includes(query)));}
      else{const params=new URLSearchParams({q:query,category,mine:source==='mine'?'1':'0'});if(more&&cursor)params.set('cursor',cursor);const data=await api('/api/templates?'+params);if(run!==loadRun)return;entries.push(...data.templates);cursor=data.cursor;}
      if(run!==loadRun)return;render();$('library-more').hidden=!cursor;
      $('library-status').textContent=entries.length?entries.length+' templates · each one becomes your own project':query||category?'No matches. Try another search or business type.':source==='mine'?'You have not shared any designs yet. Use “Share this design” in the editor.':'Be the first to share a useful design. Ready-to-use starters are available in the first tab.';
    }catch(e){if(run!==loadRun)return;error('library-error',e.message);$('library-status').textContent='Your projects are safe. The library could not load.';$('retry-library').hidden=false;}
  }
  function selectSource(value){source=value;document.querySelectorAll('[data-library-source]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.librarySource===source)));load();}
  $('open-library').addEventListener('click',()=>{$('library-dialog').showModal();load();});
  $('close-library').addEventListener('click',()=>$('library-dialog').close());
  $('library-dialog').addEventListener('close',()=>{loadRun++;});
  document.querySelectorAll('[data-library-source]').forEach(b=>b.addEventListener('click',()=>selectSource(b.dataset.librarySource)));
  $('library-search-form').addEventListener('submit',e=>{e.preventDefault();load();});$('library-category').addEventListener('change',()=>load());
  $('retry-library').addEventListener('click',()=>load());$('library-more').addEventListener('click',()=>load(true));
  function sharedValue(){return model.create(shareDraft,$('share-template-name').value||'Untitled template',$('share-template-description').value,$('share-template-content').checked);}
  function updateShare(){
    if(!shareDraft)return;const template=sharedValue();preview($('share-template-canvas'),template);
    $('share-template-summary').textContent=template.includeContent?'Your headline, small heading and '+template.design.itemCount+' visible item(s)'+(template.design.purpose==='combos'?' and combo names and bundle prices':'')+', plus the design.':'Design, colours, typeface and layout only. Example products in this preview are placeholders.';
  }
  $('open-share-template').addEventListener('click',()=>{
    try{shareDraft=ShopDeskPromotion.templateSnapshot();shareId=crypto.randomUUID();$('share-template-name').value='';$('share-template-description').value='';$('share-template-content').checked=false;error('share-template-error','');updateShare();$('share-template-dialog').showModal();$('share-template-name').focus();}catch(e){error('library-error',e.message);$('library-dialog').showModal();}
  });
  $('close-share-template').addEventListener('click',()=>{if(!sharing)$('share-template-dialog').close();});
  $('share-template-dialog').addEventListener('cancel',e=>{if(sharing)e.preventDefault();});
  $('share-template-content').addEventListener('change',()=>{try{updateShare();}catch(e){error('share-template-error',e.message);}});
  $('share-template-form').addEventListener('submit',async e=>{
    e.preventDefault();if(sharing)return;error('share-template-error','');
    if(!$('share-template-name').value.trim()){error('share-template-error','Name your template first.');$('share-template-name').focus();return;}
    sharing=true;$('publish-template').disabled=true;$('close-share-template').disabled=true;$('publish-template').textContent='Sharing…';
    const controls=[...$('share-template-form').querySelectorAll('input,textarea')];controls.forEach(el=>el.disabled=true);
    try{await api('/api/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:shareId,template:sharedValue()})});$('share-template-dialog').close();$('library-search').value='';$('library-category').value='';$('library-dialog').showModal();selectSource('mine');}
    catch(e){error('share-template-error',e.message);}
    finally{sharing=false;$('publish-template').disabled=false;$('close-share-template').disabled=false;$('publish-template').textContent='Share template';controls.forEach(el=>el.disabled=false);}
  });
})();
