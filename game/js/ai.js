'use strict';
/* =====================================================================
   COMPUTER OPPONENT
   Plays any board, expansion and variant one visible step at a time.
   ===================================================================== */
const AIS={timer:null,turnKey:'',steps:0,trades:0,tried:{},speed:(function(){try{return localStorage.getItem('tidehaven.aispeed')||'normal';}catch(e){return 'normal';}})()};
const aiSeats=()=>(G&&G.opts&&(G.opts.aiSeats||(G.opts.ai!=null?[G.opts.ai]:[])))||[];
const aiOn=()=>aiSeats().length>0;
const isAI=p=>aiSeats().includes(p);
const humanP=()=>aiOn()?PL().find(p=>!isAI(p)):null;
const oppsOf=p=>PL().filter(x=>x!==p);
const oppOf=p=>{const o=PL().find(x=>x!==p);return o==null?0:o;};   // the one rival in a two-player game
/* how much a rival matters: the closer to winning, the more it matters */
const rivalW=q=>1+Math.max(0,vp(q,false))/Math.max(1,winTarget(q))*1.2;
const AIDIFF=()=>(G&&G.opts.diff)||'normal';
const PIPN=n=>n?6-Math.abs(7-n):0;
function noise(){const d=AIDIFF();return d==='easy'?.45+rnd()*1.1:d==='normal'?.9+rnd()*.2:1;}
function argmax(list,f){let best=null,bv=-Infinity;list.forEach(x=>{const v=f(x);if(v>bv){bv=v;best=x;}});return best;}

function pendingActor(){
  const pd=G.pending;if(!pd)return null;
  switch(pd.type){
    case 'discard':case 'gold':return pd.queue[0].p;
    case 'progDiscard':case 'progChoose':return pd.p;
    case 'give':return pd.from;
    case 'vote':return pd.order.find(x=>pd.bids[x]==null);
    case 'camel':return pd.chooser!=null?pd.chooser:G.cur;
    default:return G.cur;
  }
}
function aiShouldAct(){
  if(PAD.role==='pad')return false;
  if(!aiOn()||!G||G.preview||G.winner!=null||UI.busy||UI.aiOffer||G.phase==='over')return false;
  const a=pendingActor();if(a!=null)return isAI(a);
  if(G.endingTurn)return false;
  return isAI(G.cur)&&(G.phase==='setup'||G.phase==='main');
}
function humanMustWait(){
  if(!G||G.preview||G.winner!=null)return false;
  if(PAD.role==='tv')return true;
  if(PAD.role==='pad')return PAD.actor()!==PAD.seat;
  return aiOn()&&(pendingActor()!=null?isAI(pendingActor()):isAI(G.cur));
}
function aiSchedule(){
  clearTimeout(AIS.timer);
  if(aiShouldAct()){const fast=G.phase==='setup'||(G.pending&&['discard','gold','give','progDiscard'].includes(G.pending.type));AIS.timer=setTimeout(aiTick,(fast?650:850)*({fast:.45,slow:1.7}[AIS.speed]||1));}
}
function aiTick(){
  if(!aiShouldAct())return;
  aiTurnKey();AIS.steps++;const before=G.logId;
  try{if(AIS.steps>90)aiBailout();else aiStep();}
  catch(e){console.error('AI error',e);aiBailout();}
  if(G.logId>before){const m=G.log[G.log.length-1].m;if(!/rolled|collected/.test(m))toast(m,2600);}
  refresh(true);
}
function aiTurnKey(){const key=G.turn+':'+G.cur+':'+G.phase;if(key!==AIS.turnKey){AIS.turnKey=key;AIS.steps=0;AIS.trades=0;AIS.tried={};AIS.offered=false;}}
function aiBailout(){
  const pd=G.pending;
  if(pd){if(['smith','deserter','freeRoads','engineer','treason'].includes(pd.type)&&skipPending())return;aiPending(pd,true);if(G.pending===pd)nextPending();return;}
  if(G.phase==='main'&&G.rolled)endTurn();
}

