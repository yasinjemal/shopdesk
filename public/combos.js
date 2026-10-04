(function(root){
  'use strict';
  const styles=['combo-board','combo-ticket','combo-fresh'];
  const defaults=()=>Array.from({length:4},(_,i)=>({name:'Combo '+(i+1),price:''}));
  const groupOf=(item,index,count)=>Math.min(count-1,item.combo??index%count);
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
  root.ShopDeskCombos={styles,defaults,groupOf,groups,error};
})(typeof window!=='undefined'?window:globalThis);
