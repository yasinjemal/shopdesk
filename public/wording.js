(() => {
  'use strict';
  const $=id=>document.getElementById(id),model=ShopDeskWords;
  let context=null,choices=[],undo=null;
  const labels={offers:'Offers, menu or price list',combos:'Grocery combo flyer',spotlight:'Single-offer spotlight',event:'Event invitation',opening:'Grand opening'};
  function notice(text,error=false){$('wording-message').textContent=text;$('wording-message').classList.toggle('validation',error);}
  function apply(values){
    try{const before=ShopDeskPromotion.applyWording(values,context.context);undo={before,after:values};$('undo-wording').disabled=false;notice('Wording applied. You can keep choosing or return to your flyer.');render();}
    catch(e){notice(e.message,true);}
  }
  function render(){
    const choice=choices.find(c=>c.id===$('wording-tone').value)||choices[0];
    $('wording-options').replaceChildren();
    for(const [key,field] of Object.entries(model.fields)){
      const card=document.createElement('article');card.className='wording-card';
      const label=document.createElement('h3');label.textContent=field.label;
      const phrase=document.createElement('p');phrase.textContent=choice.values[key];
      const button=document.createElement('button');button.type='button';button.className='button secondary';button.textContent=key==='cta'?'Use contact message':'Use '+field.label.toLowerCase();button.addEventListener('click',()=>apply({[key]:choice.values[key]}));
      card.append(label,phrase,button);$('wording-options').append(card);
    }
  }
  function open(){
    try{
      context=ShopDeskPromotion.wordingContext();choices=model.sets(context);undo=null;$('undo-wording').disabled=true;notice('');
      $('wording-context').textContent=ShopDeskBusiness.get(context.business).label+' · '+labels[context.purpose||'offers'];
      $('wording-tone').value=ShopDeskPoster.collection[context.template]?.category==='elegant'?'refined':'friendly';render();
      $('wording-dialog').showModal();$('wording-title').focus();
    }catch(e){$('editor-action-error').textContent=e.message;$('editor-action-error').hidden=false;}
  }
  for(const id of ['open-wording','open-footer-wording'])$(id).addEventListener('click',open);
  $('close-wording').addEventListener('click',()=>$('wording-dialog').close());
  $('wording-tone').addEventListener('change',render);
  $('apply-wording-set').addEventListener('click',()=>apply(choices.find(c=>c.id===$('wording-tone').value).values));
  $('undo-wording').addEventListener('click',()=>{
    if(!undo)return;try{
      const current=ShopDeskPromotion.wordingContext();
      if(current.context!==context.context||Object.entries(undo.after).some(([key,value])=>current.values[key]!==value))throw new Error('Your wording has changed. Return to the editor to review it.');
      ShopDeskPromotion.applyWording(undo.before,context.context);undo=null;$('undo-wording').disabled=true;notice('Your previous wording is restored.');
    }catch(e){notice(e.message,true);}
  });
})();
