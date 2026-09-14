(function(root) {
  'use strict';
  const themes={green:['#103e35','#c6f39b','#f7f9ef'],blue:['#182c5c','#cbe6ff','#f3f7ff'],orange:['#763714','#ffe29c','#fff8ec'],red:['#c91424','#ffe232','#ffffff']};
  const money=n=>'R'+Number(n).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
  const cropCache=new WeakMap();
  let trimPhotos=false;
  function contentBounds(pixels){
    const {data,width,height}=pixels;
    const white=(x,y)=>{const i=(y*width+x)*4;return data[i+3]<12||(data[i]>244&&data[i+1]>244&&data[i+2]>244);};
    let border=0,clear=0;
    for(let x=0;x<width;x++){border+=2;clear+=Number(white(x,0))+Number(white(x,height-1));}
    for(let y=1;y<height-1;y++){border+=2;clear+=Number(white(0,y))+Number(white(width-1,y));}
    if(clear/border<.97)return null;
    let left=width,top=height,right=-1,bottom=-1,found=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(!white(x,y)){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);found++;}
    if(found<20||right<left||bottom<top)return null;
    const padding=Math.max(3,Math.ceil(Math.max(right-left,bottom-top)*.05));
    left=Math.max(0,left-padding);top=Math.max(0,top-padding);right=Math.min(width,right+padding+1);bottom=Math.min(height,bottom+padding+1);
    return {x:left/width,y:top/height,w:(right-left)/width,h:(bottom-top)/height};
  }
  function imageBounds(image){
    if(cropCache.has(image))return cropCache.get(image);
    let bounds=null;
    try{
      const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height,ratio=Math.min(1,400/Math.max(w,h));
      const canvas=typeof document!=='undefined'?document.createElement('canvas'):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1,1):null;
      if(canvas){canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);bounds=contentBounds(ctx.getImageData(0,0,canvas.width,canvas.height));}
    }catch{/* Keep the complete image if its border cannot be measured. */}
    cropCache.set(image,bounds);return bounds;
  }
  function packDetails(name,size){
    const weight=/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)\b/i;
    const pack=size.trim().match(weight);
    const prefix=name.trim().match(weight),suffix=name.trim().match(/\b(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)$/i);
    const label=prefix||suffix;
    if(!pack||!label)return null;
    const amount=m=>Number(m[1].replace(',','.'))*(['kg','l'].includes(m[2].toLowerCase())?1000:1);
    const type=m=>['kg','g'].includes(m[2].toLowerCase())?'mass':'volume';
    return {match:type(pack)===type(label)&&amount(pack)===amount(label),label:label[0],prefix:!!prefix};
  }
  function displayName(name,size){
    const info=packDetails(name,size);if(!info?.match)return name;
    const clean=(info.prefix?name.trim().slice(info.label.length):name.trim().slice(0,-info.label.length)).replace(/^[\s·—-]+|[\s·—-]+$/g,'');
    return clean||name;
  }
  function packWarning(name,size){const info=packDetails(name,size);return info&&!info.match?'The name says '+info.label+' but the pack label says '+size+'. Check both amounts.':'';}
  function fit(ctx,text,x,y,width,size,color,weight=700){
    ctx.fillStyle=color;ctx.textAlign='left';let actual=size;ctx.font=`${weight} ${actual}px "DM Sans", sans-serif`;
    while(ctx.measureText(text).width>width&&actual>18){actual--;ctx.font=`${weight} ${actual}px "DM Sans", sans-serif`;}
    ctx.fillText(text,x,y,width);return actual;
  }
  function contain(ctx,image,x,y,width,height){
    const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,b=trimPhotos?imageBounds(image):null;
    const sx=b?b.x*iw:0,sy=b?b.y*ih:0,sw=b?b.w*iw:iw,sh=b?b.h*ih:ih,scale=Math.min(width/sw,height/sh),w=sw*scale,h=sh*scale;
    ctx.fillStyle='#ffffff';ctx.fillRect(x,y,width,height);ctx.drawImage(image,sx,sy,sw,sh,x+(width-w)/2,y+(height-h)/2,w,h);
  }
  function geometry(format,count){
    const status=format==='status',height=status?1920:1350,top=status?360:285,bottom=height-(status?300:220),gap=22;
    const cardHeight=(bottom-top-gap*(count-1))/count;
    return {height,top,bottom,cardHeight,cards:Array.from({length:count},(_,i)=>({x:60,y:top+i*(cardHeight+gap),w:960,h:cardHeight})),footerY:bottom+64,status};
  }
  function draw(canvas,data,images=new Map()){
    trimPhotos=!!data.trimPhotos;
    if(data.cleanNames)data={...data,items:data.items.map(i=>({...i,name:displayName(i.name,i.size)}))};
    if(['bold','market'].includes(data.template))return drawDesigned(canvas,data,images);
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
    fit(ctx,data.packPage?'ShopDesk · '+data.packPage.index+' / '+data.packPage.total:'ShopDesk',data.packPage?735:870,y+109,data.packPage?285:150,22,accent,600);
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
    if(result.length>maxLines)result=[...result.slice(0,maxLines-1),result.slice(maxLines-1).join(' ')];
    return {lines:result,font:Math.max(18,font)};
  }
  function drawPrice(ctx,value,x,y,width,height,background='#ffe132',ink='#111111'){
    if(background){ctx.fillStyle=background;ctx.fillRect(x,y,width,height);}
    const cents=value!==''&&Number.isFinite(Number(value))&&Number(value)>0?Math.round(Number(value)*100):null;
    if(cents===null){fit(ctx,'R —',x+12,y+height*.8,width-24,height*.75,ink,800);return;}
    const main='R'+Math.floor(cents/100).toLocaleString('en-ZA'),fraction=String(cents%100).padStart(2,'0');let size=Math.min(height*.86,width*.31);
    function measure(){ctx.font=`800 ${size}px "DM Sans", sans-serif`;const a=ctx.measureText(main).width;ctx.font=`800 ${size*.48}px "DM Sans", sans-serif`;return {a,b:ctx.measureText(fraction).width};}
    let m=measure();while(m.a+m.b+8>width-22&&size>16){size--;m=measure();}
    const left=x+(width-m.a-m.b-6)/2,baseline=y+(height+size*.72)/2;
    fit(ctx,main,left,baseline,m.a+2,size,ink,800);fit(ctx,fraction,left+m.a+5,baseline-size*.43,m.b+2,size*.48,ink,800);
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
    fit(ctx,data.packPage?'ShopDesk · '+data.packPage.index+' / '+data.packPage.total:'ShopDesk',data.packPage?765:876,fy+(layout.status?102:80),data.packPage?275:165,22,'#657069',600);
    if(data.phone)fit(ctx,'While stocks last.',40,fy+(layout.status?140:113),780,18,'#657069',400);
    return layout;
  }
  function designedGeometry(template,format,count){
    if(!Number.isInteger(count)||count<1||count>12)throw new Error('Flyers need 1 to 12 products.');
    const status=format==='status',height=status?1920:1350,columns=count<=3?1:count<=6?2:3,rows=Math.ceil(count/columns),gap=18;
    const top=(template==='bold'?370:340)+(status?100:0),bottom=height-(status?290:190),w=(1000-gap*(columns-1))/columns,h=(bottom-top-gap*(rows-1))/rows;
    return {height,status,columns,rows,top,bottom,footerY:bottom+24,cards:Array.from({length:count},(_,i)=>({x:40+(i%columns)*(w+gap),y:top+Math.floor(i/columns)*(h+gap),w,h}))};
  }
  function roundBox(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
  function nameLines(ctx,text,x,bottom,width,maxSize,height,maxLines=3,color='#172923'){
    let block=lines(ctx,text,width,maxSize,maxLines);
    while(block.lines.length*(block.font+4)>height&&block.font>18)block=lines(ctx,text,width,block.font-1,maxLines);
    const step=Math.min(block.font+4,height/block.lines.length);
    for(const [i,line] of block.lines.entries())fit(ctx,line,x,bottom-(block.lines.length-i-1)*step,width,block.font,color,700);
  }
  function drawDesigned(canvas,data,images){
    const layout=designedGeometry(data.template,data.format,data.items.length),bold=data.template==='bold';
    canvas.width=1080;canvas.height=layout.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser cannot create this flyer.');
    const brand={red:'#c91328',green:'#10563e',blue:'#163b70',orange:'#a83c12'}[data.theme]||(bold?'#c91328':'#10563e'),ink='#15271e',accent=bold?'#ffe134':'#d4f1bc';
    ctx.fillStyle=bold?'#f3f4f1':'#ffffff';ctx.fillRect(0,0,1080,layout.height);
    const offset=layout.status?100:0,logo=data.logo?images.get(data.logo):null;
    ctx.fillStyle='#fff';ctx.fillRect(0,0,1080,bold?106+offset:layout.top-14);
    if(logo){contain(ctx,logo,40,24+offset,122,70);fit(ctx,data.shop||'Your shop',184,71+offset,856,43,ink,800);}
    else fit(ctx,data.shop||'Your shop',40,71+offset,1000,46,ink,800);
    if(bold){
      const by=106+offset;ctx.fillStyle=brand;ctx.fillRect(0,by,1080,196);
      ctx.fillStyle='#00000016';ctx.beginPath();ctx.moveTo(875,by);ctx.lineTo(1080,by);ctx.lineTo(1080,by+196);ctx.lineTo(785,by+196);ctx.closePath();ctx.fill();
      fit(ctx,'SHOP SPECIALS',40,by+31,1000,20,'#ffffff',700);
      const headline=lines(ctx,data.headline||'Everyday essentials. Great prices.',1000,68,2);
      const baseline=headline.lines.length===1?by+125:by+94;
      for(const [i,line] of headline.lines.entries())fit(ctx,line,40,baseline+i*72,1000,headline.font,'#ffffff',800);
      ctx.fillStyle=accent;ctx.fillRect(0,by+188,1080,8);
      fit(ctx,'Offers valid until '+(data.dateText||'your selected date'),40,338+offset,1000,25,ink,600);
    }else{
      ctx.fillStyle=brand;ctx.fillRect(40,109+offset,1000,3);fit(ctx,'YOUR SHOP SPECIALS',40,145+offset,1000,20,brand,700);
      const headline=lines(ctx,data.headline||'Fresh finds. Everyday value.',970,64,2),baseline=headline.lines.length===1?228+offset:211+offset;
      for(const [i,line] of headline.lines.entries())fit(ctx,line,40,baseline+i*64,970,headline.font,brand,800);
      fit(ctx,'Offers valid until '+(data.dateText||'your selected date'),40,310+offset,1000,25,ink,500);
    }
    for(const [index,item] of data.items.entries()){
      const c=layout.cards[index],photo=item.photo?images.get(item.photo):null,pad=12,innerW=c.w-pad*2,innerH=c.h-pad*2;
      roundBox(ctx,c.x,c.y,c.w,c.h,bold?8:12,'#ffffff',bold?'#e3e6df':'#dce5df');
      const horizontal=c.w/c.h>1.1,priceH=Math.min(125,Math.max(52,innerH*.3)),packH=Math.min(34,Math.max(23,innerH*.10));
      let labelX=c.x+pad,labelW=innerW;
      if(horizontal){
        const photoW=innerW*.50;labelX=c.x+pad+photoW+8;labelW=innerW-photoW-8;
        if(photo)contain(ctx,photo,c.x+pad,c.y+pad,photoW-7,innerH);
        else nameLines(ctx,item.name||'Product name',c.x+pad+5,c.y+c.h*.54,photoW-14,Math.min(48,photoW*.15),innerH*.7,3,brand);
      }
      const priceY=c.y+c.h-pad-priceH,packY=priceY-packH,nameBottom=packY-12;
      if(horizontal&&photo){nameLines(ctx,item.name||'Product name',labelX+3,nameBottom,labelW-6,Math.min(42,Math.max(21,labelW*.12)),nameBottom-(c.y+pad),3,ink);}
      if(!horizontal){
        const title=lines(ctx,item.name||'Product name',innerW-4,Math.min(30,Math.max(22,innerW*.08)),2),nameH=title.lines.length*(title.font+4),photoBottom=nameBottom-nameH-10;
        if(photo){contain(ctx,photo,c.x+pad,c.y+pad,innerW,Math.max(24,photoBottom-c.y-pad));nameLines(ctx,item.name||'Product name',c.x+pad+2,nameBottom,innerW-4,title.font,nameH,2,ink);}
        else nameLines(ctx,item.name||'Product name',c.x+pad+8,c.y+pad+(packY-c.y-pad)*.64,innerW-16,Math.min(54,innerW*.15),(packY-c.y-pad)*.8,3,brand);
      }
      roundBox(ctx,labelX,packY,labelW,packH,bold?0:5,bold?brand:'#edf5ee');
      fit(ctx,item.size||'Each',labelX+8,packY+packH*.75,labelW-16,Math.min(23,packH*.68),bold?'#ffffff':brand,700);
      drawPrice(ctx,item.price,labelX,priceY,labelW,priceH,bold?accent:null,bold?'#151515':brand);
    }
    const fy=layout.footerY;
    if(bold){ctx.fillStyle=brand;ctx.fillRect(0,fy,1080,104);}else{ctx.fillStyle=brand;ctx.fillRect(40,fy,1000,3);}
    fit(ctx,data.location||'Visit us in store',40,fy+39,1000,34,bold?'#ffffff':brand,700);
    fit(ctx,data.phone?'Contact us: '+data.phone:'Ask in store about these offers',40,fy+80,1000,28,bold?'#ffffff':ink,500);
    fit(ctx,'While stocks last.',40,fy+138,680,21,'#62736a',400);fit(ctx,data.packPage?'ShopDesk · '+data.packPage.index+' / '+data.packPage.total:'ShopDesk',data.packPage?765:881,fy+138,data.packPage?275:159,21,'#62736a',600);
    return layout;
  }
  root.ShopDeskPoster={draw,geometry,retailGeometry,designedGeometry,contentBounds,displayName,packWarning};
})(typeof window!=='undefined'?window:globalThis);
