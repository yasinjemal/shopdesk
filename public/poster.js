(function(root) {
  'use strict';
  const themes={green:['#103e35','#c6f39b','#f7f9ef'],blue:['#182c5c','#cbe6ff','#f3f7ff'],orange:['#763714','#ffe29c','#fff8ec']};
  const money=n=>'R'+Number(n).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
  function fit(ctx,text,x,y,width,size,color,weight=700){
    ctx.fillStyle=color;ctx.textAlign='left';let actual=size;ctx.font=`${weight} ${actual}px "DM Sans", sans-serif`;
    while(ctx.measureText(text).width>width&&actual>18){actual--;ctx.font=`${weight} ${actual}px "DM Sans", sans-serif`;}
    ctx.fillText(text,x,y,width);return actual;
  }
  function contain(ctx,image,x,y,width,height){
    const scale=Math.min(width/(image.naturalWidth||image.width),height/(image.naturalHeight||image.height));
    const w=(image.naturalWidth||image.width)*scale,h=(image.naturalHeight||image.height)*scale;
    ctx.fillStyle='#ffffff';ctx.fillRect(x,y,width,height);ctx.drawImage(image,x+(width-w)/2,y+(height-h)/2,w,h);
  }
  function geometry(format,count){
    const status=format==='status',height=status?1920:1350,top=status?360:285,bottom=height-(status?300:220),gap=22;
    const cardHeight=(bottom-top-gap*(count-1))/count;
    return {height,top,bottom,cardHeight,cards:Array.from({length:count},(_,i)=>({x:60,y:top+i*(cardHeight+gap),w:960,h:cardHeight})),footerY:bottom+64,status};
  }
  function draw(canvas,data,images=new Map()){
    const layout=geometry(data.format,data.items.length);canvas.width=1080;canvas.height=layout.height;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser cannot create this poster.');
    const [bg,accent,paper]=themes[data.theme]||themes.green;
    ctx.fillStyle=bg;ctx.fillRect(0,0,1080,layout.height);
    ctx.fillStyle=accent;ctx.fillRect(60,layout.status?116:40,70,6);
    const header=layout.status?190:112;
    fit(ctx,data.shop||'Your shop',60,header,960,44,accent,600);
    fit(ctx,data.headline||'Your special offers',60,header+96,960,64,'#ffffff',800);
    data.items.forEach((item,index)=>{
      const card=layout.cards[index],image=item.photo?images.get(item.photo):null;
      ctx.fillStyle=paper;ctx.fillRect(card.x,card.y,card.w,card.h);
      let x=card.x+38,width=card.w-76;
      if(image){
        const side=data.items.length===1?Math.min(410,card.h-80):Math.min(260,card.h-48);
        contain(ctx,image,card.x+24,card.y+(card.h-side)/2,side,side);x=card.x+side+56;width=card.w-side-90;
      }
      const spacious=card.h>420;
      const nameY=card.y+(spacious?card.h*.29:67);
      fit(ctx,item.name||'Product name',x,nameY,width,spacious?64:49,bg,700);
      if(item.size)fit(ctx,item.size,x,nameY+(spacious?59:44),width,spacious?38:31,bg,400);
      const price=(item.price!==''&&Number.isFinite(Number(item.price))&&Number(item.price)>0)?money(item.price):'R —';
      const priceY=spacious?card.y+card.h*.7:card.y+card.h-40;
      fit(ctx,price,x,priceY,width,spacious?138:Math.min(112,card.h*.38),bg,800);
      if(spacious)fit(ctx,'EACH',x,priceY+50,width,25,bg,600);
    });
    const y=layout.footerY;
    fit(ctx,'Valid until '+(data.dateText||'your selected date'),60,y,960,30,'#ffffff',500);
    const contact=[data.location,data.phone].filter(Boolean).join('  •  ');
    if(contact)fit(ctx,contact,60,y+56,960,32,accent,500);
    fit(ctx,'While stocks last.',60,y+109,600,24,'#ffffff',400);
    fit(ctx,'ShopDesk',870,y+109,150,22,accent,600);
    return layout;
  }
  root.ShopDeskPoster={draw,geometry};
})(typeof window!=='undefined'?window:globalThis);
