'use strict';
/* =====================================================================
   ROLE: what this device is for. 'tv' = the main screen (shows the board),
   'pad' = a controller (private cards). The choice is remembered on the
   device so the home page opens straight into it, and it can be changed
   later from the settings (controller menu, or the main screen's lobby).
   ===================================================================== */
const Role=(function(){
  const KEY='tidehaven.role';
  const get=()=>{try{const v=localStorage.getItem(KEY);return v==='tv'||v==='pad'?v:null;}catch(e){return null;}};
  const set=r=>{try{if(r)localStorage.setItem(KEY,r);else localStorage.removeItem(KEY);}catch(e){}};
  /* keep the query string (e.g. ?lowq=1 or ?sig=...) so options survive the switch */
  const go=r=>{set(r);location.href=(r==='tv'?'tv.html':'pad.html')+(location.search||'');};
  return {get,set,go};
})();
