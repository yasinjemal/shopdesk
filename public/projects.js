(function(root){
  'use strict';
  const day=(value=new Date())=>[value.getFullYear(),String(value.getMonth()+1).padStart(2,'0'),String(value.getDate()).padStart(2,'0')].join('-');
  const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
  const dateLabel=value=>validDate(value)?new Date(value+'T12:00:00').toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}):'Choose a date';
  const announcement=d=>['event','opening'].includes(d.purpose);
  function status(shop,d,today=day()){
    const draft=detail=>({code:'draft',label:'Draft',detail});
    if(!shop.name?.trim())return draft('Add a business name.');
    if(!d.headline?.trim())return draft('Add a headline.');
    const event=announcement(d),items=root.ShopDeskBusiness.visibleItems(d);
    if(d.purpose==='combos'){const message=root.ShopDeskCombos.error(d);if(message)return draft(message);}
    if(!event&&d.purpose!=='combos'&&(!items.length||items.some(i=>!i.name.trim()||!Number.isFinite(Number(i.price))||Number(i.price)<=0)))return draft('Check the offer names and prices.');
    if(!event&&d.showDate===false)return {code:'current',label:'No end date',detail:'An ongoing menu, price list or promotion.'};
    const end=event?d.eventDate:d.date;
    if(!validDate(end)||(!event&&d.startDate&&(!validDate(d.startDate)||d.startDate>end)))return draft('Check the promotion dates.');
    if(end<today)return {code:'expired',label:event?'Past event':'Expired',detail:(event?'Event was on ':'Ended ')+dateLabel(end)};
    if(event&&end>today)return {code:'scheduled',label:'Upcoming event',detail:dateLabel(end)};
    if(!event&&d.startDate&&d.startDate>today)return {code:'scheduled',label:'Upcoming',detail:'Starts '+dateLabel(d.startDate)};
    const remaining=Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
    if(remaining<=3)return {code:'ending',label:event?'Event today':remaining===0?'Ends today':'Ending soon',detail:event?dateLabel(end):'Valid until '+dateLabel(end)};
    return {code:'current',label:'Current',detail:'Valid until '+dateLabel(end)};
  }
  function catalog(state,today=day()){
    return state.clients.flatMap(client=>client.projects.map(project=>({clientId:client.id,projectId:project.id,title:project.title,shop:client.shop,draft:project.draft,
      current:state.activeClientId===client.id&&state.activeProjectId===project.id,count:announcement(project.draft)?0:root.ShopDeskBusiness.visibleItems(project.draft).length,
      status:status(client.shop,project.draft,today)}))).sort((a,b)=>Number(b.current)-Number(a.current)||a.title.localeCompare(b.title)||a.shop.name.localeCompare(b.shop.name));
  }
  function filter(entries,{query='',client='',status='all'}={}){
    const words=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return entries.filter(entry=>{
      if(client&&entry.clientId!==client)return false;if(status!=='all'&&entry.status.code!==status)return false;
      const haystack=[entry.title,entry.shop.name,entry.draft.headline,...(entry.draft.combos||[]).map(c=>c.name),...root.ShopDeskBusiness.visibleItems(entry.draft).map(i=>i.name)].join(' ').toLocaleLowerCase();
      return words.every(word=>haystack.includes(word));
    });
  }
  function defaults(entry,today=day()){
    const last=new Date(today+'T12:00:00');last.setDate(last.getDate()+6);
    return {title:(entry.title+' · '+dateLabel(today)).slice(0,60),startDate:today,endDate:day(last),eventDate:today};
  }
  function renew(state,clientId,projectId,values,today=day()){
    if(typeof values.title!=='string'||!values.title.trim()||values.title.length>60)throw new Error('Give the new edition a name (up to 60 characters).');
    const selected=root.ShopDeskStudio.select(state,clientId,projectId),original=root.ShopDeskStudio.active(selected).project.draft;
    if(announcement(original)){
      if(!validDate(values.eventDate)||values.eventDate<today)throw new Error('Choose today or a future event date.');
    }else if(original.showDate!==false){
      if(!validDate(values.startDate)||!validDate(values.endDate)||values.startDate<today||values.endDate<values.startDate)throw new Error('Choose a start date from today and an end date on or after it.');
    }
    const next=root.ShopDeskStudio.duplicate(selected),copy=root.ShopDeskStudio.active(next).project;
    copy.title=values.title.trim();
    if(announcement(original))copy.draft.eventDate=values.eventDate;
    else if(original.showDate!==false){copy.draft.startDate=values.startDate;copy.draft.date=values.endDate;}
    return next;
  }
  root.ShopDeskProjects={day,validDate,dateLabel,announcement,status,catalog,filter,defaults,renew};
})(typeof window!=='undefined'?window:globalThis);
