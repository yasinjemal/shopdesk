(function(root){
  'use strict';
  const DEMO_KEY='shopdesk.demo.studio.v1',DB_NAME='shopdesk-demo-photos',STORE='photos',MAX_PHOTO=1500000,MAX_PHOTOS=250;
  const REMOTE_MISSING=['api_unavailable','storage_not_configured'];
  const fail=(message,status,code)=>Object.assign(new Error(message),{status,code});

  /** Talks to the ShopDesk API (Cloudflare Worker or Vercel functions). Always expects JSON and says so when it does not get it. */
  const remote={
    name:'remote',
    async request(path,options={}){
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
      try{
        const response=await fetch(path,{...options,credentials:'same-origin',signal:controller.signal});
        const type=response.headers.get('content-type')||'';
        if(!type.includes('application/json'))throw fail('ShopDesk’s saving service is not available on this site (status '+response.status+').',response.status,'api_unavailable');
        let data;try{data=await response.json();}catch{throw fail('ShopDesk’s saving service returned an unreadable answer.',response.status,'api_unavailable');}
        if(!response.ok)throw fail(data.error||'Please try again.',response.status,data.code);
        return data;
      }catch(e){if(e.name==='AbortError')throw fail('The connection took too long. Your edits are still here; try again.');throw e;}
      finally{clearTimeout(timeout);}
    },
    loadStudio(){return this.request('/api/studio');},
    saveStudio(revision,data){return this.request('/api/studio',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,data})});},
    uploadPhoto(blob){return this.request('/api/photos',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob});},
    photoURL(id){return '/api/photos/'+id;}
  };

  /** Browser demo mode: workspace JSON in localStorage, photos in IndexedDB. Data stays on this device and browser. */
  const photoURLs=new Map(),memoryPhotos=new Map();
  function openDB(){
    return new Promise((resolve,reject)=>{
      if(!root.indexedDB){reject(new Error('IndexedDB is unavailable.'));return;}
      const request=root.indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Could not open browser photo storage.'));
    });
  }
  const done=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const demo={
    name:'demo',
    notice:'',
    read(){
      let raw;try{raw=root.localStorage.getItem(DEMO_KEY);}catch(e){throw fail('Your browser is blocking storage, so Browser demo mode cannot save. Allow site data or use a normal window.',0,'demo_blocked');}
      if(!raw)return {data:null,revision:0};
      try{const record=JSON.parse(raw);if(!record||!Number.isInteger(record.revision))throw new Error('bad record');return record;}
      catch{
        try{root.localStorage.setItem(DEMO_KEY+'.unreadable',raw);root.localStorage.removeItem(DEMO_KEY);}catch{/* storage is failing; the caller shows the error below */}
        demo.notice='Your earlier browser demo data could not be read. It was set aside and a fresh workspace was started.';
        return {data:null,revision:0};
      }
    },
    async loadStudio(){
      const record=demo.read();
      try{
        const db=await openDB(),tx=db.transaction(STORE),keys=await done(tx.objectStore(STORE).getAllKeys()),values=await done(tx.objectStore(STORE).getAll());
        keys.forEach((key,i)=>{if(!photoURLs.has(key))photoURLs.set(key,URL.createObjectURL(values[i]));});db.close();
      }catch(e){console.warn('ShopDesk demo photos could not be loaded from this browser.',e);demo.notice=(demo.notice+' Saved photos could not be loaded in this browser.').trim();}
      return record;
    },
    async saveStudio(revision,data){
      const current=demo.read();
      if(current.revision!==revision)throw fail('This workspace changed in another tab. Reload the saved version before making more changes.',409);
      const next=current.revision+1;
      try{root.localStorage.setItem(DEMO_KEY,JSON.stringify({data,revision:next,updatedAt:new Date().toISOString()}));}
      catch(e){throw fail('Your browser is out of space for demo data. Export your flyer, or remove unused photos.',507,'demo_full');}
      return {revision:next};
    },
    async uploadPhoto(blob){
      if(blob.size>MAX_PHOTO)throw fail('Choose a smaller photo.',413);
      if(photoURLs.size>=MAX_PHOTOS)throw fail('Your photo storage is full. Reuse a saved product photo for now.',413);
      const id=root.crypto.randomUUID();
      try{const db=await openDB(),tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,id);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});db.close();}
      catch(e){console.warn('ShopDesk demo photo could not be stored permanently.',e);memoryPhotos.set(id,blob);demo.notice='Photos could not be stored permanently in this browser; they will disappear when you close the tab.';}
      photoURLs.set(id,URL.createObjectURL(blob));return {id};
    },
    photoURL(id){return photoURLs.get(id)||'';}
  };

  let adapter=remote;
  async function activateDemo(reason){
    adapter=demo;root.dispatchEvent(new CustomEvent('shopdesk:storage-mode',{detail:{mode:'demo',reason}}));
    return {...await demo.loadStudio(),mode:'demo'};
  }
  const api={
    REMOTE_MISSING,
    get mode(){return adapter===demo?'demo':'remote';},
    get notice(){return demo.notice;},
    /** Loads the saved workspace, falling back to Browser demo mode only when the server says it has no storage. */
    async loadStudio(){
      if(adapter===demo)return {...await demo.loadStudio(),mode:'demo'};
      // Ask the cheap health endpoint first so a server without storage does not log a failed /api/studio request.
      let health=null;try{health=await remote.request('/api/health');}catch{/* older or static hosting: /api/studio below decides */}
      if(health?.mode==='demo')return activateDemo('Cloud storage is not configured on this server.');
      try{return {...await remote.loadStudio(),mode:'remote'};}
      catch(e){
        if(!REMOTE_MISSING.includes(e.code))throw e;
        return activateDemo(e.message);
      }
    },
    saveStudio:(revision,data)=>adapter.saveStudio(revision,data),
    uploadPhoto:blob=>adapter.uploadPhoto(blob),
    photoURL:id=>adapter.photoURL(id),
    demo:{key:DEMO_KEY}
  };
  root.ShopDeskStorage=api;
})(typeof window!=='undefined'?window:globalThis);
