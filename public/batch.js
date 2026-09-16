(() => {
  'use strict';
  const $=id=>document.getElementById(id),api=window.ShopDeskPromotion;
  let bulkRows=[],bulkContext='',bulkBusy=false,savedContext='',savedProducts=[],savedSelection=new Map(),savedBusy=false,photoIndex=-1,photoContext='';
  function message(id,text){$(id).textContent=text;$(id).hidden=!text;}
  function launchError(error){message('editor-action-error',error.message||'This tool could not open. Please reopen ShopDesk and try again.');$('editor-action-error').focus();}
  function state(){
    message('editor-action-error','');
    if(typeof api?.itemState!=='function')throw new Error('The editor has not finished loading. Reopen ShopDesk to load the latest controls. Your saved projects are kept.');
    const value=api.itemState();if(!value.ready)throw new Error(value.unavailableReason||'Wait for your project to load, then try again.');return value;
  }
  function showBulkSummary(){
    const available=api.itemState().available,invalid=bulkRows.filter(row=>ShopDeskItems.error(row)).length;
    $('bulk-summary').textContent=bulkRows.length+' items · '+available+' spaces available'+(invalid?' · '+invalid+' need attention':'');
    $('apply-bulk').disabled=bulkBusy||!bulkRows.length||!!invalid||bulkRows.length>available;
    $('apply-bulk').textContent='Add '+bulkRows.length+' '+(bulkRows.length===1?'item':'items')+' to flyer';
    message('bulk-error',bulkRows.length>available?'This list has more items than the available spaces. Remove rows from this review or make room in the flyer.':'');
  }
  function renderBulk(){
    $('bulk-rows').replaceChildren();
    bulkRows.forEach((row,index)=>{
      const card=document.createElement('div');card.className='bulk-row';
      const heading=document.createElement('div');heading.className='bulk-row-heading';const title=document.createElement('strong');title.textContent='Item '+(index+1);
      const remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='Remove';remove.setAttribute('aria-label','Remove item '+(index+1)+' from the import');remove.addEventListener('click',()=>{bulkRows.splice(index,1);renderBulk();});heading.append(title,remove);card.append(heading);
      const error=document.createElement('p');error.className='validation';error.id='import-error-'+index;error.textContent=ShopDeskItems.error(row);error.hidden=!error.textContent;
      for(const [key,label,max] of [['name','Name',50],['size','Pack / details',25],['price','Price (R)',20]]){
        const wrap=document.createElement('label');wrap.className='field bulk-'+key;wrap.append(document.createTextNode(label));const input=document.createElement('input');input.value=row[key];input.maxLength=max;input.setAttribute('aria-describedby',error.id);
        if(key==='price'){input.inputMode='decimal';input.placeholder='e.g. 120.00';}
        input.addEventListener('input',()=>{row[key]=input.value;error.textContent=ShopDeskItems.error(row);error.hidden=!error.textContent;showBulkSummary();});wrap.append(input);card.append(wrap);
      }
      card.append(error);$('bulk-rows').append(card);
    });showBulkSummary();
  }
  $('open-bulk').addEventListener('click',()=>{
    try{bulkContext=state().context;bulkRows=[];$('bulk-source').value='';$('bulk-entry').hidden=false;$('bulk-review').hidden=true;message('bulk-error','');$('bulk-dialog').showModal();$('bulk-source').focus();}catch(e){launchError(e);}
  });
  $('close-bulk').addEventListener('click',()=>$('bulk-dialog').close());
  $('review-bulk').addEventListener('click',()=>{
    try{bulkRows=ShopDeskItems.parse($('bulk-source').value);$('bulk-entry').hidden=true;$('bulk-review').hidden=false;renderBulk();$('bulk-rows').querySelector('input')?.focus();}catch(e){message('bulk-error',e.message);}
  });
  $('back-bulk').addEventListener('click',()=>{$('bulk-entry').hidden=false;$('bulk-review').hidden=true;message('bulk-error','');$('bulk-source').focus();});
  $('apply-bulk').addEventListener('click',async()=>{
    if(bulkBusy)return;bulkBusy=true;showBulkSummary();
    try{await api.addBatch(bulkRows,bulkContext);$('bulk-dialog').close();}catch(e){message('bulk-error',e.message);}finally{bulkBusy=false;$('apply-bulk').disabled=!bulkRows.length||bulkRows.some(row=>ShopDeskItems.error(row))||bulkRows.length>api.itemState().available;}
  });
  function selectionStatus(){
    const available=api.itemState().available,error=[...savedSelection.values()].map(ShopDeskItems.error).find(Boolean);
    $('saved-selection-count').textContent=savedSelection.size+' selected · '+available+' spaces available';
    $('apply-saved-selection').disabled=savedBusy||!savedSelection.size||savedSelection.size>available||!!error;
    $('apply-saved-selection').textContent='Add '+savedSelection.size+' selected '+(savedSelection.size===1?'item':'items');
    message('saved-grid-error',error||(available===0?'This flyer has no empty spaces. Close this window and remove an existing item, or create a new project to choose a different product list.':''));
    for(const checkbox of $('saved-product-grid').querySelectorAll('input[type="checkbox"]'))checkbox.disabled=!checkbox.checked&&savedSelection.size>=available;
  }
  function renderSavedGrid(){
    const query=$('saved-search').value.trim().toLowerCase(),visible=savedProducts.filter(item=>(item.name+' '+item.size).toLowerCase().includes(query));
    $('saved-product-grid').replaceChildren();$('saved-grid-empty').hidden=visible.length>0;
    $('saved-grid-empty').textContent=savedProducts.length?'No products match this search. Your selections are kept.':'No saved products yet. Save items from your flyer to reuse their photos and prices.';
    for(const product of visible){
      const selected=savedSelection.get(product.id),card=document.createElement('article');card.className='saved-product-card';card.classList.toggle('selected',!!selected);
      const choice=document.createElement('label');choice.className='saved-product-choice';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=!!selected;checkbox.setAttribute('aria-label','Select '+product.name);choice.append(checkbox);
      const imageBox=document.createElement('div');imageBox.className='saved-product-image';
      if(product.photo){const img=document.createElement('img');img.src='/api/photos/'+product.photo;img.alt='';img.loading='lazy';img.addEventListener('error',()=>{img.remove();imageBox.textContent='Photo unavailable';});imageBox.append(img);}else imageBox.textContent='No photo';
      const name=document.createElement('strong');name.textContent=product.name;const detail=document.createElement('span');detail.textContent=product.size||'Each';choice.append(imageBox,name,detail);card.append(choice);
      const priceLabel=document.createElement('label');priceLabel.className='field saved-grid-price';priceLabel.append(document.createTextNode('Flyer price (R)'));const price=document.createElement('input');price.type='text';price.inputMode='decimal';price.maxLength=20;price.value=(selected||product).price;price.disabled=!selected;price.setAttribute('aria-label','Flyer price for '+product.name);
      price.addEventListener('input',()=>{const row=savedSelection.get(product.id);if(row)row.price=price.value;selectionStatus();});priceLabel.append(price);card.append(priceLabel);
      checkbox.addEventListener('change',()=>{
        if(checkbox.checked){if(savedSelection.size>=api.itemState().available){checkbox.checked=false;return;}savedSelection.set(product.id,ShopDeskItems.copy(product,false));}
        else savedSelection.delete(product.id);
        card.classList.toggle('selected',checkbox.checked);price.disabled=!checkbox.checked;price.value=(savedSelection.get(product.id)||product).price;selectionStatus();
      });$('saved-product-grid').append(card);
    }selectionStatus();
  }
  $('open-saved-grid').addEventListener('click',()=>{
    try{const current=state();savedContext=current.context;savedProducts=current.products;savedSelection.clear();$('saved-search').value='';renderSavedGrid();$('saved-grid-dialog').showModal();$('saved-search').focus();}catch(e){launchError(e);}
  });
  $('close-saved-grid').addEventListener('click',()=>$('saved-grid-dialog').close());
  $('saved-search').addEventListener('input',renderSavedGrid);
  $('clear-saved-selection').addEventListener('click',()=>{savedSelection.clear();renderSavedGrid();});
  $('apply-saved-selection').addEventListener('click',async()=>{
    if(savedBusy)return;savedBusy=true;selectionStatus();
    try{await api.addBatch([...savedSelection.values()],savedContext);$('saved-grid-dialog').close();}catch(e){message('saved-grid-error',e.message);}finally{savedBusy=false;$('apply-saved-selection').disabled=!savedSelection.size||[...savedSelection.values()].some(row=>ShopDeskItems.error(row))||savedSelection.size>api.itemState().available;}
  });
  function updatePhotoPreview(){
    if(!$('photo-adjust-dialog').open)return;
    const value=api.photoPreview(photoIndex,photoContext);if(!value){$('photo-adjust-dialog').close();return;}
    const {item,canvas,card,warnings}=value,target=$('photo-adjust-canvas');target.width=Math.ceil(card.w);target.height=Math.ceil(card.h);
    target.getContext('2d').drawImage(canvas,card.x,card.y,card.w,card.h,0,0,target.width,target.height);
    $('photo-adjust-name').textContent=item.name||'Your product';
    $('photo-scale-value').value=Math.round((item.photoScale??1)*100)+'%';
    $('photo-x-value').value=item.photoX?Math.round(Math.abs(item.photoX)*100)+'% '+(item.photoX<0?'left':'right'):'Centre';
    $('photo-y-value').value=item.photoY?Math.round(Math.abs(item.photoY)*100)+'% '+(item.photoY<0?'up':'down'):'Centre';
    message('photo-adjust-warning',warnings.length?'This photo may look blurry at this size. Try a larger image or reduce the photo size.':'');
  }
  function syncSliders(){const value=api.photoPreview(photoIndex,photoContext);if(!value)return;$('photo-scale').value=(value.item.photoScale??1)*100;$('photo-x').value=(value.item.photoX??0)*100;$('photo-y').value=(value.item.photoY??0)*100;}
  window.addEventListener('shopdesk:adjust-photo',event=>{
    try{photoContext=state().context;photoIndex=event.detail.index;if(!api.photoPreview(photoIndex,photoContext))throw new Error('This photo is not available in the current flyer. Choose the item again or add its photo.');syncSliders();$('photo-adjust-dialog').showModal();updatePhotoPreview();}catch(e){launchError(e);}
  });
  for(const id of ['photo-scale','photo-x','photo-y'])$(id).addEventListener('input',()=>{
    try{api.setPhotoFrame(photoIndex,{photoScale:Number($('photo-scale').value)/100,photoX:Number($('photo-x').value)/100,photoY:Number($('photo-y').value)/100},photoContext);}catch(e){message('photo-adjust-warning',e.message);}
  });
  $('reset-photo-adjust').addEventListener('click',()=>{try{api.setPhotoFrame(photoIndex,{},photoContext);syncSliders();}catch(e){message('photo-adjust-warning',e.message);}});
  $('close-photo-adjust').addEventListener('click',()=>$('photo-adjust-dialog').close());
  window.addEventListener('shopdesk:preview',updatePhotoPreview);
})();
