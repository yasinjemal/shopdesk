import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/business.js';
import '../public/studio.js';
import '../public/projects.js';
import {validateStudio} from '../worker/index.js';

const draft=()=>({headline:'Weekly rice offers',date:'2030-09-20',startDate:'2030-09-10',theme:'blue',template:'shelf',format:'a4',exportQuality:'4k',typeface:'geometric',priceStyle:'pill',itemCount:1,purpose:'offers',showDate:true,items:[{name:'Rice',size:'2 kg',price:'40',photo:crypto.randomUUID(),photoScale:1.2,photoX:.2,dealQuantity:2,featured:true},{name:'Reserved beans',size:'410 g',price:'15',photo:''}]});
const state=()=>ShopDeskStudio.upgrade({shop:{name:'Market shop',phone:'0721234567',location:'Market Street',logo:crypto.randomUUID()},products:[{id:crypto.randomUUID(),name:'Saved rice',size:'2 kg',price:'50',photo:''}],draft:draft()});
test('project dates distinguish incomplete, current, ending, past and upcoming offers',()=>{
 const shop={name:'Shop'},d=draft(),today='2030-09-17';
 assert.equal(ShopDeskProjects.status(shop,d,today).code,'ending');
 for(const [date,code] of [['2030-09-16','expired'],['2030-09-17','ending'],['2030-09-21','current']])assert.equal(ShopDeskProjects.status(shop,{...d,date},today).code,code);
 assert.equal(ShopDeskProjects.status(shop,{...d,date:'2030-09-25',startDate:'2030-09-19'},today).code,'scheduled');
 assert.equal(ShopDeskProjects.status(shop,{...d,showDate:false,date:'2020-01-01'},today).label,'No end date');
 assert.equal(ShopDeskProjects.status(shop,{...d,items:[{name:'Rice',price:''}]},today).code,'draft');
 assert.equal(ShopDeskProjects.status(shop,{...d,date:'2030-02-31'},today).code,'draft');
 assert.equal(ShopDeskProjects.status(shop,{...d,startDate:'2030-09-21'},today).code,'draft');
 for(const [eventDate,code] of [['2030-09-16','expired'],['2030-09-17','ending'],['2030-09-18','scheduled']])assert.equal(ShopDeskProjects.status(shop,{...d,purpose:'event',items:[],eventDate},today).code,code);
});
test('search respects client and status filters and only searches visible offers',()=>{
 const s=state();s.clients[0].projects[0].title='Weekend specials';
 const second=ShopDeskStudio.addClient(s,'Quiet salon','beauty','offers','Beauty menu');
 const entries=ShopDeskProjects.catalog(second,'2030-09-17');
 assert.equal(entries[0].title,'Beauty menu');assert.equal(entries[0].current,true);
 assert.equal(ShopDeskProjects.filter(entries,{query:'market RICE',status:'ending'}).length,1);
 assert.equal(ShopDeskProjects.filter(entries,{query:'Reserved beans'}).length,0);
 assert.equal(ShopDeskProjects.filter(entries,{query:'rice',client:second.activeClientId}).length,0);
 assert.equal(ShopDeskProjects.filter(entries,{status:'draft'}).length,1);
});
test('new editions preserve original clients, photos, hidden items, saved products and design settings',()=>{
 const s=state(),before=structuredClone(s),c=s.activeClientId,p=s.activeProjectId;
 const next=ShopDeskProjects.renew(s,c,p,{title:'Next weekend',startDate:'2030-09-21',endDate:'2030-09-27'},'2030-09-17');
 assert.deepEqual(s,before);assert.deepEqual(next.clients[0].projects[0],before.clients[0].projects[0]);
 assert.deepEqual(next.clients[0].shop,before.clients[0].shop);assert.deepEqual(next.clients[0].products,before.clients[0].products);
 const edition=ShopDeskStudio.active(next).project;assert.notEqual(edition.id,p);assert.equal(edition.title,'Next weekend');
 assert.deepEqual(edition.draft,{...before.clients[0].projects[0].draft,startDate:'2030-09-21',date:'2030-09-27'});assert.deepEqual(validateStudio(next),next);
 edition.draft.items[0].price='1';assert.equal(next.clients[0].projects[0].draft.items[0].price,'40');
 for(const values of [{title:''},{title:'Bad range',startDate:'2030-09-25',endDate:'2030-09-24'},{title:'Past',startDate:'2030-09-16',endDate:'2030-09-22'}])assert.throws(()=>ShopDeskProjects.renew(s,c,p,values,'2030-09-17'));
});
test('event editions change only their event date and evergreen editions need no dates',()=>{
 for(const purpose of ['event','opening','offers']){
  const s=state(),d=ShopDeskStudio.active(s).project.draft;Object.assign(d,{purpose,showDate:false,eventDate:'2020-01-01',eventTime:'10 am',venue:'Our shop'});
  const before=structuredClone(d),next=ShopDeskProjects.renew(s,s.activeClientId,s.activeProjectId,{title:'Next edition',eventDate:'2030-09-25'},'2030-09-17');
  assert.deepEqual(ShopDeskStudio.active(next).project.draft,purpose==='offers'?before:{...before,eventDate:'2030-09-25'});
 }
 const s=state();while(s.clients[0].projects.length<100)s.clients[0].projects.push({...structuredClone(s.clients[0].projects[0]),id:crypto.randomUUID()});
 assert.throws(()=>ShopDeskProjects.renew(s,s.activeClientId,s.activeProjectId,{title:'Full',startDate:'2030-09-17',endDate:'2030-09-23'},'2030-09-17'),/100 saved projects/);
 const entry=ShopDeskProjects.catalog(state())[0];assert.equal(ShopDeskProjects.defaults(entry,'2030-12-29').endDate,'2031-01-04');
});
