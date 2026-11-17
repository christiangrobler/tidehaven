'use strict';
/* =====================================================================
   GUILDS & GARRISONS: interface pieces
   ===================================================================== */
const CK=()=>!!(G&&G.opts&&G.opts.ck);
function ckTargets(p){
  const pd=G.pending;
  if(pd){
    if(pd.type==='engineer')return {k:'v',act:'engineer',list:wallSpots(p)};
    if(pd.type==='inventor')return {k:'h',act:'inventor',list:inventorHexes().filter(h=>h!==pd.first)};
    if(pd.type==='merchant')return {k:'h',act:'merchant',list:merchantHexes(p)};
    if(pd.type==='deserter')return {k:'v',act:'deserter',list:knightSpots(p)};
    if(pd.type==='diplomat')return {k:'e',act:'diplomat',list:openRoads()};
    if(pd.type==='intrigue')return {k:'v',act:'intrigue',list:intrigueTargets(p)};
    if(pd.type==='smith')return {k:'v',act:'smith',list:smithTargets(p)};
    return undefined;
  }
  if(UI.mode==='wall')return {k:'v',act:'wall',list:wallSpots(p)};
  if(UI.mode==='knight')return {k:'v',act:'knight',list:knightSpots(p)};
  if(UI.mode==='kmove')return {k:'v',act:'kmove',list:knightMoves(UI.kFrom)};
  return undefined;
}
function ckBoardAction(a,i){
  switch(a){
    case 'engineer':return engineerPick(i);
    case 'inventor':return inventorPick(i);
    case 'merchant':return merchantPick(i);
    case 'deserter':return deserterPick(i);
    case 'diplomat':return diplomatPick(i);
    case 'intrigue':return intriguePick(i);
    case 'smith':return smithPick(i);
    case 'wall':{const ok=buildWall(i);if(ok)UI.mode=null;return ok;}
    case 'knight':{const ok=buildKnight(i);if(ok)UI.mode=null;return ok;}
    case 'kmove':{const ok=moveKnight(UI.kFrom,i);if(ok){UI.mode=null;UI.kFrom=null;}return ok;}
  }
  return null;
}
function ckTapKnight(x,y){
  if(!CK()||G.phase!=='main'||G.winner!=null)return false;
  let best=null,bd=.4;Object.keys(G.kn).forEach(v=>{const V=T.verts[v];const d=Math.hypot(V.x-x,V.y-y);if(d<bd){bd=d;best=+v;}});
  if(best==null)return false;UI.sheet={type:'knight',v:best};refresh();return true;
}
function ckStatus(){
  const pd=G.pending;
  if(pd){const m={engineer:'Engineer: tap one of your cities to wall it.',inventor:pd.first==null?'Inventor: tap the first number token to swap.':'Inventor: tap the second number token.',
      merchant:'Merchant: tap a tile next to your building.',deserter:`Deserter: place your free ${KNAMES[pd.lvl]?KNAMES[pd.lvl].toLowerCase():'knight'}.`,diplomat:'Diplomat: tap an open road to remove it.',
      intrigue:'Intrigue: tap the knight to displace.',smith:`Smith: tap a knight to promote (${pd.left} left).`,
      progDiscard:`Waiting for ${esc(nm(pd.p))} to discard a progress card.`,progChoose:`Waiting for ${esc(nm(pd.p))} to choose a progress card.`,give:`Waiting for ${esc(nm(pd.from))} to hand over cards.`};
    if(m[pd.type])return m[pd.type]+(['smith','deserter','engineer'].includes(pd.type)?'<span class="sub">Or tap Skip.</span>':'');}
  if(UI.mode==='wall')return 'Build a city wall.<span class="sub">Tap one of your cities.</span>';
  if(UI.mode==='knight')return 'Recruit a knight.<span class="sub">Tap a glowing corner on your roads.</span>';
  if(UI.mode==='kmove')return 'Move your knight.<span class="sub">Tap a corner along your roads. A weaker knight there gets pushed away.</span>';
  return null;
}
function ckBuildButtons(pl,p){
  return [['wall','Wall',KCOST.wall,3-ckWalls(p)],['knight','Knight',KCOST.knight,2-knightsOf(p,1).length],['improve','Improve',null,null]];
}
function ckBuildState(k,p){
  if(k==='wall')return ckWalls(p)<3&&wallSpots(p).length>0&&canAfford(p,KCOST.wall);
  if(k==='knight')return canBuildKnight(p)&&canAfford(p,KCOST.knight);
  if(k==='improve')return true;
  return false;
}
function ckWanted(){
  const pd=G.pending;if(!pd)return null;
  if(pd.type==='progDiscard'){if(privateFor(pd.p,'You hold more than 4 progress cards. Choose one to discard.'))return {type:'gate'};return {type:'progDiscard'};}
  if(pd.type==='progChoose')return {type:'progChoose'};
  if(pd.type==='give'){const why=`${pd.why}: give ${pd.n} ${pd.kinds==='com'?'commodity':'card'}${pd.n>1?'s':''} of your choice to ${nm(pd.to)}.`;
    if(privateFor(pd.from,why))return {type:'gate'};const key=pd.from+':'+G.logId;if(UI.giveKey!==key){UI.giveKey=key;UI.giveSel={};}return {type:'give'};}
  return null;
}
function pickRow(act,keys,sel,extra){return `<div class="pick" style="grid-template-columns:repeat(${Math.min(keys.length,5)},minmax(0,1fr))">${keys.map(k=>`<button class="rt${sel===k?' sel':''}" data-act="${act}" data-r="${k}" ${extra?extra(k):''}>${img(k)}<span class="rate">${KNAME(k)}</span></button>`).join('')}</div>`;}
function progArgUI(s,t,p,q){
  switch(t){
    case 'alchemist':return `<h3>Yellow die</h3><div class="seg">${[1,2,3,4,5,6].map(v=>`<button class="${s.a===v?'sel':''}" data-act="alch" data-k="a" data-v="${v}">${v}</button>`).join('')}</div>
      <h3>Red die</h3><div class="seg">${[1,2,3,4,5,6].map(v=>`<button class="${s.b===v?'sel':''}" data-act="alch" data-k="b" data-v="${v}">${v}</button>`).join('')}</div>`;
    case 'harbor':return `<h3>Resource to give</h3>${pickRow('parg',RES,s.arg,k=>P(p).res[k]<1?'disabled':'')}`;
    case 'resmono':return `<h3>Resource</h3>${pickRow('parg',RES,s.arg)}`;
    case 'trademono':return `<h3>Commodity</h3>${pickRow('parg',COM,s.arg)}`;
    case 'fleet':return `<h3>Trade at 2:1</h3>${pickRow('parg',RES.concat(COM),s.arg)}`;
    case 'mastermerchant':{const need=Math.min(2,handCount(q));const sel=s.sel||{};const n=sumH(sel);
      return `<h3>${esc(nm(q))}’s hand: take ${need}</h3><div class="stps stps8">${HANDK().map(k=>stepper('mm',k,sel[k]||0,Math.min(P(q).res[k],(sel[k]||0)+(need-n)),`has ${P(q).res[k]}`)).join('')}</div>`;}
    case 'spy':return `<h3>${esc(nm(q))}’s progress cards</h3><div class="menu">${P(q).prog.map((c,j)=>`<button class="btn${String(s.arg)===String(j)?' primary':''}" data-act="parg" data-r="${j}">${PROG[c.t].n}</button>`).join('')}</div>`;
  }
  return '';
}
function progArgReady(s,t,q){
  if(t==='alchemist')return s.a&&s.b;
  if(['harbor','resmono','trademono','fleet','spy'].includes(t))return s.arg!=null;
  if(t==='mastermerchant')return sumH(s.sel||{})===Math.min(2,handCount(q));
  return true;
}
function ckSheet(s){
  const p=G.cur,q=1-p,pl=P(p);
  switch(s.type){
  case 'improve':{
    return `<div class="sheet"><h2>City improvements</h2><p class="lead">Each level costs that many commodities of its colour. You need at least one city. Level 4 founds a metropolis (+2 points) if nobody has it; reaching level 5 first takes it from a player still on 4.</p>
      ${TRACKS.map(t=>{const L=pl.imp[t],why=improveBlock(p,t),cost=improveCost(p,t),m=G.metro[t];
        return `<div class="track" style="--tc:${TRACK[t].col}"><div class="track-h"><b>${TRACK[t].n}</b>${img(TRACK[t].com)}<span>${[1,2,3,4,5].map(i=>`<i class="${i<=L?'on':''}${i===3?' ab':''}${i===4?' mt':''}"></i>`).join('')}</span></div>
        <p class="track-d">${L?`Level ${L}: ${LEVEL_NAMES[t][L-1]}. `:''}${TRACK[t].abil}${m?` <b>${esc(nm(m.p))}</b> holds the ${TRACK[t].metro.toLowerCase()}.`:''} ${esc(nm(q))} is on level ${P(q).imp[t]}.</p>
        ${L<5?`<button class="btn${why?'':' primary'}" data-act="improve" data-v="${t}" ${why?'disabled':''}>${why||`Build ${LEVEL_NAMES[t][L]} for ${cost} ${CNAME[TRACK[t].com]}`}</button>`:''}</div>`;}).join('')}
      ${G.crane===p?'<p class="note">Crane: your next improvement costs one less.</p>':''}
      <div class="btns"><button class="btn ghost" data-act="close">Done</button></div></div>`;}
  case 'knight':{const v=s.v,k=G.kn[v];if(!k)return '';const mine=k.p===p&&G.phase==='main';
    const pb=mine?promoteBlock(p,v):'';const canMove=mine&&knightCanAct(p,v)&&knightMoves(v).length>0;const chase=mine&&canChase(p,v);
    const act=mine&&!k.act&&G.rolled&&!G.pending;
    return `<div class="sheet"><h2>${esc(nm(k.p))}’s ${KNAMES[k.lvl].toLowerCase()}</h2><p class="lead">Strength ${k.lvl} · ${k.act?'active':'inactive'}${k.act&&k.tA===G.turn?' (activated this turn, can act next turn)':''}. Active knights defend against the barbarians, block roads and can move, push away weaker knights, or chase the robber.</p>
      ${mine?`<div class="menu">
        <button class="btn" data-act="kact" data-v="${v}" ${act&&canAfford(p,KCOST.activate)?'':'disabled'}>Activate · ${costIcons(KCOST.activate)}${k.act?' (already active)':''}</button>
        <button class="btn" data-act="kpro" data-v="${v}" ${!pb&&G.rolled&&!G.pending&&canAfford(p,KCOST.promote)?'':'disabled'}>Promote · ${costIcons(KCOST.promote)}${pb?` (${pb})`:''}</button>
        <button class="btn" data-act="kmove" data-v="${v}" ${canMove?'':'disabled'}>Move or displace${canMove?'':' (needs an active knight activated on an earlier turn)'}</button>
        <button class="btn" data-act="kchase" data-v="${v}" ${chase?'':'disabled'}>Chase the robber${chase?'':' (knight must be active and next to the robber)'}</button></div>`:''}
      <div class="btns"><button class="btn ghost" data-act="close">Close</button></div></div>`;}
  case 'prog':{const c=pl.prog[s.i];if(!c)return '';const t=c.t,why=progBlock(t);
    return `<div class="sheet"><h2 style="color:${TRACK[PROG[t].deck].col}">${PROG[t].n}</h2><p>${PROG[t].d}</p>${why?`<p class="note">${why}</p>`:progArgUI(s,t,p,q)}
      <div class="btns"><button class="btn ghost" data-act="close">Keep it</button><button class="btn primary" data-act="playprog" ${why||!progArgReady(s,t,q)?'disabled':''}>Play ${PROG[t].n}</button></div></div>`;}
  case 'progDiscard':{const pd=G.pending,hp=P(pd.p);
    return `<div class="sheet"><h2>${esc(nm(pd.p))}, discard a progress card</h2><p class="lead">You may hold at most 4. The card goes to the bottom of its deck.</p>
      <div class="menu">${hp.prog.map((c,j)=>`<button class="btn" data-act="pdisc" data-v="${j}"><span style="color:${TRACK[PROG[c.t].deck].col}">●</span> ${PROG[c.t].n}</button>`).join('')}</div></div>`;}
  case 'progChoose':{const pd=G.pending;
    return `<div class="sheet"><h2>${esc(nm(pd.p))}, choose a deck</h2><p class="lead">The barbarians were driven off with a tied defence. Draw the top card of any deck.</p>
      <div class="menu">${TRACKS.map(t=>`<button class="btn" data-act="pchoose" data-v="${t}" ${G.progDecks[t].length?'':'disabled'}><span style="color:${TRACK[t].col}">●</span> ${TRACK[t].n} (${G.progDecks[t].length} left)</button>`).join('')}</div></div>`;}
  case 'give':{const pd=G.pending,fp=P(pd.from);const keys=pd.kinds==='com'?COM:HANDK();const have=keys.reduce((a,k)=>a+fp.res[k],0);const need=Math.min(pd.n,have);const n=keys.reduce((a,k)=>a+(UI.giveSel[k]||0),0);
    return `<div class="sheet"><h2>${esc(nm(pd.from))}, give ${need} to ${esc(nm(pd.to))}</h2><p class="lead">${esc(pd.why)}. You choose which ${pd.kinds==='com'?'commodities':'cards'}.</p>
      <div class="stps${keys.length>5?' stps8':''}">${keys.map(k=>stepper('give',k,UI.giveSel[k]||0,Math.min(fp.res[k],(UI.giveSel[k]||0)+(need-n)),`have ${fp.res[k]}`)).join('')}</div>
      <div class="btns"><button class="btn primary" data-act="give" ${n===need?'':'disabled'}>${n===need?`Give ${need}`:`Pick ${need-n} more`}</button></div></div>`;}
  case 'alchroll':return '';
  }
  return null;
}
const CKACT={
  improve(d){if(improve(d.v)){sfx('card');}refresh();},
  kact(d){if(activateKnight(+d.v))sfx('place');refresh(true);},
  kpro(d){if(promoteKnight(+d.v))sfx('place');refresh(true);},
  kmove(d){UI.mode='kmove';UI.kFrom=+d.v;UI.sheet=null;refresh();},
  kchase(d){if(chaseRobber(+d.v)){UI.sheet=null;sfx('place');}refresh(true);},
  progi(d){UI.sheet={type:'prog',i:+d.v};refresh();},
  alch(d){UI.sheet[d.k]=+d.v;refresh();},
  parg(d){UI.sheet.arg=d.r;refresh();},
  playprog(){const s=UI.sheet;const c=P(G.cur).prog[s.i];if(!c)return;const t=c.t;
    const arg=t==='alchemist'?[s.a,s.b]:t==='mastermerchant'?(s.sel||{}):s.arg;
    if(playProg(s.i,arg)){UI.sheet=null;sfx('card');toast(`${PROG[t].n} played.`);}refresh(true);},
  pdisc(d){if(progDiscard(+d.v))sfx('card');refresh();},
  pchoose(d){if(progChoose(d.v))sfx('card');refresh();},
  give(){if(doGive(UI.giveSel)){UI.giveSel={};UI.giveKey='';sfx('card');}refresh();},
  skip(){if(skipPending())refresh();}
};
function ckStep(k,r){
  if(k==='mm'){const s=UI.sheet;s.sel=s.sel||{};const q=1-G.cur;const need=Math.min(2,handCount(q));return {o:s.sel,max:Math.min(P(q).res[r],(s.sel[r]||0)+(need-sumH(s.sel)))};}
  if(k==='give'){const pd=G.pending;const keys=pd.kinds==='com'?COM:HANDK();const have=keys.reduce((a,x)=>a+P(pd.from).res[x],0);const need=Math.min(pd.n,have);const n=keys.reduce((a,x)=>a+(UI.giveSel[x]||0),0);
    if(UI.giveSel[r]==null)UI.giveSel[r]=0;return {o:UI.giveSel,max:Math.min(P(pd.from).res[r],UI.giveSel[r]+(need-n))};}
  return null;
}
function ckScoreExtra(pl,p){
  if(!CK())return '';
  return `<span>knights <b>${activeStrength(p)}</b>/${Object.values(G.kn).filter(k=>k.p===p).reduce((a,k)=>a+k.lvl,0)}</span><span class="imps">${TRACKS.map(t=>`<i style="--tc:${TRACK[t].col}" title="${TRACK[t].n}">${pl.imp[t]}</i>`).join('')}</span><span><b>${pl.prog.length}</b> progress</span>`;
}
function ckProgChips(pl,show){
  if(!show)return '';
  return pl.prog.map((c,j)=>`<button class="devchip prog" style="--tc:${TRACK[PROG[c.t].deck].col}" data-act="progi" data-v="${j}"><span class="n">${PROG[c.t].n}</span></button>`).join('');
}
function renderBarb(){
  const el=$('#barb');if(!el)return;if(!CK()||G.preview){el.hidden=true;return;}
  el.hidden=false;const cities=cityCount(0)+cityCount(1),def=activeStrength(0)+activeStrength(1);
  el.innerHTML=`<span class="bship" aria-hidden="true">${SHIPSVG}</span><span class="btrack">${[1,2,3,4,5,6,7].map(i=>`<i class="${i<=G.barb?'on':''}"></i>`).join('')}</span><span class="bnum">Barbarians <b>${cities}</b> vs knights <b>${def}</b>${G.robberOn?'':' · robber asleep'}</span>`;
}
const SHIPSVG='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2v13H5.5L12 2z" opacity=".85"/><path d="M13 5l6 9h-6z"/><path d="M2.5 16.5h19l-2.5 4h-14z"/></svg>';
const GATESVG='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 21V9l8-6 8 6v12h-5v-6a3 3 0 0 0-6 0v6z"/></svg>';
function eventFaceHTML(v){const f=evFace(v);return f==='ship'?`<div class="evf ship">${SHIPSVG}</div>`:`<div class="evf" style="color:${TRACK[f].col}">${GATESVG}</div>`;}
