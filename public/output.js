(function(root){
  'use strict';
  const encode=(canvas,type='image/png',quality)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('This image could not be created. Try Standard quality or fewer photos.')),type,quality));
  async function printDensity(blob){
    const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),chunk=new Uint8Array(21),cv=new DataView(chunk.buffer);
    cv.setUint32(0,9);chunk.set([112,72,89,115],4);cv.setUint32(8,11811);cv.setUint32(12,11811);chunk[16]=1;
    let crc=0xffffffff;for(const byte of chunk.slice(4,17)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}cv.setUint32(17,(crc^0xffffffff)>>>0);
    const parts=[bytes.slice(0,33),chunk];
    for(let pos=33;pos<bytes.length;){const end=pos+12+view.getUint32(pos);if(!(bytes[pos+4]===112&&bytes[pos+5]===72&&bytes[pos+6]===89&&bytes[pos+7]===115))parts.push(bytes.slice(pos,end));pos=end;}
    return new Blob(parts,{type:'image/png'});
  }
  // One RGB image per page, with physical paper dimensions. Text is redrawn at
  // 300 dpi before embedding; this is a print image, not a screen screenshot.
  async function pdf(canvas,format){
    const paper=root.ShopDeskPoster.formats[format]?.mm;
    if(!paper)throw new Error('Choose A4 or A5 for a print PDF.');
    const jpeg=new Uint8Array(await (await encode(canvas,'image/jpeg',.97)).arrayBuffer());
    const pt=paper.map(mm=>(mm*72/25.4).toFixed(4)),encoder=new TextEncoder(),parts=[],offsets=[0];let length=0;
    const add=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;parts.push(bytes);length+=bytes.length;};
    const object=(id,body)=>{offsets[id]=length;add(id+' 0 obj\n'+body+'\nendobj\n');};
    add('%PDF-1.4\n%ShopDesk\n');
    object(1,'<< /Type /Catalog /Pages 2 0 R >>');
    object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pt.join(' ')+'] /Resources << /XObject << /Photo 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4]=length;add('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');add(jpeg);add('\nendstream\nendobj\n');
    const commands='q\n'+pt[0]+' 0 0 '+pt[1]+' 0 0 cm\n/Photo Do\nQ\n';
    object(5,'<< /Length '+encoder.encode(commands).length+' >>\nstream\n'+commands+'endstream');
    const xref=length;add('xref\n0 6\n0000000000 65535 f \n');
    for(let id=1;id<=5;id++)add(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
    add('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
    return new Blob(parts,{type:'application/pdf'});
  }
  async function image(data,images,type='png'){
    const canvas=document.createElement('canvas'),size=root.ShopDeskPoster.outputSize(data.format,data.exportQuality);
    try{
      root.ShopDeskPoster.draw(canvas,data,images,{width:size.width,height:size.height,printMargin:!!size.mm});
      if(type==='pdf')return await pdf(canvas,data.format);
      const blob=await encode(canvas);return size.mm?await printDensity(blob):blob;
    }finally{canvas.width=1;canvas.height=1;}
  }
  root.ShopDeskOutput={image,pdf,encode};
})(typeof window!=='undefined'?window:globalThis);
