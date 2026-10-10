(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const iso=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const money=n=>'R'+Number(n).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
  let items=[{name:'Potatoes',size:'1 kg pack',price:'10.00',photo:''}],products=[],revision=0,ready=false,dirty=false,saving=false,blocked=false,change=0,saveTimer,toastTimer;
  let selectedCount=1,lastLayout=null,lastRemoval=null,exportBusy=false,combos=ShopDeskCombos.defaults(),combosSaved=false,activeCombo=0;
  let comboProductContext='',comboProductTarget=0,comboProductChoices=[];
  let lastSaveError=false,pendingPhotos=0,logo='',heroPhoto='',finishingChosen=false;
  let studioState=null,loadingWorkspace=false,createKind='client';
  let packRun=0,packBusy=false,packZip=null,packText='',packName='',packURLs=[];
  const images=new Map(),imageErrors=new Set(),imageLoads=new Map(),photoBlobs=new Map(),photoThumbs=new Map();
  const localMode=!location.hostname.endsWith('.chatgpt.site')&&!['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const localWorkspaceKey='shopdesk-local-workspace-v1';
  function localStored(){try{const raw=localStorage.getItem(localWorkspaceKey);return raw?JSON.parse(raw):null;}catch{return null;}}
  async function localApi(path,options={}){
    if(path==='/api/photos'&&options.method==='POST'){
      const blob=options.body;if(!blob?.arrayBuffer)throw new Error('Choose a valid image.');
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this image.'));reader.readAsDataURL(blob);});
      const id='local-photo:'+crypto.randomUUID(),photos=JSON.parse(localStorage.getItem(localWorkspaceKey+'-photos')||'{}');photos[id]=data;localStorage.setItem(localWorkspaceKey+'-photos',JSON.stringify(photos));return {id};
    }
    if(path!=='/api/studio')return null;
    if(options.method==='PUT'){
      const body=JSON.parse(options.body),revision=Number(body.revision||0)+1;
      localStorage.setItem(localWorkspaceKey,JSON.stringify(body.data));localStorage.setItem(localWorkspaceKey+'-revision',String(revision));
      return {revision};
    }
    return {data:localStored(),revision:Number(localStorage.getItem(localWorkspaceKey+'-revision')||0)};
  }
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
  function status(message,error=false){$('save-status').textContent=message;$('save-status').dataset.state=message==='All changes saved'?'saved':error?'error':'pending';$('save-status').classList.toggle('save-error',error);}
  async function api(path,options={}) {
    if(localMode){const fallback=await localApi(path,options);if(fallback)return fallback;}
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
    try {const response=await fetch(path,{...options,credentials:'same-origin',signal:controller.signal});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Please try again.'),{status:response.status});return data;}
    catch(e){if(e.name==='AbortError')throw new Error('The connection took too long. Your edits are still here; try again.');throw e;}
    finally{clearTimeout(timeout);}
  }
  // Leaflets print the weekday with every date ("Thu 8 October 2026") so the
  // promotion window reads at a glance.
  function dateText(value){if(!value)return 'your selected date';const d=new Date(value+'T12:00:00');if(Number.isNaN(d.getTime()))return 'your selected date';return d.toLocaleDateString('en-ZA',{weekday:'short'}).replace(/[.,]/g,'')+' '+d.toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});}
  function profile(){return ShopDeskBusiness.get($('business-type').value);}
  function announcement(){return ['event','opening'].includes($('flyer-purpose').value);}
  function comboMode(){return $('flyer-purpose').value==='combos';}
  function capacity(){return comboMode()?20:$('flyer-purpose').value==='spotlight'?1:$('poster-template').value==='simple'?3:25;}
  function activeCount(){return Math.min(selectedCount,capacity());}
  function activeItems(){return items.slice(0,activeCount());}
  function pinCombos(){if(comboMode())items.forEach((item,index)=>item.combo=ShopDeskCombos.groupOf(item,index,combos.length));}
  // Finishes are saved only when they differ from the design default, so a flyer that never used them is stored exactly as before.
  function finishSnapshot(){
    const out={};
    for(const [id,key,fallback] of [['backdrop','backdrop','design'],['card-style','cardStyle','design'],['photo-shape','photoShape','design'],['headline-case','headlineCase','design'],['price-size','priceSize','standard'],['badge-style','badgeStyle','burst']])if($(id).value!==fallback)out[key]=$(id).value;
    if($('auto-save-badge').checked)out.autoSave=true;
    if($('use-custom-colours').checked)out.colours={brand:$('colour-brand').value,accent:$('colour-accent').value,paper:$('colour-paper').value};
    return out;
  }
  function snapshot(){return {shop:{name:$('shop-name').value,phone:$('promo-phone').value,location:$('promo-location').value,logo},products:products.map(p=>({...p})),draft:{...(combosSaved||comboMode()?{combos:structuredClone(combos)}:{}),...($('logo-size').value==='compact'?{logoSize:'compact'}:{}),...($('flyer-promotion').value?{promotion:$('flyer-promotion').value}:{}),exportQuality:$('export-quality').value,...($('print-pages').value==='catalogue'?{printPages:'catalogue'}:{}),keepColours:$('keep-colours').checked,typeface:$('poster-typeface').value,priceStyle:$('price-style').value,...finishSnapshot(),itemCount:selectedCount,purpose:$('flyer-purpose').value,details:$('promo-details').value,eventDate:$('event-date').value,eventTime:$('event-time').value,venue:$('event-venue').value,heroPhoto,business:$('business-type').value,eyebrow:$('promo-eyebrow').value,cta:$('promo-cta').value,terms:$('promo-terms').value,showDate:$('show-date').checked,headline:$('promo-headline').value,date:$('promo-date').value,startDate:$('promo-start-date').value,theme:$('promo-theme').value,template:$('poster-template').value,trimPhotos:$('trim-photos').checked,cleanNames:$('clean-names').checked,format:document.querySelector('[name="poster-format"]:checked').value,items:items.map(item=>ShopDeskItems.copy(item))}};}
  function capture(){if(studioState)studioState=ShopDeskStudio.capture(studioState,snapshot(),$('project-name').value);}
  function changed(){if(!ready)return;if(comboMode())combosSaved=true;capture();renderDesigner();dirty=true;change++;if(!blocked){status('Unsaved changes');clearTimeout(saveTimer);saveTimer=setTimeout(save,900);}draw();}
  async function save(){
    if(!ready||!dirty||saving||blocked||pendingPhotos)return;
    saving=true;lastSaveError=false;status('Saving…');const version=change;
    try{const result=await api('/api/studio',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,data:studioState})});revision=result.revision;dirty=version!==change;$('workspace-error').hidden=true;$('retry-save').hidden=true;status(dirty?'Saving your latest changes…':'All changes saved');}
    catch(e){lastSaveError=true;status('Changes not saved',true);$('workspace-error').textContent=e.message;$('workspace-error').hidden=false;if(e.status===409){blocked=true;$('reload-workspace').hidden=false;$('retry-save').hidden=true;}else $('retry-save').hidden=false;}
    finally{saving=false;renderDesigner();if(dirty&&!blocked&&!lastSaveError)saveTimer=setTimeout(save,150);}
  }
  function applyWorkspace(data,title){
    lastRemoval=null;$('logo-size').value=data.draft.logoSize||'prominent';$('export-quality').value=data.draft.exportQuality||'standard';$('print-pages').value=data.draft.printPages||'single';const d=data.draft,p=ShopDeskBusiness.get(d.business);$('keep-colours').checked=d.keepColours??false;
    $('poster-typeface').value=d.typeface||'design';$('price-style').value=d.priceStyle||'design';
    for(const [id,key,fallback] of [['backdrop','backdrop','design'],['card-style','cardStyle','design'],['photo-shape','photoShape','design'],['headline-case','headlineCase','design'],['price-size','priceSize','standard'],['badge-style','badgeStyle','burst']]){$(id).value=d[key]||fallback;if($(id).value!==(d[key]||fallback))$(id).value=fallback;}
    $('auto-save-badge').checked=d.autoSave===true;const colours=ShopDeskPoster.customColours(d.colours);$('use-custom-colours').checked=!!colours;$('colour-inputs').hidden=!colours;
    if(colours){$('colour-brand').value=colours.brand;$('colour-accent').value=colours.accent;$('colour-paper').value=colours.paper;}else seedColours(d.theme);
    $('project-name').value=title;$('business-type').value=d.business||'grocery';$('promo-eyebrow').value=d.eyebrow??p.eyebrow;$('promo-cta').value=d.cta??p.cta;$('promo-terms').value=d.terms??p.terms;$('show-date').checked=d.showDate??true;
    $('shop-name').value=data.shop.name;$('promo-phone').value=data.shop.phone;$('promo-location').value=data.shop.location;logo=data.shop.logo||'';
    $('promo-headline').value=d.headline;$('promo-date').value=d.date;$('promo-start-date').value=d.startDate||'';$('promo-theme').value=d.theme;$('poster-template').value=d.template||'simple';$('trim-photos').checked=d.trimPhotos??false;$('clean-names').checked=d.cleanNames??false;
    $('flyer-purpose').value=d.purpose||'offers';$('flyer-promotion').value=d.promotion||'';if($('flyer-promotion').value!==(d.promotion||''))$('flyer-promotion').value='';$('promo-details').value=d.details||'';$('event-date').value=d.eventDate||'';$('event-time').value=d.eventTime||'';$('event-venue').value=d.venue||'';heroPhoto=d.heroPhoto||'';
    finishingChosen=d.trimPhotos!==undefined||d.cleanNames!==undefined;document.querySelector('[name="poster-format"][value="'+d.format+'"]').checked=true;
    activeCombo=0;combosSaved=Array.isArray(d.combos);combos=structuredClone(d.combos||ShopDeskCombos.defaults());items=structuredClone(d.items);selectedCount=d.itemCount??items.length;products=structuredClone(data.products);
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
    fill('client-picker',studioState.clients.map(c=>[c.id,c.shop.name||'Unnamed business']),studioState.activeClientId);
    fill('project-picker',client.projects.map(p=>[p.id,p.title]),studioState.activeProjectId);
    const count=studioState.clients.reduce((n,c)=>n+c.projects.length,0);$('studio-count').textContent=studioState.clients.length+' / 20 businesses · '+count+' / 100 flyers';
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
    $('studio-dialog-title').textContent=client?'New business':'New flyer';$('create-studio-entry').textContent=client?'Create business':'Create flyer';$('new-client-fields').hidden=!client;$('new-client-name').required=client;
    $('new-client-name').value='';$('new-project-name').value='';$('new-client-business').value=$('business-type').value;$('new-project-purpose').value='offers';$('studio-create-error').hidden=true;$('studio-dialog').showModal();
    $(client?'new-client-name':'new-project-name').focus();
  }
  $('new-client').addEventListener('click',()=>openCreate('client'));$('new-project').addEventListener('click',()=>openCreate('project'));
  $('start-project').addEventListener('click',()=>openCreate('project'));
  $('close-studio-dialog').addEventListener('click',()=>$('studio-dialog').close());
  $('studio-create-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!ready||loadingWorkspace||pendingPhotos||blocked)return;
    try{const title=$('new-project-name').value.trim(),name=$('new-client-name').value.trim();if(!title||(createKind==='client'&&!name))throw new Error('Enter the business and flyer names.');capture();
      studioState=createKind==='client'?ShopDeskStudio.addClient(studioState,name,$('new-client-business').value,$('new-project-purpose').value,title):ShopDeskStudio.addProject(studioState,title,$('new-project-purpose').value);
      dirty=true;change++;$('studio-dialog').close();await showActive();changed();clearTimeout(saveTimer);save();toast(createKind==='client'?'Your new business is ready.':'Your new flyer is ready.');
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
    const card=$('promo-items').querySelector('.promo-item[data-index="'+index+'"]');if(!card)return;
    if(comboMode())selectCombo(ShopDeskCombos.groupOf(items[index],index,combos.length));
    card.open=true;(card.querySelector(selector)||card.querySelector('summary')).focus();
  }
  function moveDestination(index,step){
    if(!comboMode())return index+step;
    const group=ShopDeskCombos.groupOf(items[index],index,combos.length),indices=activeItems().map((item,i)=>ShopDeskCombos.groupOf(item,i,combos.length)===group?i:-1).filter(i=>i>=0);
    return indices[indices.indexOf(index)+step]??-1;
  }
  function moveItem(item,step){
    try{
      assertEditable(batchContext());const index=items.indexOf(item),next=moveDestination(index,step);
      if(index<0||next<0||next>=activeCount())return;
      pinCombos();
      [items[index],items[next]]=[items[next],items[index]];
      renderItems();changed();focusItem(next,'.move-item:not(:disabled)');
      toast((item.name||'Item')+' moved to position '+(next+1)+'.');
    }catch(e){toast(e.message);}
  }
  function removeItem(item){
    try{
      assertEditable(batchContext());const index=items.indexOf(item),count=activeCount();
      if(index<0||index>=count||count<=1)return;
      pinCombos();
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
    const comboLists=comboMode()?renderComboPanels():null;
    activeItems().forEach((item,index)=>{
      const inCombo=comboMode(),groupIndex=ShopDeskCombos.groupOf(item,index,combos.length);
      const featured=item.featured&&$('flyer-purpose').value==='offers'&&$('poster-template').value!=='simple';
      const box=document.createElement('details');box.className='promo-item'+(featured?' is-featured':'');box.dataset.index=String(index);box.open=opened.has(index)||(wasEmpty&&index===0);
      const heading=document.createElement('summary');heading.className='item-heading';
      const number=document.createElement('span');number.className='item-index';number.textContent=featured?'★':String(index+1);number.setAttribute('aria-label',featured?'Featured offer':String(index+1));
      const title=document.createElement('span');title.className='item-title';title.textContent=item.name||'New '+profile().item.toLowerCase();
      const price=document.createElement('span');price.className='item-price';price.textContent=(item.dealQuantity?item.dealQuantity+' for ':'')+(item.price&&Number(item.price)>0?money(item.price):'Add price');
      if(inCombo)price.textContent=String(item.quantity||1)+' ×';
      const chevron=document.createElement('span');chevron.className='item-chevron';chevron.textContent='⌄';chevron.setAttribute('aria-hidden','true');heading.append(number,title,price,chevron);
      if(inCombo){
        box.classList.add('combo-product');
        if(item.photo){number.replaceChildren();const img=document.createElement('img');img.alt='';setPhotoThumb(img,item.photo);number.append(img);}else if(item.icon){number.replaceChildren();const img=document.createElement('img');img.alt='';img.src=ShopDeskIllustrations.dataURL(item.icon,72);number.append(img);}else number.textContent=item.name?.trim().slice(0,1).toUpperCase()||'+';
        const pack=document.createElement('small');pack.className='combo-pack';pack.textContent=item.size||'Add a pack size';title.append(pack);
        const quick=document.createElement('span');quick.className='combo-quantity';
        for(const [step,label] of [[-1,'Fewer packs'],[1,'More packs']]){
          const control=button(step<0?'−':'+','quantity-step',event=>{event.preventDefault();event.stopPropagation();try{assertEditable(batchContext());item.quantity=Math.max(1,Math.min(99,(item.quantity||1)+step));syncComboQuantity(item,box);changed();}catch(e){toast(e.message);}});
          control.dataset.quantityStep=String(step);control.setAttribute('aria-label',label+' of '+(item.name||'this product'));if(step===1)quick.append(price);quick.append(control);
        }
        heading.append(quick);
      }
      const itemActions=document.createElement('div');itemActions.className='item-actions';
      if(activeCount()>1)itemActions.append(button('Remove','remove-item',()=>removeItem(item)));
      const order=document.createElement('div');order.className='item-order';
      if(activeCount()>1)for(const [step,label] of [[-1,'Move up'],[1,'Move down']]){
        const control=button((step<0?'↑ ':'↓ ')+label,'text-button move-item',()=>moveItem(item,step));
        control.dataset.step=String(step);control.setAttribute('aria-label',label+' item '+(index+1));
        control.disabled=moveDestination(index,step)<0||moveDestination(index,step)>=activeCount();order.append(control);
      }
      if($('flyer-purpose').value==='offers'&&$('poster-template').value!=='simple'){
        const feature=button(item.featured?'★ Featured · remove':'☆ Feature this offer','text-button feature-offer',()=>{
          const selected=!!item.featured;for(const other of items)delete other.featured;if(!selected)item.featured=true;renderItems();changed();
        });feature.setAttribute('aria-pressed',String(!!item.featured));itemActions.append(feature);
      }
      const autoIcon=!item.photo&&item.icon===undefined?(ShopDeskProducts.identify(item.name||'')?.icon||''):'';
      const photoRow=document.createElement('div');photoRow.className='photo-row';const thumb=document.createElement('div');thumb.className='photo-thumb';
      if(item.photo){const img=document.createElement('img');img.alt=item.name||'Offer photo';setPhotoThumb(img,item.photo);img.addEventListener('error',()=>{img.hidden=true;thumb.textContent='Photo unavailable';});thumb.append(img);}
      else if(item.icon||autoIcon){const img=document.createElement('img');img.alt=item.icon?'Illustration':'Suggested illustration';img.src=ShopDeskIllustrations.dataURL(item.icon||autoIcon,152);thumb.append(img);thumb.classList.add('is-illustration');if(!item.icon)thumb.title='Suggested from the product name. Choose another or remove it below.';}
      else{thumb.textContent='Your photo';}
      const photoActions=document.createElement('div');photoActions.className='photo-actions';const uploadLabel=document.createElement('label');uploadLabel.className='photo-upload';uploadLabel.append(document.createTextNode(item.photo?'Change photo':'Add photo'));
      const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.setAttribute('aria-label','Choose photo for item '+(index+1));file.addEventListener('change',()=>{if(file.files[0])uploadPhoto(item,file.files[0],uploadLabel,file);});uploadLabel.append(file);photoActions.append(uploadLabel);
      const hint=document.createElement('span');hint.className='field-help';hint.textContent='JPG, PNG or WebP · full image kept';photoActions.append(hint);
      if(item.photo){photoActions.append(button('Adjust size & position','text-button',()=>window.dispatchEvent(new CustomEvent('shopdesk:adjust-photo',{detail:{index}}))));photoActions.append(button('Remove photo','text-button',()=>{item.photo='';for(const key of ['photoScale','photoX','photoY','source'])delete item[key];renderItems();changed();}));}
      else photoActions.append(button(item.icon||autoIcon?'Change illustration':'Choose an illustration','text-button choose-illustration',()=>openIllustrations(item)));
      photoActions.append(button('Find product & photo','text-button find-product',()=>window.dispatchEvent(new CustomEvent('shopdesk:find-product',{detail:{index,query:item.name}}))));
      photoRow.append(thumb,photoActions);const name=field(profile().item+' name',item.name,'text',v=>item.name=v,50);name.classList.add('full');const row=document.createElement('div');row.className='field-row';
      if(!inCombo||true)attachSuggestions(name.querySelector('input'),{placeholder:'Start typing, e.g. maize meal',onPick(product){
        item.name=product.name;if(product.size)item.size=product.size;if(product.section&&!item.section)item.section=product.section;if(product.icon&&!item.photo)item.icon=product.icon;
        if(product.photo&&!item.photo){item.photo=product.photo;if(product.source)item.source={...product.source};}if(product.price&&(!item.price||Number(item.price)<=0))item.price=product.price;
        renderItems();changed();preloadPhotos().then(draw);setTimeout(()=>focusItem(index,item.size?(item.price?'input[type="text"]':'input[type="number"]'):'.field-row input[type="text"]'),0);
      }});
      const sizeField=field(profile().size,item.size,'text',v=>item.size=v,25);sizeField.querySelector('input').placeholder=profile().example;sizeField.querySelector('input').addEventListener('blur',e=>{item.size=normalSize(item.size);e.target.value=item.size;changed();});
      row.append(sizeField);
      if(inCombo){
        const qty=field('Packs in this combo',String(item.quantity||1),'number',v=>{const n=Number(v);if(Number.isInteger(n)&&n>=1&&n<=99){item.quantity=n;syncComboQuantity(item,box,false);}},2);
        const input=qty.querySelector('input');input.min='1';input.max='99';input.step='1';input.inputMode='numeric';input.required=true;input.dataset.comboQuantity=String(index);
        input.addEventListener('blur',()=>{input.value=String(item.quantity||1);changed();});row.append(qty);
        const assignment=document.createElement('label');assignment.className='field full';assignment.append(document.createTextNode('Move to another combo'));
        const select=document.createElement('select');select.className='combo-assignment';
        combos.forEach((c,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent='Combo '+(i+1)+' · '+c.name;select.append(option);});select.value=String(groupIndex);
        select.addEventListener('change',()=>{pinCombos();item.combo=Number(select.value);activeCombo=item.combo;renderItems();changed();focusItem(index,'.combo-assignment');toast((item.name||'Product')+' moved to '+combos[activeCombo].name+'.');});assignment.append(select);row.append(assignment);
      }else row.append(field('Price (R)',item.price,'number',v=>item.price=v));
      const dealInputType='number';const deal=document.createElement('details');deal.className='offer-options';deal.open=!!item.dealQuantity||!!item.wasPrice||!!item.section||!!item.badge;
      const dealSummary=document.createElement('summary');dealSummary.textContent='Multi-buy, previous price, badge & section';
      const dealLabel=document.createElement('label');dealLabel.className='field';dealLabel.append(document.createTextNode('Price covers'));
      const quantity=document.createElement('select');quantity.className='deal-quantity';
      for(let count=1;count<=Math.max(24,item.dealQuantity||1);count++){const option=document.createElement('option');option.value=String(count);option.textContent=count===1?'One item · normal price':count+' items for this price';quantity.append(option);}
      quantity.value=String(item.dealQuantity||1);quantity.addEventListener('change',()=>{const value=Number(quantity.value);if(value===1)delete item.dealQuantity;else item.dealQuantity=value;price.textContent=(item.dealQuantity?item.dealQuantity+' for ':'')+(item.price&&Number(item.price)>0?money(item.price):'Add price');changed();});
      const dealHelp=document.createElement('p');dealHelp.className='field-help';dealHelp.textContent='The price above is the total for this many items. Choose 2 to show “2 for” on the flyer and caption.';
      dealLabel.append(quantity);
      const wasField=field('Previous price (optional)',item.wasPrice||'',dealInputType,v=>{if(v==='')delete item.wasPrice;else item.wasPrice=v;});wasField.querySelector('input').placeholder='e.g. 129.99';
      const wasHelp=document.createElement('p');wasHelp.className='field-help';wasHelp.textContent='Shown struck through with the saving worked out from your two prices. Leave blank unless the previous price is genuine.';
      const sectionField=field('Section label (optional)',item.section||'',dealInputType==='number'?'text':'text',v=>{if(!v.trim())delete item.section;else item.section=v;},24);sectionField.querySelector('input').setAttribute('list','section-labels');sectionField.querySelector('input').placeholder='e.g. Butchery';
      const sectionHelp=document.createElement('p');sectionHelp.className='field-help';sectionHelp.textContent='A small department tag on this card, such as Fresh produce or Household.';
      const badgeField=field('Badge (optional)',item.badge||'','text',v=>{if(!v.trim())delete item.badge;else item.badge=v;},14);badgeField.querySelector('input').setAttribute('list','badge-presets');badgeField.querySelector('input').placeholder='e.g. NEW or BEST BUY';
      const badgeHelp=document.createElement('p');badgeHelp.className='field-help';badgeHelp.textContent='A sticker on this card in the badge style chosen under Design. Up to 14 characters; leave blank for none.';
      deal.append(dealSummary,dealLabel,dealHelp,wasField,wasHelp,badgeField,badgeHelp,sectionField,sectionHelp);
      const saveProduct=button('Save to my items','text-button save-product',()=>{
        if(!item.name.trim()||item.price===''||Number(item.price)<=0||!Number.isFinite(Number(item.price))){toast('Enter a name and a price above zero first.');return;}
        const found=products.find(p=>p.name.trim().toLowerCase()===item.name.trim().toLowerCase()&&p.size.trim().toLowerCase()===item.size.trim().toLowerCase());
        if(!found&&products.length>=100){toast('You can keep up to 100 saved items.');return;}
        const value={id:found?.id||crypto.randomUUID(),...ShopDeskItems.copy(item,false)};if(found)products[products.indexOf(found)]=value;else products.push(value);
        renderSaved();changed();clearTimeout(saveTimer);save();toast(found?'Item updated. Waiting for the saved confirmation.':'Item added to your list. Waiting for the saved confirmation.');
      });
      name.querySelector('input').addEventListener('input',()=>{if(inCombo){title.firstChild.textContent=item.name||'New product';if(!item.photo)number.textContent=item.name.trim().slice(0,1).toUpperCase()||'+';for(const control of box.querySelectorAll('.quantity-step'))control.setAttribute('aria-label',(Number(control.dataset.quantityStep)<0?'Fewer packs':'More packs')+' of '+(item.name||'this product'));refreshComboBoard();}else title.textContent=item.name||'New '+profile().item.toLowerCase();});
      if(inCombo)sizeField.querySelector('input').addEventListener('input',()=>box.querySelector('.combo-pack').textContent=item.size||'Add a pack size');
      if(!inCombo)row.querySelector('input[type="number"]').addEventListener('input',()=>price.textContent=(item.dealQuantity?item.dealQuantity+' for ':'')+(item.price&&Number(item.price)>0?money(item.price):'Add price'));
      if(!inCombo)itemActions.prepend(saveProduct);const body=document.createElement('div');body.className='item-body';body.append(photoRow,name,row,...(inCombo?[]:[deal]),itemActions,order);box.append(heading,body);(inCombo?comboLists[groupIndex]:list).append(box);
      if(inCombo)syncComboQuantity(item,box);
    });
    renderCombos();
    $('item-count').textContent=activeCount()+' of '+capacity();$('add-item').disabled=activeCount()>=capacity();
    $('product-count').value=String(selectedCount);
    for(const option of $('product-count').options)option.disabled=Number(option.value)>capacity();
    const kept=items.length-activeCount();
    $('product-count-hint').textContent='The layout fits '+activeCount()+' '+(activeCount()===1?'item':'items')+'.'+(kept?' '+kept+' extra '+(kept===1?'item is':'items are')+' kept in this project. Increase the count to show them again.':' Select any amount from 1 to '+capacity()+'.');
    $('add-item').textContent=kept?'+ Show next saved item':'+ Add a new '+profile().item.toLowerCase();
    $('poster-template').querySelector('[value="simple"]').disabled=activeCount()>3;
    const hints={super:'A compact sale banner, oversized price tickets and a strong contact strip. Fits up to 25 items.',ribbon:'An angled heading, framed product cards and a split contact footer. Fits up to 25 items.',signature:'An editorial masthead, refined price labels and a framed footer. Fits up to 25 items.',boutique:'A quiet, elegant collection with spacious photos and understated prices. Fits up to 25 items.',menu:'A warm menu with easy-to-scan rows, portion labels and optional food photos. Fits up to 25 items.',studio:'A polished price list for treatments and services. Works with or without photos, up to 25 offers.',bold:'A large headline and bold yellow price tickets. Fits up to 25 offers.',market:'A clean layout with simple prices and more space around each offer. Fits up to 25 offers.',retail:'Your classic shop flyer with strong pack labels and yellow prices. Fits up to 25 offers.',simple:'A spacious design for one to three offers.'};
    $('template-hint').textContent=ShopDeskPoster.collection[$('poster-template').value]?.hint?ShopDeskPoster.collection[$('poster-template').value].hint+(comboMode()?' Fits up to 20 products in 1–6 combos.':' Fits 1–25 items.'):hints[$('poster-template').value];
    updatePicker();
  }
  function renderSaved(){const select=$('saved-product'),value=select.value;select.replaceChildren();const first=document.createElement('option');first.value='';first.textContent=products.length?'Choose an item or service…':'No saved items yet';select.append(first);
    for(const product of products){const option=document.createElement('option');option.value=product.id;option.textContent=product.name+(product.size?' · '+product.size:'')+' · '+(product.dealQuantity?product.dealQuantity+' for ':'')+money(product.price);select.append(option);}select.value=value;updatePicker();
    $('saved-hint').textContent=products.length?products.length+' saved '+(products.length===1?'item':'items')+'. Select one to reuse its photo and price.':'Save an item below to reuse its details and photo.';
  }
  function emptySlot(){return activeItems().findIndex(i=>!i.name.trim()&&!i.price&&!i.size.trim()&&!i.photo);}
  function insertProduct(product){
    if(comboMode()){pinCombos();product={...product,combo:activeCombo};}
    const blank=emptySlot();let index;
    if(blank>=0){items[blank]={...product};index=blank;}
    else if(activeCount()<capacity()&&items.length<25){items.splice(activeCount(),0,{...product});selectedCount=activeCount()+1;index=selectedCount-1;}
    else return false;
    renderItems();changed();return index+1;
  }
  // The person's own history: names they picked before rank first next time.
  const recentKey='shopdesk-recent-products-v1';
  function recentProducts(){try{return JSON.parse(localStorage.getItem(recentKey)||'[]');}catch{return [];}}
  function rememberProduct(name){try{const list=[name,...recentProducts().filter(n=>n!==name)].slice(0,40);localStorage.setItem(recentKey,JSON.stringify(list));}catch{}}
  function searchContext(){return {business:$('business-type').value,section:'',saved:products.map(p=>({id:p.id,...ShopDeskItems.copy(p,false)})),recent:recentProducts()};}
  // Suggestions as you type: catalogue products with their common sizes, plus
  // the person's own saved items. Picking fills the card in one tap; typing
  // anything else keeps the text exactly as written.
  function attachSuggestions(input,{onPick,placeholder}){
    const wrap=document.createElement('div');wrap.className='product-combobox';input.parentNode.insertBefore(wrap,input);wrap.append(input);
    const list=document.createElement('div');list.className='product-suggestions';list.setAttribute('role','listbox');list.hidden=true;wrap.append(list);
    input.setAttribute('autocomplete','off');input.setAttribute('role','combobox');input.setAttribute('aria-expanded','false');input.setAttribute('aria-autocomplete','list');if(placeholder)input.placeholder=placeholder;
    let active=-1,rows=[],lastResult=null;
    const close=()=>{list.hidden=true;list.replaceChildren();rows=[];active=-1;input.setAttribute('aria-expanded','false');};
    const pick=(result,size,own)=>{rememberProduct(result.name);close();onPick({name:result.name,size:size||'',section:result.section||'',icon:result.icon||'',price:own?.price||lastResult?.price||'',photo:own?.photo||'',parsedSize:lastResult?.size||''});};
    const render=()=>{
      const query=input.value;if(query.trim().length<2){close();return;}
      lastResult=ShopDeskProducts.search(query,searchContext());const results=lastResult.results;list.replaceChildren();rows=[];active=-1;
      if(!results.length){close();return;}
      for(const result of results){
        const row=document.createElement('div');row.className='product-suggestion';row.setAttribute('role','option');row.setAttribute('aria-selected','false');
        const icon=document.createElement('img');icon.alt='';icon.width=36;icon.height=36;icon.src=result.own[0]?.photo&&photoThumbs.get(result.own[0].photo)||(result.icon?ShopDeskIllustrations.dataURL(result.icon,72):ShopDeskIllustrations.dataURL('generic',72));
        const text=document.createElement('div');text.className='product-suggestion-text';const name=document.createElement('button');name.type='button';name.className='product-suggestion-name';name.textContent=result.name;name.addEventListener('mousedown',e=>e.preventDefault());name.addEventListener('click',()=>pick(result,result.sizes.includes(lastResult.size)?lastResult.size:(result.sizes.length===1?result.sizes[0]:''),result.own[0]));
        const meta=document.createElement('small');meta.textContent=[result.section,result.own.length?'Your saved item'+(result.own[0].price?' · last '+money(result.own[0].price):''):result.kind==='catalogue'?'Choose a size':''].filter(Boolean).join(' · ');
        const sizes=document.createElement('div');sizes.className='product-sizes';
        for(const size of result.sizes.slice(0,6)){const chip=document.createElement('button');chip.type='button';chip.className='size-chip';const own=result.own.find(p=>p.size===size);chip.textContent=size+(own?.price?' · '+money(own.price):'');chip.classList.toggle('is-own',!!own);chip.setAttribute('aria-label',result.name+' '+size);chip.addEventListener('mousedown',e=>e.preventDefault());chip.addEventListener('click',()=>pick(result,size,own));sizes.append(chip);}
        text.append(name,meta,sizes);row.append(icon,text);list.append(row);rows.push({row,result});
      }
      const custom=document.createElement('button');custom.type='button';custom.className='product-suggestion-custom';custom.textContent='Keep “'+query.trim().slice(0,40)+'” as typed';custom.addEventListener('mousedown',e=>e.preventDefault());custom.addEventListener('click',()=>close());list.append(custom);
      list.hidden=false;input.setAttribute('aria-expanded','true');
    };
    input.addEventListener('input',render);input.addEventListener('focus',()=>{if(input.value.trim().length>=2)render();});
    input.addEventListener('blur',()=>setTimeout(close,150));
    input.addEventListener('keydown',event=>{
      if(list.hidden)return;
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();active=(active+(event.key==='ArrowDown'?1:rows.length-1))%rows.length;rows.forEach(({row},i)=>{row.classList.toggle('is-active',i===active);row.setAttribute('aria-selected',String(i===active));});rows[active].row.scrollIntoView({block:'nearest'});}
      else if(event.key==='Enter'&&active>=0){event.preventDefault();const {result}=rows[active];pick(result,result.sizes.includes(lastResult.size)?lastResult.size:(result.sizes.length===1?result.sizes[0]:''),result.own[0]);}
      else if(event.key==='Escape'){close();}
    });
    return {close};
  }
  function quickAdd(product){
    if(!ready||loadingWorkspace||pendingPhotos||blocked)return false;
    const value={name:product.name||'',size:product.size||'',price:product.price||'',photo:product.photo||'',...(product.section?{section:product.section}:{}),...(product.icon&&!product.photo?{icon:product.icon}:{})};
    const position=insertProduct(value);
    if(!position){toast('Increase your product count or clear an item to make room.');return false;}
    const index=position-1;preloadPhotos().then(draw);
    // Focus after the click that triggered this has fully completed, otherwise the browser keeps focus on the search box.
    setTimeout(()=>focusItem(index,value.size?(value.price?'input[type="text"]':'input[type="number"]'):'.field-row input[type="text"]'),0);
    toast(value.name+(value.size?' · '+value.size:'')+' added. '+(value.price?'Check the price.':'Add your price.'));return true;
  }
  function updatePicker(){$('use-saved').disabled=!ready||!$('saved-product').value||(emptySlot()<0&&(activeCount()>=capacity()||items.length>=25));}
  $('saved-product').addEventListener('change',updatePicker);
  $('use-saved').addEventListener('click',async()=>{const p=products.find(p=>p.id===$('saved-product').value);if(!p||!insertProduct(ShopDeskItems.copy(p,false)))return;await preloadPhotos();draw();});
  $('add-item').addEventListener('click',async()=>{if(pendingPhotos)return;if(activeCount()<capacity()){const next=ShopDeskBusiness.resizeItems(items,activeCount()+1);items=next.items;selectedCount=next.itemCount;renderItems();changed();focusItem(activeCount()-1,'input[type="text"]');await preloadPhotos();draw();}});
  $('poster-template').addEventListener('change',()=>{
    if(ShopDeskCombos.styles.includes($('poster-template').value)){$('flyer-purpose').value='combos';selectedCount=Math.min(selectedCount,20);}
    else if(comboMode())$('flyer-purpose').value='offers';
    renderBusiness();
    if($('poster-template').value==='simple')selectedCount=Math.min(selectedCount,3);
    const template=$('poster-template').value;
    if(['bold','market','super','ribbon','signature'].includes(template)){if(!$('keep-colours').checked)$('promo-theme').value=({bold:'red',market:'green',super:'red',ribbon:'blue',signature:'gold'})[template];if(!finishingChosen){$('trim-photos').checked=true;$('clean-names').checked=true;finishingChosen=true;}}
    if(ShopDeskPoster.collection[template]&&!$('keep-colours').checked){$('promo-theme').value=ShopDeskPoster.collection[template].theme;}
    renderItems();changed();
  });
  for(const id of ['trim-photos','clean-names'])$(id).addEventListener('change',()=>finishingChosen=true);
  const designNames={super:'Super Saver',ribbon:'Corner Ribbon',signature:'Signature Collection',bold:'Bold Specials',market:'Fresh Market',boutique:'Boutique Collection',menu:'Kitchen Menu',studio:'Service Studio'};
  function comboData(){return {items,itemCount:activeCount(),purpose:'combos',combos};}
  function selectCombo(index){
    activeCombo=Math.max(0,Math.min(combos.length-1,index));
    for(const panel of $('promo-items').querySelectorAll('.combo-control'))panel.hidden=Number(panel.dataset.combo)!==activeCombo;
    for(const choice of $('combo-groups').children)choice.setAttribute('aria-pressed',String(Number(choice.dataset.comboChoice)===activeCombo));
    const rail=$('combo-groups'),selected=rail.children[activeCombo];if(selected&&rail.scrollWidth>rail.clientWidth){const bounds=rail.getBoundingClientRect(),tile=selected.getBoundingClientRect();if(tile.left<bounds.left)rail.scrollLeft+=tile.left-bounds.left-3;else if(tile.right>bounds.right)rail.scrollLeft+=tile.right-bounds.right+3;}
    const spaces=ShopDeskItems.room(items,activeCount(),capacity());$('batch-room').textContent=spaces+' '+(spaces===1?'space':'spaces')+' available for added items. Empty cards are filled first. New products go into '+combos[activeCombo].name+'.';
  }
  function syncComboQuantity(item,box,updateInput=true){
    const quantity=item.quantity||1;box.querySelector('.item-price').textContent=quantity+' ×';
    if(updateInput){const input=box.querySelector('[data-combo-quantity]');if(input)input.value=String(quantity);}
    for(const control of box.querySelectorAll('.quantity-step'))control.disabled=Number(control.dataset.quantityStep)<0?quantity<=1:quantity>=99;
    refreshComboBoard();
  }
  function comboStatus(group){
    if(!group.items.length)return 'Empty · off the flyer';
    if(!group.name.trim())return 'Add a name';
    if(!ShopDeskItems.price(group.price))return 'Add a bundle price';
    if(group.items.some(item=>!item.name.trim()))return 'Name your products';
    return 'Ready for your flyer';
  }
  function refreshComboBoard(){
    if(!comboMode())return;
    const groups=ShopDeskCombos.groups(comboData());$('combo-groups').replaceChildren();
    for(const group of groups){
      const choice=button('','combo-choice',()=>selectCombo(group.index));choice.dataset.comboChoice=String(group.index);choice.setAttribute('aria-label','Edit combo '+group.number+' · '+(group.name||'Unnamed combo'));choice.setAttribute('aria-controls','combo-panel-'+group.index);
      const number=document.createElement('span');number.className='combo-choice-number';number.textContent=String(group.number);
      const name=document.createElement('strong');name.textContent=group.name||'Unnamed combo';
      const photos=document.createElement('span');photos.className='combo-choice-photos';photos.setAttribute('aria-hidden','true');
      for(const item of group.items.slice(0,3)){const tile=document.createElement('span');if(item.photo){const img=document.createElement('img');img.alt='';setPhotoThumb(img,item.photo);tile.append(img);}else tile.textContent=item.name.trim().slice(0,1).toUpperCase()||'+';photos.append(tile);}
      const caption=document.createElement('small');caption.textContent=group.items.length+' product'+(group.items.length===1?'':'s')+' · '+(!group.items.length?'Off the flyer':ShopDeskItems.price(group.price)?money(group.price):'Set price');
      choice.append(number,name,photos,caption);$('combo-groups').append(choice);
      const panel=$('promo-items').querySelector('[data-combo="'+group.index+'"]');
      if(panel){const status=panel.querySelector('.combo-status');status.textContent=comboStatus(group);status.dataset.ready=String(comboStatus(group)==='Ready for your flyer');const packs=group.items.reduce((sum,item)=>sum+(item.quantity||1),0);panel.querySelector('.combo-product-count').textContent=group.items.length+' product'+(group.items.length===1?'':'s')+' · '+packs+' pack'+(packs===1?'':'s');}
    }
    selectCombo(activeCombo);
  }
  function applyComboItems(next){items=next.items;selectedCount=next.itemCount;if(next.combos)combos=next.combos;renderItems();changed();}
  function addComboProduct(index,product={name:'',size:'',price:'',photo:''}){
    try{assertEditable(batchContext());const next=ShopDeskCombos.add(comboData(),index,[product]);activeCombo=index;applyComboItems(next);const position=items.findIndex((item,i)=>i<activeCount()&&item.combo===index&&item.name===product.name&&item.photo===product.photo);if(!product.name)focusItem(position,'input[type="text"]');preloadPhotos().then(draw);return true;}catch(e){toast(e.message);return false;}
  }
  function renderComboPanels(){
    activeCombo=Math.min(activeCombo,combos.length-1);
    const groups=ShopDeskCombos.groups(comboData()),lists=[];
    groups.forEach(group=>{
      const index=group.index,combo=combos[index],panel=document.createElement('article');panel.className='combo-control';panel.dataset.combo=String(index);panel.id='combo-panel-'+index;panel.hidden=index!==activeCombo;
      const heading=document.createElement('div');heading.className='panel-heading compact';
      const label=document.createElement('h3');label.textContent='Basket '+(index+1);const status=document.createElement('span');status.className='combo-status';status.textContent=comboStatus(group);heading.append(label,status);
      const row=document.createElement('div');row.className='field-row combo-fields';
      const name=field('Combo name',combo.name,'text',v=>{combo.name=v;for(const select of $('promo-items').querySelectorAll('.combo-assignment'))select.options[index].textContent='Combo '+(index+1)+' · '+v;refreshComboBoard();},40);name.querySelector('input').className='combo-name';
      const price=field('Complete combo price (R)',combo.price,'number',v=>{combo.price=v;refreshComboBoard();});price.querySelector('input').className='combo-price';row.append(name,price);panel.append(heading,row);
      const ideas=document.createElement('details');ideas.className='combo-name-ideas';const summary=document.createElement('summary');summary.textContent='Choose a ready-made name';const names=document.createElement('div');names.className='combo-name-chips';
      for(const title of ['Family pantry','Breakfast basket','Braai essentials','Fresh produce','Cleaning bundle','Month-end saver'])names.append(button(title,'combo-name-chip',()=>{combo.name=title;name.querySelector('input').value=title;for(const select of $('promo-items').querySelectorAll('.combo-assignment'))select.options[index].textContent='Combo '+(index+1)+' · '+title;refreshComboBoard();changed();ideas.open=false;name.querySelector('input').focus();}));
      ideas.append(summary,names);panel.append(ideas);
      const count=document.createElement('p');count.className='combo-product-count';panel.append(count);
      const list=document.createElement('div');list.className='combo-products';lists.push(list);panel.append(list);
      if(!group.items.length){const empty=document.createElement('p');empty.className='combo-empty';empty.textContent='Start this basket with a new product, or reuse one you already have.';list.append(empty);}
      const actions=document.createElement('div');actions.className='combo-add-actions';
      const add=button('+ New product','button secondary add-combo-product',()=>addComboProduct(index));try{ShopDeskCombos.add(comboData(),index,[{name:'',size:'',price:'',photo:''}]);}catch(e){add.disabled=true;add.title=e.message;}
      const reuse=button('Reuse a product','button quiet reuse-combo-product',()=>openComboProducts(index));actions.append(add,reuse);panel.append(actions);
      const footer=document.createElement('div');footer.className='combo-panel-footer';
      const duplicate=button('Copy this combo','text-button duplicate-combo',()=>{try{assertEditable(batchContext());const next=ShopDeskCombos.duplicate(comboData(),index);activeCombo=next.combos.length-1;applyComboItems(next);$('promo-items').querySelector('.combo-control:not([hidden]) .combo-name').focus();toast('Separate combo copied. Change its name, products or price.');}catch(e){toast(e.message);}});
      let reason='';try{ShopDeskCombos.duplicate(comboData(),index);}catch(e){reason=e.message;}duplicate.disabled=!!reason;duplicate.title=reason||'Make an independent variation with the same products and price';footer.append(duplicate);
      if(combos.length>1){const remove=button('Remove empty combo','text-button remove-combo',()=>{
        if(group.items.length)return;try{assertEditable(batchContext());pinCombos();const remap=group=>group>index?group-1:Math.min(group,combos.length-2);items.forEach(item=>item.combo=remap(item.combo));if(lastRemoval)lastRemoval.item.combo=remap(lastRemoval.item.combo??ShopDeskCombos.groupOf(lastRemoval.item,lastRemoval.index,combos.length));combos.splice(index,1);activeCombo=Math.max(0,index-1);renderItems();changed();$('combo-groups').children[activeCombo]?.focus();toast('Empty combo removed.');}catch(e){toast(e.message);}
      });remove.disabled=group.items.length>0;remove.hidden=group.items.length>0;footer.append(remove);}panel.append(footer);
      if(reason&&group.items.length){const help=document.createElement('p');help.className='field-help combo-copy-help';help.textContent=reason;panel.append(help);}
      $('promo-items').append(panel);
    });return lists;
  }
  function renderCombos(){
    $('combo-editor').hidden=!comboMode();if(!comboMode())return;
    $('combo-total').textContent=activeCount()+' / 20 products';refreshComboBoard();$('add-combo').disabled=combos.length>=6;
  }
  $('add-combo').addEventListener('click',()=>{
    if(!comboMode()||combos.length>=6||pendingPhotos)return;
    pinCombos();combos.push({name:'Combo '+(combos.length+1),price:''});activeCombo=combos.length-1;renderItems();changed();$('promo-items').querySelector('.combo-control:not([hidden]) .combo-name').focus();toast('Your empty basket is ready. Add products inside it.');
  });
  function openComboProducts(index){
    try{assertEditable(batchContext());comboProductTarget=index;comboProductContext=batchContext();
      comboProductChoices=[...activeItems().filter(item=>item.name.trim()).map(item=>({item:ShopDeskItems.copy(item),source:'On this flyer'})),...products.map(item=>({item:ShopDeskItems.copy(item,false),source:'Saved product'}))];
      $('combo-product-title').textContent='Add to '+(combos[index].name||'Combo '+(index+1));$('combo-product-search').value='';$('combo-product-feedback').textContent='';renderComboProductChoices();$('combo-product-dialog').showModal();$('combo-product-search').focus();
    }catch(e){toast(e.message);}
  }
  function renderComboProductChoices(){
    const list=$('combo-product-options'),search=$('combo-product-search').value.trim().toLowerCase();list.replaceChildren();
    for(const choice of comboProductChoices.filter(choice=>(choice.item.name+' '+choice.item.size).toLowerCase().includes(search))){
      const option=button('','combo-reuse-choice',()=>{try{assertEditable(comboProductContext);if(!comboMode())throw new Error('Reopen this chooser from a combo flyer.');const next=ShopDeskCombos.add(comboData(),comboProductTarget,[choice.item]);activeCombo=comboProductTarget;applyComboItems(next);$('combo-product-feedback').textContent=choice.item.name+' added to '+combos[activeCombo].name+'.';preloadPhotos().then(draw);}catch(e){$('combo-product-feedback').textContent=e.message;}});
      const photo=document.createElement('span');photo.className='combo-reuse-photo';if(choice.item.photo){const img=document.createElement('img');img.alt='';setPhotoThumb(img,choice.item.photo);photo.append(img);}else photo.textContent=choice.item.name.slice(0,1).toUpperCase();
      const text=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=choice.item.name;detail.textContent=[choice.item.size,choice.source].filter(Boolean).join(' · ');text.append(name,detail);const plus=document.createElement('span');plus.textContent='+';plus.setAttribute('aria-hidden','true');option.append(photo,text,plus);list.append(option);
    }
    if(!list.children.length){const empty=document.createElement('p');empty.className='combo-empty';empty.textContent=comboProductChoices.length?'No matching products. Try another name.':'Add your first product to a basket, then reuse it here.';list.append(empty);}
  }
  $('combo-product-search').addEventListener('input',renderComboProductChoices);
  $('close-combo-products').addEventListener('click',()=>$('combo-product-dialog').close());
  $('combo-product-dialog').addEventListener('close',()=>{$('promo-items').querySelector('.combo-control:not([hidden]) .reuse-combo-product')?.focus();});
  function renderBusiness(){
    const p=ShopDeskStudio.suggest(snapshot().draft);$('business-suggestion').textContent='Suggested: '+(announcement()?ShopDeskStudio.purposes[p.purpose]:designNames[p.template]||ShopDeskPoster.collection[p.template]?.name||p.template)+' · “'+p.headline+'” · '+p.cta+'.';
    const ann=announcement(),purpose=$('flyer-purpose').value;
    $('date-field').hidden=ann||!$('show-date').checked;$('date-toggle').hidden=ann;$('template-field').hidden=!['offers','combos'].includes(purpose);$('template-hint').hidden=!['offers','combos'].includes(purpose);$('item-layout-control').hidden=!['offers','combos'].includes(purpose);$('offer-fields').hidden=ann;$('announcement-fields').hidden=!ann;$('details-field').hidden=['offers','combos'].includes(purpose);$('combo-editor').hidden=!comboMode();
    $('add-item').textContent='+ Add a new '+profile().item.toLowerCase();
    $('offer-fields').classList.toggle('editing-combos',comboMode());$('product-tools').open=!comboMode();$('add-item').hidden=comboMode();
  }
  $('business-type').addEventListener('change',()=>{renderBusiness();renderItems();changed();});
  $('apply-business-style').addEventListener('click',()=>{
    const d=ShopDeskStudio.suggest(snapshot().draft);
    for(const [id,key] of [['poster-template','template'],['promo-theme','theme'],['promo-headline','headline'],['promo-eyebrow','eyebrow'],['promo-cta','cta'],['promo-terms','terms']])$(id).value=d[key];
    $('show-date').checked=d.showDate;renderBusiness();renderItems();changed();toast('Style applied. Edit the wording below to make it yours.');
  });
  $('show-date').addEventListener('change',renderBusiness);
  $('flyer-purpose').addEventListener('change',async()=>{if(comboMode()){selectedCount=Math.min(selectedCount,20);if(!$('flyer-promotion').value)$('flyer-promotion').value='combos';if(!ShopDeskCombos.styles.includes($('poster-template').value))$('poster-template').value='combo-board';}else if(ShopDeskCombos.styles.includes($('poster-template').value))$('poster-template').value='bold';renderBusiness();renderItems();changed();await preloadPhotos();draw();});
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
      if(!items.includes(item))return;item.photo=result.id;for(const key of ['photoScale','photoX','photoY','source'])delete item[key];renderItems();changed();await loadImage(result.id);toast('Photo added. It will be kept with your saved product.');
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
      if(localMode&&id.startsWith('local-photo:')){const photos=JSON.parse(localStorage.getItem(localWorkspaceKey+'-photos')||'{}'),src=photos[id];if(!src)throw new Error('A saved photo could not be loaded.');const blob=await (await fetch(src)).blob(),image=await ShopDeskPhotos.decode(blob,1000);photoBlobs.set(id,blob);images.set(id,image);cachePhotoThumb(id,image);return image;}
      const response=await fetch('/api/photos/'+id,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('A saved photo could not be loaded.');
      const blob=await response.blob(),image=await ShopDeskPhotos.decode(blob,1000);photoBlobs.set(id,blob);images.set(id,image);cachePhotoThumb(id,image);imageErrors.delete(id);return image;
    })();imageLoads.set(id,promise);
    try{return await promise;}catch(e){imageErrors.add(id);throw e;}finally{imageLoads.delete(id);}
  }
  async function preloadPhotos(){
    // Serial decoding bounds peak memory on phones when opening a large catalogue.
    for(const id of new Set([logo,heroPhoto,...activeItems().map(i=>i.photo)].filter(Boolean)))try{await loadImage(id);}catch{}
  }
  async function exportImage(data,type='png',pages=null){
    const canvas=document.createElement('canvas'),size=ShopDeskPoster.outputSize(data.format,data.exportQuality),needed=new Map(),decoded=new Map();
    const request=(id,edge)=>{if(id)needed.set(id,Math.min(3840,Math.max(needed.get(id)||0,Math.ceil(edge))));};
    for(const page of (pages&&pages.length?pages:[data])){
      const layout=ShopDeskPoster.draw(canvas,page,images),scale=size.width/(layout.width||1080);
      request(page.logo,240*scale);request(page.heroPhoto,Math.max(size.width,size.height));
      page.items.forEach((item,i)=>{const c=layout.cards[i];if(c)request(item.photo,Math.max(c.w,c.h)*scale*(item.photoScale||1)*(page.trimPhotos?1.5:1));});
    }
    canvas.width=1;canvas.height=1;
    try{
      for(const [id,edge] of needed){
        if(!photoBlobs.has(id))await loadImage(id);
        decoded.set(id,await ShopDeskPhotos.decode(photoBlobs.get(id),edge));
      }
      return await ShopDeskOutput.image(data,decoded,type,pages);
    }finally{for(const image of decoded.values()){image.width=1;image.height=1;}decoded.clear();}
  }
  function dataForPoster(){const s=snapshot();return {...s.shop,shop:s.shop.name,...s.draft,eventDateText:dateText(s.draft.eventDate),dateText:dateText(s.draft.date),startDateText:s.draft.startDate?dateText(s.draft.startDate):'',itemCount:activeCount(),items:activeItems().map(i=>({...i,size:normalSize(i.size)}))};}
  function validatePoster(){
    if(!ready||loadingWorkspace)throw new Error('Load your saved project before making a poster.');
    const d=dataForPoster();if(!d.shop.trim())throw new Error('Enter your business name.');if(!d.headline.trim())throw new Error('Enter a headline.');if(!announcement()&&d.showDate&&!/^\d{4}-\d{2}-\d{2}$/.test(d.date))throw new Error('Choose the offer end date.');if(!announcement()&&d.showDate&&d.date<iso())throw new Error('This offer has expired. Choose today or a future end date.');
    if(!announcement()&&d.showDate&&d.startDate&&d.startDate>d.date)throw new Error('Choose an offer start date before or on the end date.');
    if(announcement()&&!/^\d{4}-\d{2}-\d{2}$/.test(d.eventDate))throw new Error('Choose the event or opening date.');
    if(comboMode()){const invalid=$('promo-items').querySelector('[data-combo-quantity]:invalid');if(invalid)throw new Error('Choose 1 to 99 packs for item '+(Number(invalid.dataset.comboQuantity)+1)+'.');const message=ShopDeskCombos.error(d);if(message)throw new Error(message);}
    if(!announcement()&&!comboMode())d.items.forEach((i,index)=>{if(!i.name.trim())throw new Error('Enter the name for item '+(index+1)+'.');ShopDeskLogic.number(i.price,'Price for item '+(index+1),.01,1000000);if(i.wasPrice!==undefined&&i.wasPrice!=='')ShopDeskLogic.number(i.wasPrice,'Previous price for item '+(index+1),.01,1000000);});
    if(pendingPhotos)throw new Error('Please wait for your photo to finish uploading.');
    if(!announcement()&&d.items.length>capacity())throw new Error(d.purpose==='spotlight'?'Spotlight needs one offer. Remove the others or choose Offers, menu or price list.':'Choose a flyer design to include more than three items.');
    if([logo,...(announcement()?[heroPhoto]:d.items.map(i=>i.photo))].some(id=>id&&!images.has(id)))throw new Error('A photo or logo is still loading or unavailable. Try changing or removing it before downloading.');
    return d;
  }
  function draw(){
    updateUndo();
    for(const control of $('promo-items').querySelectorAll('.move-item,.remove-item')){
      const index=Number(control.closest('.promo-item').dataset.index),step=Number(control.dataset.step||0);
      const next=step?moveDestination(index,step):index;control.disabled=!ready||loadingWorkspace||pendingPhotos>0||blocked||next<0||next>=activeCount()||(!step&&activeCount()<=1);
    }
    $('product-count').disabled=pendingPhotos>0;$('add-item').disabled=pendingPhotos>0||activeCount()>=capacity();
    renderDesigner();const d=dataForPoster(),statusFormat=d.format==='status',outputSize=ShopDeskPoster.outputSize(d.format,d.exportQuality),print=!!outputSize.mm;
    let valid=false;
    try{validatePoster();valid=true;$('promo-error').hidden=true;$('download-promo').disabled=exportBusy||packBusy;$('copy-promo').disabled=false;}catch(e){$('promo-error').textContent=e.message;$('promo-error').hidden=!ready;$('download-promo').disabled=true;$('copy-promo').disabled=true;}
    for(const id of ['create-pack','create-pack-bottom'])$(id).disabled=!valid||packBusy||exportBusy;
    $('download-print').disabled=!valid||exportBusy||packBusy;$('download-print').hidden=!print;
    const cataloguePages=print&&!comboMode()&&!announcement()?Math.ceil(d.items.length/12):1;
    $('print-pages-field').hidden=!print||cataloguePages<2;$('print-pages').disabled=exportBusy||packBusy;
    const catalogue=print&&cataloguePages>1&&$('print-pages').value==='catalogue';
    $('print-pages').options[1].textContent='Catalogue pages · '+cataloguePages+' pages of up to 12 offers';
    $('download-print').textContent=catalogue?'Download '+cataloguePages+'-page catalogue PDF ↓':'Download print PDF ↓';
    $('export-quality').closest('.field').hidden=print;
    $('export-quality').disabled=print||exportBusy||packBusy;$('promo-fields').disabled=!ready||loadingWorkspace||exportBusy||packBusy;
    $('download-promo').closest('.export-panel').setAttribute('aria-busy',String(exportBusy));
    const pages=comboMode()?ShopDeskCombos.groups(d).filter(g=>g.items.length).length:announcement()?1:Math.ceil(d.items.length/4);$('pack-summary').textContent='1 full flyer + '+pages+' WhatsApp Status '+(pages===1?'page':'pages')+' + a matching caption.';
    lastLayout=ShopDeskPoster.draw($('promo-canvas'),d,images,{warningScale:outputSize.width/(ShopDeskPoster.formats[d.format]?.width||1080)});
    const warnings=(announcement()?[]:d.items).map((i,index)=>{const message=ShopDeskPoster.packWarning(i.name,i.size);return message?'Item '+(index+1)+': '+message:'';}).filter(Boolean);
    for(const warning of lastLayout.photoWarnings||[])warnings.push((warning.name||'A product')+': this photo may look soft in the chosen export size. Upload a larger original for more detail.');
    $('promo-review').hidden=!warnings.length;$('promo-review').textContent=warnings.join(' ');
    const spaces=ShopDeskItems.room(items,activeCount(),capacity());
    $('batch-room').textContent=spaces+' '+(spaces===1?'space':'spaces')+' available for added items. Empty cards are filled first.'+(comboMode()?' New products go into '+combos[activeCombo].name+'.':'');
    for(const id of ['open-bulk','open-saved-grid','quick-add-input','quick-add-button','quick-add-find'])$(id).disabled=!ready||loadingWorkspace||pendingPhotos>0||blocked||exportBusy||packBusy;
    $('feature-explainer').hidden=d.purpose!=='offers'||d.template==='simple';
    $('format-caption').textContent=ShopDeskPoster.formats[d.format].label;
    $('download-hint').textContent=outputSize.width+' × '+outputSize.height+' PNG'+(print?' · '+d.format.toUpperCase()+' PDF at 300 dpi'+(catalogue?' · '+cataloguePages+' pages':'')+'. Print at Actual size (100%).':' · '+(d.exportQuality==='4k'?'4K long edge.':'Ready to share.'));
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
      const catalogue=type==='pdf'&&$('print-pages').value==='catalogue'&&!comboMode()&&!announcement()&&d.items.length>12?ShopDeskPack.catalogue(d,12):null;
      const blob=await exportImage(d,type,catalogue);download(blob,'handbill-'+d.format+(catalogue?'-catalogue':'')+'-'+iso()+'.'+type);
      toast(type==='pdf'?(catalogue?'Your '+catalogue.length+'-page catalogue PDF is ready. Choose Actual size (100%) when printing.':'Your print PDF is ready. Choose Actual size (100%) when printing.'):'Your image is ready to share.');
    }catch(e){toast(e.message||'Could not create this download. Try Standard quality.');}
    finally{exportBusy=false;draw();}
  }
  $('download-promo').addEventListener('click',()=>downloadFlyer('png'));
  $('download-print').addEventListener('click',()=>downloadFlyer('pdf'));
  $('export-quality').addEventListener('change',changed);$('print-pages').addEventListener('change',changed);
  $('copy-promo').addEventListener('click',async()=>{try{const content=ShopDeskPack.caption(validatePoster());try{await navigator.clipboard.writeText(content);toast('Offer text copied. Paste it into your customer message.');}catch{download(new Blob([content],{type:'text/plain;charset=utf-8'}),'handbill-offer.txt');toast('Offer text downloaded.');}}catch(e){toast(e.message);}});
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
      const zip=await ShopDeskPack.zip(files);if(run!==packRun)return;packZip=zip;packName='handbill-'+($('project-name').value.trim().replace(/[^a-z0-9]+/gi,'-').slice(0,50)||'project')+'.zip';
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
  $('promo-form').addEventListener('input',event=>{if(event.target.closest('#promo-items,#combo-editor')||['product-count','saved-product','logo-file','hero-file','poster-template','business-type','flyer-purpose'].includes(event.target.id))return;changed();});
  $('promo-form').addEventListener('change',event=>{if(event.target.closest('#promo-items,#combo-editor')||['product-count','saved-product','logo-file','hero-file','poster-template','business-type','flyer-purpose'].includes(event.target.id))return;changed();});
  const expiry=new Date();expiry.setDate(expiry.getDate()+7);$('promo-date').value=iso(expiry);
  let illustrationItem=null;
  function openIllustrations(item){
    try{assertEditable(batchContext());}catch(e){toast(e.message);return;}
    illustrationItem=item;const grid=$('illustration-grid');grid.replaceChildren();
    $('illustration-name').textContent=item.name||'this offer';
    for(const id of ShopDeskIllustrations.ids){
      const option=button('','illustration-option',()=>{item.icon=id;$('illustration-dialog').close();renderItems();changed();toast('Illustration added. A real photo always replaces it.');});
      option.setAttribute('aria-pressed',String(item.icon===id));option.setAttribute('aria-label',id.replace(/-/g,' '));
      const img=document.createElement('img');img.alt='';img.src=ShopDeskIllustrations.dataURL(id,96);const caption=document.createElement('span');caption.textContent=id.replace(/-/g,' ');option.append(img,caption);grid.append(option);
    }
    $('remove-illustration').hidden=!item.icon;$('illustration-dialog').showModal();
  }
  $('close-illustration').addEventListener('click',()=>$('illustration-dialog').close());
  $('remove-illustration').addEventListener('click',()=>{if(illustrationItem){illustrationItem.icon='';$('illustration-dialog').close();renderItems();changed();}});
  attachSuggestions($('quick-add-input'),{onPick(product){const added=quickAdd(product);if(added)$('quick-add-input').value='';}});
  function quickAddTyped(){
    const text=$('quick-add-input').value.trim();if(!text)return;
    const parsed=ShopDeskProducts.search(text,searchContext());
    if(parsed.results.length&&parsed.exact){const top=parsed.results[0];quickAdd({name:top.name,size:parsed.size||(top.sizes.length===1?top.sizes[0]:''),price:parsed.price,section:top.section,icon:top.icon});}
    else quickAdd(ShopDeskProducts.enrich({name:(parsed.name||text).slice(0,50),size:parsed.size,price:parsed.price,photo:''}));
    $('quick-add-input').value='';
  }
  $('quick-add-button').addEventListener('click',quickAddTyped);
  $('quick-add-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.defaultPrevented){event.preventDefault();quickAddTyped();}});
  // Find product & photo: state changes requested by the finder dialog.
  // Brand colours start from whichever palette is chosen, so the three pickers never open on arbitrary values.
  function seedColours(theme){const [brand,accent,paper]=ShopDeskPoster.themes[theme]||ShopDeskPoster.themes.red;$('colour-brand').value=brand;$('colour-accent').value=accent;$('colour-paper').value=paper;}
  $('use-custom-colours').addEventListener('change',()=>{$('colour-inputs').hidden=!$('use-custom-colours').checked;});
  $('colours-from-palette').addEventListener('click',()=>{seedColours($('promo-theme').value);changed();});
  function catalogueContext(){return {...searchContext(),context:batchContext(),comboMode:comboMode(),activeCombo,comboName:comboMode()?(combos[activeCombo]?.name||'Combo '+(activeCombo+1)):'',items:activeItems().map((item,index)=>({index,name:item.name,size:item.size,photo:item.photo,featured:!!item.featured,quantity:item.quantity||1}))};}
  async function searchOnline(params){
    if(localMode)throw new Error('Online search needs the hosted version of Handbill. Local search and manual entry still work.');
    return api('/api/catalogue/search?'+new URLSearchParams(params));
  }
  async function providerPhoto(source){
    if(localMode)throw new Error('Provider photos need the hosted version of Handbill. You can still add the product without a photo.');
    const result=await api('/api/catalogue/photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source})});
    await loadImage(result.id);return result;
  }
  function addCatalogueProduct(product,{replaceIndex=-1,remember=false,context}={}){
    assertEditable(context??batchContext());
    const value=ShopDeskItems.copy({name:product.name||'',size:product.size||'',price:product.price||'',photo:product.photo||'',...(product.icon&&!product.photo?{icon:product.icon}:{}),...(product.section?{section:product.section}:{}),...(product.photo&&product.source?{source:product.source}:{}),...(product.caseQuantity?{caseQuantity:product.caseQuantity}:{}),...(product.wasPrice?{wasPrice:product.wasPrice}:{})},false);
    let index;
    if(replaceIndex>=0){
      const current=activeItems()[replaceIndex];if(!current)throw new Error('That offer is no longer on the flyer. Add the product as a new offer instead.');
      if(comboMode())pinCombos();
      // Replacing keeps the offer's place in the flyer: its basket, pack count, featured state and multi-buy quantity.
      const keep={...(current.featured?{featured:true}:{}),...(current.combo!==undefined?{combo:current.combo}:{}),...(current.quantity?{quantity:current.quantity}:{}),...(current.dealQuantity?{dealQuantity:current.dealQuantity}:{})};
      items[replaceIndex]={...value,...keep};index=replaceIndex;renderItems();changed();
    }else{
      const position=insertProduct(value);if(!position)throw new Error('Increase your product count or clear an item to make room.');index=position-1;
    }
    if(remember&&value.name.trim()){
      const found=products.find(p=>p.name.trim().toLowerCase()===value.name.trim().toLowerCase()&&p.size.trim().toLowerCase()===value.size.trim().toLowerCase());
      if(found||products.length<100){const saved={id:found?.id||crypto.randomUUID(),...ShopDeskItems.copy(value,false)};if(found)products[products.indexOf(found)]=saved;else products.push(saved);renderSaved();}
    }
    rememberProduct(value.name);changed();preloadPhotos().then(draw);
    setTimeout(()=>focusItem(index,value.price?'input[type="text"]':'input[type="number"]'),0);
    return index;
  }
  window.ShopDeskPromotion={draw,quickAdd,catalogueContext,searchOnline,providerPhoto,addCatalogueProduct,addProduct(product){if(!ready){toast('Wait for your saved workspace to load.');return false;}if(announcement()){toast('Choose an offers flyer to add products.');return false;}if(!insertProduct({...product,photo:''})){toast('Increase your product count or clear an item to make room.');return false;}return true;}};
  function batchContext(){return studioState?studioState.activeClientId+':'+studioState.activeProjectId:'';}
  function assertEditable(context){if(!ready||loadingWorkspace||pendingPhotos||blocked||exportBusy||packBusy)throw new Error('Wait for the project to finish loading, saving photos or creating downloads.');if(context!==batchContext())throw new Error('The active project changed. Close this window and reopen it.');}
  Object.assign(window.ShopDeskPromotion,{
    wordingContext(){assertEditable(batchContext());const d=snapshot().draft;return {context:batchContext(),business:d.business,purpose:d.purpose,promotion:d.promotion||'',template:d.template,showDate:d.showDate,values:Object.fromEntries(Object.keys(ShopDeskWords.fields).map(key=>[key,d[key]]))};},
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
    async addBatch(rows,context){assertEditable(context);if(announcement())throw new Error('Choose an offers flyer first.');const count=activeCount(),slots=activeItems().map((item,i)=>!item.name.trim()&&!item.size.trim()&&!item.price&&!item.photo?i:-1).filter(i=>i>=0);if(comboMode())pinCombos();const next=ShopDeskItems.insert(items,count,rows.map(row=>ShopDeskProducts.enrich(row)),capacity());if(comboMode())rows.forEach((item,i)=>next.items[i<slots.length?slots[i]:count+i-slots.length].combo=activeCombo);items=next.items;selectedCount=next.itemCount;renderItems();changed();preloadPhotos().then(draw);toast(rows.length+' '+(rows.length===1?'item added.':'items added.')+(comboMode()?' To '+combos[activeCombo].name+'.':''));},
    selectCombo(index){if(comboMode())selectCombo(index);},
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
