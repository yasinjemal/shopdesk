(() => {
  'use strict';
  // Find product & photo: one dialog for the whole journey. Private saved
  // products first, then the built-in list, then (only when asked) the open
  // product database. Every path ends at the same detail panel: exact pack,
  // selling price, photo and “remember”, or a plain manual entry.
  const $=id=>document.getElementById(id),P=ShopDeskProducts;
  const state={open:false,context:null,replaceIndex:-1,run:0,online:null,onlineQuery:'',busy:false,selected:null,stream:null,scanning:false};
  const money=n=>'R'+Number(n).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
  const allowedImage=url=>{try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='images.openfoodfacts.org';}catch{return false;}};
  function status(text,error=false){$('finder-status').textContent=text;$('finder-status').classList.toggle('validation',error);}
  function error(text){$('finder-error').textContent=text;$('finder-error').hidden=!text;}
  function setBusy(flag){state.busy=flag;$('finder-dialog').setAttribute('aria-busy',String(flag));for(const id of ['finder-add','finder-back','finder-manual','finder-search-online','finder-query','close-finder'])$(id).disabled=flag;}
  function illustration(icon){return ShopDeskIllustrations.dataURL(icon||'generic',112);}
  function refreshContext(){try{state.context=ShopDeskPromotion.catalogueContext();}catch{state.context=null;}return state.context;}
  function card(group,{image,name,meta,sizes,onName,onSize,note}){
    const row=document.createElement('article');row.className='finder-result';
    const img=document.createElement('img');img.alt='';img.src=image;img.loading='lazy';img.addEventListener('error',()=>{img.src=illustration('generic');});
    const text=document.createElement('div');text.className='finder-result-text';
    const title=document.createElement('button');title.type='button';title.className='finder-result-name';title.textContent=name;title.addEventListener('click',onName);
    const small=document.createElement('small');small.textContent=meta;text.append(title,small);
    if(note){const n=document.createElement('small');n.textContent=note;n.className='finder-note';text.append(n);}
    if(sizes&&sizes.length){const chips=document.createElement('div');chips.className='product-sizes';for(const size of sizes.slice(0,8)){const chip=document.createElement('button');chip.type='button';chip.className='size-chip';chip.textContent=size.label;chip.setAttribute('aria-label',name+' '+size.label);chip.classList.toggle('is-own',!!size.own);chip.addEventListener('click',()=>onSize(size));chips.append(chip);}text.append(chips);}
    row.append(img,text);group.append(row);
  }
  function groupEl(title){const section=document.createElement('section');section.className='finder-group';const h=document.createElement('h3');h.textContent=title;section.append(h);return section;}
  // Local results render instantly on every keystroke; nothing leaves the browser.
  function renderLocal(){
    const query=$('finder-query').value.trim(),results=$('finder-results');results.replaceChildren();
    const context=state.context||refreshContext()||{saved:[],recent:[]};
    const digits=query.replace(/\s+/g,'');
    if(/^\d{6,}$/.test(digits)){
      status(P.validBarcode(digits)?'That looks like a barcode. Tap “Search online” to look it up.':'That barcode does not pass its check digit. Check the digits printed under the bars.',!P.validBarcode(digits));
      renderOnline(results);return;
    }
    if(query.length<2){status(context.saved?.length?'Your '+context.saved.length+' saved products appear first when you type.':'');renderOnline(results);return;}
    const found=P.search(query,context,12);
    const mine=found.results.filter(r=>r.own.length),rest=found.results.filter(r=>!r.own.length);
    if(mine.length){
      const group=groupEl('Your saved products · private');
      for(const r of mine)card(group,{image:r.own[0].photo?('/api/photos/'+r.own[0].photo):illustration(r.icon||r.own[0].icon),name:r.name,meta:[r.section,'Saved for this business'].filter(Boolean).join(' · '),
        sizes:r.sizes.map(label=>{const own=r.own.find(p=>p.size===label);return {label:label+(own?.price?' · '+money(own.price):''),size:label,own};}),
        onName:()=>select({kind:'saved',name:r.name,section:r.section,icon:r.icon,sizes:r.sizes,size:found.size||r.own[0].size||'',price:r.own[0].price||'',photo:r.own[0].photo||'',source:r.own[0].source||null,own:r.own}),
        onSize:size=>select({kind:'saved',name:r.name,section:r.section,icon:r.icon,sizes:r.sizes,size:size.size,price:size.own?.price||found.price||'',photo:size.own?.photo||'',source:size.own?.source||null,own:r.own})});
      results.append(group);
    }
    if(rest.length){
      const group=groupEl('Built-in product list');
      for(const r of rest)card(group,{image:illustration(r.icon),name:r.name,meta:[r.section,r.customSize?'Your size: '+r.sizes[0]:'Choose a pack'].filter(Boolean).join(' · '),
        sizes:r.sizes.map(label=>({label,size:label})),
        onName:()=>select({kind:'local',name:r.name,section:r.section,icon:r.icon,sizes:r.sizes,size:found.size&&r.sizes.some(s=>P.sameSize(s,found.size))?found.size:(r.sizes.length===1?r.sizes[0]:''),price:found.price||'',photo:'',source:null}),
        onSize:size=>select({kind:'local',name:r.name,section:r.section,icon:r.icon,sizes:r.sizes,size:size.size,price:found.price||'',photo:'',source:null})});
      results.append(group);
    }
    const total=mine.length+rest.length;
    status(total?total+' local '+(total===1?'match':'matches')+'. Tap a pack size, or “Search online” for brand photos.':'No local match. Try “Search online”, or add it manually below.');
    renderOnline(results);
  }
  function renderOnline(results){
    if(!state.online)return;
    const group=groupEl(state.online.products.length?'Online results · '+state.online.products.length+' from Open Food Facts':'Online results');
    if(!state.online.products.length){const p=document.createElement('p');p.className='field-help';p.textContent='Nothing found online for “'+state.onlineQuery+'”. Coverage of South African products is still growing; add it manually below.';group.append(p);}
    const wanted=P.parseSize(P.parseQuery(state.onlineQuery).size||'');
    for(const product of state.online.products){
      // A record with a different measurable size is never offered for a typed size.
      if(wanted&&product.size&&P.parseSize(product.size)&&!P.sameSize(product.size,P.parseQuery(state.onlineQuery).size))continue;
      const local=P.identify(product.name);
      card(group,{image:product.image&&allowedImage(product.image)?product.image:illustration(local?.icon),name:product.name,meta:[product.size?'Pack: '+product.size+(product.sizeFromName?' (read from the name, please check)':''):'Pack size not listed','Code '+product.code,product.author?'Photo by '+product.author:'No photo yet'].join(' · '),
        sizes:product.size?[{label:product.size,size:product.size}]:[],
        onName:()=>select({kind:'online',name:product.name,section:local?.section||'',icon:local?.icon||'',sizes:product.size?[product.size]:[],size:product.size||'',sizeFromName:!!product.sizeFromName,price:P.parseQuery(state.onlineQuery).price||'',photo:'',image:product.image&&allowedImage(product.image)&&product.revision?product.image:'',source:product.revision?product.source:null,code:product.code}),
        onSize:size=>select({kind:'online',name:product.name,section:local?.section||'',icon:local?.icon||'',sizes:[size.size],size:size.size,sizeFromName:!!product.sizeFromName,price:P.parseQuery(state.onlineQuery).price||'',photo:'',image:product.image&&allowedImage(product.image)&&product.revision?product.image:'',source:product.revision?product.source:null,code:product.code})});
    }
    results.append(group);
  }
  async function searchOnline(){
    const query=$('finder-query').value.trim();if(query.length<2){status('Type at least two letters or a barcode first.',true);return;}
    const digits=query.replace(/\s+/g,''),byCode=/^\d{6,}$/.test(digits);
    if(byCode&&!P.validBarcode(digits)){status('That barcode does not pass its check digit. Check the digits printed under the bars.',true);return;}
    const run=++state.run;state.online=null;state.onlineQuery=query;$('finder-search-online').disabled=true;status('Searching Open Food Facts…');
    try{
      const parsed=P.parseQuery(query),result=await ShopDeskPromotion.searchOnline(byCode?{code:digits}:{q:parsed.query||query});
      if(run!==state.run)return;// a newer search started; never overwrite it
      state.online=result;renderLocal();
      status(result.products.length?result.products.length+' online '+(result.products.length===1?'result':'results')+(result.cached?' (recent)':'')+'. Pick one to choose the exact pack and your price.':'Nothing found online. Local matches above still work, or add it manually.');
    }catch(e){if(run!==state.run)return;status(e.message||'Online search is not available right now. Local matches and manual entry still work.',true);}
    finally{if(run===state.run)$('finder-search-online').disabled=false;}
  }
  function select(choice){
    state.selected=choice;error('');
    $('finder-results').hidden=true;$('finder-detail').hidden=false;
    $('finder-image').src=choice.image||(choice.photo?'/api/photos/'+choice.photo:illustration(choice.icon));
    $('finder-detail-source').textContent=choice.kind==='online'?'Open Food Facts · code '+choice.code:choice.kind==='saved'?'Your saved product':'Built-in product list';
    $('finder-detail-title').textContent=choice.name;$('finder-name').value=choice.name;
    $('finder-detail-meta').textContent=[choice.section,choice.source?.author?'Photo by '+choice.source.author+' (CC BY-SA 3.0)':''].filter(Boolean).join(' · ');
    const chips=$('finder-sizes');chips.replaceChildren();
    for(const size of (choice.sizes||[]).slice(0,8)){const chip=document.createElement('button');chip.type='button';chip.className='size-chip';chip.textContent=size;chip.setAttribute('aria-pressed',String(P.sameSize(size,choice.size)));chip.addEventListener('click',()=>{choice.size=size;$('finder-size').value=size;for(const c of chips.children)c.setAttribute('aria-pressed',String(c===chip));});chips.append(chip);}
    $('finder-size').value=choice.size||'';
    $('finder-size-note').hidden=!choice.sizeFromName;$('finder-size-note').textContent=choice.sizeFromName?'This size was read from the product name, not confirmed by the database. Check it against the pack.':'';
    $('finder-price').value=choice.price&&Number(choice.price)>0?choice.price:'';
    const hasPhoto=!!(choice.image&&choice.source)||!!choice.photo;$('finder-photo-line').hidden=!hasPhoto;$('finder-photo').checked=hasPhoto;
    $('finder-photo-note').textContent=choice.photo?'Uses the photo already saved with this product.':'The photo is downloaded once and kept with your saved products. Credits are stored in the file details, not on the flyer.';
    $('finder-remember').checked=choice.kind!=='saved';$('finder-case').value='';
    $('finder-add').textContent=state.replaceIndex>=0?'Use for this item':(state.context?.comboMode?'Add to '+state.context.comboName:'Add to flyer');
    $('finder-price').focus();
  }
  function back(){$('finder-detail').hidden=true;$('finder-results').hidden=false;state.selected=null;$('finder-query').focus();}
  async function add(){
    const choice=state.selected;if(!choice||state.busy)return;error('');
    const name=$('finder-name').value.trim().slice(0,50),size=$('finder-size').value.trim().slice(0,25),price=$('finder-price').value.trim(),caseQuantity=Number($('finder-case').value||0);
    if(!name){error('Give the product a name.');$('finder-name').focus();return;}
    if(price!==''&&!(Number(price)>0&&Number(price)<=1000000)){error('Enter a selling price above R0, or leave it blank to fill in later.');$('finder-price').focus();return;}
    if($('finder-case').value&&!(Number.isInteger(caseQuantity)&&caseQuantity>=2&&caseQuantity<=999)){error('Case quantity must be a whole number from 2 to 999.');$('finder-case').focus();return;}
    const product={name,size,price,section:choice.section||'',icon:choice.icon||'',photo:choice.photo||'',source:choice.photo?choice.source:null,caseQuantity:caseQuantity>=2?caseQuantity:0};
    const wantsPhoto=!$('finder-photo-line').hidden&&$('finder-photo').checked;
    setBusy(true);
    try{
      if(wantsPhoto&&!product.photo&&choice.source){
        status('Adding the product photo…');
        try{const result=await ShopDeskPromotion.providerPhoto(choice.source);product.photo=result.id;product.source=choice.source;}
        catch(e){setBusy(false);error((e.message||'The photo could not be added.')+' You can add the product without a photo, or try again.');$('finder-photo').checked=false;$('finder-photo-note').textContent='Photo not added. Untick to add the product without it, or tick and try again.';status('');return;}
      }
      if(!$('finder-dialog').open)return;// closed meanwhile; nothing was changed on the flyer
      const index=ShopDeskPromotion.addCatalogueProduct(product,{replaceIndex:state.replaceIndex,remember:$('finder-remember').checked,context:state.context?.context});
      $('finder-dialog').close();
      const message=(state.replaceIndex>=0?'Offer '+(index+1)+' updated.':name+(size?' · '+size:'')+' added'+(state.context?.comboMode?' to '+state.context.comboName:'')+'.')+(price?'':' Add your selling price.');
      window.dispatchEvent(new CustomEvent('shopdesk:toast',{detail:message}));
    }catch(e){error(e.message||'Could not add this product.');}
    finally{setBusy(false);}
  }
  function manual(){
    const query=$('finder-query').value.trim();
    try{
      if(state.replaceIndex>=0){$('finder-dialog').close();return;}
      const parsed=P.parseQuery(query);
      if(!query){$('finder-dialog').close();$('quick-add-input').focus();return;}
      ShopDeskPromotion.addCatalogueProduct(P.enrich({name:(parsed.name||query).slice(0,50),size:parsed.size,price:parsed.price,photo:''}),{remember:false,context:state.context?.context});
      $('finder-dialog').close();
    }catch(e){status(e.message,true);}
  }
  function stopCamera(){state.scanning=false;if(state.stream){for(const track of state.stream.getTracks())track.stop();state.stream=null;}$('finder-video').hidden=true;}
  const supportsCamera=()=>'BarcodeDetector' in window&&!!navigator.mediaDevices?.getUserMedia;
  async function startCamera(){
    if(!supportsCamera())return;
    try{
      state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});const video=$('finder-video');video.srcObject=state.stream;video.hidden=false;await video.play();
      const detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});state.scanning=true;status('Point the camera at the barcode.');
      const tick=async()=>{if(!state.scanning)return;try{const codes=await detector.detect(video);if(codes.length){stopCamera();$('finder-query').value=codes[0].rawValue;renderLocal();searchOnline();return;}}catch{}setTimeout(tick,300);};tick();
    }catch{status('The camera is not available here. Type the number under the barcode instead.',true);}
  }
  function open({query='',replaceIndex=-1}={}){
    if(!refreshContext()){window.dispatchEvent(new CustomEvent('shopdesk:toast',{detail:'Wait for your project to finish loading, then try again.'}));return;}
    state.replaceIndex=replaceIndex;state.online=null;state.onlineQuery='';state.selected=null;state.run++;error('');
    $('finder-title').textContent=replaceIndex>=0?'Find product & photo for offer '+(replaceIndex+1):'Find product & photo';
    $('finder-query').value=query;$('finder-detail').hidden=true;$('finder-results').hidden=false;$('finder-scan').hidden=!supportsCamera();
    $('finder-manual').textContent=replaceIndex>=0?'Keep what you typed':'Add it manually';
    setBusy(false);$('finder-dialog').showModal();renderLocal();$('finder-query').focus();if(query)$('finder-query').select();
  }
  $('quick-add-find').addEventListener('click',()=>open({query:$('quick-add-input').value.trim()}));
  window.addEventListener('shopdesk:find-product',event=>open({query:event.detail.query||'',replaceIndex:event.detail.index}));
  $('finder-query').addEventListener('input',()=>{state.online=null;renderLocal();});
  $('finder-query').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchOnline();}});
  $('finder-search-online').addEventListener('click',searchOnline);
  $('finder-scan').addEventListener('click',startCamera);
  $('finder-back').addEventListener('click',back);$('finder-add').addEventListener('click',add);$('finder-manual').addEventListener('click',manual);
  $('finder-price').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();add();}});
  $('finder-image').addEventListener('error',()=>{$('finder-image').src=illustration(state.selected?.icon);});
  $('close-finder').addEventListener('click',()=>{if(!state.busy)$('finder-dialog').close();});
  $('finder-dialog').addEventListener('cancel',event=>{if(state.busy)event.preventDefault();});
  $('finder-dialog').addEventListener('close',()=>{stopCamera();state.run++;});
  window.addEventListener('shopdesk:toast',event=>{const toast=$('toast');toast.textContent=event.detail;toast.hidden=false;clearTimeout(window.__handbillToast);window.__handbillToast=setTimeout(()=>toast.hidden=true,4500);});
  // Voice: say "maize meal 12.5 kg 119.99" and the parser fills the fields.
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(Recognition){
    $('quick-add-voice').hidden=false;let recogniser=null;
    $('quick-add-voice').addEventListener('click',()=>{
      if(recogniser){recogniser.stop();return;}
      try{
        recogniser=new Recognition();recogniser.lang='en-ZA';recogniser.interimResults=false;recogniser.maxAlternatives=1;
        $('quick-add-voice').setAttribute('aria-pressed','true');$('quick-add-help').textContent='Listening… say the product, size and price.';
        recogniser.onresult=event=>{const text=event.results[0][0].transcript;$('quick-add-input').value=text;$('quick-add-input').dispatchEvent(new Event('input',{bubbles:true}));$('quick-add-input').focus();};
        recogniser.onerror=()=>{$('quick-add-help').textContent='Voice entry did not work this time. Type the product instead.';};
        recogniser.onend=()=>{recogniser=null;$('quick-add-voice').setAttribute('aria-pressed','false');if($('quick-add-help').textContent.startsWith('Listening'))$('quick-add-help').textContent='Type a product, pick its size, then add your price.';};
        recogniser.start();
      }catch{recogniser=null;$('quick-add-help').textContent='Voice entry is not available here.';}
    });
  }
})();