/* ---------- valuation ---------- */
function prodTypes(p){const s=new Set();G.vOwn.forEach((o,v)=>{if(o&&o.p===p)T.verts[v].hexes.forEach(h=>{const r=TERR_RES[HT(h)];if(r)s.add(r);});});return s;}
function resWeight(p,r){
  const built=G.vOwn.filter(o=>o&&o.p===p).length;let w=1;
  if(built<4&&(r==='wood'||r==='brick'))w=1.15;
  if(built>=4&&(r==='grain'||r==='ore'))w=1.2;
  if(G.opts.ck&&(r==='wood'||r==='wool'||r==='ore'))w+=.1;
  return w;
}
function hexValue(h,p){
  if(h===G.robber||(G.conq&&G.conq[h]))return 0;const H=G.board.hexes[h];const pip=PIPN(H.n);
  if(H.t==='gold')return pip*1.3;const r=TERR_RES[H.t];return r?pip*resWeight(p,r):0;
}
function vertexValue(v,p){
  let s=0;const have=prodTypes(p),seen=new Set();
  T.verts[v].hexes.forEach(h=>{s+=hexValue(h,p);const r=TERR_RES[HT(h)];if(r&&!have.has(r)&&!seen.has(r)&&PIPN(G.board.hexes[h].n)){s+=1.8;seen.add(r);}});
  G.board.harbors.forEach(hb=>{const E=T.edges[hb.e];if(E.a===v||E.b===v){if(hb.t==='any')s+=1.4;else{const prod=T.hexes.filter(x=>TERR_RES[HT(x.i)]===hb.t&&x.v.some(u=>G.vOwn[u]&&G.vOwn[u].p===p)).reduce((a,x)=>a+PIPN(G.board.hexes[x.i].n),0);s+=.8+prod*.25;}}});
  if(SC().bonus&&G.phase==='main'){const pl=P(p);if(vAreas(v).some(a=>!pl.home.includes(a)&&!pl.claimed.includes(a)))s+=5;}
  if(typeof fishSpotVertex==='function'&&fishSpotVertex(v))s+=1.5;
  if(G.opts.scen==='rivers'&&T.verts[v].hexes.some(h=>G.board.hexes[h].river))s+=.8;
  if(G.camels&&T.verts[v].edges.filter(e=>G.camels[e]).length>=2)s+=3;
  return s;
}
/* hard computer also takes the corners the human wants most */
function denyBonus(v,p){if(AIDIFF()!=='hard')return 0;const o=oppsOf(p).filter(x=>x<NP());if(!o.length)return 0;return .35*o.reduce((a,q)=>a+vertexValue(v,q),0)/o.length;}
function freeSpot(v){return !G.vOwn[v]&&!(G.kn&&G.kn[v])&&vBuildable(v)&&!T.verts[v].adj.some(u=>G.vOwn[u])&&!tbSettleBlocked(v);}

/* ---------- route planning: best next road/ship toward a good corner ---------- */
function planRoute(p){
  const own=v=>G.vOwn[v]&&G.vOwn[v].p===p;const blocked=v=>(G.vOwn[v]&&G.vOwn[v].p!==p)||oppKnight(v,p);
  const startKinds={};
  T.verts.forEach(V=>{const v=V.i;if(own(v)){startKinds[v]='both';return;}
    const r=V.edges.some(e=>ownEdge(e,p,'road')),s=V.edges.some(e=>ownEdge(e,p,'ship'));if((r||s)&&!blocked(v))startKinds[v]=r&&s?'both':r?'road':'ship';});
  const dist={},first={},kindAt={},q=[];
  Object.keys(startKinds).forEach(k=>{const v=+k;dist[v]=0;kindAt[v]=startKinds[v];q.push(v);});
  const edgeKind=(e,from)=>{const land=eLand(e)&&!tbRoadBlocked(e,p),sea=SC().sea&&eSea(e)&&!(G.pirate!=null&&T.edges[e].hexes.includes(G.pirate));
    const k=kindAt[from];if(k==='both')return land&&P(p).roads>0?'road':sea&&P(p).ships>0?'ship':null;if(k==='road')return land&&P(p).roads>0?'road':null;return sea&&P(p).ships>0?'ship':null;};
  while(q.length){const v=q.shift();if(dist[v]>=4)continue;
    for(const e of T.verts[v].edges){if(G.eOwn[e])continue;const k=edgeKind(e,v);if(!k)continue;const E=T.edges[e];const w=E.a===v?E.b:E.a;if(w in dist)continue;
      dist[w]=dist[v]+1;first[w]=dist[v]===0?{e,k}:first[v];kindAt[w]=own(w)?'both':k;if(!blocked(w))q.push(w);}}
  let best=null,bv=0;
  Object.keys(dist).forEach(k=>{const v=+k;if(!dist[v]||!freeSpot(v))return;const val=vertexValue(v,p)*noise()/(1+.55*dist[v]);if(val>bv){bv=val;best=v;}});
  return best==null?null:{target:best,first:first[best],dist:dist[best],value:bv};
}

