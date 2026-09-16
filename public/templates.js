(function(root){
  'use strict';
  const choices={
    template:['simple','retail','bold','market','boutique','menu','studio','super','ribbon','signature','pop','editorial','noir','warehouse','atelier','street','sunburst','botanical','blueprint','scrapbook','candy','mono','wholesale','mosaic','fresh'],
    theme:['green','blue','orange','red','plum','charcoal','teal','gold','berry','violet','cobalt','coral','coffee','sage','terracotta','lavender','peach','lemon','aqua','burgundy','slate'],
    format:['poster','status'],business:['grocery','fashion','food','beauty','services','general'],
    purpose:['offers','spotlight','event','opening'],typeface:['design','modern','elegant','geometric'],priceStyle:['design','solid','outline','pill']
  };
  const defaults={template:'bold',theme:'green',format:'poster',business:'general',purpose:'offers',typeface:'design',priceStyle:'design'};
  const blank=()=>({name:'',size:'',price:'',photo:''});
  function string(value,max,label){if(typeof value!=='string'||value.length>max)throw new Error('Check '+label+'.');return value.trim();}
  // Explicit allowlist: never copy account IDs, photos, contact details, dates,
  // hidden offers, or arbitrary properties into the shared library.
  function design(source,includeContent=false){
    if(!source||typeof source!=='object')throw new Error('Choose a valid flyer design.');
    const result={};
    for(const [key,values] of Object.entries(choices)){
      const value=source[key]??defaults[key];if(!values.includes(value))throw new Error('Choose a valid '+key+'.');result[key]=value;
    }
    for(const key of ['trimPhotos','cleanNames']){if(source[key]!==undefined&&typeof source[key]!=='boolean')throw new Error('Check the photo settings.');result[key]=source[key]??false;}
    const count=source.itemCount??source.items?.length??1,limit=result.purpose==='spotlight'?1:result.template==='simple'?3:25;
    if(!Number.isInteger(count)||count<1||count>25)throw new Error('Choose between 1 and 25 items.');
    result.itemCount=['event','opening'].includes(result.purpose)?1:Math.min(count,limit);
    if(includeContent){
      result.headline=string(source.headline??'',45,'the headline');result.eyebrow=string(source.eyebrow??'',28,'the small heading');
      if(!Array.isArray(source.items)||source.items.length<result.itemCount||source.items.length>25)throw new Error('Check the template items.');
      result.items=['event','opening'].includes(result.purpose)?[blank()]:source.items.slice(0,result.itemCount).map(item=>{
        const price=string(item.price??'',20,'the price');
        if(price!==''&&(!Number.isFinite(Number(price))||Number(price)<0||Number(price)>1000000))throw new Error('Check the template prices.');
        const deal={};if(item.dealQuantity!==undefined){if(!Number.isInteger(item.dealQuantity)||item.dealQuantity<2||item.dealQuantity>99)throw new Error('Check the multi-buy quantity.');deal.dealQuantity=item.dealQuantity;}
        return {name:string(item.name??'',50,'the item name'),size:string(item.size??'',25,'the item details'),price,photo:'',...deal};
      });
    }
    return result;
  }
  function validate(value){
    if(!value||value.formatVersion!==1||typeof value.includeContent!=='boolean')throw new Error('This template format is not supported.');
    const title=string(value.title,60,'the template name');if(!title)throw new Error('Name your template.');
    return {formatVersion:1,title,description:string(value.description??'',160,'the description'),includeContent:value.includeContent,design:design(value.design,value.includeContent)};
  }
  function create(source,title,description,includeContent=false){return validate({formatVersion:1,title,description,includeContent,design:source});}
  function draft(template){
    const value=validate(template),d=value.design;
    const expiry=new Date();expiry.setDate(expiry.getDate()+7);
    const next=root.ShopDeskStudio.suggest({...d});
    Object.assign(next,d,{date:[expiry.getFullYear(),String(expiry.getMonth()+1).padStart(2,'0'),String(expiry.getDate()).padStart(2,'0')].join('-'),eventDate:'',eventTime:'',venue:'',details:'',heroPhoto:'',items:d.items?structuredClone(d.items):Array.from({length:d.itemCount},blank)});
    return next;
  }
  const starters=[
    ['Weekly shop specials','A clear grid for your weekly offers.','grocery','warehouse','red','offers',6],
    ['The everyday menu','An easy-to-read menu for food made with care.','food','street','orange','offers',4],
    ['The new collection','Give clothes and accessories room to shine.','fashion','editorial','coffee','offers',4],
    ['Services worth booking','A calm price list for beauty and wellbeing.','beauty','atelier','plum','offers',3],
    ['One offer, all the attention','Make a single product or service the star.','general','pop','cobalt','spotlight',1],
    ['Opening day','Invite your neighbourhood to something new.','general','ribbon','teal','opening',1],
    ['Weekend price drop','Retro sun rays and ticket prices for a lively sale.','grocery','sunburst','terracotta','offers',6],
    ['Fresh from the garden','A leafy, relaxed home for produce and fresh finds.','grocery','botanical','sage','offers',6],
    ['The repair workshop','Numbered panels and a precise grid for reliable services.','services','blueprint','slate','offers',4],
    ['Handmade with love','Layered paper notes for crafts and small collections.','general','scrapbook','lavender','offers',4],
    ['The sweet counter','Scalloped edges and rounded prices for tempting treats.','food','candy','peach','offers',6],
    ['The statement sale','Oversized type and confident price blocks for bold offers.','fashion','mono','burgundy','offers',4],
    ['Golden hour specials','A bright retro ticket board for a busy takeaway.','food','sunburst','lemon','offers',4,{typeface:'geometric',priceStyle:'pill'}],
    ['The calm collection','Soft tones and delicate rules for beauty treatments.','beauty','botanical','lavender','offers',3,{priceStyle:'outline'}],
    ['Clean and ready','Crisp aqua service panels for cleaning and home care.','services','blueprint','aqua','offers',6,{priceStyle:'outline'}],
    ['The style journal','Paper textures and quiet prices for curated outfits.','fashion','scrapbook','terracotta','offers',3,{typeface:'elegant'}],
    ['Freshly baked','A warm, playful selection of bakes and daily favourites.','food','candy','lemon','offers',4,{typeface:'elegant'}],
    ['Everyday essentials','Strong type and clear prices for the practical things.','grocery','mono','slate','offers',9,{typeface:'geometric',priceStyle:'outline'}],
    ['The weekly wholesale board','A compact product grid with clear pack sizes and price tickets.','grocery','wholesale','red','offers',12],
    ['The market front page','A large lead offer surrounded by a varied selection of deals.','grocery','mosaic','teal','offers',9],
    ['Fresh counter favourites','Rich dark panels and generous photos for fresh food.','food','fresh','charcoal','offers',4]
  ].map(([title,description,business,template,theme,purpose,itemCount,finishes={}],i)=>({id:'starter-'+i,starter:true,...create({business,template,theme,purpose,itemCount,...finishes},title,description)}));
  root.ShopDeskTemplates={design,validate,create,draft,starters};
})(typeof window!=='undefined'?window:globalThis);
