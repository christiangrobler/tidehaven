'use strict';
/* =====================================================================
   GUILDS & GARRISONS module: commodities, improvements, metropolises,
   knights, barbarians, event die, progress cards, walls, merchant
   ===================================================================== */
const TRACKS=['trade','politics','science'];
const TRACK={
  trade:{n:'Trade',com:'cloth',col:'#d9a52a',abil:'Merchant Guild: trade commodities with the bank at 2:1.',metro:'Trade metropolis'},
  politics:{n:'Politics',com:'coin',col:'#2f6fcf',abil:'Fortress: you may promote strong knights to mighty knights.',metro:'Politics metropolis'},
  science:{n:'Science',com:'paper',col:'#3c9a4a',abil:'Aqueduct: when a production roll gives you nothing, take 1 resource of your choice.',metro:'Science metropolis'}
};
const LEVEL_NAMES={trade:['Market','Trading House','Merchant Guild','Bank','Great Exchange'],politics:['Town Hall','Church','Fortress','Cathedral','High Assembly'],science:['Abbey','Library','Aqueduct','Theater','University']};
const PROG={
  alchemist:{deck:'science',n:'Alchemist',d:'Play before you roll: choose the numbers on both production dice. The event die is rolled as normal.'},
  crane:{deck:'science',n:'Crane',d:'Your next city improvement this turn costs one commodity less.'},
  engineer:{deck:'science',n:'Engineer',d:'Build one city wall for free.'},
  inventor:{deck:'science',n:'Inventor',d:'Swap two number tokens. Tokens 2, 12, 6 and 8 can’t be moved.'},
  irrigation:{deck:'science',n:'Irrigation',d:'Take 2 grain for each fields tile next to at least one of your settlements or cities.'},
  medicine:{deck:'science',n:'Medicine',d:'Your next city this turn costs 2 ore and 1 grain.'},
  mining:{deck:'science',n:'Mining',d:'Take 2 ore for each mountains tile next to at least one of your settlements or cities.'},
  printer:{deck:'science',n:'Printer',d:'1 victory point, revealed as soon as it is drawn.',vp:true},
  roadbuilding:{deck:'science',n:'Road Building',d:'Build 2 roads for free (ships too, on sea maps).'},
  smith:{deck:'science',n:'Smith',d:'Promote up to 2 of your knights for free.'},
  harbor:{deck:'trade',n:'Commercial Harbor',d:'Give your opponent 1 resource of your choice; they must give you 1 commodity of their choice, if they have one.'},
  mastermerchant:{deck:'trade',n:'Master Merchant',d:'If your opponent has more points, look at their hand and take 2 cards of your choice.'},
  merchant:{deck:'trade',n:'Merchant',d:'Place the merchant on a land tile next to your settlement or city. Trade that tile’s resource at 2:1 while you hold it. Worth 1 point.'},
  fleet:{deck:'trade',n:'Merchant Fleet',d:'Pick one resource or commodity. You can trade it with the bank at 2:1 for the rest of this turn.'},
  resmono:{deck:'trade',n:'Resource Monopoly',d:'Name a resource. Your opponent gives you 2 of it, if they can.'},
  trademono:{deck:'trade',n:'Trade Monopoly',d:'Name a commodity. Your opponent gives you 1 of it, if they can.'},
  bishop:{deck:'politics',n:'Bishop',d:'Move the robber. Steal 1 random card from each player with a building next to its new tile.'},
  constitution:{deck:'politics',n:'Constitution',d:'1 victory point, revealed as soon as it is drawn.',vp:true},
  deserter:{deck:'politics',n:'Deserter',d:'Your opponent removes one of their knights. You may place a knight of the same strength for free.'},
  diplomat:{deck:'politics',n:'Diplomat',d:'Remove an open road (one with a free end). If it’s yours, you may build it again elsewhere for free.'},
  intrigue:{deck:'politics',n:'Intrigue',d:'Displace an opposing knight standing on one of your roads.'},
  saboteur:{deck:'politics',n:'Saboteur',d:'If your opponent has at least as many points as you, they discard half of their cards.'},
  spy:{deck:'politics',n:'Spy',d:'Look at your opponent’s progress cards and take one.'},
  warlord:{deck:'politics',n:'Warlord',d:'Activate all of your knights for free.'},
  wedding:{deck:'politics',n:'Wedding',d:'If your opponent has more points, they give you 2 cards of their choice.'}
};
const DECKS={science:{alchemist:2,crane:2,engineer:1,inventor:2,irrigation:2,medicine:2,mining:2,printer:1,roadbuilding:2,smith:2},
  trade:{harbor:2,mastermerchant:2,merchant:6,fleet:2,resmono:4,trademono:2},
  politics:{bishop:2,constitution:1,deserter:2,diplomat:2,intrigue:2,saboteur:2,spy:3,warlord:2,wedding:2}};