/* ---------- needs ---------- */
function buildGoals(p){
  const pl=P(p),g=[];const ck=G.opts.ck;
  if(pl.cities>0&&validCities(p).length)g.push({k:'city',cost:cityCost(p),w:10});
  if(pl.settlements>0&&(validSettlements(p,false).length||(planRoute(p)||{}).dist<=1))g.push({k:'settlement',cost:COST.settlement,w:9});
  if(ck){TRACKS.forEach(t=>{const L=pl.imp[t];if(L<5&&cityCount(p)>0)g.push({k:'imp',t,cost:{[TRACK[t].com]:improveCost(p,t)},w:L<3?7:6});});
    if(knightsOf(p,1).length<2&&knightSpots(p).length)g.push({k:'knight',cost:KCOST.knight,w:G.barb>=4?8:5});}
  const r=planRoute(p);if(r&&r.first)g.push({k:r.first.k,cost:COST[r.first.k],w:validSettlements(p,false).length?3:6});
  if(!ck&&G.devDeck.length&&G.opts.scen!=='barbattack')g.push({k:'dev',cost:COST.dev,w:4});
  if(G.opts.scen==='barbattack'&&G.devDeck.length)g.push({k:'dev',cost:COST.dev,w:6});
  return g.sort((a,b)=>b.w-a.w);
}
function needOf(p){
  const n={};HANDK().forEach(k=>n[k]=0);
  buildGoals(p).slice(0,3).forEach((g,i)=>Object.keys(g.cost).forEach(k=>{n[k]=(n[k]||0)+(g.cost[k]||0)*(3-i);}));
  return n;
}
function cardValue(p,k){const n=needOf(p);const have=P(p).res[k]||0;return 1+Math.max(0,(n[k]||0)-have)*.6-(have>3?.3:0);}
function pickCards(p,n,keys,forKeep){
  const hand={};keys.forEach(k=>hand[k]=P(p).res[k]||0);const sel={};
  for(let i=0;i<n;i++){const c=keys.filter(k=>hand[k]>0);if(!c.length)break;const k=argmax(c,k=>(hand[k]-(needOf(p)[k]||0))*1.5-cardValue(p,k)+rnd()*.1);hand[k]--;sel[k]=(sel[k]||0)+1;}
  return sel;
}
function pickWanted(p,n,avail){
  const sel={};const need=needOf(p);const have=Object.assign({},P(p).res);
  for(let i=0;i<n;i++){const c=RES.filter(k=>(avail?avail[k]:G.bank[k])-(sel[k]||0)>0);if(!c.length)break;
    const k=argmax(c,k=>(need[k]||0)-(have[k]||0)-(sel[k]||0)+rnd()*.2);sel[k]=(sel[k]||0)+1;}
  return sel;
}

