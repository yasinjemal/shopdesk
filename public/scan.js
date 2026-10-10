(() => {
  'use strict';
  // Barcode lookup and voice entry: two more ways to get a product onto the
  // flyer without typing. Both are optional and fall back to typing.
  const $=id=>document.getElementById(id);
  let stream=null,scanning=false,found=null,busy=false;
  const supportsCamera=()=>'BarcodeDetector' in window&&!!navigator.mediaDevices?.getUserMedia;
  function status(text,error=false){$('scan-status').textContent=text;$('scan-status').classList.toggle('validation',error);}
  function stopCamera(){scanning=false;if(stream){for(const track of stream.getTracks())track.stop();stream=null;}$('scan-video').hidden=true;}
  async function startCamera(){
    if(!supportsCamera())return;
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});const video=$('scan-video');video.srcObject=stream;video.hidden=false;await video.play();
      const detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});scanning=true;status('Point the camera at the barcode.');
      const tick=async()=>{if(!scanning)return;try{const codes=await detector.detect(video);if(codes.length){stopCamera();$('scan-code').value=codes[0].rawValue;lookup(codes[0].rawValue);return;}}catch{}setTimeout(tick,300);};tick();
    }catch{status('The camera is not available here. Type the number under the barcode instead.');}
  }
  function clean(text,max){return String(text||'').replace(/\s+/g,' ').trim().slice(0,max);}
  async function lookup(code){
    const digits=String(code||'').replace(/\D/g,'');
    if(digits.length<8||digits.length>14){status('Enter the 8 to 13 digits printed under the barcode.',true);return;}
    if(busy)return;busy=true;found=null;$('scan-result').hidden=true;status('Looking up '+digits+'…');
    try{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      const response=await fetch('https://world.openfoodfacts.org/api/v2/product/'+digits+'.json?fields=product_name,product_name_en,quantity,brands',{signal:controller.signal,headers:{Accept:'application/json'}}).finally(()=>clearTimeout(timer));
      const data=response.ok?await response.json():null;
      if(!data||data.status!==1||!data.product){status('This barcode is not in the open database yet. Type the product name instead; it takes a few seconds.',true);return;}
      const product=data.product,brand=clean((product.brands||'').split(',')[0],20),title=clean(product.product_name_en||product.product_name,50);
      if(!title){status('The database has this barcode but no name. Type the product name instead.',true);return;}
      const name=clean(brand&&!title.toLowerCase().includes(brand.toLowerCase())?brand+' '+title:title,50),size=clean(product.quantity,25);
      found=ShopDeskProducts.enrich({name,size,price:'',photo:''});
      $('scan-name').textContent=name;$('scan-size').textContent=size||'Add the pack size yourself';
      $('scan-illustration').src=ShopDeskIllustrations.dataURL(found.icon||'generic',96);
      $('scan-result').hidden=false;status('Found it. Check the name and size, then add it to your flyer.');$('scan-use').focus();
    }catch(e){status(e.name==='AbortError'?'The lookup took too long. Check your connection or type the name instead.':'Could not reach the product database. Type the product name instead.',true);}
    finally{busy=false;}
  }
  $('quick-add-scan').addEventListener('click',()=>{
    $('scan-code').value='';$('scan-result').hidden=true;found=null;status(supportsCamera()?'Starting the camera…':'Type the number printed under the barcode.');
    $('scan-camera-note').hidden=supportsCamera();$('scan-dialog').showModal();startCamera();if(!supportsCamera())$('scan-code').focus();
  });
  $('scan-form').addEventListener('submit',event=>{event.preventDefault();lookup($('scan-code').value);});
  $('scan-use').addEventListener('click',()=>{if(!found)return;if(ShopDeskPromotion.quickAdd({...found,section:found.section||''}))$('scan-dialog').close();});
  $('close-scan').addEventListener('click',()=>$('scan-dialog').close());
  $('scan-dialog').addEventListener('close',stopCamera);
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