const KCOST={knight:{wool:1,ore:1},promote:{wool:1,ore:1},activate:{grain:1},wall:{brick:2}};
const KNAMES=['','Basic knight','Strong knight','Mighty knight'];
const evFace=ev=>ev<=3?'ship':TRACKS[ev-4];

function ckInit(){
  G.kn={};G.barb=0;G.robberOn=false;G.attacks=0;G.metro={trade:null,politics:null,science:null};G.merchant=null;
  G.progDecks={};TRACKS.forEach(t=>{G.progDecks[t]=shuffle(Object.entries(DECKS[t]).flatMap(([k,n])=>rep(k,n)));});
  G.players.forEach(pl=>{pl.imp={trade:0,politics:0,science:0};pl.prog=[];pl.progVP=0;pl.defender=0;});
}
function ckVP(p){
  let s=0;G.vOwn.forEach(o=>{if(o&&o.p===p&&o.metro)s+=2;});
  const pl=P(p);s+=(pl.defender||0)+(pl.progVP||0);
  if(G.merchant&&G.merchant.p===p)s+=1;
  return s;
}
function ckWalls(p){return G.vOwn.filter(o=>o&&o.p===p&&o.wall).length;}
function ckRates(p,r){
  if(P(p).imp.trade>=3)COM.forEach(c=>r[c]=Math.min(r[c],2));
  if(G.merchant&&G.merchant.p===p){const k=TERR_RES[HT(G.merchant.h)];if(k)r[k]=2;}
  if(G.fleet&&G.fleet.p===p)r[G.fleet.k]=2;
}
function activeStrength(p){return Object.values(G.kn).filter(k=>k.p===p&&k.act).reduce((s,k)=>s+k.lvl,0);}
function cityCount(p){return G.vOwn.filter(o=>o&&o.p===p&&o.city).length;}