/* ---------- main step ---------- */
function aiStep(){
  aiTurnKey();const p=G.cur,pd=G.pending;
  if(pd)return aiPending(pd,false);
  if(G.phase==='setup')return aiSetup(p);
  if(!G.rolled){if(aiPreRoll(p))return true;startRoll();return true;}
  if(AIDIFF()==='easy'&&rnd()<.22&&AIS.steps>2){return endTurn();}
  if(aiBuild(p))return true;
  return endTurn();
}
function aiSetup(p){
  if(G.step==='settlement'){const l=validSettlements(p,true);const v=argmax(l,v=>vertexValue(v,p)*noise()+denyBonus(v,p));return setupSettle(v);}
  const from=G.lastV;const cand=[...new Set([...validRoads(p,from),...validShips(p,from)])];
  const e=argmax(cand,e=>{const E=T.edges[e];const w=E.a===from?E.b:E.a;let s=0;T.verts[w].adj.forEach(u=>{if(u!==from&&freeSpot(u))s=Math.max(s,vertexValue(u,p));});return s*noise();});
  const ks=edgeKinds(p,e,from);return setupEdge(e,ks.includes('road')?'road':ks[0]);
}
function aiPreRoll(p){
  const pl=P(p);
  const robHurt=G.robber!=null&&T.hexes[G.robber].v.some(v=>G.vOwn[v]&&G.vOwn[v].p===p)&&PIPN(G.board.hexes[G.robber].n)>=3;
  const armyChase=G.army!==p&&(AIDIFF()==='hard'||rnd()<(AIDIFF()==='normal'?.7:.35));
  if(!G.opts.ck&&!devBlock('knight')&&(robHurt||armyChase)){if(playKnight())return true;}
  if(VARS().two&&robHurt&&!tokenBlock(p)&&G.robber!=null){if(tokenRobber())return true;}
  if(G.opts.ck){const ki=pl.prog.findIndex(c=>c.t==='alchemist');if(ki>=0&&!progBlock('alchemist')&&rnd()<.4){const best=aiBestSum(p);if(best){const a=Math.max(1,best-6),b=best-a;if(playProg(ki,[a,b]))return true;}}}
  return false;
}
function aiBestSum(p){let best=null,bv=0;[2,3,4,5,6,8,9,10,11,12].forEach(n=>{let v=0;T.hexes.forEach(h=>{if(G.board.hexes[h.i].n!==n||h.i===G.robber)return;h.v.forEach(u=>{const o=G.vOwn[u];if(o&&o.p===p)v+=o.city?2:1;else if(o&&o.p===oppOf(p))v-=.6*(o.city?2:1);});});if(v>bv){bv=v;best=n;}});return best;}

