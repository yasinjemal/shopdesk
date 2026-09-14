(function(root){
  'use strict';
  const profiles={
    grocery:{label:'Grocery & general retail',item:'Product',size:'Pack / quantity',example:'e.g. 12.5 kg',unit:'Each',template:'bold',theme:'red',headline:'Fresh deals. Everyday value.',eyebrow:'SHOP SPECIALS',cta:'Contact us',terms:'While stocks last.',showDate:true},
    fashion:{label:'Clothing & accessories',item:'Item',size:'Size / colour',example:'e.g. S–XL · Black',unit:'Each',template:'boutique',theme:'charcoal',headline:'Find your next favourite.',eyebrow:'THE COLLECTION',cta:'Order on WhatsApp',terms:'While stocks last.',showDate:true},
    food:{label:'Food, takeaway & bakery',item:'Menu item',size:'Portion / options',example:'e.g. Serves 2',unit:'Per portion',template:'menu',theme:'orange',headline:'Good food. Made for you.',eyebrow:'ON THE MENU',cta:'Call to order',terms:'Ask us about ingredients and allergens.',showDate:false},
    beauty:{label:'Salon, barber & beauty',item:'Service',size:'Duration / details',example:'e.g. 45 min',unit:'Per service',template:'studio',theme:'plum',headline:'A little time for yourself.',eyebrow:'TREATMENTS & PRICES',cta:'Book an appointment',terms:'Please book ahead.',showDate:false},
    services:{label:'Repairs, cleaning & other services',item:'Service',size:'Duration / what is included',example:'e.g. Per hour',unit:'Per service',template:'studio',theme:'blue',headline:'Good service. Close to home.',eyebrow:'OUR SERVICES',cta:'Call to book',terms:'Contact us to discuss your requirements.',showDate:false},
    general:{label:'Other business',item:'Offer',size:'Details / quantity',example:'e.g. Per person',unit:'Each',template:'market',theme:'green',headline:'Discover what we offer.',eyebrow:'EXPLORE OUR OFFERS',cta:'Get in touch',terms:'',showDate:false}
  };
  const get=key=>profiles[key]||profiles.grocery;
  function applyPreset(draft,business){
    const p=get(business),next={...draft,business};
    for(const key of ['template','theme','headline','eyebrow','cta','terms','showDate'])next[key]=p[key];
    return next;
  }
  function copy(data){
    const p=get(data.business),cta=data.cta??p.cta,announcement=['event','opening'].includes(data.purpose);
    return {eyebrow:data.eyebrow??p.eyebrow,terms:data.terms??p.terms,unit:p.unit,
      location:announcement?(data.venue||data.location):data.location,
      contact:[cta,data.phone].filter(Boolean).join(': '),
      date:announcement?[(data.eventDateText||'Your event date'),data.eventTime].filter(Boolean).join(' · '):data.showDate===false?'':'Valid until '+(data.dateText||'your selected date')};
  }
  root.ShopDeskBusiness={profiles,get,applyPreset,copy};
})(typeof window!=='undefined'?window:globalThis);
