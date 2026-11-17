'use strict';
/* =====================================================================
   BARBARIAN ATTACK scenario
   ===================================================================== */
const BA_DEV={knighthood:{n:'Knighthood',d:'Place one of your knights on an empty edge of the castle.'},swift:{n:'Swift Knight',d:'Place one of your knights on any empty edge.'},
  capture:{n:'Capture',d:'Take one barbarian from a coastal tile as a prisoner. A conquered tile is freed.'},treason:{n:'Treason',d:'Take 2 gold, then move up to 2 barbarians from one coastal tile to another unconquered one.'}};
const BA=()=>G&&G.opts.scen==='barbattack';
function coastHexes(){return T.hexes.filter(h=>h.e.some(e=>T.edges[e].hexes.length===1)&&TERR_RES[HT(h.i)]).map(h=>h.i);}
function barbLanding(){
  const used=new Set();const coast=coastHexes();let tries=0,placed=0;
  while(placed<3&&tries<60){tries++;const d=1+Math.floor(rnd()*6)+1+Math.floor(rnd()*6);if(d===7||used.has(d))continue;used.add(d);placed++;
    const cand=coast.filter(h=>G.board.hexes[h].n===d&&!G.conq[h]&&(G.barbs[h]||0)<3).sort((a,b)=>(G.barbs[a]||0)-(G.barbs[b]||0));
    if(!cand.length){log(`Barbarians (${d}) find no landing place.`);continue;}
    const h=cand[0];G.barbs[h]=(G.barbs[h]||0)+1;log(`Barbarians land on the ${d}.`);
    if(G.barbs[h]>=3){G.conq[h]=true;log(`The ${d} is conquered! It stops producing.`);}}
  updateLongest();
}
function vConquered(v){const hs=T.verts[v].hexes.filter(h=>LAND_T.has(HT(h)));return hs.length>0&&hs.every(h=>G.conq[h]);}
function conqueredVP(p){if(!G.conq)return 0;let s=0;G.vOwn.forEach((o,v)=>{if(o&&o.p===p&&vConquered(v))s+=o.city?2:1;});return s;}
function castleEdges(){return T.hexes[G.board.castle].e;}
function kplaceSpots(pd){const free=e=>!G.kt[e];return (pd.castle?castleEdges():T.edges.map(e=>e.i).filter(e=>eLand(e))).filter(free);}
function baDevBought(t){
  const p=G.cur,pl=P(p);
  if(t==='knighthood'||t==='swift'){if(pl.knightsLeft>0&&kplaceSpots({castle:t==='knighthood'}).length)pushPending({type:'kplace',castle:t==='knighthood'});else log('No knight could be placed.');}
  else if(t==='capture'){if(Object.keys(G.barbs).some(h=>G.barbs[h]>0))pushPending({type:'capture'});}
  else if(t==='treason'){pl.gold+=2;if(Object.keys(G.barbs).some(h=>G.barbs[h]>0))pushPending({type:'treason',left:2,from:null});}
  log(`${nm(p)} played ${BA_DEV[t].n}.`);
}
function kplace(e){const pd=G.pending;if(!pd||pd.type!=='kplace'||!kplaceSpots(pd).includes(e))return false;const p=G.cur;
  G.kt[e]={p,moved:-1};P(p).knightsLeft--;log(`${nm(p)} placed a knight.`);nextPending();return true;}
function captureTargets(){return Object.keys(G.barbs).map(Number).filter(h=>G.barbs[h]>0);}
function capture(h){const pd=G.pending;if(!pd||pd.type!=='capture'||!captureTargets().includes(h))return false;
  G.barbs[h]--;P(G.cur).prisoners++;if(G.conq[h]){delete G.conq[h];log('A conquered tile is freed.');}log(`${nm(G.cur)} captured a barbarian.`);nextPending();checkWin();return true;}
