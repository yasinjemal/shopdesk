(function(root) {
  'use strict';
  const themes={green:['#103e35','#c6f39b','#f7f9ef'],blue:['#182c5c','#cbe6ff','#f3f7ff'],orange:['#763714','#ffe29c','#fff8ec'],red:['#c91424','#ffe232','#ffffff']};
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
    if(data.template==='retail')return drawRetail(canvas,data,images);
    const layout=geometry(data.format,data.items.length);canvas.width=1080;canvas.height=layout.height;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser cannot create this poster.');
    const [bg,accent,paper]=themes[data.theme]||themes.green;
    ctx.fillStyle=bg;ctx.fillRect(0,0,1080,layout.height);
    ctx.fillStyle=accent;ctx.fillRect(60,layout.status?116:40,70,6);
    const header=layout.status?190:112;
    const logo=data.logo?images.get(data.logo):null;
    if(logo){contain(ctx,logo,60,header-65,120,90);fit(ctx,data.shop||'Your shop',205,header,815,44,accent,600);}
    else fit(ctx,data.shop||'Your shop',60,header,960,44,accent,600);
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
  function retailGeometry(format,count){
    if(!Number.isInteger(count)||count<1||count>12)throw new Error('Retail flyers need 1 to 12 products.');
    const status=format==='status',height=status?1920:1350,columns=count<=3?1:count<=6?2:3,rows=Math.ceil(count/columns);
    const top=status?410:310,bottom=height-(status?300:180),gap=20,w=(1000-gap*(columns-1))/columns,h=(bottom-top-gap*(rows-1))/rows;
    return {height,status,top,bottom,columns,rows,cards:Array.from({length:count},(_,i)=>({x:40+(i%columns)*(w+gap),y:top+Math.floor(i/columns)*(h+gap),w,h})),footerY:bottom+36};
  }
  function lines(ctx,text,width,size,maxLines=2){
    let font=size,result=[];
    while(font>=18){ctx.font=`700 ${font}px "DM Sans", sans-serif`;let line='';result=[];for(const word of text.split(/\s+/)){const trial=line?line+' '+word:word;if(line&&ctx.measureText(trial).width>width){result.push(line);line=word;}else line=trial;}if(line)result.push(line);if(result.length<=maxLines&&result.every(l=>ctx.measureText(l).width<=width))break;font--;}
    return {lines:result.slice(0,maxLines),font:Math.max(18,font)};
  }
  function drawPrice(ctx,value,x,y,width,height){
    ctx.fillStyle='#ffe132';ctx.fillRect(x,y,width,height);
    const cents=value!==''&&Number.isFinite(Number(value))&&Number(value)>0?Math.round(Number(value)*100):null;
    if(cents===null){fit(ctx,'R —',x+12,y+height*.8,width-24,height*.75,'#111111',800);return;}
    const main='R'+Math.floor(cents/100).toLocaleString('en-ZA'),fraction=String(cents%100).padStart(2,'0');let size=Math.min(height*.86,width*.31);
    function measure(){ctx.font=`800 ${size}px "DM Sans", sans-serif`;const a=ctx.measureText(main).width;ctx.font=`800 ${size*.48}px "DM Sans", sans-serif`;return {a,b:ctx.measureText(fraction).width};}
    let m=measure();while(m.a+m.b+8>width-22&&size>16){size--;m=measure();}
    const left=x+(width-m.a-m.b-6)/2,baseline=y+(height+size*.72)/2;
    fit(ctx,main,left,baseline,m.a+2,size,'#111111',800);fit(ctx,fraction,left+m.a+5,baseline-size*.43,m.b+2,size*.48,'#111111',800);
  }
  function drawRetail(canvas,data,images){
    const layout=retailGeometry(data.format,data.items.length);canvas.width=1080;canvas.height=layout.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser cannot create this flyer.');
    const brand={red:'#cc1726',green:'#105940',blue:'#17386e',orange:'#b84912'}[data.theme]||'#cc1726';const dark='#15231d';
    ctx.fillStyle='#fff';ctx.fillRect(0,0,1080,layout.height);
    const top=layout.status?125:22,logo=data.logo?images.get(data.logo):null;
    if(logo){contain(ctx,logo,40,top,122,68);fit(ctx,data.shop||'Your shop',183,top+46,853,43,dark,800);}
    else fit(ctx,data.shop||'Your shop',40,top+49,1000,44,dark,800);
    const bannerY=top+89,bannerH=126;ctx.fillStyle=brand;ctx.fillRect(0,bannerY,1080,bannerH);ctx.fillStyle='#ffe132';ctx.fillRect(0,bannerY+bannerH-9,1080,9);
    fit(ctx,'SHOP SPECIALS',40,bannerY+30,1000,19,'#ffffff',700);
    fit(ctx,data.headline||'Everyday essentials. Great prices.',40,bannerY+91,1000,60,'#ffffff',800);
    fit(ctx,'Offers valid until '+(data.dateText||'your selected date'),40,bannerY+164,1000,25,dark,600);
    for(const [index,item] of data.items.entries()){
      const c=layout.cards[index],image=item.photo?images.get(item.photo):null;
      if(image&&c.w/c.h>1.1){
        const imageWidth=c.w*.49,labelX=c.x+imageWidth+12,labelW=c.w-imageWidth-12;
        contain(ctx,image,c.x+4,c.y+4,imageWidth-12,c.h-8);
        const priceH=Math.min(105,Math.max(55,c.h*.27)),packH=Math.min(35,Math.max(23,c.h*.09)),priceY=c.y+c.h-priceH,packY=priceY-packH;
        const name=lines(ctx,item.name||'Product name',labelW-8,Math.min(38,Math.max(21,labelW*.115)),3);
        const textY=Math.max(c.y+name.font,packY-15-(name.lines.length-1)*(name.font+4));
        for(const [j,line] of name.lines.entries())fit(ctx,line,labelX+4,textY+j*(name.font+4),labelW-8,name.font,dark,700);
        ctx.fillStyle=brand;ctx.fillRect(labelX,packY,labelW,packH);fit(ctx,item.size||'Each',labelX+8,packY+packH*.75,labelW-16,packH*.65,'#ffffff',700);
        drawPrice(ctx,item.price,labelX,priceY,labelW,priceH);
        continue;
      }
      const priceH=Math.min(105,Math.max(43,c.h*.2)),sizeH=Math.min(35,Math.max(21,c.h*.085)),nameSize=Math.min(34,Math.max(21,c.h*.085));
      const nameBlock=lines(ctx,item.name||'Product name',c.w-12,nameSize,2),nameH=nameBlock.lines.length*(nameBlock.font+3);
      const priceY=c.y+c.h-priceH,sizeY=priceY-sizeH,nameY=sizeY-nameH-9,imageBottom=nameY-10;
      if(image){
        contain(ctx,image,c.x+10,c.y+7,c.w-20,Math.max(20,imageBottom-c.y-14));
        for(const [j,line] of nameBlock.lines.entries())fit(ctx,line,c.x+6,nameY+(j+1)*(nameBlock.font+3)-3,c.w-12,nameBlock.font,dark,700);
      }
      else{
        ctx.fillStyle='#f7f7f1';ctx.fillRect(c.x,c.y,c.w,sizeY-c.y);
        const title=lines(ctx,item.name||'Product name',c.w-36,Math.min(55,c.w*.13,(sizeY-c.y)*.23),3);let ty=c.y+(sizeY-c.y-title.lines.length*(title.font+8))/2+title.font;
        for(const line of title.lines){fit(ctx,line,c.x+18,ty,c.w-36,title.font,brand,800);ty+=title.font+8;}
      }
      ctx.fillStyle=brand;ctx.fillRect(c.x,sizeY,c.w,sizeH);fit(ctx,item.size||'Each',c.x+10,sizeY+sizeH*.75,c.w-20,sizeH*.67,'#ffffff',700);
      drawPrice(ctx,item.price,c.x,priceY,c.w,priceH);
    }
    const fy=layout.footerY;ctx.fillStyle=brand;ctx.fillRect(0,fy-17,1080,layout.status?74:58);
    fit(ctx,data.location||'Visit us in store',40,fy+(layout.status?24:17),1000,layout.status?36:30,'#ffffff',700);
    if(data.phone)fit(ctx,'Contact us: '+data.phone,40,fy+(layout.status?102:80),780,28,dark,600);
    else fit(ctx,'While stocks last.',40,fy+(layout.status?102:80),780,24,'#56615b',400);
    fit(ctx,'ShopDesk',876,fy+(layout.status?102:80),165,22,'#657069',600);
    if(data.phone)fit(ctx,'While stocks last.',40,fy+(layout.status?140:113),780,18,'#657069',400);
    return layout;
  }
  root.ShopDeskPoster={draw,geometry,retailGeometry};
})(typeof window!=='undefined'?window:globalThis);
