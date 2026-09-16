(function(root){
  'use strict';
  const encode=(canvas,type,quality)=>new Promise(resolve=>canvas.toBlob(resolve,type,quality));
  async function prepare(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP photo.');
    if(file.size>15000000)throw new Error('Choose a photo smaller than 15 MB.');
    const url=URL.createObjectURL(file),source=new Image(),canvas=document.createElement('canvas');
    try{
      source.src=url;await source.decode();
      if(source.naturalWidth*source.naturalHeight>60000000)throw new Error('This photo is too large. Choose a smaller image.');
      // Keep up to a 4K long edge in storage; only small previews stay decoded.
      // Bound encoded storage without enlarging a small original or flattening PNGs.
      for(const edge of [3840,3200,2560,2048,1600,1200]){
        const ratio=Math.min(1,edge/Math.max(source.naturalWidth,source.naturalHeight));
        canvas.width=Math.max(1,Math.round(source.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(source.naturalHeight*ratio));
        const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not process this photo.');
        ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,canvas.width,canvas.height);
        const type=file.type==='image/jpeg'?'image/jpeg':'image/webp';
        for(const quality of [.94,.86]){const blob=await encode(canvas,type,quality);if(blob&&blob.size<=1500000)return blob;}
      }
      throw new Error('Choose a smaller photo.');
    }finally{source.src='';URL.revokeObjectURL(url);canvas.width=1;canvas.height=1;}
  }
  async function decode(blob,edge){
    const url=URL.createObjectURL(blob),image=new Image();
    try{
      image.src=url;await image.decode();
      const sourceWidth=image.naturalWidth,sourceHeight=image.naturalHeight;
      const ratio=Math.min(1,edge/Math.max(sourceWidth,sourceHeight)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(sourceWidth*ratio));canvas.height=Math.max(1,Math.round(sourceHeight*ratio));
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not load this photo.');
      ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,canvas.width,canvas.height);
      canvas.sourceWidth=sourceWidth;canvas.sourceHeight=sourceHeight;return canvas;
    }finally{image.src='';URL.revokeObjectURL(url);}
  }
  root.ShopDeskPhotos={prepare,decode};
})(typeof window!=='undefined'?window:globalThis);
