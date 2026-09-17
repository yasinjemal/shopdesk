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
    event:[['You are invited. Come join us.','LET’S GET TOGETHER','Contact us for event details','Please confirm the date, time and venue before attending.'],['Save the date. Be part of it.','MARK YOUR CALENDAR','Ask how to attend','Contact us about attendance and event arrangements.'],['An invitation to something special.','YOU ARE INVITED','Enquire about attending','Please enquire about arrangements before attending.']],
    opening:[['A new beginning. Come say hello.','WE’RE OPENING OUR DOORS','Ask about our opening','Please check the opening date and visiting times.'],['New doors. New possibilities.','GRAND OPENING','Contact us for opening details','Opening arrangements are available on enquiry.'],['We look forward to welcoming you.','A NEW CHAPTER','Enquire about our opening','Please confirm the opening details before visiting.']],
    spotlight:[['One favourite. All the attention.','IN THE SPOTLIGHT'],['Take a closer look at this one.','THE FEATURED OFFER'],['A closer look at something special.','THE SPOTLIGHT EDIT']]
  };
  function sets(context={}){
    const source=bank[context.business]||bank.general;
    return Object.entries(tones).map(([id,label],i)=>{
      const values=Object.fromEntries(Object.keys(fields).map((field,j)=>[field,source[i][j]]));
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
  root.ShopDeskWords={tones,fields,sets,validate};
})(typeof window!=='undefined'?window:globalThis);
