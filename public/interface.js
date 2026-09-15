(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const tabs=[...document.querySelectorAll('[data-editor-tab]')];
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let currentTab='style';
  function showTab(name,focus=false){
    if(!tabs.some(t=>t.dataset.editorTab===name))return;
    currentTab=name;
    for(const tab of tabs){
      const active=tab.dataset.editorTab===name;
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      $(tab.getAttribute('aria-controls')).hidden=!active;
      if(active&&focus)tab.focus();
    }
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>showTab(tab.dataset.editorTab));
    tab.addEventListener('keydown',event=>{
      const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;
      if(next<0)return;event.preventDefault();showTab(tabs[next].dataset.editorTab,true);
    });
  });
  const templateNames={bold:'Bold Specials',super:'Super Saver',ribbon:'Corner Ribbon',signature:'Signature',market:'Fresh Market',boutique:'Boutique',menu:'Kitchen Menu',studio:'Service Studio',retail:'Classic Retail',simple:'Simple Poster'};
  const seeds={bold:'red',super:'red',ribbon:'blue',signature:'gold',market:'green',boutique:'charcoal',menu:'orange',studio:'plum',retail:'red',simple:'green'};
  const templateButtons=new Map(),colourButtons=new Map();
  for(const option of $('poster-template').options){
    const button=document.createElement('button');button.type='button';button.className='template-card';button.dataset.template=option.value;button.setAttribute('aria-label',option.textContent.replace(' · new',''));button.setAttribute('aria-pressed','false');
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=200;canvas.setAttribute('aria-hidden','true');
    const name=document.createElement('span');name.textContent=templateNames[option.value];button.append(canvas,name);
    button.addEventListener('click',()=>{if(option.disabled)return;$('poster-template').value=option.value;$('poster-template').dispatchEvent(new Event('change',{bubbles:true}));});
    $('template-gallery').append(button);templateButtons.set(option.value,button);
  }
  const colours={red:'#c91424',green:'#10563e',blue:'#163b70',orange:'#a83c12',plum:'#613b59',charcoal:'#292822',teal:'#075e64',gold:'#20232c',berry:'#941c50'};
  for(const option of $('promo-theme').options){
    const button=document.createElement('button');button.type='button';button.className='colour-swatch';button.dataset.colour=option.value;button.style.setProperty('--swatch',colours[option.value]);button.setAttribute('aria-label',option.textContent.replace(' · new',''));button.title=option.textContent.replace(' · new','');button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>{$('promo-theme').value=option.value;$('promo-theme').dispatchEvent(new Event('change',{bubbles:true}));});
    $('colour-swatches').append(button);colourButtons.set(option.value,button);
  }
  function sync(){
    for(const option of $('poster-template').options){const button=templateButtons.get(option.value);button.disabled=option.disabled;button.setAttribute('aria-pressed',String(option.value===$('poster-template').value));}
    for(const [key,button] of colourButtons)button.setAttribute('aria-pressed',String(key===$('promo-theme').value));
    $('chosen-colour').textContent=$('promo-theme').selectedOptions[0]?.textContent.replace(' · new','')||'';
    $('template-gallery').hidden=$('template-field').hidden;
    const client=$('client-picker').selectedOptions[0]?.textContent,project=$('project-picker').selectedOptions[0]?.textContent;
    $('workspace-summary').textContent=[client,project].filter(Boolean).join(' / ')||'Your saved workspace';
    $('review-details').hidden=$('promo-error').hidden||$('promo-fields').disabled;
    if($('preview-dialog').open)copyPreview();
  }
  function copyPreview(){
    const source=$('promo-canvas'),canvas=$('expanded-canvas');canvas.width=source.width;canvas.height=source.height;canvas.getContext('2d').drawImage(source,0,0);
  }
  $('expand-preview').addEventListener('click',()=>{copyPreview();$('preview-dialog').showModal();});
  $('close-preview').addEventListener('click',()=>$('preview-dialog').close());
  $('jump-preview').addEventListener('click',()=>{$('editor-preview').scrollIntoView({behavior:reduced()?'instant':'smooth',block:'start'});$('editor-preview').focus({preventScroll:true});});
  $('review-details').addEventListener('click',()=>{
    const message=$('promo-error').textContent;
    if(/business name/i.test(message)){showTab('business');$('shop-name').focus();return;}
    showTab('content');
    let target=/headline/i.test(message)?$('promo-headline'):/event|opening date/i.test(message)?$('event-date'):/end date|expired/i.test(message)?$('promo-date'):null;
    const item=message.match(/item (\d+)/i);
    if(item){const card=$('promo-items').children[Number(item[1])-1];if(card){card.open=true;target=card.querySelector(/price/i.test(message)?'input[type="number"]':'input[type="text"]');}}
    (target||$('flyer-purpose')).focus();
  });
  $('client-drawer').open=!window.matchMedia('(max-width: 900px)').matches;
  window.addEventListener('shopdesk:preview',sync);
  window.ShopDeskInterface={showTab};
  document.body.classList.add('ui-enhanced');sync();
  // Render small, faithful design thumbnails in separate frames so the editor stays responsive.
  async function thumbnails(){
    await document.fonts?.ready;
    const source=document.createElement('canvas');
    for(const [template,button] of templateButtons){
      await new Promise(requestAnimationFrame);
      try{
        const data={template,theme:seeds[template],format:'poster',shop:'Your business',headline:'Your next great offer.',eyebrow:'SPECIAL OFFERS',showDate:false,phone:'',location:'Visit us today',terms:'',items:Array.from({length:template==='simple'?3:6},(_,i)=>({name:'Product '+(i+1),size:'Each',price:String(49+i*10),photo:''}))};
        ShopDeskPoster.draw(source,data);
        const thumb=button.querySelector('canvas');thumb.getContext('2d').drawImage(source,0,0,thumb.width,thumb.height);
      }catch{button.querySelector('canvas').hidden=true;}
    }
    source.width=1;source.height=1;
  }
  thumbnails();
})();