function aiBuild(p){
  const pl=P(p),ck=G.opts.ck;
  // play development cards that help right now
  if(!ck&&G.opts.scen!=='barbattack'&&!G.devPlayed&&AIDIFF()!=='easy'){
    if(!devBlock('road')&&planRoute(p)){if(playRoadBuilding())return true;}
    if(!devBlock('plenty')){const g=buildGoals(p)[0];if(g){const miss={};let m=0;Object.keys(g.cost).forEach(k=>{const d=(g.cost[k]||0)-(pl.res[k]||0);if(d>0){miss[k]=d;m+=d;}});
      if(m>0&&m<=2&&RES.every(k=>(miss[k]||0)<=G.bank[k])){const sel=Object.assign(zero(),miss);if(m<2){const k=argmax(RES.filter(x=>G.bank[x]>(sel[x]||0)),x=>needOf(p)[x]||0);sel[k]++;}if(playPlenty(sel))return true;}}}
    if(!devBlock('monopoly')&&oppsOf(p).reduce((a,q)=>a+handCount(q),0)>=Math.max(5,3*(NP()-1))){const k=argmax(RES,k=>(needOf(p)[k]||0)+ (19-G.bank[k]-pl.res[k])*.3);if(playMonopoly(k)!==false)return true;}
  }
  if(pl.cities>0){const l=validCities(p);if(l.length&&canAfford(p,cityCost(p))){const v=argmax(l,v=>vertexValue(v,p));if(build('city',v))return true;}}
  if(pl.settlements>0&&canAfford(p,COST.settlement)){const l=validSettlements(p,false);if(l.length){const v=argmax(l,v=>vertexValue(v,p)*noise()+denyBonus(v,p));if(build('settlement',v))return true;}}
  if(ck&&aiCK(p))return true;
  if(aiTB(p))return true;
  if(SC().sea&&pl.harborGifts&&pl.harborGifts.length){const l=harborGiftSpots(p);if(l.length&&placeHarborGift(l[0]))return true;}
  const route=planRoute(p);const spots=validSettlements(p,false).length;
  if(route&&route.first&&!spots&&pl.settlements>0){
    const k=route.first.k,e=route.first.e;if(canAfford(p,COST[k])&&(k==='road'?canRoad(p,e):canShip(p,e))&&!AIS.tried['r'+e]){AIS.tried['r'+e]=1;if(build(k,e))return true;}}
  if(route&&route.first&&spots&&!canAfford(p,COST.settlement)&&G.longest!==p&&G.roadLen[p]+1>=Math.max(...oppsOf(p).map(q=>G.roadLen[q]))&&Math.max(...oppsOf(p).map(q=>G.roadLen[q]))>=4){
    const e=route.first.e;if(route.first.k==='road'&&canAfford(p,COST.road)&&canRoad(p,e)&&!AIS.tried['r'+e]){AIS.tried['r'+e]=1;if(build('road',e))return true;}}
  if(aiBankTrade(p,['city','settlement']))return true;
  if(!ck){if(canBuyDev()&&(G.opts.scen==='barbattack'||!spots||pl.settlements===0||handCount(p)>=7)){if(buyDev())return true;}}
  if(aiPropose(p))return true;
  if(aiBankTrade(p))return true;
  return false;
}
function aiPropose(p){
  if(AIDIFF()==='easy'||AIS.offered||UI.aiOffer||UI.busy||G.pending||!G.rolled)return false;
  if(AIS.lastOffer!=null&&G.turn-AIS.lastOffer<5)return false;if(rnd()<(AIDIFF()==='hard'?.35:.55))return false;
  const pl=P(p);const hs=PL().filter(x=>!isAI(x)&&(!AIS.reachable||AIS.reachable(x))&&vp(x,false)<winTarget(x)-2);if(!hs.length)return false;
  for(const g of buildGoals(p)){
    const miss=[];let m=0,commodity=false;Object.keys(g.cost).forEach(k=>{const d=(g.cost[k]||0)-(pl.res[k]||0);if(d>0){if(!RES.includes(k))commodity=true;miss.push(k);m+=d;}});
    if(!m||m>2||commodity)continue;
    const want=miss.find(k=>hs.some(x=>(P(x).res[k]||0)>0));if(!want)continue;
    const h=pick(hs.filter(x=>(P(x).res[want]||0)>0));
    const spare=RES.filter(k=>!miss.includes(k)&&(pl.res[k]||0)-(g.cost[k]||0)>=1);if(!spare.length)continue;
    const give=argmax(spare,k=>(pl.res[k]||0)-(g.cost[k]||0)+rnd()*.1);
    AIS.offered=true;AIS.lastOffer=G.turn;UI.aiOffer={kind:'propose',mine:true,ai:p,to:h,aiGives:{[give]:1},aiGets:{[want]:1}};UI.sheet=null;sfx('card');return true;}
  return false;
}
/* the human said no: sweeten once by adding a second spare card */
function aiSweeten(o){
  const p=o.ai!=null?o.ai:G.opts.ai,pl=P(p);const g=Object.assign({},o.aiGives);
  const goal=buildGoals(p)[0];const spareOf=k=>(pl.res[k]||0)-(goal&&goal.cost[k]||0)-(g[k]||0);
  const ks=RES.filter(k=>!o.aiGets[k]&&spareOf(k)>=1);if(!ks.length)return null;
  const k=argmax(ks,k=>spareOf(k));g[k]=(g[k]||0)+1;return {kind:'counter',mine:true,ai:p,aiGives:g,aiGets:o.aiGets};
}
/* the human's own offer was too thin: say what would work instead */
function aiCounter(og,ot,ai){
  const p=ai!=null?ai:G.opts.ai,h=isAI(G.cur)?humanP():G.cur;if(!canAfford(p,ot))return null;const hh=P(h),c=[];
  HANDK().forEach(k=>{if((hh.res[k]||0)>(og[k]||0)){const o2=Object.assign({},og);o2[k]=(o2[k]||0)+1;if(aiAcceptTrade(o2,ot,p))c.push({aiGets:o2,aiGives:ot,cost:cardValue(p,k)});}});
  if(sumH(ot)>1)HANDK().forEach(k=>{if(ot[k]){const t2=Object.assign({},ot);t2[k]--;if(sumH(t2)&&aiAcceptTrade(og,t2,p))c.push({aiGets:og,aiGives:t2,cost:cardValue(p,k)+.5});}});
  if(!c.length)return null;const b=c.reduce((a,x)=>x.cost<a.cost?x:a);return {aiGets:b.aiGets,aiGives:b.aiGives};
}
function aiBankTrade(p,only){
  if(AIS.trades>=4||AIDIFF()==='easy'&&AIS.trades>=1)return false;
  const pl=P(p),rt=rates(p);
  for(const g of buildGoals(p)){if(only&&!only.includes(g.k))continue;
    const miss=[];let m=0;Object.keys(g.cost).forEach(k=>{const d=(g.cost[k]||0)-(pl.res[k]||0);if(d>0){miss.push(k);m+=d;}});
    if(!m||m>2)continue;
    const want=miss.find(k=>G.bank[k]>0);if(!want)continue;
    const give=argmax(HANDK().filter(k=>!miss.includes(k)&&(pl.res[k]||0)-(g.cost[k]||0)>=rt[k]),k=>(pl.res[k]||0)-(g.cost[k]||0)-rt[k]);
    if(give&&bankTrade(give,want)){AIS.trades++;return true;}
  }
  return false;
}
function aiAcceptTrade(give,get,ai){
  const p=ai!=null?ai:G.opts.ai,h=isAI(G.cur)?humanP():G.cur;if(!canAfford(p,get))return false;
  if(vp(h,false)>=winTarget(h)-2&&AIDIFF()!=='easy')return false;
  let gain=0,loss=0;HANDK().forEach(k=>{gain+=(give[k]||0)*cardValue(p,k);loss+=(get[k]||0)*cardValue(p,k);});
  const margin=AIDIFF()==='hard'?1.25:AIDIFF()==='normal'?1.05:.9;
  return gain>=loss*margin;
}

