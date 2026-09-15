(function(root){
  'use strict';
  const optional=['photoScale','photoX','photoY','featured'];
  function copy(item,includeFeature=true){
    const next={name:item.name||'',size:item.size||'',price:item.price??'',photo:item.photo||''};
    for(const key of optional)if(item[key]!==undefined&&(includeFeature||key!=='featured'))next[key]=item[key];
    return next;
  }
  function price(value){
    let s=String(value).trim().replace(/^R\s*/i,'').replace(/\s+/g,'');
    if(/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s))s=s.replaceAll(',','');
    else if(/^\d+,\d{1,2}$/.test(s))s=s.replace(',','.');
    if(!/^\d+(\.\d{1,2})?$/.test(s)||Number(s)<=0||Number(s)>1000000)return '';
    return Number(s).toFixed(2);
  }
  function split(line,delimiter){
    const cells=[];let value='',quoted=false;
    for(let i=0;i<line.length;i++){
      const char=line[i];
      if(char==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
      else if(char===delimiter&&!quoted){cells.push(value.trim());value='';}else value+=char;
    }
    cells.push(value.trim());return {cells,quoted};
  }
  function parse(source){
    const lines=String(source).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    if(!lines.length)throw new Error('Paste at least one product or service.');
    if(lines.length>100)throw new Error('Paste up to 100 lines to review. A flyer holds up to 25 items.');
    const rows=[];
    for(const [index,line] of lines.entries()){
      const delimiter=line.includes('\t')?'\t':line.includes('|')?'|':line.includes(';')?';':',';
      const result=split(line,delimiter),cells=result.cells;
      if(index===0&&/^(product|item|service|name|product name)$/i.test(cells[0])&&/^price(?:\s*\(r\))?$/i.test(cells.at(-1)))continue;
      let row={name:'',size:'',price:'',photo:'',source:line};
      if((cells.length===2||cells.length===3)&&!result.quoted&&!/(?:^|\s)R\s*\d/i.test(cells.slice(0,-1).join(' '))){
        row.name=cells[0];row.size=cells.length===3?cells[1]:'';row.price=price(cells.at(-1));
      }else{
        // Without columns, require R before the price: a pack weight must not become a price.
        const match=line.match(/^(.*?)(?:\s+|[,;|])R\s*([\d][\d\s,.]*)$/i);
        if(match){
          row.name=match[1].trim().replace(/[;,|]\s*$/,'');row.price=price(match[2]);
          const prefix=split(row.name,delimiter).cells;if(prefix.length===2){row.name=prefix[0];row.size=prefix[1];}
          const pack=row.size?null:row.name.match(/(?:^|\s)(\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|min|mins|minutes|hour|hours))$/i);
          if(pack){row.size=pack[1];row.name=row.name.slice(0,-pack[0].length).trim();}
        }else row.name=line;
      }
      if(result.quoted){row.name=line;row.price='';}
      rows.push(row);
    }
    if(!rows.length)throw new Error('Paste your products below the column headings.');
    return rows;
  }
  function error(item){
    if(!item.name.trim())return 'Enter a name.';
    if(item.name.length>50)return 'Shorten the name to 50 characters.';
    if(item.size.length>25)return 'Shorten the pack or details to 25 characters.';
    if(!price(item.price))return 'Enter a price above R0, up to R1,000,000, with at most two decimal places.';
    return '';
  }
  const blank=item=>!item.name.trim()&&!item.size.trim()&&!item.price&&!item.photo;
  function room(items,count,limit=25){
    const visible=Math.min(count,limit),empty=items.slice(0,visible).filter(blank).length;
    const hiddenEmpty=items.slice(visible).filter(blank).length;
    return empty+Math.max(0,Math.min(limit-visible,25-items.length+hiddenEmpty));
  }
  function insert(items,count,incoming,limit=25){
    if(!incoming.length)throw new Error('Choose at least one item.');
    const spaces=room(items,count,limit);
    if(incoming.length>spaces)throw new Error('There '+(spaces===1?'is 1 space':'are '+spaces+' spaces')+' available. Remove some selections or clear existing items first. Extra items kept in this project also use space.');
    incoming.forEach((item,i)=>{const message=error(item);if(message)throw new Error('Item '+(i+1)+': '+message);});
    const next=items.map(item=>copy(item));let visible=Math.min(count,limit);
    for(const item of incoming){
      const value=copy(item,false);value.price=price(value.price);
      const index=next.slice(0,visible).findIndex(blank);
      if(index>=0)next[index]={...value,...(next[index].featured?{featured:true}:{})};
      else{const reserved=next.findIndex((item,i)=>i>=visible&&blank(item));if(reserved>=0){if(next[reserved].featured)value.featured=true;next.splice(reserved,1);}next.splice(visible,0,value);visible++;}
    }
    return {items:next,itemCount:visible};
  }
  root.ShopDeskItems={copy,price,parse,error,room,insert};
})(typeof window!=='undefined'?window:globalThis);