/* ---- event die ---- */
function ckEvent(ev,red){
  const f=evFace(ev);const out={face:f,red};
  if(f==='ship'){G.barb++;log(`The barbarian ship sails closer (${G.barb} of 7).`);if(G.barb>=7)out.attack=barbAttack();}
  else{out.drew=[];[G.cur,1-G.cur].forEach(p=>{const lvl=P(p).imp[f];if(lvl>0&&red<=lvl+1){const c=drawProg(p,f);if(c)out.drew.push({p,c});}});}
  return out;
}
function drawProg(p,deck){
  const d=G.progDecks[deck];if(!d.length)return null;const t=d.pop();const pl=P(p);
  if(PROG[t].vp){pl.progVP++;log(`${nm(p)} drew ${PROG[t].n}: +1 point.`);return t;}
  pl.prog.push({t,turn:G.turn});log(`${nm(p)} drew a ${TRACK[deck].n.toLowerCase()} progress card.`);
  if(pl.prog.length>4)pushPending({type:'progDiscard',p});
  return t;
}
function barbAttack(){
  const strength=cityCount(0)+cityCount(1);const def=[0,1].map(activeStrength);const D=def[0]+def[1];
  G.attacks++;const res={strength,def,D};
  log(`The barbarians land! Their strength is ${strength} (one per city); the knights defend with ${D}.`);
  if(strength>D){
    const elig=[0,1].filter(p=>G.vOwn.some(o=>o&&o.p===p&&o.city&&!o.metro));
    if(elig.length){const min=Math.min(...elig.map(p=>def[p]));const losers=elig.filter(p=>def[p]===min);
      losers.forEach(p=>{const cs=G.vOwn.map((o,v)=>({o,v})).filter(x=>x.o&&x.o.p===p&&x.o.city&&!x.o.metro).sort((a,b)=>(a.o.wall?1:0)-(b.o.wall?1:0));
        const c=cs[0];const pl=P(p);
        if(pl.settlements>0){c.o.city=false;c.o.wall=false;pl.cities++;pl.settlements--;}else{G.vOwn[c.v]=null;pl.cities++;}
        log(`${nm(p)} had the weakest defence and loses a city to the barbarians.`);});
      res.losers=losers;}
    else log('No city could be pillaged.');
  }else{
    const max=Math.max(def[0],def[1]);const top=[0,1].filter(p=>def[p]===max);
    if(max>0&&top.length===1){P(top[0]).defender++;log(`The barbarians are driven off. ${nm(top[0])} is named Defender: +1 point.`);res.defender=top[0];}
    else if(max>0){top.forEach(p=>pushPending({type:'progChoose',p}));res.tie=top;log('The barbarians are driven off. The defenders tie, so each draws a progress card of their choice.');}
    else log('The barbarians found no cities and sailed away.');
  }
  G.barb=0;Object.values(G.kn).forEach(k=>k.act=false);
  if(!G.robberOn){G.robberOn=true;log('The robber is now free to move.');}
  updateLongest();
  return res;
}
function ckAqueduct(gains,gold){
  [G.cur,1-G.cur].forEach(p=>{if(P(p).imp.science>=3&&sumH(gains[p])===0&&!gold[p])addGold(p,1,'aqueduct');});
}
function progChoose(deck){const pd=G.pending;if(!pd||pd.type!=='progChoose'||!G.progDecks[deck].length)return false;nextPending();drawProg(pd.p,deck);return true;}
function progDiscard(i){const pd=G.pending;if(!pd||pd.type!=='progDiscard')return false;const pl=P(pd.p);const c=pl.prog[i];if(!c)return false;
  pl.prog.splice(i,1);G.progDecks[PROG[c.t].deck].unshift(c.t);log(`${nm(pd.p)} discarded a progress card.`);if(pl.prog.length<=4)nextPending();return true;}

/* ---- improvements & metropolis ---- */
function freeCity(p){const i=G.vOwn.findIndex(o=>o&&o.p===p&&o.city&&!o.metro);return i<0?null:i;}
function improveCost(p,t){return Math.max(0,P(p).imp[t]+1-(G.crane===p?1:0));}
function improveBlock(p,t){
  const pl=P(p);if(G.phase!=='main'||G.pending||!G.rolled||G.winner!=null)return 'Roll first, then you can improve.';
  if(pl.imp[t]>=5)return 'This track is complete.';
  if(cityCount(p)<1)return 'You need a city to improve.';
  const c=improveCost(p,t);if(pl.res[TRACK[t].com]<c)return `Needs ${c} ${CNAME[TRACK[t].com]}.`;
  return '';
}
function improve(t){
  const p=G.cur,pl=P(p);if(improveBlock(p,t))return false;
  const c=improveCost(p,t);pay(p,{[TRACK[t].com]:c});pl.imp[t]++;if(G.crane===p)G.crane=null;
  log(`${nm(p)} built ${LEVEL_NAMES[t][pl.imp[t]-1]} (${TRACK[t].n} ${pl.imp[t]}).`);
  checkMetro(p,t);checkWin();return true;
}
function checkMetro(p,t){
  const L=P(p).imp[t];if(L<4)return;const m=G.metro[t];
  if(!m){const v=freeCity(p);if(v!=null){G.vOwn[v].metro=t;G.metro[t]={p,v};log(`${nm(p)} founds the ${TRACK[t].metro}: +2 points.`);}return;}
  if(m.p!==p&&L===5&&P(m.p).imp[t]<5){const v=freeCity(p);if(v!=null){if(G.vOwn[m.v])delete G.vOwn[m.v].metro;G.vOwn[v].metro=t;G.metro[t]={p,v};log(`${nm(p)} takes over the ${TRACK[t].metro}.`);}}
}
function ckAfterCity(p){TRACKS.forEach(t=>checkMetro(p,t));}