/* ---------- robber ---------- */
function aiThief(p){
  const ts=thiefTargets();
  return argmax(ts,i=>{let s=0;
    if(isSeaHex(i)){T.hexes[i].e.forEach(e=>{const o=G.eOwn[e];if(o&&o.k==='ship'){if(o.p===p)s-=3;else if(o.p<NP())s+=2*rivalW(o.p);}});return s+(thiefVictims(i).length?1:0)+rnd()*.1;}
    const pip=PIPN(G.board.hexes[i].n);T.hexes[i].v.forEach(v=>{const o=G.vOwn[v];if(!o)return;const m=o.city?2:1;if(o.p===p)s-=pip*m*2;else if(o.p<NP())s+=pip*m*rivalW(o.p);});
    if(thiefVictims(i).length)s+=2;return s*noise();});
}

/* ---------- pending decisions ---------- */
function aiPending(pd,force){
  const p=pendingActor(),me=p,h=oppOf(p);
  switch(pd.type){
    case 'steal':return stealFrom(argmax(pd.vs,q=>handCount(q)+vp(q,false)*.6+rnd()*.1));
    case 'discard':{const q=pd.queue[0];return doDiscard(pickCards(q.p,q.n,HANDK()));}
    case 'gold':{const q=pd.queue[0];return doGold(pickWanted(q.p,Math.min(q.n,sum(G.bank))));}
    case 'robber':return moveRobber(aiThief(me));
    case 'freeRoads':{const r=planRoute(me);const l=freeEdgeTargets(me);if(!l.length)return skipPending();
      let e=r&&r.first&&l.includes(r.first.e)?r.first.e:pick(l);const ks=edgeKinds(me,e).filter(k=>k==='road'?P(me).roads>0:P(me).ships>0);return build(ks.includes(r&&r.first?r.first.k:'road')?(r&&r.first?r.first.k:'road'):ks[0],e,true);}
    case 'progDiscard':{const pl=P(p);const order=['inventor','diplomat','spy','crane','intrigue','harbor','trademono','resmono','fleet','engineer'];const i=pl.prog.findIndex(c=>order.includes(c.t));return progDiscard(i>=0?i:0);}
    case 'progChoose':{const deck=argmax(TRACKS.filter(t=>G.progDecks[t].length),t=>P(p).imp[t]+rnd()*.1);return progChoose(deck);}
    case 'give':{const keys=pd.kinds==='com'?COM:HANDK();const have=keys.reduce((a,k)=>a+P(p).res[k],0);return doGive(pickCards(p,Math.min(pd.n,have),keys));}
    case 'smith':{const l=smithTargets(me);if(!l.length)return skipPending();return smithPick(argmax(l,v=>G.kn[v].lvl));}
    case 'deserter':{const l=knightSpots(me);if(!l.length)return skipPending();return deserterPick(argmax(l,v=>vertexValue(v,me)));}
    case 'engineer':{const l=wallSpots(me);if(!l.length)return skipPending();return engineerPick(l[0]);}
    case 'inventor':{const l=inventorHexes().filter(x=>x!==pd.first);const own=x=>T.hexes[x].v.some(v=>G.vOwn[v]&&G.vOwn[v].p===me);
      if(pd.first==null){const pickH=argmax(l,x=>(own(x)?-1:1)*PIPN(G.board.hexes[x].n)+rnd()*.1);return inventorPick(pickH);}
      return inventorPick(argmax(l,x=>(own(x)?1:-1)*(5-PIPN(G.board.hexes[x].n))+rnd()*.1));}
    case 'merchant':return merchantPick(argmax(merchantHexes(me),x=>PIPN(G.board.hexes[x].n)));
    case 'diplomat':{const l=openRoads();const theirs=l.filter(e=>G.eOwn[e].p===h);return diplomatPick(theirs.length?pick(theirs):pick(l));}
    case 'intrigue':return intriguePick(pick(intrigueTargets(me)));
    case 'neutral':{const t=neutralTargets(pd.kind);const ids=Object.keys(t).map(Number);const r=planRoute(h);
      const goal=r?T.verts[r.target]:null;const pos=i=>pd.kind==='settlement'?T.verts[i]:T.edges[i];
      return placeNeutral(goal?argmax(ids,i=>-Math.hypot(pos(i).x-goal.x,pos(i).y-goal.y)+rnd()*.2):pick(ids));}
    case 'vote':{const pl=P(p);const want=G.vOwn.some((o,v)=>o&&o.p===p&&T.verts[v].edges.some(e=>G.camels[e]))?2:1;
      return castVote({wool:Math.min(pl.res.wool,want>1&&rnd()<.6?1:0),grain:Math.min(pl.res.grain,rnd()<.5?1:0)});}
    case 'camel':{const l=camelSpots();return placeCamel(argmax(l,e=>{const E=T.edges[e];let s=0;[E.a,E.b].forEach(v=>{const o=G.vOwn[v];if(o)s+=(o.p===p?2:-2)*(T.verts[v].edges.some(x=>G.camels[x])?2:1);if(G.eOwn[e]&&G.eOwn[e].p===p)s+=1;});return s+rnd()*.2;}));}
    case 'kplace':{const l=kplaceSpots(pd);const threat=e=>T.edges[e].hexes.reduce((a,x)=>a+(G.barbs[x]||0),0);return kplace(argmax(l,e=>threat(e)+rnd()*.2));}
    case 'capture':return capture(argmax(captureTargets(),x=>(G.barbs[x]||0)*2+(G.conq[x]?3:0)+(T.hexes[x].v.some(v=>G.vOwn[v]&&G.vOwn[v].p===me)?2:0)));
    case 'treason':return skipPending();
    case 'kmoves':{const cast=new Set(castleEdges());const mv=Object.keys(G.kt).map(Number).filter(knightCanMove).sort((a,b)=>(cast.has(b)?1:0)-(cast.has(a)?1:0));
      mv.forEach(e=>{if(!knightCanMove(e))return;let boost=false,r=knightRange(e,3);if(!r.length&&cast.has(e)&&canAfford(G.cur,{grain:1})){boost=true;r=knightRange(e,5);}if(!r.length)return;
        const best=argmax(r,x=>T.edges[x].hexes.reduce((a,hh)=>{const b=G.barbs[hh]||0;const k=T.hexes[hh].e.filter(y=>G.kt[y]).length;return a+(b&&k<=b?b*2:0)+(G.conq[hh]?1:0);},0)+rnd()*.1);
        if(best!=null)moveEdgeKnight(e,best,boost);});
      return finishKnightMoves();}
  }
  return false;
}

