(function(root){
  'use strict';
  const encode=(canvas,type='image/png',quality)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('This image could not be created. Try Standard quality or fewer photos.')),type,quality));
  // PNG chunks: CRC, pHYs (print density) and tEXt (photo credits). Credits
  // live in the file's metadata, never in the visible artwork.
  const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  function pngChunk(type,data){
    const chunk=new Uint8Array(12+data.length),view=new DataView(chunk.buffer);view.setUint32(0,data.length);
    for(let i=0;i<4;i++)chunk[4+i]=type.charCodeAt(i);chunk.set(data,8);
    let crc=0xffffffff;for(let i=4;i<8+data.length;i++)crc=crcTable[(crc^chunk[i])&255]^(crc>>>8);view.setUint32(8+data.length,(crc^0xffffffff)>>>0);return chunk;
  }
  const latin1=text=>String(text).replace(/[^\x20-\x7e\xa0-\xff]/g,'?');
  function textChunk(keyword,text){const value=latin1(keyword).slice(0,79)+'\0'+latin1(text).replace(/\0/g,' ');return pngChunk('tEXt',Uint8Array.from(value,c=>c.charCodeAt(0)));}
  async function annotate(blob,{density=false,credits=[]}={}){
    if(!density&&!credits.length)return blob;
    const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),parts=[bytes.slice(0,33)];
    if(density){const data=new Uint8Array(9),dv=new DataView(data.buffer);dv.setUint32(0,11811);dv.setUint32(4,11811);data[8]=1;parts.push(pngChunk('pHYs',data));}
    for(const credit of credits.slice(0,25))parts.push(textChunk('Comment',credit));
    if(credits.length)parts.push(textChunk('Copyright',credits.join(' | ').slice(0,4000)));
    for(let pos=33;pos<bytes.length;){const end=pos+12+view.getUint32(pos);const type=String.fromCharCode(...bytes.slice(pos+4,pos+8));if(!(density&&type==='pHYs'))parts.push(bytes.slice(pos,end));pos=end;}
    return new Blob(parts,{type:'image/png'});
  }
  // Photo credits for every visible offer whose photo came from a catalogue provider.
  function credits(data){
    const items=root.ShopDeskBusiness.visibleItems(data),seen=new Set(),out=[];
    for(const item of items){const s=item.source;if(!item.photo||!s||!s.provider)continue;const key=[s.provider,s.code,s.language,s.revision].join(':');if(seen.has(key))continue;seen.add(key);
      out.push((item.name?item.name+' - ':'')+'Photo: '+(s.author||'Open Food Facts contributors')+' via Open Food Facts, CC BY-SA 3.0, '+(s.url||'https://world.openfoodfacts.org/product/'+s.code)+' (code '+s.code+', lang '+s.language+', rev '+s.revision+')');}
    return out;
  }
  // One RGB image per page, with physical paper dimensions. Text is redrawn at
  // 300 dpi before embedding; this is a print image, not a screen screenshot.
  async function pdf(canvases,format,creditLines=[]){
    const pages=Array.isArray(canvases)?canvases:[canvases];
    const paper=root.ShopDeskPoster.formats[format]?.mm;
    if(!paper)throw new Error('Choose A4 or A5 for a print PDF.');
    if(!pages.length||pages.length>12)throw new Error('A print PDF holds 1 to 12 pages.');
    const pt=paper.map(mm=>(mm*72/25.4).toFixed(4)),encoder=new TextEncoder(),parts=[],offsets=[0];let length=0;
    const add=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);length+=bytes.length;};
    const object=(id,body)=>{offsets[id]=length;add(id+' 0 obj\n'+body+'\nendobj\n');};
    add('%PDF-1.4\n%Handbill\n');
    const kids=pages.map((_,i)=>(3+i*3)+' 0 R');
    object(1,'<< /Type /Catalog /Pages 2 0 R >>');
    object(2,'<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>');
    for(const [i,canvas] of pages.entries()){
      const page=3+i*3,image=page+1,content=page+2;
      const jpeg=new Uint8Array(await (await encode(canvas,'image/jpeg',.97)).arrayBuffer());
      object(page,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pt.join(' ')+'] /Resources << /XObject << /Photo '+image+' 0 R >> >> /Contents '+content+' 0 R >>');
      offsets[image]=length;add(image+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');add(jpeg);add('\nendstream\nendobj\n');
      const commands='q\n'+pt[0]+' 0 0 '+pt[1]+' 0 0 cm\n/Photo Do\nQ\n';
      object(content,'<< /Length '+encoder.encode(commands).length+' >>\nstream\n'+commands+'endstream');
    }
    const info=3+pages.length*3,escape=text=>'('+latin1(text).replace(/[\\()]/g,m=>'\\'+m).replace(/[\r\n]+/g,' ')+')';
    object(info,'<< /Producer (Handbill) /Title (Handbill flyer)'+(creditLines.length?' /Subject '+escape('Photo credits: '+creditLines.join(' | ').slice(0,3000))+' /Keywords '+escape('Open Food Facts, CC BY-SA 3.0'):'')+' >>');
    const count=info+1,xref=length;add('xref\n0 '+count+'\n0000000000 65535 f \n');
    for(let id=1;id<count;id++)add(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
    add('trailer\n<< /Size '+count+' /Root 1 0 R /Info '+info+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
    return new Blob(parts,{type:'application/pdf'});
  }
  async function image(data,images,type='png',pages=null){
    const size=root.ShopDeskPoster.outputSize(data.format,data.exportQuality),canvases=[];
    try{
      for(const page of (pages&&pages.length?pages:[data])){
        const canvas=document.createElement('canvas');canvases.push(canvas);
        root.ShopDeskPoster.draw(canvas,page,images,{width:size.width,height:size.height,printMargin:!!size.mm});
      }
      const lines=[...new Set((pages&&pages.length?pages:[data]).flatMap(credits))];
      if(type==='pdf')return await pdf(canvases,data.format,lines);
      const blob=await encode(canvases[0]);return await annotate(blob,{density:!!size.mm,credits:lines});
    }finally{for(const canvas of canvases){canvas.width=1;canvas.height=1;}}
  }
  root.ShopDeskOutput={image,pdf,encode,credits,annotate};
})(typeof window!=='undefined'?window:globalThis);
