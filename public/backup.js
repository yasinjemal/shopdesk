(function(root){
  'use strict';
  const FORMAT='shopdesk-backup',VERSION=1,MAX_TEXT=30000000,ID=/^[0-9a-f-]{36}$/,DATA_URL=/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
  const fail=message=>Object.assign(new Error(message),{backup:true});
  const clone=value=>JSON.parse(JSON.stringify(value));
  function slots(studio){
    const list=[];
    for(const client of studio.clients){
      if(client.shop)list.push([client.shop,'logo']);
      for(const product of client.products||[])list.push([product,'photo']);
      for(const project of client.projects||[]){
        list.push([project.draft,'heroPhoto']);
        for(const item of project.draft?.items||[])list.push([item,'photo']);
      }
    }
    return list.filter(([owner,key])=>owner&&typeof owner[key]==='string'&&owner[key]);
  }
  /** Every photo id a workspace refers to (logos, main photos, saved products and flyer items). */
  const photoIds=studio=>[...new Set(slots(studio).map(([owner,key])=>owner[key]))];
  /** Copy of the workspace with photo ids replaced through `map`; ids without a new home are cleared. */
  function remap(studio,map){
    const next=clone(studio);
    for(const [owner,key] of slots(next))owner[key]=map.get(owner[key])||'';
    return next;
  }
  function build(studio,photos,now=new Date()){
    return {format:FORMAT,version:VERSION,exportedAt:now.toISOString(),studio:clone(studio),photos:{...photos}};
  }
  function summary(studio){
    return {clients:studio.clients.length,projects:studio.clients.reduce((n,c)=>n+c.projects.length,0),products:studio.clients.reduce((n,c)=>n+(c.products||[]).length,0),photos:photoIds(studio).length};
  }
  function parse(text){
    if(typeof text!=='string'||!text.trim())throw fail('This file is empty.');
    if(text.length>MAX_TEXT)throw fail('This backup is too large to restore.');
    let data;try{data=JSON.parse(text);}catch{throw fail('This is not a ShopDesk backup file (it is not valid JSON).');}
    if(data?.format!==FORMAT)throw fail('This is not a ShopDesk backup file.');
    if(data.version!==VERSION)throw fail('This backup was made by a newer version of ShopDesk and cannot be restored here.');
    const studio=data.studio;
    if(studio?.schemaVersion!==2||!Array.isArray(studio.clients)||studio.clients.length<1||studio.clients.length>20)throw fail('The backup does not contain a valid list of clients.');
    if(studio.clients.some(c=>!c||!ID.test(c.id||'')||!c.shop||!Array.isArray(c.projects)||!c.projects.length||c.projects.some(p=>!p||!ID.test(p.id||'')||!p.draft)))throw fail('The backup has a client or project that is damaged.');
    const active=studio.clients.find(c=>c.id===studio.activeClientId);
    if(!active||!active.projects.some(p=>p.id===studio.activeProjectId))throw fail('The backup does not say which project was open.');
    const photos=data.photos&&typeof data.photos==='object'?data.photos:{};
    for(const [id,url] of Object.entries(photos))if(!ID.test(id)||typeof url!=='string'||!DATA_URL.test(url))throw fail('The backup contains a photo that cannot be read.');
    return {studio,photos,exportedAt:typeof data.exportedAt==='string'?data.exportedAt:''};
  }
  const cell=value=>{
    let text=String(value??'');
    if(/^[=+@\t\r]/.test(text)||(/^-/.test(text)&&!/^-?\d/.test(text)))text="'"+text; // stop spreadsheets running names as formulas
    return /[",\n\r]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
  };
  /** Saved products as CSV that the flyer's "paste a product list" importer reads back. */
  function productsCSV(clients){
    const rows=[['client','name','size','price']];
    for(const client of clients)for(const product of client.products||[])rows.push([client.shop?.name||'',product.name,product.size,product.price]);
    return rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
  }
  root.ShopDeskBackup={FORMAT,VERSION,photoIds,remap,build,parse,summary,productsCSV};
})(typeof window!=='undefined'?window:globalThis);
