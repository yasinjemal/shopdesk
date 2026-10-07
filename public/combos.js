(function(root){
  'use strict';
  const styles=['combo-board','combo-ticket','combo-fresh','combo-circular','combo-receipt'];
  const defaults=()=>Array.from({length:4},(_,i)=>({name:'Combo '+(i+1),price:''}));
  const groupOf=(item,index,count)=>Math.min(count-1,item.combo??index%count);
  const blank=item=>!item.name?.trim()&&!item.size?.trim()&&!item.price&&!item.photo;
  function pinned(data){return data.items.map((item,i)=>({...root.ShopDeskItems.copy(item),combo:groupOf(item,i,data.combos.length)}));}
  function add(data,index,incoming){
    if(!data.combos?.[index])throw new Error('Choose a combo first.');
    const items=pinned(data);let count=Math.min(data.itemCount??items.length,20);
    const slots=items.slice(0,count).map((item,i)=>blank(item)?i:-1).filter(i=>i>=0).sort((a,b)=>Number(items[b].combo===index)-Number(items[a].combo===index));
    const extra=Math.max(0,incoming.length-slots.length);
    if(count+extra>20||items.length+extra>25)throw new Error('Make room for these products first. A page holds 20 products; reserved products are kept too.');
    for(const item of incoming){const value={...root.ShopDeskItems.copy(item),combo:index};delete value.featured;if(slots.length)items[slots.shift()]=value;else{items.splice(count,0,value);count++;}}
    return {...data,items,itemCount:count};
  }
  function duplicate(data,index){
    if(data.combos.length>=6)throw new Error('A page holds up to 6 combos.');
    const source=groups(data)[index];if(!source?.items.length)throw new Error('Add products before copying this combo.');
    const items=pinned(data),count=Math.min(data.itemCount??items.length,20);
    if(count+source.items.length>20||items.length+source.items.length>25)throw new Error('Make room to copy this combo. A page holds 20 products; reserved products are kept too.');
    const combos=data.combos.map(c=>({...c})),next=combos.length;
    combos.push({...combos[index],name:(combos[index].name.slice(0,33)+' (copy)').slice(0,40)});
    items.splice(count,0,...source.items.map(item=>{const copy={...root.ShopDeskItems.copy(item),combo:next};delete copy.featured;return copy;}));
    return {...data,combos,items,itemCount:count+source.items.length};
  }
  function groups(data){
    const definitions=data.combos?.length?data.combos:defaults();
    const items=root.ShopDeskBusiness.visibleItems({...data,purpose:'combos'});
    return definitions.map((combo,index)=>({...combo,index,number:(data.comboOffset||0)+index+1,items:items.map((item,i)=>({...item,sourceIndex:i})).filter((item,i)=>groupOf(item,i,definitions.length)===index)}));
  }
  function error(data){
    if(!Array.isArray(data.items)||data.items.length>25||(data.itemCount??data.items.length)>20)return 'A combo flyer holds up to 20 visible products.';
    if(!Array.isArray(data.combos)||data.combos.length<1||data.combos.length>6)return 'Choose 1 to 6 combos.';
    const active=groups(data).filter(g=>g.items.length);
    if(!active.length)return 'Add a product to your first combo.';
    for(const group of active){
      if(!group.name?.trim())return 'Enter the name for combo '+group.number+'.';
      if(!root.ShopDeskItems.price(group.price))return 'Enter a bundle price above zero for combo '+group.number+'.';
      for(const item of group.items)if(!item.name?.trim())return 'Enter the name for item '+(item.sourceIndex+1)+'.';
    }
    return '';
  }
  root.ShopDeskCombos={styles,defaults,groupOf,groups,error,add,duplicate};
})(typeof window!=='undefined'?window:globalThis);
