(function(root){
  'use strict';
  const money=value=>'R'+Number(value).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
  function plan(data){
    if(data?.purpose==='combos'){
      const message=root.ShopDeskCombos.error(data);if(message)throw new Error(message);
      const fullFormat=['square','landscape','a4','a5'].includes(data.format)?data.format:'poster';
      const groups=root.ShopDeskCombos.groups(data).filter(g=>g.items.length),pages=groups.length;
      return [{name:'01-full-flyer.png',label:'Full combo flyer',detail:groups.length+' complete combos',data:{...data,format:fullFormat}},...groups.map((group,index)=>({
        name:String(index+2).padStart(2,'0')+'-combo-'+group.number+'.png',label:'Combo '+group.number+' · '+group.name,detail:group.items.length+' products · 9:16',
        data:{...data,format:'status',exportQuality:'standard',itemCount:group.items.length,items:group.items.map(item=>({...item,combo:0})),combos:[{name:group.name,price:group.price}],comboOffset:group.number-1,packPage:{index:index+1,total:pages}}
      }))];
    }
    if(data?.items && !['event','opening'].includes(data.purpose) && (data.items.length>25 || (data.itemCount===undefined && data.purpose==='spotlight' && data.items.length!==1) || (data.itemCount===undefined && data.template==='simple' && data.items.length>3)))throw new Error('Choose a valid number of offers for this layout.');
    if(data?.items)data={...data,items:root.ShopDeskBusiness.visibleItems(data),itemCount:undefined};
    const fullFormat=['square','landscape','a4','a5'].includes(data?.format)?data.format:'poster';
    const fullLabel=({poster:'4:5',square:'1:1',landscape:'16:9',a4:'A4',a5:'A5'})[fullFormat];
    if(data&&['event','opening'].includes(data.purpose))return [{name:'01-full-flyer.png',label:'Full flyer',detail:'Announcement · '+fullLabel,data:{...data,format:fullFormat}},{name:'02-status-1-of-1.png',label:'Status 1 of 1',detail:'Announcement · 9:16',data:{...data,format:'status',exportQuality:'standard',packPage:{index:1,total:1}}}];
    if(!data||!Array.isArray(data.items)||data.items.length<1||data.items.length>25)throw new Error('Choose 1 to 25 offers for your promotion pack.');
    if(data.purpose==='spotlight'&&data.items.length!==1)throw new Error('Choose one offer for a Spotlight flyer.');
    const base={...data,items:data.items.map(item=>({...item}))};
    if(base.template==='simple'&&base.items.length>3)throw new Error('Choose a flyer design for more than three offers.');
    const pages=Math.ceil(base.items.length/4),outputs=[{name:'01-full-flyer.png',label:'Full flyer',detail:base.items.length+' '+(base.items.length===1?'offer':'offers')+' · '+fullLabel,data:{...base,format:fullFormat}}];
    let offset=0;
    for(let page=0;page<pages;page++){
      const count=Math.ceil((base.items.length-offset)/(pages-page));
      outputs.push({name:String(page+2).padStart(2,'0')+'-status-'+(page+1)+'-of-'+pages+'.png',label:'Status '+(page+1)+' of '+pages,detail:count+' '+(count===1?'offer':'offers')+' · 9:16',data:{...base,format:'status',exportQuality:'standard',items:base.items.slice(offset,offset+count),packPage:{index:page+1,total:pages}}});
      offset+=count;
    }
    return outputs;
  }
  function caption(data){
    data={...data,items:root.ShopDeskBusiness.visibleItems(data)};
    const rows=data.purpose==='combos'?root.ShopDeskCombos.groups(data).filter(g=>g.items.length).flatMap(group=>[
      'Combo '+group.number+' · '+group.name+' — '+money(group.price)+' for the complete combo',
      ...group.items.map(item=>(item.quantity||1)+' × '+(data.cleanNames?root.ShopDeskPoster.displayName(item.name,item.size):item.name)+(item.size?' · '+item.size:'')),''
    ]):['event','opening'].includes(data.purpose)?[]:data.items.map(item=>{
      const name=data.cleanNames?root.ShopDeskPoster.displayName(item.name,item.size):item.name;
      const was=item.wasPrice&&Number(item.wasPrice)>Number(item.price)?' (was '+money(item.wasPrice)+')':'';
      return (item.section?item.section+': ':'')+name+(item.size?' · '+item.size:'')+' — '+(item.dealQuantity?item.dealQuantity+' for ':'')+money(item.price)+was;
    });
    const copy=root.ShopDeskBusiness.copy(data);
    const credits=root.ShopDeskOutput?.credits?root.ShopDeskOutput.credits(data):[];
    return [data.shop,data.headline,'',...rows,...(data.purpose&&data.purpose!=='offers'&&data.details?[data.details]:[]),'',...[copy.date,copy.location,copy.contact,copy.terms].filter(Boolean),...(credits.length?['','Photo credits:',...credits]:[])].join('\n');
  }
  const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=table[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
  // PNG files are already compressed. A stored ZIP keeps them intact and needs no external service.
  async function zip(files,now=new Date()){
    if(!Array.isArray(files)||!files.length||files.length>20)throw new Error('Could not package these files.');
    const encoder=new TextEncoder(),parts=[],directory=[],names=new Set();let offset=0;
    const year=Math.min(2107,Math.max(1980,now.getFullYear())),date=((year-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
    for(const file of files){
      if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(file.name)||names.has(file.name)||!(file.blob instanceof Blob))throw new Error('Could not package this file.');
      names.add(file.name);const name=encoder.encode(file.name),bytes=new Uint8Array(await file.blob.arrayBuffer());
      if(offset+bytes.length>100000000)throw new Error('This pack is too large to zip. Download the images individually.');
      const crc=crc32(bytes),local=new Uint8Array(30+name.length),a=new DataView(local.buffer);
      a.setUint32(0,0x04034b50,true);a.setUint16(4,20,true);a.setUint16(6,0x0800,true);a.setUint16(10,time,true);a.setUint16(12,date,true);a.setUint32(14,crc,true);a.setUint32(18,bytes.length,true);a.setUint32(22,bytes.length,true);a.setUint16(26,name.length,true);local.set(name,30);
      const central=new Uint8Array(46+name.length),b=new DataView(central.buffer);
      b.setUint32(0,0x02014b50,true);b.setUint16(4,20,true);b.setUint16(6,20,true);b.setUint16(8,0x0800,true);b.setUint16(12,time,true);b.setUint16(14,date,true);b.setUint32(16,crc,true);b.setUint32(20,bytes.length,true);b.setUint32(24,bytes.length,true);b.setUint16(28,name.length,true);b.setUint32(42,offset,true);central.set(name,46);
      parts.push(local,bytes);directory.push(central);offset+=local.length+bytes.length;
    }
    const directorySize=directory.reduce((sum,entry)=>sum+entry.length,0),end=new Uint8Array(22),view=new DataView(end.buffer);
    view.setUint32(0,0x06054b50,true);view.setUint16(8,files.length,true);view.setUint16(10,files.length,true);view.setUint32(12,directorySize,true);view.setUint32(16,offset,true);
    return new Blob([...parts,...directory,end],{type:'application/zip'});
  }
  // Print catalogue pages: the same design repeated with a fixed number of
  // offers per page and page numbers, like a multi-page leaflet.
  function catalogue(data,perPage=12){
    if(!data||data.purpose==='combos'||['event','opening'].includes(data.purpose))throw new Error('Catalogue pages are available for offers, menus and price lists.');
    const items=root.ShopDeskBusiness.visibleItems(data);
    if(!items.length||items.length>25)throw new Error('Choose 1 to 25 offers for catalogue pages.');
    // Pages are balanced (16 offers become 8 + 8, not 12 + 4) so the last page never looks empty.
    const total=Math.ceil(items.length/perPage),pages=[];let offset=0;
    for(let page=0;page<total;page++){
      const count=Math.ceil((items.length-offset)/(total-page)),slice=items.slice(offset,offset+count);offset+=count;
      pages.push({...data,items:slice,itemCount:slice.length,packPage:{index:page+1,total}});
    }
    return pages;
  }
  root.ShopDeskPack={plan,caption,catalogue,zip,crc32};
})(typeof window!=='undefined'?window:globalThis);
