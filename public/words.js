(function(root){
  'use strict';
  const tones={friendly:'Friendly',bold:'Bold & direct',refined:'Calm & refined'};
  const fields={headline:{label:'Headline',max:45},eyebrow:{label:'Small heading',max:28},cta:{label:'Order or booking message',max:40},terms:{label:'Footer note',max:80}};
  // Curated copy, not generated claims: never invent discounts, delivery,
  // guarantees, opening hours, stock levels or service qualifications.
  const bank={
    grocery:[['Good things for your everyday.','YOUR LOCAL SHOP','Ask us about your favourites','Ask in store about product availability.'],['Fill your basket. Find your favourites.','SHOP THE SELECTION','Contact us to order','Check pack sizes and prices before ordering.'],['Everyday essentials, thoughtfully chosen.','THE EVERYDAY COLLECTION','Enquire about our selection','Product availability may vary. Please enquire.']],
    fashion:[['Find something that feels like you.','YOUR NEXT FAVOURITE','Ask about sizes and colours','Please confirm size and colour when ordering.'],['Make room for a new look.','STYLE STARTS HERE','Message us to order','Ask about available sizes before ordering.'],['A collection to make your own.','CONSIDERED STYLE','Enquire about the collection','Please enquire about sizes and availability.']],
    food:[['What are you craving today?','FROM OUR KITCHEN','Contact us to order','Ask us about ingredients and allergens.'],['Your next meal starts here.','PICK YOUR FAVOURITE','Call to place your order','Please confirm your order and collection time.'],['Something to savour.','AT THE TABLE','Enquire about the menu','Please tell us about any dietary requirements.']],
    beauty:[['Make a little time for yourself.','A MOMENT FOR YOU','Ask about appointments','Please confirm your appointment before visiting.'],['Your next look starts here.','BOOK YOUR NEXT VISIT','Contact us to book','Ask about service times and availability.'],['Care, considered.','THE TREATMENT COLLECTION','Enquire about an appointment','Please discuss your requirements when booking.']],
    services:[['A helping hand, close to home.','HERE TO HELP','Tell us what you need','Please describe your requirements when enquiring.'],['Let us help with your next job.','SERVICES AT A GLANCE','Contact us for a quote','Confirm what is included before booking.'],['Practical help. Personal attention.','OUR SERVICE COLLECTION','Discuss your requirements','Availability and scope are confirmed on enquiry.']],
    general:[['Discover something for you.','WELCOME TO OUR BUSINESS','Get in touch','Contact us for details and availability.'],['Take a look. Find your next favourite.','EXPLORE THE SELECTION','Contact us today','Please confirm the details before ordering.'],['A thoughtful selection.','THE COLLECTION','Enquire to find out more','Please contact us with your requirements.']]
  };
  const occasions={
    combos:[['Everyday essentials. Better together.','GROCERY COMBOS','Contact us to order','Price is for all items in each combo. While stocks last.'],['Pick your combo. Stock your pantry.','BUNDLE DEALS','Ask us about these combos','Each price covers the listed combo contents.'],['A basket, thoughtfully put together.','THE BUNDLE COLLECTION','Enquire about a combo','Please confirm pack sizes and availability when ordering.']],
    event:[['You are invited. Come join us.','LET’S GET TOGETHER','Contact us for event details','Please confirm the date, time and venue before attending.'],['Save the date. Be part of it.','MARK YOUR CALENDAR','Ask how to attend','Contact us about attendance and event arrangements.'],['An invitation to something special.','YOU ARE INVITED','Enquire about attending','Please enquire about arrangements before attending.']],
    opening:[['A new beginning. Come say hello.','WE’RE OPENING OUR DOORS','Ask about our opening','Please check the opening date and visiting times.'],['New doors. New possibilities.','GRAND OPENING','Contact us for opening details','Opening arrangements are available on enquiry.'],['We look forward to welcoming you.','A NEW CHAPTER','Enquire about our opening','Please confirm the opening details before visiting.']],
    spotlight:[['One favourite. All the attention.','IN THE SPOTLIGHT'],['Take a closer look at this one.','THE FEATURED OFFER'],['A closer look at something special.','THE SPOTLIGHT EDIT']]
  };
  // Promotion wording replaces the headline and small heading for a specific
  // kind of flyer. Contact messages and footers stay with the business.
  const promotions={
    weekly:[['Weekly specials for your family table.','WEEKLY SPECIALS'],['This week’s specials. Fill your trolley.','THIS WEEK ONLY'],['A considered selection for the week ahead.','THE WEEKLY SELECTION']],
    weekend:[['Your weekend shop, sorted.','WEEKEND SPECIALS'],['Big weekend. Big value.','WEEKEND DEALS'],['Everything for a good weekend.','THE WEEKEND EDIT']],
    wholesale:[['Wholesale prices for your business.','WHOLESALE PRICES'],['Stock up by the case.','CASH & CARRY'],['Bulk packs, clearly priced.','THE WHOLESALE LIST'],],
    produce:[['Fresh from the market this week.','FRESH PRODUCE'],['Fresh in today. Pick yours.','FRESH PICKS'],['Seasonal produce, simply priced.','FROM THE MARKET']],
    butchery:[['Quality cuts from our butchery.','FROM OUR BUTCHERY'],['Braai-ready cuts and packs.','BUTCHERY SPECIALS'],['Cut to order, priced per kilogram.','THE BUTCHER’S COUNTER']],
    bakery:[['Baked fresh every morning.','FROM OUR BAKERY'],['Warm bakes, ready today.','BAKERY SPECIALS'],['Breads and bakes, made by hand.','THE BAKERY COUNTER']],
    household:[['Everyday essentials, all in one place.','HOUSEHOLD ESSENTIALS'],['Stock up on the basics.','HOME ESSENTIALS'],['The practical things, clearly priced.','THE ESSENTIALS LIST']],
    single:[['This week’s big deal.','THIS WEEK’S DEAL'],['One product. One price. Take a look.','THE BIG PRICE'],['A closer look at one favourite.','PRODUCT OF THE WEEK']],
    sale:[['Prices worth a second look.','PRICE DROP'],['Sale on now. Don’t miss it.','SALE'],['Reduced prices, for a short time.','THE SALE EDIT']],
    menu:[['What are you craving today?','FROM OUR KITCHEN'],['Today’s specials, hot and ready.','TODAY’S SPECIALS'],['Something to savour.','AT THE TABLE']],
    collection:[['Find something that feels like you.','NEW COLLECTION'],['New in. Just for you.','JUST ARRIVED'],['A collection to make your own.','THE NEW COLLECTION']],
    services:[['Good service, close to home.','OUR SERVICES'],['Tell us what you need.','SERVICES & PRICES'],['Practical help. Personal attention.','THE SERVICE LIST']]
  };
  function sets(context={}){
    const source=bank[context.business]||bank.general;
    return Object.entries(tones).map(([id,label],i)=>{
      const values=Object.fromEntries(Object.keys(fields).map((field,j)=>[field,source[i][j]]));
      const promotion=promotions[context.promotion]?.[i];
      if(promotion&&!['combos','event','opening','spotlight'].includes(context.purpose)){values.headline=promotion[0];values.eyebrow=promotion[1];}
      const occasion=occasions[context.purpose]?.[i];
      if(occasion)Object.keys(fields).forEach((field,j)=>{if(occasion[j]!==undefined)values[field]=occasion[j];});
      if(context.purpose==='spotlight'&&context.showDate===false)values.eyebrow=['IN THE SPOTLIGHT','TAKE A CLOSER LOOK','THE SPOTLIGHT EDIT'][i];
      return {id,label,values};
    });
  }
  function validate(values){
    if(!values||typeof values!=='object'||Array.isArray(values)||!Object.keys(values).length)throw new Error('Choose wording to use.');
    const result={};for(const [key,value] of Object.entries(values)){
      if(!fields[key]||typeof value!=='string'||value.length>fields[key].max)throw new Error('Check the selected wording.');
      result[key]=value;
    }return result;
  }
  root.ShopDeskWords={tones,fields,promotions,sets,validate};
})(typeof window!=='undefined'?window:globalThis);
