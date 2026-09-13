(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const iso=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const money=n=>'R'+Number(n).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
  let items=[{name:'Potatoes',size:'1 kg pack',price:'10.00',photo:''}],products=[],revision=0,ready=false,dirty=false,saving=false,blocked=false,change=0,saveTimer,toastTimer;
  let lastSaveError=false,pendingPhotos=0;
  const images=new Map(),imageErrors=new Set(),imageLoads=new Map();
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
  function status(message,error=false){$('save-status').textContent=message;$('save-status').classList.toggle('save-error',error);}
  async function api(path,options={}) {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
    try {const response=await fetch(path,{...options,credentials:'same-origin',signal:controller.signal});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Please try again.'),{status:response.status});return data;}
    catch(e){if(e.name==='AbortError')throw new Error('The connection took too long. Your edits are still here; try again.');throw e;}
    finally{clearTimeout(timeout);}
  }
  function dateText(value){if(!value)return 'your selected date';const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?'your selected date':d.toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});}
  function snapshot(){return {shop:{name:$('shop-name').value,phone:$('promo-phone').value,location:$('promo-location').value},products:products.map(p=>({...p})),draft:{headline:$('promo-headline').value,date:$('promo-date').value,theme:$('promo-theme').value,format:document.querySelector('[name="poster-format"]:checked').value,items:items.map(({name,size,price,photo})=>({name,size,price,photo}))}};}
  function changed(){if(!ready)return;dirty=true;change++;if(!blocked){status('Unsaved changes');clearTimeout(saveTimer);saveTimer=setTimeout(save,900);}draw();}
  async function save(){
    if(!ready||!dirty||saving||blocked||pendingPhotos)return;
    saving=true;lastSaveError=false;status('Saving…');const version=change;
    try{const result=await api('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,data:snapshot()})});revision=result.revision;dirty=version!==change;$('workspace-error').hidden=true;$('retry-save').hidden=true;status(dirty?'Saving your latest changes…':'All changes saved');}
    catch(e){lastSaveError=true;status('Changes not saved',true);$('workspace-error').textContent=e.message;$('workspace-error').hidden=false;if(e.status===409){blocked=true;$('reload-workspace').hidden=false;$('retry-save').hidden=true;}else $('retry-save').hidden=false;}
    finally{saving=false;if(dirty&&!blocked&&!lastSaveError)saveTimer=setTimeout(save,150);}
  }
  async function loadWorkspace(){
    if(saving)return;status('Loading your saved workspace…');$('promo-fields').disabled=true;$('retry-save').hidden=true;$('reload-workspace').hidden=true;
    try{const result=await api('/api/workspace');revision=result.revision;const data=result.data;
      if(data){$('shop-name').value=data.shop.name;$('promo-phone').value=data.shop.phone;$('promo-location').value=data.shop.location;$('promo-headline').value=data.draft.headline;$('promo-date').value=data.draft.date;$('promo-theme').value=data.draft.theme;document.querySelector('[name="poster-format"][value="'+data.draft.format+'"]').checked=true;items=data.draft.items;products=data.products;}
      ready=true;dirty=false;blocked=false;lastSaveError=false;$('promo-fields').disabled=false;$('workspace-error').hidden=true;status(data?'All changes saved':'Your changes will save automatically');renderItems();renderSaved();await preloadPhotos();draw();
    }catch(e){ready=false;status('Could not load saved products',true);$('workspace-error').textContent=e.message;$('workspace-error').hidden=false;$('retry-save').hidden=false;draw();}
  }
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
  function renderItems(){
    const list=$('promo-items');list.replaceChildren();
    items.forEach((item,index)=>{
      const box=document.createElement('div');box.className='promo-item';const heading=document.createElement('div');heading.className='item-heading';heading.textContent='PRODUCT '+(index+1);
      if(items.length>1)heading.append(button('Remove','remove-item',()=>{items.splice(items.indexOf(item),1);renderItems();changed();}));
      const photoRow=document.createElement('div');photoRow.className='photo-row';const thumb=document.createElement('div');thumb.className='photo-thumb';
      if(item.photo){const img=document.createElement('img');img.alt=item.name||'Product photo';img.src='/api/photos/'+item.photo;img.addEventListener('error',()=>{img.hidden=true;thumb.textContent='Photo unavailable';});thumb.append(img);}else{thumb.textContent='Your photo';}
      const photoActions=document.createElement('div');photoActions.className='photo-actions';const uploadLabel=document.createElement('label');uploadLabel.className='photo-upload';uploadLabel.append(document.createTextNode(item.photo?'Change photo':'Add product photo'));
      const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.setAttribute('aria-label','Choose photo for product '+(index+1));file.addEventListener('change',()=>{if(file.files[0])uploadPhoto(item,file.files[0],uploadLabel,file);});uploadLabel.append(file);photoActions.append(uploadLabel);
      const hint=document.createElement('span');hint.className='field-help';hint.textContent='JPG, PNG or WebP · full image kept';photoActions.append(hint);
      if(item.photo)photoActions.append(button('Remove photo','text-button',()=>{item.photo='';renderItems();changed();}));
      photoRow.append(thumb,photoActions);const name=field('Product name',item.name,'text',v=>item.name=v,50);name.classList.add('full');const row=document.createElement('div');row.className='field-row';
      const sizeField=field('Pack / quantity',item.size,'text',v=>item.size=v,25);sizeField.querySelector('input').addEventListener('blur',e=>{item.size=normalSize(item.size);e.target.value=item.size;changed();});
      row.append(sizeField,field('Selling price (R)',item.price,'number',v=>item.price=v));
      const saveProduct=button('Save to my products','text-button save-product',()=>{
        if(!item.name.trim()||item.price===''||Number(item.price)<=0||!Number.isFinite(Number(item.price))){toast('Enter a product name and a price above zero first.');return;}
        const found=products.find(p=>p.name.trim().toLowerCase()===item.name.trim().toLowerCase()&&p.size.trim().toLowerCase()===item.size.trim().toLowerCase());
        if(!found&&products.length>=100){toast('You can keep up to 100 saved products.');return;}
        const value={id:found?.id||crypto.randomUUID(),...item};if(found)products[products.indexOf(found)]=value;else products.push(value);
        renderSaved();changed();clearTimeout(saveTimer);save();toast(found?'Product updated. Waiting for the saved confirmation.':'Product added to your list. Waiting for the saved confirmation.');
      });
      box.append(heading,photoRow,name,row,saveProduct);list.append(box);
    });
    $('item-count').textContent=items.length+' of 3';$('add-item').disabled=items.length>=3;updatePicker();
  }
  function renderSaved(){const select=$('saved-product'),value=select.value;select.replaceChildren();const first=document.createElement('option');first.value='';first.textContent=products.length?'Choose a product…':'No saved products yet';select.append(first);
    for(const product of products){const option=document.createElement('option');option.value=product.id;option.textContent=product.name+(product.size?' · '+product.size:'')+' · '+money(product.price);select.append(option);}select.value=value;updatePicker();
    $('saved-hint').textContent=products.length?products.length+' saved '+(products.length===1?'product':'products')+'. Select one to reuse its photo and price.':'Save a product below to reuse its details and photo.';
  }
  function updatePicker(){$('use-saved').disabled=!ready||!$('saved-product').value||items.length>=3;}
  $('saved-product').addEventListener('change',updatePicker);
  $('use-saved').addEventListener('click',async()=>{const p=products.find(p=>p.id===$('saved-product').value);if(!p||items.length>=3)return;items.push({name:p.name,size:p.size,price:p.price,photo:p.photo});renderItems();changed();await preloadPhotos();draw();});
  $('add-item').addEventListener('click',()=>{if(items.length<3){items.push({name:'',size:'',price:'',photo:''});renderItems();changed();}});
  async function imageBlob(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP photo.');
    if(file.size>15000000)throw new Error('Choose a photo smaller than 15 MB.');
    const url=URL.createObjectURL(file);
    try{const image=new Image();image.src=url;await image.decode();if(image.naturalWidth*image.naturalHeight>60000000)throw new Error('This photo is too large. Choose a smaller image.');
      const ratio=Math.min(1,1000/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not process this photo.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));if(!blob||blob.size>1500000)throw new Error('Choose a smaller photo.');return blob;
    }finally{URL.revokeObjectURL(url);}
  }
  async function uploadPhoto(item,file,label,input){
    const old=label.firstChild.textContent;input.disabled=true;label.firstChild.textContent='Adding photo…';pendingPhotos++;draw();
    try{const blob=await imageBlob(file);const result=await api('/api/photos',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob});
      if(!items.includes(item))return;item.photo=result.id;await loadImage(result.id);renderItems();changed();toast('Photo added. It will be kept with your saved product.');
    }catch(e){toast(e.message||'Could not add this photo. Please try another image.');}
    finally{pendingPhotos--;input.disabled=false;label.firstChild.textContent=old;draw();if(dirty&&!blocked){clearTimeout(saveTimer);saveTimer=setTimeout(save,100);}}
  }
  async function loadImage(id){
    if(images.has(id))return images.get(id);if(imageLoads.has(id))return imageLoads.get(id);
    const promise=(async()=>{const image=new Image();image.src='/api/photos/'+id;await image.decode();images.set(id,image);imageErrors.delete(id);return image;})();imageLoads.set(id,promise);
    try{return await promise;}catch(e){imageErrors.add(id);throw e;}finally{imageLoads.delete(id);}
  }
  async function preloadPhotos(){await Promise.allSettled([...new Set(items.map(i=>i.photo).filter(Boolean))].map(loadImage));}
  function dataForPoster(){const s=snapshot();return {...s.shop,shop:s.shop.name,...s.draft,dateText:dateText(s.draft.date),items:s.draft.items.map(i=>({...i,size:normalSize(i.size)}))};}
  function validatePoster(){
    if(!ready)throw new Error('Load your saved workspace before making a poster.');
    const d=dataForPoster();if(!d.shop.trim())throw new Error('Enter your shop name.');if(!d.headline.trim())throw new Error('Enter a headline.');if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date))throw new Error('Choose the offer end date.');if(d.date<iso())throw new Error('This offer has expired. Choose today or a future end date.');
    d.items.forEach((i,index)=>{if(!i.name.trim())throw new Error('Enter the name for product '+(index+1)+'.');ShopDeskLogic.number(i.price,'Price for product '+(index+1),.01,1000000);});
    if(pendingPhotos)throw new Error('Please wait for your photo to finish uploading.');
    if(d.items.some(i=>i.photo&&!images.has(i.photo)))throw new Error('A photo is still loading or unavailable. Try changing or removing that photo before downloading.');
    return d;
  }
  function draw(){
    const d=dataForPoster(),statusFormat=d.format==='status';
    try{validatePoster();$('promo-error').hidden=true;$('download-promo').disabled=false;$('copy-promo').disabled=false;}catch(e){$('promo-error').textContent=e.message;$('promo-error').hidden=!ready;$('download-promo').disabled=true;$('copy-promo').disabled=true;}
    ShopDeskPoster.draw($('promo-canvas'),d,images);
    $('format-caption').textContent=statusFormat?'9:16 WhatsApp Status':'4:5 portrait';$('download-hint').textContent=statusFormat?'1080 × 1920 PNG · Ready for WhatsApp Status.':'1080 × 1350 PNG · Ready to share.';
    $('download-promo').textContent=statusFormat?'Download Status ↓':'Download poster ↓';$('poster-note').textContent=statusFormat?'Space at the top and bottom keeps offers clear of Status controls.':'Your products take centre stage. Photos are optional.';
  }
  function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  $('download-promo').addEventListener('click',async()=>{try{const d=validatePoster();$('download-promo').disabled=true;await document.fonts?.ready;await preloadPhotos();validatePoster();draw();$('promo-canvas').toBlob(blob=>{if(!blob){toast('Could not create your poster. Please try again.');return;}download(blob,'shopdesk-'+d.format+'-'+iso()+'.png');toast('Your '+(d.format==='status'?'Status image':'poster')+' is ready to share.');},'image/png');}catch(e){toast(e.message);}finally{draw();}});
  $('copy-promo').addEventListener('click',async()=>{try{const d=validatePoster();const content=[d.shop,d.headline,'',...d.items.map(i=>`${i.name}${i.size?' · '+i.size:''} — ${money(i.price)}`),'','Valid until '+d.dateText,d.location,d.phone,'While stocks last.'].join('\n');try{await navigator.clipboard.writeText(content);toast('Offer text copied. Paste it into your customer message.');}catch{download(new Blob([content],{type:'text/plain;charset=utf-8'}),'shopdesk-offer.txt');toast('Offer text downloaded.');}}catch(e){toast(e.message);}});
  $('promo-form').addEventListener('input',event=>{if(event.target.closest('#promo-items')||event.target.id==='saved-product')return;changed();});
  $('promo-form').addEventListener('change',event=>{if(event.target.closest('#promo-items')||event.target.id==='saved-product')return;changed();});
  const expiry=new Date();expiry.setDate(expiry.getDate()+7);$('promo-date').value=iso(expiry);
  window.ShopDeskPromotion={draw,addProduct(product){if(!ready){toast('Wait for your saved workspace to load.');return false;}if(items.length>=3){toast('Your poster already has three products. Remove one to add this price.');return false;}items.push({...product,photo:''});renderItems();changed();return true;}};
  renderItems();draw();loadWorkspace();if(document.fonts?.ready)document.fonts.ready.then(draw);
})();