/* ---------- Cities & Knights turn actions ---------- */
function aiCK(p){
  const pl=P(p);
  // play progress cards
  for(let i=0;i<pl.prog.length;i++){const t=pl.prog[i].t;if(t==='alchemist'||progBlock(t))continue;let arg;
    if(t==='harbor'){arg=argmax(RES.filter(k=>pl.res[k]>0),k=>pl.res[k]);if(!arg)continue;}
    else if(t==='resmono')arg=argmax(RES,k=>needOf(p)[k]||0);
    else if(t==='trademono')arg=argmax(COM,k=>needOf(p)[k]||0);
    else if(t==='fleet'){arg=argmax(HANDK(),k=>pl.res[k]);if(pl.res[arg]<2)continue;}
    else if(t==='spy')arg=0;
    else if(t==='mastermerchant'){const h=oppOf(p);arg=pickWanted(p,Math.min(2,handCount(h)),P(h).res);const add=Math.min(2,handCount(h))-sumH(arg);if(add>0){HANDK().forEach(k=>{const room=P(h).res[k]-(arg[k]||0);const n=Math.min(room,Math.min(2,handCount(h))-sumH(arg));if(n>0)arg[k]=(arg[k]||0)+n;});}}
    else if(t==='crane'||t==='medicine'){if(t==='crane'&&!TRACKS.some(tr=>pl.res[TRACK[tr].com]>=improveCost(p,tr)-1&&pl.imp[tr]<5))continue;if(t==='medicine'&&!(validCities(p).length&&pl.res.ore>=2&&pl.res.grain>=1))continue;}
    if(playProg(i,arg))return true;}
  // barbarians: defend
  const cities=cityCount(0)+cityCount(1),def=activeStrength(0)+activeStrength(1);const danger=G.barb>=4&&def<cities;
  if(danger||G.barb>=5){const l=knightsOf(p).filter(v=>!G.kn[v].act);if(l.length&&canAfford(p,KCOST.activate)&&activateKnight(l[0]))return true;}
  if((danger||knightsOf(p).length<1)&&canAfford(p,KCOST.knight)&&knightsOf(p,1).length<2){const l=knightSpots(p);if(l.length){const v=argmax(l,v=>vertexValue(v,p)*.2+(G.robber!=null&&T.hexes[G.robber].v.includes(v)?3:0)+rnd()*.1);if(buildKnight(v))return true;}}
  // chase the robber off our tiles
  if(G.robber!=null&&T.hexes[G.robber].v.some(v=>G.vOwn[v]&&G.vOwn[v].p===p)){const k=knightsOf(p).find(v=>canChase(p,v));if(k!=null&&chaseRobber(k))return true;}
  // improvements
  const t=argmax(TRACKS.filter(t=>!improveBlock(p,t)),t=>(pl.imp[t]===3&&!G.metro[t]?3:0)+(t==='science'&&pl.imp[t]<3?1:0)+rnd()*.3);
  if(t&&improve(t))return true;
  if(pl.res.wool>=1&&pl.res.ore>=1&&!validCities(p).length){const v=knightsOf(p).find(v=>!promoteBlock(p,v));if(v!=null&&G.barb>=3&&promoteKnight(v))return true;}
  if(handCount(p)>=7+2*ckWalls(p)&&canAfford(p,KCOST.wall)){const l=wallSpots(p);if(l.length&&ckWalls(p)<3&&buildWall(l[0]))return true;}
  return false;
}

