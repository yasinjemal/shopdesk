(function(root){
  'use strict';
  const money=value=>'R'+Number(value).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
  function plan(data){
    if(data&&['event','opening'].includes(data.purpose))return [{name:'01-full-flyer.png',label:'Full flyer',detail:'Announcement · 4:5',data:{...data,format:'poster'}},{name:'02-status-1-of-1.png',label:'Status 1 of 1',detail:'Announcement · 9:16',data:{...data,format:'status',packPage:{index:1,total:1}}}];
    if(!data||!Array.isArray(data.items)||data.items.length<1||data.items.length>12)throw new Error('Choose 1 to 12 offers for your promotion pack.');
    if(data.purpose==='spotlight'&&data.items.length!==1)throw new Error('Choose one offer for a Spotlight flyer.');
    const base={...data,items:data.items.map(item=>({...item}))};
    if(base.template==='simple'&&base.items.length>3)throw new Error('Choose a flyer design for more than three offers.');
    const pages=Math.ceil(base.items.length/4),outputs=[{name:'01-full-flyer.png',label:'Full flyer',detail:base.items.length+' '+(base.items.length===1?'offer':'offers')+' · 4:5',data:{...base,format:'poster'}}];
    let offset=0;
    for(let page=0;page<pages;page++){
      const count=Math.ceil((base.items.length-offset)/(pages-page));
      outputs.push({name:String(page+2).padStart(2,'0')+'-status-'+(page+1)+'-of-'+pages+'.png',label:'Status '+(page+1)+' of '+pages,detail:count+' '+(count===1?'offer':'offers')+' · 9:16',data:{...base,format:'status',items:base.items.slice(offset,offset+count),packPage:{index:page+1,total:pages}}});
      offset+=count;
    }
    return outputs;
  }
  function caption(data){
    const rows=['event','opening'].includes(data.purpose)?[]:data.items.map(item=>{
      const name=data.cleanNames?root.ShopDeskPoster.displayName(item.name,item.size):item.name;
      return name+(item.size?' · '+item.size:'')+' — '+money(item.price);
    });
    const copy=root.ShopDeskBusiness.copy(data);
    return [data.shop,data.headline,'',...rows,...(data.purpose&&data.purpose!=='offers'&&data.details?[data.details]:[]),'',...[copy.date,copy.location,copy.contact,copy.terms].filter(Boolean)].join('\n');
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
  root.ShopDeskPack={plan,caption,zip,crc32};
})(typeof window!=='undefined'?window:globalThis);
