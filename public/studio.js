(function(root){
  'use strict';
  const clone=value=>structuredClone(value),id=()=>crypto.randomUUID();
  const purposes={offers:'Offers, menu or price list',spotlight:'Single-offer spotlight',event:'Event invitation',opening:'Grand opening'};
  function active(state){
    const client=state.clients.find(c=>c.id===state.activeClientId);
    const project=client?.projects.find(p=>p.id===state.activeProjectId);
    if(!client||!project)throw new Error('Choose a saved client and project.');
    return {client,project};
  }
  function upgrade(data,fallback){
    if(data?.schemaVersion===2)return clone(data);
    const old=clone(data||fallback),clientId=id(),projectId=id();
    return {schemaVersion:2,activeClientId:clientId,activeProjectId:projectId,clients:[{id:clientId,shop:old.shop,products:old.products,projects:[{id:projectId,title:'My first flyer',draft:old.draft}]}]};
  }
  function capture(state,workspace,title){
    const next=clone(state),{client,project}=active(next);
    client.shop=clone(workspace.shop);client.products=clone(workspace.products);project.draft=clone(workspace.draft);project.title=title.trim()||'Untitled project';
    return next;
  }
  function select(state,clientId,projectId){
    const next=clone(state),client=next.clients.find(c=>c.id===clientId);
    if(!client)throw new Error('Client not found.');
    next.activeClientId=client.id;next.activeProjectId=projectId||client.projects[0].id;active(next);return next;
  }
  function room(state){if(state.clients.reduce((n,c)=>n+c.projects.length,0)>=100)throw new Error('You have reached 100 saved projects.');}
  function suggest(source){
    const draft=root.ShopDeskBusiness.applyPreset(clone(source),source.business||'grocery'),purpose=source.purpose;
    if(purpose==='event'||purpose==='opening')Object.assign(draft,{headline:purpose==='event'?"You're invited.":"We're opening our doors.",eyebrow:purpose==='event'?'SAVE THE DATE':'GRAND OPENING',cta:'Contact us for details',terms:'',showDate:false});
    return draft;
  }
  function newDraft(source,business,purpose){
    let draft=suggest({...source,business,purpose});
    const expiry=new Date();expiry.setDate(expiry.getDate()+7);draft.date=[expiry.getFullYear(),String(expiry.getMonth()+1).padStart(2,'0'),String(expiry.getDate()).padStart(2,'0')].join('-');
    Object.assign(draft,{purpose,heroPhoto:'',details:'',eventDate:'',eventTime:'',venue:'',items:[{name:'',size:'',price:'',photo:''}]});
    return draft;
  }
  function addClient(state,name,business,purpose,title){
    if(state.clients.length>=20)throw new Error('You have reached 20 saved clients.');room(state);
    const next=clone(state),{project:source}=active(state),clientId=id(),projectId=id();
    next.clients.push({id:clientId,shop:{name:name.trim(),phone:'',location:'',logo:''},products:[],projects:[{id:projectId,title:title.trim()||'First project',draft:newDraft(source.draft,business,purpose)}]});
    return select(next,clientId,projectId);
  }
  function addProject(state,title,purpose){
    room(state);const next=clone(state),{client,project:source}=active(next),projectId=id();
    const draft=newDraft(source.draft,source.draft.business||'grocery',purpose);
    // Keep the client's chosen palette and offer design for their next project.
    draft.theme=source.draft.theme;draft.template=source.draft.template||'bold';
    client.projects.push({id:projectId,title:title.trim()||'Untitled project',draft});return select(next,client.id,projectId);
  }
  function duplicate(state){
    room(state);const next=clone(state),{client,project}=active(next),copy=clone(project);
    copy.id=id();copy.title=project.title.slice(0,53)+' (copy)';client.projects.push(copy);return select(next,client.id,copy.id);
  }
  root.ShopDeskStudio={purposes,active,upgrade,capture,select,addClient,addProject,duplicate,suggest};
})(typeof window!=='undefined'?window:globalThis);
