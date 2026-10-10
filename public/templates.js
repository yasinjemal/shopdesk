(function(root){
  'use strict';
  const choices={
    template:['simple','retail','bold','market','boutique','menu','studio','super','ribbon','signature','pop','editorial','noir','warehouse','atelier','street','sunburst','botanical','blueprint','scrapbook','candy','mono','wholesale','mosaic','fresh','parade','shelf','paper','arc','ticket','terrace','combo-board','combo-ticket','combo-fresh','gazette','harvest','ledger','midnight','diagonal','circular','frontpage','aisle','price-blocks','fresh-cut','split-banner','combo-circular','combo-receipt','weekend','butcher','bakery','household','bigprice','cashcarry','crate','tagsale'],
    theme:['green','blue','orange','red','plum','charcoal','teal','gold','berry','violet','cobalt','coral','coffee','sage','terracotta','lavender','peach','lemon','aqua','burgundy','slate','tangerine','petrol','raspberry','olive','indigo','cocoa','tomato','kraft','mint'],
    format:['poster','status','square','landscape','a4','a5'],business:['grocery','fashion','food','beauty','services','general'],
    purpose:['offers','combos','spotlight','event','opening'],logoSize:['compact','prominent'],typeface:['design','modern','elegant','geometric'],priceStyle:['design','solid','outline','pill']
  };
  const defaults={template:'bold',theme:'green',format:'poster',business:'general',purpose:'offers',logoSize:'prominent',typeface:'design',priceStyle:'design'};
  // Promotion types describe what a flyer is for. They guide wording and the
  // gallery filters without changing how a design renders.
  const promotions={weekly:'Weekly specials',weekend:'Weekend promotion',monthend:'Month-end specials',seasonal:'Seasonal savings',wholesale:'Wholesale catalogue',produce:'Fresh produce',butchery:'Butchery',bakery:'Bakery offers',household:'Household essentials',hardware:'Hardware & building',single:'Single product promotion',combos:'Grocery combos',sale:'Sale / price drop',menu:'Menu & price list',collection:'New collection',services:'Service price list',event:'Event',opening:'Grand opening'};
  const styles={bold:'Bold & bright',classic:'Classic supermarket',fresh:'Fresh & natural',clean:'Clean & minimal',premium:'Premium & dark',playful:'Playful & warm'};
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
    if(source.promotion!==undefined&&source.promotion!==''){if(!Object.hasOwn(promotions,source.promotion))throw new Error('Choose a valid promotion type.');result.promotion=source.promotion;}
    const count=source.itemCount??source.items?.length??1,limit=result.purpose==='combos'?20:result.purpose==='spotlight'?1:result.template==='simple'?3:25;
    if(!Number.isInteger(count)||count<1||count>25)throw new Error('Choose between 1 and 25 items.');
    result.itemCount=['event','opening'].includes(result.purpose)?1:Math.min(count,limit);
    if(result.purpose==='combos'){
      const combos=source.combos??Array.from({length:4},(_,i)=>({name:'Combo '+(i+1),price:''}));
      if(!Array.isArray(combos)||!combos.length||combos.length>6)throw new Error('Choose 1 to 6 combos.');
      result.combos=combos.map((c,i)=>{const price=string(c.price??'',20,'the bundle price');if(price!==''&&(!Number.isFinite(Number(price))||Number(price)<0||Number(price)>1000000))throw new Error('Check the bundle price.');return {name:includeContent?string(c.name??'',40,'the combo name'):'Combo '+(i+1),price:includeContent?price:''};});
    }
    if(includeContent){
      result.headline=string(source.headline??'',45,'the headline');result.eyebrow=string(source.eyebrow??'',28,'the small heading');
      if(!Array.isArray(source.items)||source.items.length<result.itemCount||source.items.length>25)throw new Error('Check the template items.');
      result.items=['event','opening'].includes(result.purpose)?[blank()]:source.items.slice(0,result.itemCount).map(item=>{
        const price=string(item.price??'',20,'the price');
        if(price!==''&&(!Number.isFinite(Number(price))||Number(price)<0||Number(price)>1000000))throw new Error('Check the template prices.');
        const deal={};if(item.dealQuantity!==undefined){if(!Number.isInteger(item.dealQuantity)||item.dealQuantity<2||item.dealQuantity>99)throw new Error('Check the multi-buy quantity.');deal.dealQuantity=item.dealQuantity;}
        if(item.wasPrice!==undefined&&item.wasPrice!==''){const was=string(item.wasPrice,20,'the previous price');if(!Number.isFinite(Number(was))||Number(was)<0||Number(was)>1000000)throw new Error('Check the previous prices.');deal.wasPrice=was;}
        if(item.section!==undefined&&item.section!==''){deal.section=string(item.section,24,'the section label');}
        if(item.icon!==undefined&&item.icon!==''){const icon=string(item.icon,32,'the illustration');if(!/^[a-z][a-z0-9-]{0,31}$/.test(icon))throw new Error('Check the illustration.');deal.icon=icon;}
        if(item.caseQuantity!==undefined){if(!Number.isInteger(item.caseQuantity)||item.caseQuantity<2||item.caseQuantity>999)throw new Error('Check the case quantity.');deal.caseQuantity=item.caseQuantity;}
        if(result.purpose==='combos')for(const [key,min,max] of [['combo',0,result.combos.length-1],['quantity',1,99]])if(item[key]!==undefined){if(!Number.isInteger(item[key])||item[key]<min||item[key]>max)throw new Error('Check the combo products.');deal[key]=item[key];}
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
    // A promotion type seeds crafted wording for a brand-new project only; it
    // never rewrites text in an existing flyer.
    const crafted=!value.includeContent&&d.promotion&&root.ShopDeskWords?.promotions?.[d.promotion]?.[0];
    if(crafted&&!['combos','event','opening'].includes(d.purpose)){next.headline=crafted[0];next.eyebrow=crafted[1];}
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
    ['Fresh counter favourites','Rich dark panels and generous photos for fresh food.','food','fresh','charcoal','offers',4],
    ['The price parade','Bright tickets and a bold sale banner for your best offers.','grocery','parade','red','offers',6],
    ['On the spotlight shelf','A generous lead offer beside the rest of your collection.','general','shelf','blue','offers',6],
    ['The paper catalogue','A calm catalogue for beautiful products and thoughtful services.','general','paper','coffee','offers',6],
    ['The arc collection','Sweeping curves and framed panels for a considered collection.','fashion','arc','raspberry','offers',4],
    ['The neighbourhood ticket wall','Punchy tickets and perforated edges for everyday shop offers.','grocery','ticket','tangerine','offers',9],
    ['At the café terrace','Awning stripes and soft price labels for your menu.','food','terrace','olive','offers',4],
    ['Grocery combo market','Four numbered bundle frames for family essentials.','grocery','combo-board','red','combos',12],
    ['The bundle ticket board','Bold bundle tickets with editable names and contents.','grocery','combo-ticket','blue','combos',8],
    ['Fresh basket combos','Fresh produce bundles in clean green frames.','grocery','combo-fresh','green','combos',8],
    ['The grocer gazette','An editorial circular with numbered offers and fine price rules.','grocery','gazette','petrol','offers',6],
    ['Harvest market picks','Curved produce panels and soft, fresh-market colours.','grocery','harvest','olive','offers',6],
    ['The value ledger','A compact grocery list with clear product and price columns.','grocery','ledger','cobalt','offers',8],
    ['The midnight pantry','A premium dark catalogue for a considered grocery selection.','grocery','midnight','gold','offers',6],
    ['Diagonal grocery deals','An angled masthead and bold two-tone prices for shop promotions.','grocery','diagonal','red','offers',9],
    ['The weekly supermarket circular','A familiar campaign band and ruled grocery grid.','grocery','circular','red','offers',12],
    ['The catalogue front page','One lead offer with supporting grocery deals.','grocery','frontpage','blue','offers',9],
    ['Along the grocery aisles','Horizontal product strips with dedicated price columns.','grocery','aisle','petrol','offers',6],
    ['Everyday price blocks','Large price plates for a practical grocery promotion.','grocery','price-blocks','tangerine','offers',9],
    ['The fresh food circular','Curved photo panels for fresh counter and market finds.','grocery','fresh-cut','green','offers',6],
    ['The split banner catalogue','A modern two-part masthead and quietly framed offers.','grocery','split-banner','indigo','offers',6],
    ['The supermarket combo circular','Outlined bundle frames with a complete price for each basket.','grocery','combo-circular','red','combos',12],
    ['The basket receipt','Itemised bundles with receipt rules and perforated edges.','grocery','combo-receipt','charcoal','combos',8],
    // Grocery-first additions (starter-43 onwards). Earlier identifiers never change.
    ['Weekend burst specials','A starburst weekend heading, generous photos and round price badges.','grocery','weekend','tomato','offers',6,{promotion:'weekend'}],
    ['The butcher’s block','Striped awning, kraft panels and white price tags for cuts sold per kg.','grocery','butcher','kraft','offers',6,{promotion:'butchery'}],
    ['Bakery board','A chalkboard bakery menu with oval photos and soft price pills.','grocery','bakery','cocoa','offers',6,{promotion:'bakery'}],
    ['Household essentials list','Ticked rows, pack-size pills and clear prices for a long list of essentials.','grocery','household','cobalt','offers',10,{promotion:'household'}],
    ['One big price','A single product with its photo and one oversized price.','grocery','bigprice','tomato','spotlight',1,{promotion:'single'}],
    ['Cash & carry catalogue','A wholesale table with product, pack and price columns for up to 25 lines.','grocery','cashcarry','petrol','offers',16,{promotion:'wholesale'}],
    ['Produce crate','Fresh produce in slatted crate frames with hanging chalk price tags.','grocery','crate','mint','offers',6,{promotion:'produce'}],
    ['Tag sale','Every offer on its own swing tag with a big ticket price.','grocery','tagsale','lemon','offers',9,{promotion:'sale'}],
    ['Hero deals of the week','A few headline offers, each with an oversized price and photo.','grocery','bigprice','tomato','offers',5,{promotion:'weekly'}],
    ['Month-end stock-up','A fresh green essentials list for the month-end shop, sized for A4 printing.','grocery','household','mint','offers',12,{promotion:'household',format:'a4'}],
    ['Weekend braai pack','A butchery Status page for the weekend’s cuts and packs.','grocery','butcher','tomato','offers',4,{promotion:'weekend',format:'status'}],
    ['Wholesale price list','A calm A4 cash-and-carry list with 20 lines and clear pack columns.','grocery','cashcarry','slate','offers',20,{promotion:'wholesale',format:'a4',priceStyle:'outline'}],
    ['Fresh produce Status','Four crate frames for today’s fresh picks, sized for WhatsApp Status.','grocery','crate','mint','offers',4,{promotion:'produce',format:'status'}],
    ['Square single-product promo','One product, one big price, ready for a square social post.','grocery','bigprice','cobalt','spotlight',1,{promotion:'single',format:'square'}],
    ['Restaurant specials board','A chalkboard specials board for today’s dishes.','food','bakery','charcoal','offers',6,{promotion:'menu',typeface:'elegant'}],
    ['Weekend bakes','Warm chalkboard tiles for weekend bakes and treats.','food','bakery','peach','offers',4,{promotion:'bakery'}],
    ['Salon price tags','Swing tags for treatments and services with clear prices.','beauty','tagsale','lavender','offers',6,{promotion:'services'}],
    ['Boutique tag sale','Fashion offers on swing tags with a soft raspberry palette.','fashion','tagsale','raspberry','offers',6,{promotion:'sale'}],
    ['Service essentials list','A ticked list of services with clear prices and inclusions.','services','household','slate','offers',8,{promotion:'services'}],
    ['Weekend combo market','Four numbered grocery baskets with one price per complete combo.','grocery','combo-board','tomato','combos',12,{promotion:'combos'}],
    // Catalogue-style starters modelled on how South African retail leaflets are organised.
    ['Month-end specials catalogue','A multi-page A4 leaflet with ruled cells, department tags and page numbers.','grocery','circular','red','offers',16,{promotion:'monthend',format:'a4'}],
    ['Mid-month price blocks','Large price plates for a mid-month promotion with previous prices shown.','grocery','price-blocks','tangerine','offers',12,{promotion:'monthend'}],
    ['Seasonal savings crate','Fresh seasonal picks in crate frames with hanging tags.','grocery','crate','olive','offers',9,{promotion:'seasonal'}],
    ['Cash & carry month-end list','A 25-line wholesale list that prints as a numbered A4 catalogue.','grocery','cashcarry','petrol','offers',25,{promotion:'wholesale',format:'a4'}],
    ['Pantry staples on Status','Eight ticked essentials for a WhatsApp Status post.','grocery','household','tomato','offers',8,{promotion:'weekly',format:'status'}],
    ['Personal care & baby essentials','A calm essentials list for toiletries and baby products.','grocery','household','lavender','offers',10,{promotion:'household'}],
    ['Build & hardware price list','Tools and materials in a cash-and-carry table with pack columns.','general','cashcarry','slate','offers',16,{promotion:'hardware'}],
    ['Front-page lead offer','One hero deal with supporting specials, like a leaflet cover.','grocery','frontpage','red','offers',9,{promotion:'weekly'}],
    ['Butchery per-kg board','Square A5 butchery board priced per kilogram.','grocery','butcher','kraft','offers',6,{promotion:'butchery',format:'a5'}],
    ['Landscape weekend deals','A wide weekend layout for screens and social banners.','grocery','weekend','tomato','offers',8,{promotion:'weekend',format:'landscape'}]
  ].map(([title,description,business,template,theme,purpose,itemCount,finishes={}],i)=>{
    const {promotion,...design}=finishes;
    return {id:'starter-'+i,starter:true,...create({business,template,theme,purpose,itemCount,...design,...(promotion?{promotion}:{})},title,description)};
  });
  // Gallery tags for the original starters: promotion type and visual style.
  const tags=['weekly/bold','menu/playful','collection/clean','services/clean','single/bold','opening/bold','weekend/bold','produce/fresh','services/clean','collection/playful','bakery/playful','sale/bold','menu/playful','services/clean','services/clean','collection/clean','bakery/playful','household/bold','wholesale/classic','weekly/bold','produce/premium','sale/bold','weekly/clean','collection/clean','collection/clean','weekly/bold','menu/fresh','combos/bold','combos/bold','combos/fresh','weekly/clean','produce/fresh','household/clean','weekly/premium','weekly/bold','weekly/classic','weekly/classic','household/classic','household/bold','produce/fresh','weekly/clean','combos/classic','combos/clean',
    'weekend/bold','butchery/premium','bakery/playful','household/clean','single/bold','wholesale/classic','produce/fresh','sale/playful','weekly/bold','household/fresh','weekend/bold','wholesale/clean','produce/fresh','single/bold','menu/premium','bakery/playful','services/playful','sale/playful','services/clean','combos/bold',
    'monthend/classic','monthend/bold','seasonal/fresh','wholesale/classic','weekly/bold','household/clean','hardware/clean','weekly/classic','butchery/premium','weekend/bold'];
  starters.forEach((starter,i)=>{const [promotion,style]=(tags[i]||'weekly/bold').split('/');starter.design.promotion=starter.design.promotion||promotion;starter.promotion=starter.design.promotion;starter.style=style;});
  root.ShopDeskTemplates={design,validate,create,draft,starters,promotions,styles};
})(typeof window!=='undefined'?window:globalThis);