/* ---- walls ---- */
function wallSpots(p){return G.vOwn.map((o,v)=>({o,v})).filter(x=>x.o&&x.o.p===p&&x.o.city&&!x.o.wall).map(x=>x.v);}
function buildWall(v,free){
  const p=G.cur;if(G.phase!=='main'||G.winner!=null)return false;
  if(!wallSpots(p).includes(v)||ckWalls(p)>=3)return false;
  if(free){if(!G.pending||G.pending.type!=='engineer')return false;}
  else{if(G.pending||!G.rolled||!canAfford(p,KCOST.wall))return false;pay(p,KCOST.wall);}
  G.vOwn[v].wall=true;log(`${nm(p)} built a city wall${free?' with the Engineer':''}.`);if(free)nextPending();return true;
}

/* ---- knights ---- */
const knightsOf=(p,l)=>Object.keys(G.kn).filter(v=>G.kn[v].p===p&&(l==null||G.kn[v].lvl===l)).map(Number);
const linkedEdge=(v,p)=>T.verts[v].edges.some(e=>ownEdge(e,p));
function knightSpots(p){return T.verts.filter(v=>!G.vOwn[v.i]&&!G.kn[v.i]&&linkedEdge(v.i,p)).map(v=>v.i);}
function canBuildKnight(p){return knightsOf(p,1).length<2&&knightSpots(p).length>0;}
function buildKnight(v,opts){
  const p=G.cur;opts=opts||{};const lvl=opts.lvl||1;
  if(G.phase!=='main'||G.winner!=null||!knightSpots(p).includes(v)||knightsOf(p,lvl).length>=2)return false;
  if(opts.free){if(!G.pending||G.pending.type!=='deserter')return false;}
  else{if(G.pending||!G.rolled||!canAfford(p,KCOST.knight))return false;pay(p,KCOST.knight);}
  G.kn[v]={p,lvl,act:!!opts.act,tB:G.turn,tA:opts.act?G.turn:-1,tP:-1};
  log(`${nm(p)} ${opts.free?'placed':'recruited'} a ${KNAMES[lvl].toLowerCase()}.`);
  if(opts.free)nextPending();updateLongest();return true;
}
function promoteBlock(p,v){
  const k=G.kn[v];if(!k||k.p!==p)return 'Not your knight.';if(k.lvl>=3)return 'Already a mighty knight.';
  if(k.lvl===2&&P(p).imp.politics<3)return 'Mighty knights need a Fortress (Politics 3).';
  if(knightsOf(p,k.lvl+1).length>=2)return `You have no ${KNAMES[k.lvl+1].toLowerCase()} pieces left.`;
  if(k.tP===G.turn)return 'A knight can be promoted once per turn.';
  return '';
}
function promoteKnight(v,free){
  const p=G.cur;if(G.phase!=='main'||G.winner!=null||promoteBlock(p,v))return false;
  if(free){if(!G.pending||G.pending.type!=='smith')return false;}
  else{if(G.pending||!G.rolled||!canAfford(p,KCOST.promote))return false;pay(p,KCOST.promote);}
  const k=G.kn[v];k.lvl++;k.tP=G.turn;log(`${nm(p)} promoted a knight to ${KNAMES[k.lvl].toLowerCase()}.`);
  if(free){G.pending.left--;if(G.pending.left<=0||!smithTargets(p).length)nextPending();}
  return true;
}
function activateKnight(v){
  const p=G.cur,k=G.kn[v];if(G.phase!=='main'||G.pending||!G.rolled||G.winner!=null||!k||k.p!==p||k.act||!canAfford(p,KCOST.activate))return false;
  pay(p,KCOST.activate);k.act=true;k.tA=G.turn;log(`${nm(p)} activated a knight.`);return true;
}
function knightCanAct(p,v){const k=G.kn[v];return !!(k&&k.p===p&&k.act&&k.tA!==G.turn&&G.phase==='main'&&G.rolled&&!G.pending&&G.winner==null);}
function reachable(v,p){
  const seen=new Set([v]),out=[],q=[v];
  while(q.length){const x=q.shift();
    for(const e of T.verts[x].edges){if(!ownEdge(e,p,'road')&&!ownEdge(e,p,'ship'))continue;const E=T.edges[e];const y=E.a===x?E.b:E.a;if(seen.has(y))continue;seen.add(y);
      const b=G.vOwn[y],k=G.kn[y];out.push(y);
      if((b&&b.p!==p)||(k&&k.p!==p))continue;q.push(y);}}
  return out;
}
function knightMoves(v){
  const k=G.kn[v];if(!k)return [];const p=k.p;
  return reachable(v,p).filter(y=>{if(G.vOwn[y])return false;const o=G.kn[y];if(!o)return true;return o.p!==p&&o.lvl<k.lvl;});
}
function relocateKnight(v){
  const k=G.kn[v];delete G.kn[v];
  const dest=reachable(v,k.p).filter(y=>!G.vOwn[y]&&!G.kn[y]&&y!==v);
  if(dest.length){const d=dest[0];G.kn[d]=k;log(`${nm(k.p)}’s knight was pushed back along their roads.`);return d;}
  log(`${nm(k.p)}’s knight had nowhere to go and returns to their supply.`);return null;
}
function moveKnight(from,to){
  const p=G.cur;if(!knightCanAct(p,from)||!knightMoves(from).includes(to))return false;
  const k=G.kn[from];let displaced=false;
  if(G.kn[to]){const tmp=G.kn[to];delete G.kn[to];G.kn[to]=tmp;relocateKnight(to);displaced=true;}
  delete G.kn[from];G.kn[to]=k;k.act=false;k.tU=G.turn;
  log(displaced?`${nm(p)}’s knight displaced an opposing knight.`:`${nm(p)} moved a knight.`);updateLongest();return true;
}
function canChase(p,v){return knightCanAct(p,v)&&robberActive()&&G.robber!=null&&T.hexes[G.robber].v.includes(v);}
function chaseRobber(v){const p=G.cur;if(!canChase(p,v))return false;const k=G.kn[v];k.act=false;k.tU=G.turn;log(`${nm(p)}’s knight chased the robber away.`);pushPending({type:'robber'});return true;}

