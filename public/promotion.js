(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const iso=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const money=n=>'R'+Number(n).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
  let items=[{name:'Potatoes',size:'1 kg pack',price:'10.00',photo:''}],products=[],revision=0,ready=false,dirty=false,saving=false,blocked=false,change=0,saveTimer,toastTimer;
  let selectedCount=1,lastLayout=null,lastRemoval=null,exportBusy=false;
  let lastSaveError=false,pendingPhotos=0,logo='',heroPhoto='',finishingChosen=false;
  let studioState=null,loadingWorkspace=false,createKind='client';
  let packRun=0,packBusy=false,packZip=null,packText='',packName='',packURLs=[];
  const images=new Map(),imageErrors=new Set(),imageLoads=new Map(),photoBlobs=new Map(),photoThumbs=new Map();
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
  function status(message,error=false){$('save-status').textContent=message;$('save-status').dataset.state=message==='All changes saved'?'saved':error?'error':'pending';$('save-status').classList.toggle('save-error',error);}
  async function api(path,options={}) {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
    try {const response=await fetch(path,{...options,credentials:'same-origin',signal:controller.signal});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Please try again.'),{status:response.status});return data;}
    catch(e){if(e.name==='AbortError')throw new Error('The connection took too long. Your edits are still here; try again.');throw e;}
    finally{clearTimeout(timeout);}
  }
  function dateText(value){if(!value)return 'your selected date';const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?'your selected date':d.toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});}
  function profile(){return ShopDeskBusiness.get($('business-type').value);}
  function announcement(){return ['event','opening'].includes($('flyer-purpose').value);}
  function capacity(){return $('flyer-purpose').value==='spotlight'?1:$('poster-template').value==='simple'?3:25;}
  function activeCount(){return Math.min(selectedCount,capacity());}
  function activeItems(){return items.slice(0,activeCount());}
  function snapshot(){return {shop:{name:$('shop-name').value,phone:$('promo-phone').value,location:$('promo-location').value,logo},products:products.map(p=>({...p})),draft:{...($('logo-size').value==='compact'?{logoSize:'compact'}:{}),exportQuality:$('export-quality').value,keepColours:$('keep-colours').checked,typeface:$('poster-typeface').value,priceStyle:$('price-style').value,itemCount:selectedCount,purpose:$('flyer-purpose').value,details:$('promo-details').value,eventDate:$('event-date').value,eventTime:$('event-time').value,venue:$('event-venue').value,heroPhoto,business:$('business-type').value,eyebrow:$('promo-eyebrow').value,cta:$('promo-cta').value,terms:$('promo-terms').value,showDate:$('show-date').checked,headline:$('promo-headline').value,date:$('promo-date').value,startDate:$('promo-start-date').value,theme:$('promo-theme').value,template:$('poster-template').value,trimPhotos:$('trim-photos').checked,cleanNames:$('clean-names').checked,format:document.querySelector('[name="poster-format"]:checked').value,items:items.map(item=>ShopDeskItems.copy(item))}};}
  function capture(){if(studioState)studioState=ShopDeskStudio.capture(studioState,snapshot(),$('project-name').value);}
  function changed(){if(!ready)return;capture();renderDesigner();dirty=true;change++;if(!blocked){status('Unsaved changes');clearTimeout(saveTimer);saveTimer=setTimeout(save,900);}draw();}
  async function save(){
    if(!ready||!dirty||saving||blocked||pendingPhotos)return;
    saving=true;lastSaveError=false;status('Saving…');const version=change;
    try{const result=await api('/api/studio',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,data:studioState})});revision=result.revision;dirty=version!==change;$('workspace-error').hidden=true;$('retry-save').hidden=true;status(dirty?'Saving your latest changes…':'All changes saved');}
    catch(e){lastSaveError=true;status('Changes not saved',true);$('workspace-error').textContent=e.message;$('workspace-error').hidden=false;if(e.status===409){blocked=true;$('reload-workspace').hidden=false;$('retry-save').hidden=true;}else $('retry-save').hidden=false;}
    finally{saving=false;renderDesigner();if(dirty&&!blocked&&!lastSaveError)saveTimer=setTimeout(save,150);}
  }
  function applyWorkspace(data,title){
    lastRemoval=null;$('logo-size').value=data.draft.logoSize||'prominent';$('export-quality').value=data.draft.exportQuality||'standard';const d=data.draft,p=ShopDeskBusiness.get(d.business);$('keep-colours').checked=d.keepColours??false;
    $('poster-typeface').value=d.typeface||'design';$('price-style').value=d.priceStyle||'design';
    $('project-name').value=title;$('business-type').value=d.business||'grocery';$('promo-eyebrow').value=d.eyebrow??p.eyebrow;$('promo-cta').value=d.cta??p.cta;$('promo-terms').value=d.terms??p.terms;$('show-date').checked=d.showDate??true;
    $('shop-name').value=data.shop.name;$('promo-phone').value=data.shop.phone;$('promo-location').value=data.shop.location;logo=data.shop.logo||'';
    $('promo-headline').value=d.headline;$('promo-date').value=d.date;$('promo-start-date').value=d.startDate||'';$('promo-theme').value=d.theme;$('poster-template').value=d.template||'simple';$('trim-photos').checked=d.trimPhotos??false;$('clean-names').checked=d.cleanNames??false;
    $('flyer-purpose').value=d.purpose||'offers';$('promo-details').value=d.details||'';$('event-date').value=d.eventDate||'';$('event-time').value=d.eventTime||'';$('event-venue').value=d.venue||'';heroPhoto=d.heroPhoto||'';
    finishingChosen=d.trimPhotos!==undefined||d.cleanNames!==undefined;document.querySelector('[name="poster-format"][value="'+d.format+'"]').checked=true;
    items=structuredClone(d.items);selectedCount=d.itemCount??items.length;products=structuredClone(data.products);
    renderBusiness();renderItems();renderSaved();renderLogo();renderHero();renderDesigner();
  }
  async function showActive(){
    loadingWorkspace=true;$('promo-fields').disabled=true;renderDesigner();
    images.clear();photoBlobs.clear();photoThumbs.clear();imageErrors.clear();const {client,project}=ShopDeskStudio.active(studioState);applyWorkspace({shop:client.shop,products:client.products,draft:project.draft},project.title);draw();
    await preloadPhotos();loadingWorkspace=false;$('promo-fields').disabled=false;renderDesigner();draw();
  }
  async function loadWorkspace(){
    if(saving)return;loadingWorkspace=true;status('Loading your clients and projects…');$('promo-fields').disabled=true;$('designer-fields').disabled=true;$('retry-save').hidden=true;$('reload-workspace').hidden=true;
    try{const result=await api('/api/studio');revision=result.revision;
      studioState=ShopDeskStudio.upgrade(result.data,snapshot());ready=true;dirty=false;blocked=false;lastSaveError=false;$('workspace-error').hidden=true;
      await showActive();status(result.data?'All changes saved':'Your changes will save automatically');
      if(result.data?.schemaVersion!==2)changed();
    }catch(e){ready=false;loadingWorkspace=false;status('Could not load your projects',true);$('workspace-error').textContent=e.message;$('workspace-error').hidden=false;$('retry-save').hidden=false;renderDesigner();draw();}
  }
  function renderDesigner(){
    $('designer-fields').disabled=!ready||loadingWorkspace||pendingPhotos>0||blocked||exportBusy||packBusy;
    $('start-project').disabled=$('designer-fields').disabled;
    $('open-projects').disabled=$('designer-fields').disabled;
    $('open-share-template').disabled=$('designer-fields').disabled;
    if(!studioState)return;
    const fill=(id,entries,value)=>{const select=$(id);select.replaceChildren();for(const [key,label] of entries){const o=document.createElement('option');o.value=key;o.textContent=label;select.append(o);}select.value=value;};
    const {client}=ShopDeskStudio.active(studioState);
    fill('client-picker',studioState.clients.map(c=>[c.id,c.shop.name||'Unnamed client']),studioState.activeClientId);
    fill('project-picker',client.projects.map(p=>[p.id,p.title]),studioState.activeProjectId);
    const count=studioState.clients.reduce((n,c)=>n+c.projects.length,0);$('studio-count').textContent=studioState.clients.length+' / 20 clients · '+count+' / 100 projects';
    $('new-client').disabled=studioState.clients.length>=20||count>=100;$('new-project').disabled=count>=100;$('duplicate-project').disabled=count>=100;$('start-project').disabled=$('designer-fields').disabled||count>=100;
  }
  async function switchProject(clientId,projectId){
    if(!ready||loadingWorkspace||pendingPhotos||blocked){renderDesigner();return;}
    capture();studioState=ShopDeskStudio.select(studioState,clientId,projectId);dirty=true;change++;await showActive();changed();
  }
  $('client-picker').addEventListener('change',event=>switchProject(event.target.value));
  $('project-picker').addEventListener('change',event=>switchProject(studioState.activeClientId,event.target.value));
  function openCreate(kind){
    if(!ready||loadingWorkspace||pendingPhotos||blocked)return;createKind=kind;const client=kind==='client';
    $('studio-dialog-title').textContent=client?'New client':'New project';$('create-studio-entry').textContent=client?'Create client':'Create project';$('new-client-fields').hidden=!client;$('new-client-name').required=client;
    $('new-client-name').value='';$('new-project-name').value='';$('new-client-business').value=$('business-type').value;$('new-project-purpose').value='offers';$('studio-create-error').hidden=true;$('studio-dialog').showModal();
    $(client?'new-client-name':'new-project-name').focus();
  }
  $('new-client').addEventListener('click',()=>openCreate('client'));$('new-project').addEventListener('click',()=>openCreate('project'));
  $('start-project').addEventListener('click',()=>openCreate('project'));
  $('close-studio-dialog').addEventListener('click',()=>$('studio-dialog').close());
  $('studio-create-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!ready||loadingWorkspace||pendingPhotos||blocked)return;
    try{const title=$('new-project-name').value.trim(),name=$('new-client-name').value.trim();if(!title||(createKind==='client'&&!name))throw new Error('Enter the client and project names.');capture();
      studioState=createKind==='client'?ShopDeskStudio.addClient(studioState,name,$('new-client-business').value,$('new-project-purpose').value,title):ShopDeskStudio.addProject(studioState,title,$('new-project-purpose').value);
      dirty=true;change++;$('studio-dialog').close();await showActive();changed();clearTimeout(saveTimer);save();toast(createKind==='client'?'Your new client is ready.':'Your new project is ready.');
    }catch(e){$('studio-create-error').textContent=e.message;$('studio-create-error').hidden=false;}
  });
  $('duplicate-project').addEventListener('click',async()=>{
    if(!ready||loadingWorkspace||pendingPhotos||blocked)return;
    try{capture();studioState=ShopDeskStudio.duplicate(studioState);dirty=true;change++;await showActive();changed();clearTimeout(saveTimer);save();toast('Separate copy created. Give it a name and update the offers.');}catch(e){toast(e.message);}
  });
  $('retry-save').addEventListener('click',()=>ready?save():loadWorkspace());
  $('reload-workspace').addEventListener('click',()=>{if(!dirty||confirm('Reload the saved version? Changes in this tab that have not saved will be discarded.')){clearTimeout(saveTimer);loadWorkspace();}});
  window.addEventListener('beforeunload',event=>{if(dirty||saving||pendingPhotos){event.preventDefault();event.returnValue='';}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty)save();});
  function field(label,value,type,changeValue,maxLength){
    const el=document.createElement('label');el.className='field';el.append(document.createTextNode(label));const input=document.createElement('input');input.type=type;input.value=value;if(maxLength)input.maxLength=maxLength;
    if(type==='number'){input.min='.01';input.max='1000000';input.step='.01';input.inputMode='decimal';}
    input.addEventListener('input',()=>{changeValue(input.value);changed();});el.append(input);return el;
  }
  function button(text,cls,click){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.addEventListener('click',click);return b;}
  function normalSize(s){return s.trim().replace(/(\d)\s*\.\s*(kg|g|l|ml)\b/gi,'$1 $2').replace(/(\d)\s*(kg|g|l|ml)\b/gi,'$1 $2');}
  function focusItem(index,selector){
    const card=$('promo-items').children[index];if(!card)return;
    card.open=true;(card.querySelector(selector)||card.querySelector('summary')).focus();
  }
  function moveItem(item,step){
    try{
      assertEditable(batchContext());const index=items.indexOf(item),next=index+step;
      if(index<0||next<0||next>=activeCount())return;
      [items[index],items[next]]=[items[next],items[index]];
      renderItems();changed();focusItem(next,'.move-item:not(:disabled)');
      toast((item.name||'Item')+' moved to position '+(next+1)+'.');
    }catch(e){toast(e.message);}
  }
  function removeItem(item){
    try{
      assertEditable(batchContext());const index=items.indexOf(item),count=activeCount();
      if(index<0||index>=count||count<=1)return;
      lastRemoval={item:ShopDeskItems.copy(item),index,context:batchContext()};
      items.splice(index,1);selectedCount=count-1;renderItems();changed();$('undo-remove-item').focus();
    }catch(e){toast(e.message);}
  }
  function updateUndo(){
    $('item-undo').hidden=!lastRemoval;if(!lastRemoval)return;
    const full=items.length>=25||activeCount()>=capacity();
    $('item-undo-message').textContent=(lastRemoval.item.name||'Item')+' removed.'+(full?' Make room to restore it.':'');
    $('undo-remove-item').disabled=full||!ready||loadingWorkspace||pendingPhotos>0||blocked||exportBusy||packBusy;
  }
  $('undo-remove-item').addEventListener('click',()=>{
    try{
      if(!lastRemoval)return;assertEditable(lastRemoval.context);
      if(items.length>=25||activeCount()>=capacity()){toast('Make room in this flyer before restoring the item.');return;}
      const {item,index}=lastRemoval,count=activeCount(),position=Math.min(index,count);
      if(items.some(other=>other.featured))delete item.featured;
      items.splice(position,0,item);selectedCount=count+1;lastRemoval=null;
      renderItems();changed();focusItem(position,'input[type="text"]');toast((item.name||'Item')+' restored.');
    }catch(e){toast(e.message);}
  });
  function renderItems(){
    const list=$('promo-items'),opened=new Set([...list.querySelectorAll('details[open]')].map(el=>Number(el.dataset.index)));const wasEmpty=!list.children.length;list.replaceChildren();
    activeItems().forEach((item,index)=>{
      const featured=item.featured&&$('flyer-purpose').value==='offers'&&$('poster-template').value!=='simple';
      const box=document.createElement('details');box.className='promo-item'+(featured?' is-featured':'');box.dataset.index=String(index);box.open=opened.has(index)||(wasEmpty&&index===0);
      const heading=document.createElement('summary');heading.className='item-heading';
      const number=document.createElement('span');number.className='item-index';number.textContent=featured?'★':String(index+1);number.setAttribute('aria-label',featured?'Featured offer':String(index+1));
      const title=document.createElement('span');title.className='item-title';title.textContent=item.name||'New '+profile().item.toLowerCase();
      const price=document.createElement('span');price.className='item-price';price.textContent=(item.dealQuantity?item.dealQuantity+' for ':'')+(item.price&&Number(item.price)>0?money(item.price):'Add price');
      const chevron=document.createElement('span');chevron.className='item-chevron';chevron.textContent='⌄';chevron.setAttribute('aria-hidden','true');heading.append(number,title,price,chevron);
      const itemActions=document.createElement('div');itemActions.className='item-actions';
      if(activeCount()>1)itemActions.append(button('Remove','remove-item',()=>removeItem(item)));
      const order=document.createElement('div');order.className='item-order';
      if(activeCount()>1)for(const [step,label] of [[-1,'Move up'],[1,'Move down']]){
        const control=button((step<0?'↑ ':'↓ ')+label,'text-button move-item',()=>moveItem(item,step));
        control.dataset.step=String(step);control.setAttribute('aria-label',label+' item '+(index+1));
        control.disabled=index+step<0||index+step>=activeCount();order.append(control);
      }
      if($('flyer-purpose').value==='offers'&&$('poster-template').value!=='simple'){
        const feature=button(item.featured?'★ Featured · remove':'☆ Feature this offer','text-button feature-offer',()=>{
          const selected=!!item.featured;for(const other of items)delete other.featured;if(!selected)item.featured=true;renderItems();changed();
        });feature.setAttribute('aria-pressed',String(!!item.featured));itemActions.append(feature);
      }
      const photoRow=document.createElement('div');photoRow.className='photo-row';const thumb=document.createElement('div');thumb.className='photo-thumb';
      if(item.photo){const img=document.createElement('img');img.alt=item.name||'Offer photo';setPhotoThumb(img,item.photo);img.addEventListener('error',()=>{img.hidden=true;thumb.textContent='Photo unavailable';});thumb.append(img);}else{thumb.textContent='Your photo';}
      const photoActions=document.createElement('div');photoActions.className='photo-actions';const uploadLabel=document.createElement('label');uploadLabel.className='photo-upload';uploadLabel.append(document.createTextNode(item.photo?'Change photo':'Add photo'));
      const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.setAttribute('aria-label','Choose photo for item '+(index+1));file.addEventListener('change',()=>{if(file.files[0])uploadPhoto(item,file.files[0],uploadLabel,file);});uploadLabel.append(file);photoActions.append(uploadLabel);
      const hint=document.createElement('span');hint.className='field-help';hint.textContent='JPG, PNG or WebP · full image kept';photoActions.append(hint);
      if(item.photo){photoActions.append(button('Adjust size & position','text-button',()=>window.dispatchEvent(new CustomEvent('shopdesk:adjust-photo',{detail:{index}}))));photoActions.append(button('Remove photo','text-button',()=>{item.photo='';for(const key of ['photoScale','photoX','photoY'])delete item[key];renderItems();changed();}));}
      photoRow.append(thumb,photoActions);const name=field(profile().item+' name',item.name,'text',v=>item.name=v,50);name.classList.add('full');const row=document.createElement('div');row.className='field-row';
      const sizeField=field(profile().size,item.size,'text',v=>item.size=v,25);sizeField.querySelector('input').placeholder=profile().example;sizeField.querySelector('input').addEventListener('blur',e=>{item.size=normalSize(item.size);e.target.value=item.size;changed();});
      row.append(sizeField,field('Price (R)',item.price,'number',v=>item.price=v));
      const deal=document.createElement('details');deal.className='offer-options';deal.open=!!item.dealQuantity;
      const dealSummary=document.createElement('summary');dealSummary.textContent='Multi-buy offer';
      const dealLabel=document.createElement('label');dealLabel.className='field';dealLabel.append(document.createTextNode('Price covers'));
      const quantity=document.createElement('select');quantity.className='deal-quantity';
      for(let count=1;count<=Math.max(24,item.dealQuantity||1);count++){const option=document.createElement('option');option.value=String(count);option.textContent=count===1?'One item · normal price':count+' items for this price';quantity.append(option);}
      quantity.value=String(item.dealQuantity||1);quantity.addEventListener('change',()=>{const value=Number(quantity.value);if(value===1)delete item.dealQuantity;else item.dealQuantity=value;price.textContent=(item.dealQuantity?item.dealQuantity+' for ':'')+(item.price&&Number(item.price)>0?money(item.price):'Add price');changed();});
      const dealHelp=document.createElement('p');dealHelp.className='field-help';dealHelp.textContent='The price above is the total for this many items. Choose 2 to show “2 for” on the flyer and caption.';
      dealLabel.append(quantity);deal.append(dealSummary,dealLabel,dealHelp);
      const saveProduct=button('Save to my items','text-button save-product',()=>{
        if(!item.name.trim()||item.price===''||Number(item.price)<=0||!Number.isFinite(Number(item.price))){toast('Enter a name and a price above zero first.');return;}
        const found=products.find(p=>p.name.trim().toLowerCase()===item.name.trim().toLowerCase()&&p.size.trim().toLowerCase()===item.size.trim().toLowerCase());
        if(!found&&products.length>=100){toast('You can keep up to 100 saved items.');return;}
        const value={id:found?.id||crypto.randomUUID(),...ShopDeskItems.copy(item,false)};if(found)products[products.indexOf(found)]=value;else products.push(value);
        renderSaved();changed();clearTimeout(saveTimer);save();toast(found?'Item updated. Waiting for the saved confirmation.':'Item added to your list. Waiting for the saved confirmation.');
      });
      name.querySelector('input').addEventListener('input',()=>title.textContent=item.name||'New '+profile().item.toLowerCase());
      row.querySelector('input[type="number"]').addEventListener('input',()=>price.textContent=(item.dealQuantity?item.dealQuantity+' for ':'')+(item.price&&Number(item.price)>0?money(item.price):'Add price'));
      itemActions.prepend(saveProduct);const body=document.createElement('div');body.className='item-body';body.append(photoRow,name,row,deal,itemActions,order);box.append(heading,body);list.append(box);
    });
    $('item-count').textContent=activeCount()+' of '+capacity();$('add-item').disabled=activeCount()>=capacity();
    $('product-count').value=String(selectedCount);
    for(const option of $('product-count').options)option.disabled=Number(option.value)>capacity();
    const kept=items.length-activeCount();
    $('product-count-hint').textContent='The layout fits '+activeCount()+' '+(activeCount()===1?'item':'items')+'.'+(kept?' '+kept+' extra '+(kept===1?'item is':'items are')+' kept in this project. Increase the count to show them again.':' Select any amount from 1 to '+capacity()+'.');
    $('add-item').textContent=kept?'+ Show next saved item':'+ Add a new '+profile().item.toLowerCase();
    $('poster-template').querySelector('[value="simple"]').disabled=activeCount()>3;
    const hints={super:'A compact sale banner, oversized price tickets and a strong contact strip. Fits up to 25 items.',ribbon:'An angled heading, framed product cards and a split contact footer. Fits up to 25 items.',signature:'An editorial masthead, refined price labels and a framed footer. Fits up to 25 items.',boutique:'A quiet, elegant collection with spacious photos and understated prices. Fits up to 25 items.',menu:'A warm menu with easy-to-scan rows, portion labels and optional food photos. Fits up to 25 items.',studio:'A polished price list for treatments and services. Works with or without photos, up to 25 offers.',bold:'A large headline and bold yellow price tickets. Fits up to 25 offers.',market:'A clean layout with simple prices and more space around each offer. Fits up to 25 offers.',retail:'Your classic shop flyer with strong pack labels and yellow prices. Fits up to 25 offers.',simple:'A spacious design for one to three offers.'};
    $('template-hint').textContent=ShopDeskPoster.collection[$('poster-template').value]?.hint?ShopDeskPoster.collection[$('poster-template').value].hint+' Fits 1–25 items.':hints[$('poster-template').value];
    updatePicker();
  }
  function renderSaved(){const select=$('saved-product'),value=select.value;select.replaceChildren();const first=document.createElement('option');first.value='';first.textContent=products.length?'Choose an item or service…':'No saved items yet';select.append(first);
    for(const product of products){const option=document.createElement('option');option.value=product.id;option.textContent=product.name+(product.size?' · '+product.size:'')+' · '+(product.dealQuantity?product.dealQuantity+' for ':'')+money(product.price);select.append(option);}select.value=value;updatePicker();
    $('saved-hint').textContent=products.length?products.length+' saved '+(products.length===1?'item':'items')+'. Select one to reuse its photo and price.':'Save an item below to reuse its details and photo.';
  }
  function emptySlot(){return activeItems().findIndex(i=>!i.name.trim()&&!i.price&&!i.size.trim()&&!i.photo);}
  function insertProduct(product){
    const blank=emptySlot();
    if(blank>=0)items[blank]={...product};
    else if(activeCount()<capacity()&&items.length<25){items.splice(activeCount(),0,{...product});selectedCount=activeCount()+1;}
    else return false;
    renderItems();changed();return true;
  }
  function updatePicker(){$('use-saved').disabled=!ready||!$('saved-product').value||(emptySlot()<0&&(activeCount()>=capacity()||items.length>=25));}
  $('saved-product').addEventListener('change',updatePicker);
  $('use-saved').addEventListener('click',async()=>{const p=products.find(p=>p.id===$('saved-product').value);if(!p||!insertProduct(ShopDeskItems.copy(p,false)))return;await preloadPhotos();draw();});
  $('add-item').addEventListener('click',async()=>{if(pendingPhotos)return;if(activeCount()<capacity()){const next=ShopDeskBusiness.resizeItems(items,activeCount()+1);items=next.items;selectedCount=next.itemCount;renderItems();changed();$('promo-items').lastElementChild.open=true;$('promo-items').lastElementChild.querySelector('input[type="text"]').focus();await preloadPhotos();draw();}});
  $('poster-template').addEventListener('change',()=>{
    if($('poster-template').value==='simple')selectedCount=Math.min(selectedCount,3);
    const template=$('poster-template').value;
    if(['bold','market','super','ribbon','signature'].includes(template)){if(!$('keep-colours').checked)$('promo-theme').value=({bold:'red',market:'green',super:'red',ribbon:'blue',signature:'gold'})[template];if(!finishingChosen){$('trim-photos').checked=true;$('clean-names').checked=true;finishingChosen=true;}}
    if(ShopDeskPoster.collection[template]&&!$('keep-colours').checked){$('promo-theme').value=ShopDeskPoster.collection[template].theme;}
    renderItems();changed();
  });
  for(const id of ['trim-photos','clean-names'])$(id).addEventListener('change',()=>finishingChosen=true);
  const designNames={super:'Super Saver',ribbon:'Corner Ribbon',signature:'Signature Collection',bold:'Bold Specials',market:'Fresh Market',boutique:'Boutique Collection',menu:'Kitchen Menu',studio:'Service Studio'};
  function renderBusiness(){
    const p=ShopDeskStudio.suggest(snapshot().draft);$('business-suggestion').textContent='Suggested: '+(announcement()?ShopDeskStudio.purposes[p.purpose]:designNames[p.template])+' · “'+p.headline+'” · '+p.cta+'.';
    const ann=announcement(),purpose=$('flyer-purpose').value;
    $('date-field').hidden=ann||!$('show-date').checked;$('date-toggle').hidden=ann;$('template-field').hidden=purpose!=='offers';$('template-hint').hidden=purpose!=='offers';$('item-layout-control').hidden=purpose!=='offers';$('offer-fields').hidden=ann;$('announcement-fields').hidden=!ann;$('details-field').hidden=purpose==='offers';
    $('add-item').textContent='+ Add a new '+profile().item.toLowerCase();
  }
  $('business-type').addEventListener('change',()=>{renderBusiness();renderItems();changed();});
  $('apply-business-style').addEventListener('click',()=>{
    const d=ShopDeskStudio.suggest(snapshot().draft);
    for(const [id,key] of [['poster-template','template'],['promo-theme','theme'],['promo-headline','headline'],['promo-eyebrow','eyebrow'],['promo-cta','cta'],['promo-terms','terms']])$(id).value=d[key];
    $('show-date').checked=d.showDate;renderBusiness();renderItems();changed();toast('Style applied. Edit the wording below to make it yours.');
  });
  $('show-date').addEventListener('change',renderBusiness);
  $('flyer-purpose').addEventListener('change',async()=>{renderBusiness();renderItems();changed();await preloadPhotos();draw();});
  function renderHero(){
    const thumb=$('hero-thumb');thumb.replaceChildren();if(heroPhoto){const img=document.createElement('img');setPhotoThumb(img,heroPhoto);img.alt='Main project photo';thumb.append(img);}else thumb.textContent='Main photo';$('hero-label').textContent=heroPhoto?'Change main photo':'Add main photo';$('remove-hero').hidden=!heroPhoto;
  }
  $('remove-hero').addEventListener('click',()=>{heroPhoto='';renderHero();changed();});
  $('hero-file').addEventListener('change',async()=>{
    const input=$('hero-file'),file=input.files[0];if(!file)return;input.disabled=true;$('remove-hero').disabled=true;pendingPhotos++;draw();
    try{const blob=await imageBlob(file),result=await api('/api/photos',{method:'POST',headers:{'Content-Type':blob.type},body:blob});heroPhoto=result.id;changed();await loadImage(heroPhoto);toast('Main photo added.');}
    catch(e){toast(e.message||'Could not add this photo.');}
    finally{pendingPhotos--;input.disabled=false;input.value='';$('remove-hero').disabled=false;renderHero();draw();if(dirty&&!blocked){clearTimeout(saveTimer);saveTimer=setTimeout(save,100);}}
  });
  function renderLogo(){const thumb=$('logo-thumb');thumb.replaceChildren();if(logo){const img=document.createElement('img');setPhotoThumb(img,logo);img.alt='Your business logo';img.addEventListener('error',()=>{img.hidden=true;thumb.textContent='Logo unavailable';});thumb.append(img);}else thumb.textContent='Business logo';$('logo-label').textContent=logo?'Change your logo':'Add your logo';$('remove-logo').hidden=!logo;}
  $('remove-logo').addEventListener('click',()=>{logo='';renderLogo();changed();});
  $('logo-file').addEventListener('change',async()=>{
    const input=$('logo-file'),file=input.files[0];if(!file)return;input.disabled=true;$('remove-logo').disabled=true;pendingPhotos++;$('logo-label').textContent='Adding logo…';draw();
    try{const blob=await imageBlob(file);const result=await api('/api/photos',{method:'POST',headers:{'Content-Type':blob.type},body:blob});logo=result.id;changed();await loadImage(logo);toast('Your logo is ready.');}
    catch(e){toast(e.message||'Could not add this logo. Please try another image.');}
    finally{pendingPhotos--;input.disabled=false;input.value='';$('remove-logo').disabled=false;renderLogo();draw();if(dirty&&!blocked){clearTimeout(saveTimer);saveTimer=setTimeout(save,100);}}
  });
  const imageBlob=file=>ShopDeskPhotos.prepare(file);
  async function uploadPhoto(item,file,label,input){
    const old=label.firstChild.textContent;input.disabled=true;label.firstChild.textContent='Adding photo…';pendingPhotos++;draw();
    try{const blob=await imageBlob(file);const result=await api('/api/photos',{method:'POST',headers:{'Content-Type':blob.type},body:blob});
      if(!items.includes(item))return;item.photo=result.id;for(const key of ['photoScale','photoX','photoY'])delete item[key];renderItems();changed();await loadImage(result.id);toast('Photo added. It will be kept with your saved product.');
    }catch(e){toast(e.message||'Could not add this photo. Please try another image.');}
    finally{pendingPhotos--;input.disabled=false;label.firstChild.textContent=old;draw();if(dirty&&!blocked){clearTimeout(saveTimer);saveTimer=setTimeout(save,100);}}
  }
  function setPhotoThumb(img,id){
    img.dataset.photo=id;if(photoThumbs.has(id))img.src=photoThumbs.get(id);
  }
  function cachePhotoThumb(id,image){
    const canvas=document.createElement('canvas'),scale=Math.min(1,180/Math.max(image.width,image.height));
    canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const url=canvas.toDataURL('image/webp',.84);photoThumbs.set(id,url);canvas.width=1;canvas.height=1;
    for(const img of document.querySelectorAll('img[data-photo]'))if(img.dataset.photo===id)img.src=url;
  }
  async function loadImage(id){
    if(images.has(id))return images.get(id);if(imageLoads.has(id))return imageLoads.get(id);
    const promise=(async()=>{
      const response=await fetch('/api/photos/'+id,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('A saved photo could not be loaded.');
      const blob=await response.blob(),image=await ShopDeskPhotos.decode(blob,1000);photoBlobs.set(id,blob);images.set(id,image);cachePhotoThumb(id,image);imageErrors.delete(id);return image;
    })();imageLoads.set(id,promise);
    try{return await promise;}catch(e){imageErrors.add(id);throw e;}finally{imageLoads.delete(id);}
  }
  async function preloadPhotos(){
    // Serial decoding bounds peak memory on phones when opening a large catalogue.
    for(const id of new Set([logo,heroPhoto,...activeItems().map(i=>i.photo)].filter(Boolean)))try{await loadImage(id);}catch{}
  }
  async function exportImage(data,type='png'){
    const canvas=document.createElement('canvas'),layout=ShopDeskPoster.draw(canvas,data,images),size=ShopDeskPoster.outputSize(data.format,data.exportQuality);
    canvas.width=1;canvas.height=1;
    const scale=size.width/(layout.width||1080),needed=new Map(),decoded=new Map();
    const request=(id,edge)=>{if(id)needed.set(id,Math.min(3840,Math.max(needed.get(id)||0,Math.ceil(edge))));};
    request(data.logo,240*scale);request(data.heroPhoto,Math.max(size.width,size.height));
    data.items.forEach((item,i)=>{const c=layout.cards[i];if(c)request(item.photo,Math.max(c.w,c.h)*scale*(item.photoScale||1)*(data.trimPhotos?1.5:1));});
    try{
      for(const [id,edge] of needed){
        if(!photoBlobs.has(id))await loadImage(id);
        decoded.set(id,await ShopDeskPhotos.decode(photoBlobs.get(id),edge));
      }
      return await ShopDeskOutput.image(data,decoded,type);
    }finally{for(const image of decoded.values()){image.width=1;image.height=1;}decoded.clear();}
  }
  function dataForPoster(){const s=snapshot();return {...s.shop,shop:s.shop.name,...s.draft,eventDateText:dateText(s.draft.eventDate),dateText:dateText(s.draft.date),startDateText:s.draft.startDate?dateText(s.draft.startDate):'',itemCount:activeCount(),items:activeItems().map(i=>({...i,size:normalSize(i.size)}))};}
  function validatePoster(){
    if(!ready||loadingWorkspace)throw new Error('Load your saved project before making a poster.');
    const d=dataForPoster();if(!d.shop.trim())throw new Error('Enter your business name.');if(!d.headline.trim())throw new Error('Enter a headline.');if(!announcement()&&d.showDate&&!/^\d{4}-\d{2}-\d{2}$/.test(d.date))throw new Error('Choose the offer end date.');if(!announcement()&&d.showDate&&d.date<iso())throw new Error('This offer has expired. Choose today or a future end date.');
    if(!announcement()&&d.showDate&&d.startDate&&d.startDate>d.date)throw new Error('Choose an offer start date before or on the end date.');
    if(announcement()&&!/^\d{4}-\d{2}-\d{2}$/.test(d.eventDate))throw new Error('Choose the event or opening date.');
    if(!announcement())d.items.forEach((i,index)=>{if(!i.name.trim())throw new Error('Enter the name for item '+(index+1)+'.');ShopDeskLogic.number(i.price,'Price for item '+(index+1),.01,1000000);});
    if(pendingPhotos)throw new Error('Please wait for your photo to finish uploading.');
    if(!announcement()&&d.items.length>capacity())throw new Error(d.purpose==='spotlight'?'Spotlight needs one offer. Remove the others or choose Offers, menu or price list.':'Choose a flyer design to include more than three items.');
    if([logo,...(announcement()?[heroPhoto]:d.items.map(i=>i.photo))].some(id=>id&&!images.has(id)))throw new Error('A photo or logo is still loading or unavailable. Try changing or removing it before downloading.');
    return d;
  }
  function draw(){
    updateUndo();
    for(const control of $('promo-items').querySelectorAll('.move-item,.remove-item')){
      const index=Number(control.closest('.promo-item').dataset.index),step=Number(control.dataset.step||0);
      control.disabled=!ready||loadingWorkspace||pendingPhotos>0||blocked||index+step<0||index+step>=activeCount();
    }
    $('product-count').disabled=pendingPhotos>0;$('add-item').disabled=pendingPhotos>0||activeCount()>=capacity();
    renderDesigner();const d=dataForPoster(),statusFormat=d.format==='status',outputSize=ShopDeskPoster.outputSize(d.format,d.exportQuality),print=!!outputSize.mm;
    let valid=false;
    try{validatePoster();valid=true;$('promo-error').hidden=true;$('download-promo').disabled=exportBusy||packBusy;$('copy-promo').disabled=false;}catch(e){$('promo-error').textContent=e.message;$('promo-error').hidden=!ready;$('download-promo').disabled=true;$('copy-promo').disabled=true;}
    for(const id of ['create-pack','create-pack-bottom'])$(id).disabled=!valid||packBusy||exportBusy;
    $('download-print').disabled=!valid||exportBusy||packBusy;$('download-print').hidden=!print;
    $('export-quality').closest('.field').hidden=print;
    $('export-quality').disabled=print||exportBusy||packBusy;$('promo-fields').disabled=!ready||loadingWorkspace||exportBusy||packBusy;
    $('download-promo').closest('.export-panel').setAttribute('aria-busy',String(exportBusy));
    const pages=announcement()?1:Math.ceil(d.items.length/4);$('pack-summary').textContent='1 full flyer + '+pages+' WhatsApp Status '+(pages===1?'page':'pages')+' + a matching caption.';
    lastLayout=ShopDeskPoster.draw($('promo-canvas'),d,images,{warningScale:outputSize.width/(ShopDeskPoster.formats[d.format]?.width||1080)});
    const warnings=(announcement()?[]:d.items).map((i,index)=>{const message=ShopDeskPoster.packWarning(i.name,i.size);return message?'Item '+(index+1)+': '+message:'';}).filter(Boolean);
    for(const warning of lastLayout.photoWarnings||[])warnings.push((warning.name||'A product')+': this photo may look soft in the chosen export size. Upload a larger original for more detail.');
    $('promo-review').hidden=!warnings.length;$('promo-review').textContent=warnings.join(' ');
    const spaces=ShopDeskItems.room(items,activeCount(),capacity());
    $('batch-room').textContent=spaces+' '+(spaces===1?'space':'spaces')+' available for added items. Empty cards are filled first.';
    for(const id of ['open-bulk','open-saved-grid'])$(id).disabled=!ready||loadingWorkspace||pendingPhotos>0||blocked||exportBusy||packBusy;
    $('feature-explainer').hidden=d.purpose!=='offers'||d.template==='simple';
    $('format-caption').textContent=ShopDeskPoster.formats[d.format].label;
    $('download-hint').textContent=outputSize.width+' × '+outputSize.height+' PNG'+(print?' · '+d.format.toUpperCase()+' PDF at 300 dpi. Print at Actual size (100%).':' · '+(d.exportQuality==='4k'?'4K long edge.':'Ready to share.'));
    $('quality-help').textContent=print?'Print quality · 300 dpi, with a 5 mm white margin.':'Text and layout are redrawn sharply. Small source photos still limit detail.';
    $('format-help').textContent=print?'The PDF keeps the correct paper size and a 5 mm white margin.':'Your content rearranges to fit the selected shape.';
    window.dispatchEvent(new CustomEvent('shopdesk:preview'));
    $('download-promo').textContent=exportBusy?'Preparing download…':print?'Download print PNG ↓':statusFormat?'Download Status ↓':d.template!=='simple'?'Download flyer ↓':'Download poster ↓';$('poster-note').textContent=d.items.length>12?'This is a compact catalogue. Use the promotion pack for larger product photos and prices across WhatsApp Status pages.':d.trimPhotos?'Check your photo framing before sharing. Turn off Fit photos to restore the complete images.':(d.items.length>6?'Fewer offers give each item more space on a phone.':'Your complete photos are shown.');
  }
  function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  async function downloadFlyer(type){
    if(exportBusy||packBusy)return;
    try{
      const d=validatePoster();exportBusy=true;draw();await document.fonts?.ready;
      const blob=await exportImage(d,type);download(blob,'shopdesk-'+d.format+'-'+iso()+'.'+type);
      toast(type==='pdf'?'Your print PDF is ready. Choose Actual size (100%) when printing.':'Your image is ready to share.');
    }catch(e){toast(e.message||'Could not create this download. Try Standard quality.');}
    finally{exportBusy=false;draw();}
  }
  $('download-promo').addEventListener('click',()=>downloadFlyer('png'));
  $('download-print').addEventListener('click',()=>downloadFlyer('pdf'));
  $('export-quality').addEventListener('change',changed);
  $('copy-promo').addEventListener('click',async()=>{try{const content=ShopDeskPack.caption(validatePoster());try{await navigator.clipboard.writeText(content);toast('Offer text copied. Paste it into your customer message.');}catch{download(new Blob([content],{type:'text/plain;charset=utf-8'}),'shopdesk-offer.txt');toast('Offer text downloaded.');}}catch(e){toast(e.message);}});
  function clearPack(){
    $('pack-previews').replaceChildren();$('download-pack-caption').removeAttribute('href');$('pack-caption-text').value='';$('pack-download-detail').textContent='All images and your caption in one ZIP.';
    const retired=packURLs;setTimeout(()=>retired.forEach(url=>URL.revokeObjectURL(url)),30000);packURLs=[];packZip=null;packText='';$('download-pack').disabled=true;
  }
  function previewPackImage(output,blob){
    const url=URL.createObjectURL(blob);packURLs.push(url);
    const card=document.createElement('article');card.className='pack-preview';const wrap=document.createElement('div');wrap.className='pack-image-wrap';
    const open=document.createElement('a');open.href=url;open.target='_blank';open.rel='noopener';open.setAttribute('aria-label','Open '+output.label+' at full size');
    const img=document.createElement('img');img.src=url;img.alt=output.label+' for your client project';open.append(img);wrap.append(open);
    const body=document.createElement('div');body.className='pack-preview-body';const title=document.createElement('h3');title.textContent=output.label;const detail=document.createElement('p');detail.textContent=output.detail;
    const save=document.createElement('a');save.className='button secondary';save.href=url;save.download=output.name;save.textContent='Save image ↓';save.setAttribute('aria-label','Save '+output.label);
    body.append(title,detail,save);card.append(wrap,body);$('pack-previews').append(card);
  }
  async function createPack(){
    if(packBusy||exportBusy)return;
    let data;try{data=validatePoster();}catch(e){toast(e.message);return;}
    const run=++packRun;packBusy=true;clearPack();$('pack-output').hidden=true;$('pack-error').hidden=true;$('pack-progress').textContent='Preparing your promotion pack…';
    if(!$('pack-dialog').open)$('pack-dialog').showModal();draw();
    try{
      await document.fonts?.ready;if(run!==packRun)return;
      const outputs=ShopDeskPack.plan(data),files=[];
      for(const [index,output] of outputs.entries()){
        if(run!==packRun)return;$('pack-progress').textContent='Creating '+output.label.toLowerCase()+' ('+(index+1)+' of '+outputs.length+')…';
        const blob=await exportImage(output.data);
        if(run!==packRun)return;if(!blob)throw new Error('An image could not be created. Close this window and try the pack again.');
        files.push({name:output.name,blob});previewPackImage(output,blob);
      }
      packText=ShopDeskPack.caption(data);const captionBlob=new Blob([packText],{type:'text/plain;charset=utf-8'});files.push({name:'caption.txt',blob:captionBlob});
      $('pack-caption-text').value=packText;const url=URL.createObjectURL(captionBlob);packURLs.push(url);$('download-pack-caption').href=url;
      $('pack-output').hidden=false;$('pack-progress').textContent='Your images and caption are ready. Preparing the complete download…';
      const zip=await ShopDeskPack.zip(files);if(run!==packRun)return;packZip=zip;packName='shopdesk-'+($('project-name').value.trim().replace(/[^a-z0-9]+/gi,'-').slice(0,50)||'project')+'.zip';
      $('download-pack').disabled=false;$('pack-download-detail').textContent=files.length+' files · '+(zip.size/1000000).toFixed(1)+' MB · ZIP';
      const count=outputs.length-1;$('pack-progress').textContent='Ready: 1 flyer, '+count+' Status '+(count===1?'page':'pages')+' and your caption. Created from this project.';
    }catch(e){if(run===packRun){$('pack-error').textContent=e.message||'We could not finish the pack. Close this window and try again.';$('pack-error').hidden=false;$('pack-progress').textContent='Your pack could not be completed.';}}
    finally{if(run===packRun){packBusy=false;draw();}}
  }
  for(const id of ['create-pack','create-pack-bottom'])$(id).addEventListener('click',createPack);
  $('close-pack').addEventListener('click',()=>$('pack-dialog').close());
  $('pack-dialog').addEventListener('close',()=>{packRun++;packBusy=false;clearPack();draw();});
  $('download-pack').addEventListener('click',()=>{if(packZip)download(packZip,packName);});
  $('copy-pack-caption').addEventListener('click',async()=>{const text=packText;try{await navigator.clipboard.writeText(text);toast('Caption copied.');}catch{download(new Blob([text],{type:'text/plain;charset=utf-8'}),'caption.txt');toast('Caption downloaded as text.');}});
  $('promo-form').addEventListener('input',event=>{if(event.target.closest('#promo-items')||['product-count','saved-product','logo-file','hero-file','poster-template','business-type','flyer-purpose'].includes(event.target.id))return;changed();});
  $('promo-form').addEventListener('change',event=>{if(event.target.closest('#promo-items')||['product-count','saved-product','logo-file','hero-file','poster-template','business-type','flyer-purpose'].includes(event.target.id))return;changed();});
  const expiry=new Date();expiry.setDate(expiry.getDate()+7);$('promo-date').value=iso(expiry);
  window.ShopDeskPromotion={draw,addProduct(product){if(!ready){toast('Wait for your saved workspace to load.');return false;}if(announcement()){toast('Choose an offers flyer to add products.');return false;}if(!insertProduct({...product,photo:''})){toast('Increase your product count or clear an item to make room.');return false;}return true;}};
  function batchContext(){return studioState?studioState.activeClientId+':'+studioState.activeProjectId:'';}
  function assertEditable(context){if(!ready||loadingWorkspace||pendingPhotos||blocked||exportBusy||packBusy)throw new Error('Wait for the project to finish loading, saving photos or creating downloads.');if(context!==batchContext())throw new Error('The active project changed. Close this window and reopen it.');}
  Object.assign(window.ShopDeskPromotion,{
    wordingContext(){assertEditable(batchContext());const d=snapshot().draft;return {context:batchContext(),business:d.business,purpose:d.purpose,template:d.template,showDate:d.showDate,values:Object.fromEntries(Object.keys(ShopDeskWords.fields).map(key=>[key,d[key]]))};},
    applyWording(values,context){assertEditable(context);const selected=ShopDeskWords.validate(values),before={};for(const [key,value] of Object.entries(selected)){const field=$('promo-'+(key==='headline'?'headline':key));before[key]=field.value;field.value=value;}changed();return before;},
    projectCatalog(){assertEditable(batchContext());capture();return structuredClone(studioState);},
    async openProject(clientId,projectId){assertEditable(batchContext());ShopDeskStudio.select(studioState,clientId,projectId);await switchProject(clientId,projectId);},
    async newEdition(clientId,projectId,values){
      assertEditable(batchContext());capture();const next=ShopDeskProjects.renew(studioState,clientId,projectId,values);
      studioState=next;dirty=true;change++;await showActive();changed();clearTimeout(saveTimer);save();toast('New edition created. Review your offers before sharing.');
    },
    templateSnapshot(){assertEditable(batchContext());return {...snapshot().draft,itemCount:activeCount()};},
    async useTemplate(template){
      assertEditable(batchContext());capture();const next=ShopDeskStudio.useTemplate(studioState,template);
      studioState=next;dirty=true;change++;await showActive();changed();clearTimeout(saveTimer);save();
      window.ShopDeskInterface?.showTab('content');$('project-name').focus();toast('Your own copy is ready. Review the wording, prices and dates before sharing.');
    },
    itemState(){return {context:batchContext(),items:items.map(item=>ShopDeskItems.copy(item)),products:products.map(p=>({id:p.id,...ShopDeskItems.copy(p,false)})),count:activeCount(),limit:capacity(),available:ShopDeskItems.room(items,activeCount(),capacity()),ready:ready&&!loadingWorkspace&&!pendingPhotos&&!blocked&&!announcement(),unavailableReason:blocked?'Your saved project changed in another window. Use Reload saved version before adding products.':!ready||loadingWorkspace?'Your project is still loading. If loading failed, use Try again beside the save status.':pendingPhotos?'Wait for your photos to finish uploading, then try again.':announcement()?'Choose Offers, menu or price list to use product tools.':''};},
    async addBatch(rows,context){assertEditable(context);if(announcement())throw new Error('Choose an offers flyer first.');const next=ShopDeskItems.insert(items,activeCount(),rows,capacity());items=next.items;selectedCount=next.itemCount;renderItems();changed();preloadPhotos().then(draw);toast(rows.length+' '+(rows.length===1?'item added.':'items added.'));},
    photoPreview(index,context){if(context!==batchContext())return null;const item=activeItems()[index],card=lastLayout?.cards[index];if(!item?.photo||!card)return null;return {item:ShopDeskItems.copy(item),canvas:$('promo-canvas'),card,warnings:(lastLayout.photoWarnings||[]).filter(w=>w.photo===item.photo&&w.name===item.name)};},
    setPhotoFrame(index,values,context){assertEditable(context);const item=activeItems()[index];if(!item?.photo)throw new Error('Choose a product photo first.');for(const [key,min,max] of [['photoScale',.5,2],['photoX',-1,1],['photoY',-1,1]]){const value=values[key];if(value===undefined)delete item[key];else if(Number.isFinite(value)&&value>=min&&value<=max)item[key]=value;else throw new Error('Choose valid photo framing.');}changed();}
  });
  for(const [key,p] of Object.entries(ShopDeskBusiness.profiles)){const option=document.createElement('option');option.value=key;option.textContent=p.label;$('new-client-business').append(option);}
  for(let count=1;count<=25;count++){const option=document.createElement('option');option.value=String(count);option.textContent=count+' '+(count===1?'item':'items');$('product-count').append(option);}
  $('product-count').addEventListener('change',async()=>{
    if(pendingPhotos){$('product-count').value=String(selectedCount);return;}
    const next=ShopDeskBusiness.resizeItems(items,Number($('product-count').value));items=next.items;selectedCount=next.itemCount;renderItems();changed();await preloadPhotos();draw();
  });
  renderBusiness();renderItems();draw();loadWorkspace();if(document.fonts?.ready)document.fonts.ready.then(draw);
})();
