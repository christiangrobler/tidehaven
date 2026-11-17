'use strict';
/* =====================================================================
   PHONE-AS-REMOTE CORE
   role  null  = normal single-device game
         'tv'  = the big screen: shows the board and public info, holds the game
         'pad' = a phone: private hand + mini map, one seat of the game
   ===================================================================== */
const PAD={
  role:(document.documentElement.dataset&&document.documentElement.dataset.role)||null,
  seat:null,          // pad: 0 or 1
  hook:null,          // called at the end of every refresh()
  series:'',          // head-to-head record text, sent by the TV
  /* who has to act right now (the current player, or whoever a pending step waits on) */
  actor(){
    if(!G||G.preview)return null;
    if(G.pending){const a=pendingActor();return a==null?G.cur:a;}
    return G.cur;
  },
  mineToAct(){return this.role==='pad'&&this.actor()===this.seat;}
};