/* ---------- Traders & Barbarians turn actions ---------- */
function aiTB(p){
  const pl=P(p),sc=G.opts.scen,v=VARS();
  if(G.eOwn.some(o=>o&&o.p===p&&o.dmg)&&canAfford(p,COST.road)&&repairRoad())return true;
  if(sc==='rivers'){const b=bridgeSpots(p);if(b.length&&canAfford(p,{brick:2,wood:1})&&buildBridge(b[0]))return true;
    if(!goldBuyBlock(p)){const g=buildGoals(p)[0];if(g){const miss=Object.keys(g.cost).find(k=>RES.includes(k)&&(g.cost[k]||0)>(pl.res[k]||0));if(miss&&buyWithGold(miss))return true;}}}
  if(sc==='barbattack'&&!goldBuyBlock(p)){const g=buildGoals(p)[0];if(g){const miss=Object.keys(g.cost).find(k=>RES.includes(k)&&(g.cost[k]||0)>(pl.res[k]||0));if(miss&&buyWithGold(miss))return true;}}
  if(sc==='fish'){const tot=fishTotal(p);
    if(G.robber!=null&&T.hexes[G.robber].v.some(x=>G.vOwn[x]&&G.vOwn[x].p===p)&&!fishBlock(p,'robber')&&spendFish('robber'))return true;
    if(tot>=7&&!fishBlock(p,'dev')&&spendFish('dev'))return true;
    if(tot>=4&&!fishBlock(p,'resource')&&spendFish('resource'))return true;
    if(G.boot===p&&!G.pending&&pubVP(oppOf(p))>=pubVP(p)&&giveBoot())return true;}
  if(v.two&&!tokenBlock(p)&&handCount(oppOf(p))>=5&&AIDIFF()!=='easy'&&rnd()<.5){if(forcedTrade())return true;}
  if(v.two&&pl.knights>0&&pl.knightCash!==G.turn&&G.army!==p&&pl.tokens<3&&cashKnight())return true;
  return false;
}