function treasonTargets(){const pd=G.pending;if(!pd||pd.type!=='treason')return [];
  if(pd.from==null)return captureTargets();return coastHexes().filter(h=>h!==pd.from&&!G.conq[h]&&(G.barbs[h]||0)<3);}
function treason(h){const pd=G.pending;if(!treasonTargets().includes(h))return false;
  if(pd.from==null){pd.from=h;return true;}
  G.barbs[pd.from]--;if(G.conq[pd.from]&&G.barbs[pd.from]<3)delete G.conq[pd.from];G.barbs[h]=(G.barbs[h]||0)+1;if(G.barbs[h]>=3)G.conq[h]=true;
  pd.left--;pd.from=null;log(`${nm(G.cur)} moved a barbarian.`);if(pd.left<=0||!captureTargets().length)nextPending();return true;}
function knightRange(e,steps){
  const dist={[e]:0},q=[e];
  while(q.length){const x=q.shift();if(dist[x]>=steps)continue;const E=T.edges[x];
    [E.a,E.b].forEach(v=>T.verts[v].edges.forEach(y=>{if(dist[y]==null&&eLand(y)){dist[y]=dist[x]+1;q.push(y);}}));}
  const castle=castleEdges();
  return Object.keys(dist).map(Number).filter(y=>y!==e&&!G.kt[y]&&!castle.includes(y));
}
function knightCanMove(e){const k=G.kt[e];return !!(k&&k.p===G.cur&&k.moved!==G.turn&&G.pending&&G.pending.type==='kmoves');}
function moveEdgeKnight(from,to,boost){
  const p=G.cur;if(!knightCanMove(from))return false;if(boost&&!canAfford(p,{grain:1}))return false;
  if(!knightRange(from,boost?5:3).includes(to))return false;if(boost)pay(p,{grain:1});
  G.kt[to]=G.kt[from];delete G.kt[from];G.kt[to].moved=G.turn;log(`${nm(p)} moved a knight${boost?' (with grain)':''}.`);return true;}
function kmovesBlock(){const p=G.cur;const stuck=castleEdges().filter(e=>G.kt[e]&&G.kt[e].p===p&&G.kt[e].moved!==G.turn&&(knightRange(e,3).length||(canAfford(p,{grain:1})&&knightRange(e,5).length)));return stuck.length?'Knights on the castle must ride out first.':'';}
function finishKnightMoves(){
  const pd=G.pending;if(!pd||pd.type!=='kmoves'||kmovesBlock())return false;
  const coast=coastHexes();const res=[];const start=coast.find(h=>G.board.hexes[h].n===4);const order=start!=null?coast.slice(coast.indexOf(start)).concat(coast.slice(0,coast.indexOf(start))):coast;
  order.forEach(h=>{const b=G.barbs[h]||0;if(!b)return;const ks=T.hexes[h].e.filter(e=>G.kt[e]);if(ks.length<=b)return;
    const per=[0,1].map(p=>ks.filter(e=>G.kt[e].p===p).length);let left=b;
    [0,1].forEach(p=>{if(per[p]&&left>0){P(p).prisoners++;left--;}});
    if(left>0){let w=per[0]===per[1]?(1+Math.floor(rnd()*6)>=1+Math.floor(rnd()*6)?G.cur:1-G.cur):(per[0]>per[1]?0:1);P(w).prisoners+=left;if(per[0]===per[1])P(1-w).gold+=3;}
    G.barbs[h]=0;if(G.conq[h])delete G.conq[h];
    const die=1+Math.floor(rnd()*6);const col=[1,6].includes(die)?0:[2,5].includes(die)?1:2;
    T.hexes[h].e.forEach((e,k)=>{if(k%3===col&&G.kt[e]){const o=G.kt[e].p;delete G.kt[e];P(o).knightsLeft++;P(o).gold+=3;log(`${nm(o)} lost a knight in battle and received 3 gold.`);}});
    res.push(h);log(`The knights drove the barbarians off the ${G.board.hexes[h].n}.`);});
  nextPending();updateLongest();checkWin();
  return res;
}