/* ---- progress cards ---- */
function smithTargets(p){return knightsOf(p).filter(v=>!promoteBlock(p,v));}
function openRoads(){
  return G.eOwn.map((o,i)=>({o,i})).filter(x=>x.o&&x.o.k==='road'&&x.o.p<2).filter(({o,i})=>{const E=T.edges[i];
    return [E.a,E.b].some(v=>{const b=G.vOwn[v];if(b&&b.p===o.p)return false;return !T.verts[v].edges.some(f=>f!==i&&ownEdge(f,o.p,'road'));});}).map(x=>x.i);
}
function inventorHexes(){return G.board.hexes.map((h,i)=>i).filter(i=>{const n=G.board.hexes[i].n;return n&&![2,12,6,8].includes(n);});}
function merchantHexes(p){return T.hexes.filter(h=>TERR_RES[HT(h.i)]&&!G.board.hexes[h.i].noRobber&&h.v.some(v=>G.vOwn[v]&&G.vOwn[v].p===p)).map(h=>h.i);}
function intrigueTargets(p){return Object.keys(G.kn).map(Number).filter(v=>G.kn[v].p!==p&&T.verts[v].edges.some(e=>ownEdge(e,p,'road')));}
function progBlock(t){
  const p=G.cur,q=1-p,pl=P(p);
  if(G.phase!=='main'||G.winner!=null)return 'Not available right now.';
  if(G.pending)return 'Finish the current step first.';
  if(t==='alchemist'){if(G.rolled)return 'The Alchemist must be played before you roll.';return '';}
  if(!G.rolled)return 'Roll first. Only the Alchemist is played before rolling.';
  switch(t){
    case 'engineer':return wallSpots(p).length&&ckWalls(p)<3?'':'You need a city without a wall (maximum 3 walls).';
    case 'inventor':return inventorHexes().length>=2?'':'There aren’t two tokens that can be swapped.';
    case 'roadbuilding':return freeEdgeTargets(p).length?'':'There’s nowhere to build.';
    case 'smith':return smithTargets(p).length?'':'None of your knights can be promoted.';
    case 'mastermerchant':return vp(q,false)>vp(p,false)&&handCount(q)>0?'':'Only when your opponent has more points than you and holds cards.';
    case 'wedding':return vp(q,false)>vp(p,false)?'':'Only when your opponent has more points than you.';
    case 'saboteur':return vp(q,false)>=vp(p,false)?'':'Only when your opponent has at least as many points as you.';
    case 'merchant':return merchantHexes(p).length?'':'You need a building next to a resource tile.';
    case 'bishop':return robberActive()?'':'The robber can’t move until the barbarians have attacked once.';
    case 'deserter':return knightsOf(q).length?'':'Your opponent has no knights.';
    case 'diplomat':return openRoads().length?'':'There are no open roads.';
    case 'intrigue':return intrigueTargets(p).length?'':'No opposing knight stands on your roads.';
    case 'spy':return P(q).prog.length?'':'Your opponent has no progress cards.';
    case 'warlord':return knightsOf(p).some(v=>!G.kn[v].act)?'':'All your knights are already active.';
  }
  return '';
}
function playProg(i,arg){
  const p=G.cur,q=1-p,pl=P(p);const c=pl.prog[i];if(!c)return false;const t=c.t;
  if(progBlock(t))return false;
  const take2=(k,n)=>{n=Math.min(n,G.bank[k]);pl.res[k]+=n;G.bank[k]-=n;return n;};
  const adjCount=terr=>T.hexes.filter(h=>HT(h.i)===terr&&h.v.some(v=>G.vOwn[v]&&G.vOwn[v].p===p)).length;
  let msg='';
  switch(t){
    case 'alchemist':{const a=arg&&arg[0],b=arg&&arg[1];if(!(a>=1&&a<=6&&b>=1&&b<=6))return false;G.alch=[a,b];msg=`set the dice to ${a} and ${b}`;break;}
    case 'crane':G.crane=p;msg='will pay one commodity less for the next improvement';break;
    case 'engineer':pushPending({type:'engineer'});msg='may build a free city wall';break;
    case 'inventor':pushPending({type:'inventor',first:null});msg='will swap two number tokens';break;
    case 'irrigation':{const n=take2('grain',2*adjCount('fields'));msg=`took ${n} grain`;break;}
    case 'mining':{const n=take2('ore',2*adjCount('mountains'));msg=`took ${n} ore`;break;}
    case 'medicine':G.medicine=p;msg='can build the next city for 2 ore and 1 grain';break;
    case 'roadbuilding':pushPending({type:'freeRoads',left:2});msg='will build 2 free roads';break;
    case 'smith':pushPending({type:'smith',left:2});msg='may promote 2 knights for free';break;
    case 'harbor':{if(!RES.includes(arg)||pl.res[arg]<1)return false;pl.res[arg]--;P(q).res[arg]++;
      if(COM.some(k=>P(q).res[k]>0))pushPending({type:'give',from:q,to:p,n:1,kinds:'com',why:'Commercial Harbor'});msg=`offered 1 ${RNAME[arg]} for a commodity`;break;}
    case 'mastermerchant':{const sel=arg||{};const n=sumH(sel);if(n!==Math.min(2,handCount(q))||HANDK().some(k=>(sel[k]||0)>P(q).res[k]))return false;
      HANDK().forEach(k=>{if(sel[k]){P(q).res[k]-=sel[k];pl.res[k]+=sel[k];}});msg=`took ${n} cards from ${nm(q)}`;break;}
    case 'merchant':pushPending({type:'merchant'});msg='will place the merchant';break;
    case 'fleet':{if(!HANDK().includes(arg))return false;G.fleet={p,k:arg};msg=`can trade ${KNAME(arg)} at 2:1 this turn`;break;}
    case 'resmono':{if(!RES.includes(arg))return false;const n=Math.min(2,P(q).res[arg]);P(q).res[arg]-=n;pl.res[arg]+=n;msg=`took ${n} ${RNAME[arg]}`;break;}
    case 'trademono':{if(!COM.includes(arg))return false;const n=Math.min(1,P(q).res[arg]);P(q).res[arg]-=n;pl.res[arg]+=n;msg=`took ${n} ${CNAME[arg]}`;break;}
    case 'bishop':pushPending({type:'robber',all:true});msg='will move the robber';break;
    case 'deserter':{const ks=knightsOf(q).sort((a,b)=>G.kn[a].lvl-G.kn[b].lvl||(G.kn[a].act?1:0)-(G.kn[b].act?1:0));const v=ks[0];const k=G.kn[v];delete G.kn[v];
      if(knightsOf(p,k.lvl).length<2&&knightSpots(p).length)pushPending({type:'deserter',lvl:k.lvl,act:k.act});
      msg=`made a ${KNAMES[k.lvl].toLowerCase()} desert`;updateLongest();break;}
    case 'diplomat':pushPending({type:'diplomat'});msg='will remove an open road';break;
    case 'intrigue':pushPending({type:'intrigue'});msg='will displace a knight';break;
    case 'saboteur':{const n=Math.floor(handCount(q)/2);if(n>0)pushPending({type:'discard',queue:[{p:q,n}]});msg=`made ${nm(q)} discard ${n}`;break;}
    case 'spy':{const j=+arg;const oc=P(q).prog[j];if(!oc)return false;P(q).prog.splice(j,1);pl.prog.push({t:oc.t,turn:G.turn});msg=`took a progress card from ${nm(q)}`;break;}
    case 'warlord':{knightsOf(p).forEach(v=>{const k=G.kn[v];if(!k.act){k.act=true;k.tA=G.turn;}});msg='activated all knights';break;}
    case 'wedding':{const n=Math.min(2,handCount(q));if(n>0)pushPending({type:'give',from:q,to:p,n,kinds:'any',why:'Wedding'});msg=`receives ${n} cards from ${nm(q)}`;break;}
    default:return false;
  }
  const at=pl.prog.findIndex(x=>x===c);pl.prog.splice(at,1);G.progDecks[PROG[t].deck].unshift(t);
  log(`${nm(p)} played ${PROG[t].n} and ${msg}.`);
  if(pl.prog.length>4&&!(G.pending&&G.pending.type==='progDiscard'))pushPending({type:'progDiscard',p});
  checkWin();return true;
}
function doGive(sel){
  const pd=G.pending;if(!pd||pd.type!=='give')return false;const from=P(pd.from),to=P(pd.to);
  const keys=pd.kinds==='com'?COM:HANDK();const have=keys.reduce((s,k)=>s+from.res[k],0);const need=Math.min(pd.n,have);
  if(keys.reduce((s,k)=>s+(sel[k]||0),0)!==need||keys.some(k=>(sel[k]||0)>from.res[k]))return false;
  keys.forEach(k=>{if(sel[k]){from.res[k]-=sel[k];to.res[k]+=sel[k];}});
  log(`${nm(pd.from)} gave ${resList(sel)} to ${nm(pd.to)} (${pd.why}).`);nextPending();return true;
}
function engineerPick(v){return buildWall(v,true);}
function inventorPick(h){
  const pd=G.pending;if(!pd||pd.type!=='inventor'||!inventorHexes().includes(h))return false;
  if(pd.first==null){pd.first=h;return true;}
  if(h===pd.first)return false;const A=G.board.hexes[pd.first],B=G.board.hexes[h];const t=A.n;A.n=B.n;B.n=t;G.board.ver=(G.board.ver||0)+1;
  log(`${nm(G.cur)} swapped the ${B.n} and the ${A.n}.`);nextPending();return true;
}
function merchantPick(h){const pd=G.pending;if(!pd||pd.type!=='merchant'||!merchantHexes(G.cur).includes(h))return false;
  G.merchant={h,p:G.cur};log(`${nm(G.cur)} placed the merchant on ${TERR_NAME[HT(h)].toLowerCase()}.`);nextPending();checkWin();return true;}
function deserterPick(v){const pd=G.pending;if(!pd||pd.type!=='deserter')return false;return buildKnight(v,{free:true,lvl:pd.lvl,act:pd.act});}
function diplomatPick(e){
  const pd=G.pending;if(!pd||pd.type!=='diplomat'||!openRoads().includes(e))return false;
  const o=G.eOwn[e];G.eOwn[e]=null;P(o.p).roads++;log(`${nm(G.cur)} removed ${o.p===G.cur?'one of their own':nm(o.p)+'’s'} roads.`);
  nextPending();if(o.p===G.cur&&validRoads(G.cur).length)pushPending({type:'freeRoads',left:1});
  updateLongest();return true;
}
function intriguePick(v){const pd=G.pending;if(!pd||pd.type!=='intrigue'||!intrigueTargets(G.cur).includes(v))return false;relocateKnight(v);nextPending();updateLongest();return true;}
function smithPick(v){return promoteKnight(v,true);}
function skipPending(){const pd=G.pending;if(!pd||!['smith','deserter','freeRoads','engineer','treason'].includes(pd.type))return false;nextPending();return true;}
