(() => {
  'use strict';
  const $=id=>document.getElementById(id),model=ShopDeskProjects,pageSize=6;
  let entries=[],workspace=null,page=0,busy=false,selected=null,renderRun=0;
  const message=(id,text)=>{$(id).textContent=text;$(id).hidden=!text;};
  const button=(text,action,cls='button secondary')=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.addEventListener('click',action);return b;};
  function preview(canvas,entry){
    const d=entry.draft,f=ShopDeskPoster.formats[d.format]||ShopDeskPoster.formats.poster;
    // Render a small layout preview directly; opening a project loads its photos.
    const width=240,height=Math.round(width*f.height/f.width);
    ShopDeskPoster.draw(canvas,{...entry.shop,...d,shop:entry.shop.name,dateText:model.dateLabel(d.date),startDateText:d.startDate?model.dateLabel(d.startDate):'',eventDateText:model.dateLabel(d.eventDate)},new Map(),{width,height});
  }
  async function open(entry){
    if(busy)return;busy=true;render();message('projects-error','');
    try{await ShopDeskPromotion.openProject(entry.clientId,entry.projectId);$('projects-dialog').close();ShopDeskInterface.showTab('content',true);}
    catch(e){message('projects-error',e.message);}finally{busy=false;if($('projects-dialog').open)render();}
  }
  function edition(entry){
    selected=entry;const values=model.defaults(entry),event=model.announcement(entry.draft),dated=!event&&entry.draft.showDate!==false;
    $('edition-name').value=values.title;$('edition-start').value=values.startDate;$('edition-end').value=values.endDate;$('edition-event-date').value=values.eventDate;
    for(const id of ['edition-start','edition-end','edition-event-date'])$(id).min=model.day();
    $('edition-dates').hidden=!dated;$('edition-event-field').hidden=!event;
    $('edition-source').textContent=entry.shop.name+' · '+entry.title;
    $('edition-note').textContent='Creates a separate project with the same design, offers and photos. Review prices'+(event?', event time and venue':'')+' before sharing.';
    message('edition-error','');$('edition-dialog').showModal();$('edition-title').tabIndex=-1;$('edition-title').focus();
  }
  function render(){
    const run=++renderRun,filtered=model.filter(entries,{query:$('projects-search').value,client:$('projects-client').value,status:$('projects-status-filter').value});
    page=Math.max(0,Math.min(page,Math.ceil(filtered.length/pageSize)-1));
    const start=page*pageSize,visible=filtered.slice(start,start+pageSize),full=entries.length>=100;
    $('projects-grid').replaceChildren();$('projects-empty').hidden=!!filtered.length;
    $('projects-results').textContent=filtered.length?(start+1)+'–'+(start+visible.length)+' of '+filtered.length+' flyers':'No matching flyers';
    $('projects-count').textContent=entries.length+' saved '+(entries.length===1?'flyer':'flyers');
    $('projects-page').textContent='Page '+(page+1)+' of '+Math.max(1,Math.ceil(filtered.length/pageSize));
    $('projects-previous').disabled=busy||page===0;$('projects-next').disabled=busy||start+pageSize>=filtered.length;
    $('projects-pages').hidden=filtered.length<=pageSize;
    message('projects-capacity',full?'Your workspace has 100 projects. Open an existing flyer to keep working.':'');
    visible.forEach(entry=>{
      const card=document.createElement('article');card.className='project-card';card.dataset.projectId=entry.projectId;
      const visual=document.createElement('div');visual.className='project-card-visual';
      const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Layout preview for '+entry.title);visual.append(canvas);
      const body=document.createElement('div');body.className='project-card-body';
      const row=document.createElement('div');row.className='project-badges';
      const badge=document.createElement('span');badge.className='project-badge';badge.dataset.status=entry.status.code;badge.textContent=entry.status.label;row.append(badge);
      if(entry.current){const current=document.createElement('span');current.className='project-current';current.textContent='In editor';row.append(current);}
      const title=document.createElement('h3');title.textContent=entry.title;
      const client=document.createElement('p');client.className='project-client';client.textContent=entry.shop.name||'Unnamed business';
      const detail=document.createElement('p');detail.className='project-date';detail.textContent=entry.status.detail;
      const meta=document.createElement('p');meta.className='project-meta';meta.textContent=(entry.count?entry.count+' '+(entry.count===1?'offer':'offers')+' · ':'')+(ShopDeskPoster.formats[entry.draft.format]?.label||'Portrait');
      const actions=document.createElement('div');actions.className='project-card-actions';
      const edit=button('Open flyer',()=>open(entry),'button primary'),copy=button('New edition',()=>edition(entry));
      edit.disabled=busy;copy.disabled=busy||full;edit.setAttribute('aria-label','Open '+entry.title);copy.setAttribute('aria-label','New edition of '+entry.title);actions.append(edit,copy);
      body.append(row,title,client,detail,meta,actions);card.append(visual,body);$('projects-grid').append(card);
      requestAnimationFrame(()=>{if(run===renderRun)try{preview(canvas,entry);}catch{canvas.hidden=true;visual.textContent='Open to view this flyer.';}});
    });
  }
  function refresh(){
    workspace=ShopDeskPromotion.projectCatalog();entries=model.catalog(workspace);
    const previous=$('projects-client').value;$('projects-client').replaceChildren(new Option('All businesses',''));
    for(const client of workspace.clients)$('projects-client').append(new Option(client.shop.name||'Unnamed business',client.id));
    $('projects-client').value=workspace.clients.some(c=>c.id===previous)?previous:'';
    render();
  }
  $('open-projects').addEventListener('click',()=>{
    try{page=0;refresh();message('projects-error','');$('projects-dialog').showModal();$('projects-title').tabIndex=-1;$('projects-title').focus();}
    catch(e){$('editor-action-error').textContent=e.message;$('editor-action-error').hidden=false;}
  });
  $('close-projects').addEventListener('click',()=>$('projects-dialog').close());
  $('projects-dialog').addEventListener('close',()=>{renderRun++;});
  $('projects-search-form').addEventListener('submit',event=>{event.preventDefault();page=0;render();});
  for(const id of ['projects-search','projects-client','projects-status-filter'])$(id).addEventListener(id==='projects-search'?'input':'change',()=>{page=0;render();});
  $('projects-clear').addEventListener('click',()=>{$('projects-search').value='';$('projects-client').value='';$('projects-status-filter').value='all';page=0;render();$('projects-search').focus();});
  $('projects-previous').addEventListener('click',()=>{page--;render();$('projects-results').focus();});
  $('projects-next').addEventListener('click',()=>{page++;render();$('projects-results').focus();});
  $('close-edition').addEventListener('click',()=>$('edition-dialog').close());
  $('edition-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  $('edition-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!selected||busy)return;busy=true;$('edition-fields').disabled=true;$('close-edition').disabled=true;message('edition-error','');
    try{
      await ShopDeskPromotion.newEdition(selected.clientId,selected.projectId,{title:$('edition-name').value,startDate:$('edition-start').value,endDate:$('edition-end').value,eventDate:$('edition-event-date').value});
      $('edition-dialog').close();$('projects-dialog').close();ShopDeskInterface.showTab('content',true);
    }catch(e){message('edition-error',e.message);}
    finally{busy=false;$('edition-fields').disabled=false;$('close-edition').disabled=false;}
  });
})();
