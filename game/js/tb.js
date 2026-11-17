'use strict';
/* =====================================================================
   TRADERS & BARBARIANS module
   Variants: Catan for Two, Friendly Robber, Event Cards, Harbormaster
   Scenarios: Fishermen, Rivers, Caravans, Barbarian Attack
   ===================================================================== */
['lake','swamp','oasis','castle'].forEach(t=>LAND_T.add(t));
Object.assign(TERR_NAME,{lake:'Lake',swamp:'Swamp',oasis:'Oasis',castle:'Castle'});
const VARS=()=>(G&&G.opts.vars)||{};
const NEUTRAL_COLORS=['#8b8f86','#7a5ca8'];
const EVENT_DECK=[[2,'plenty'],[3,'none'],[3,'conflict'],[4,'flees'],[4,'flees'],[4,'none'],[5,'tradeadv'],[5,'tournament'],[5,'none'],[5,'none'],
  [6,'none'],[6,'none'],[6,'neighbors'],[6,'quake'],[6,'epidemic'],[7,'robber'],[7,'robber'],[7,'robber'],[7,'robber'],[7,'robber'],[7,'robber'],
  [8,'none'],[8,'none'],[8,'none'],[8,'none'],[8,'epidemic'],[9,'calm'],[9,'none'],[9,'none'],[9,'none'],[10,'none'],[10,'none'],[10,'assist'],[11,'none'],[11,'assist'],[12,'calm']];
const EVENTS={
  none:{n:'A Beautiful Day',d:'No event. The island produces as normal.'},
  robber:{n:'Robber Attacks',d:'Resolve a 7 as normal.'},
  plenty:{n:'Plentiful Year',d:'Each player takes 1 resource of their choice from the bank.'},
  conflict:{n:'Conflict',d:'The player with Largest Army (or else the most played Knights) steals 1 random resource from their opponent.'},
  flees:{n:'Robber Flees',d:'The robber returns to the desert (or leaves the board).'},
  tradeadv:{n:'Trade Advantage',d:'The player with the Longest Road takes 1 random resource from their opponent.'},
  tournament:{n:'Tournament',d:'The player with the most played Knights takes 1 resource of their choice.'},
  neighbors:{n:'Good Neighbors',d:'Each player gives 1 resource of their choice to the other.'},
  quake:{n:'Earthquake',d:'Each player damages one road. You can’t build roads until it is repaired (1 lumber + 1 brick). Damaged roads still count for Longest Road.'},
  epidemic:{n:'Epidemic',d:'Cities produce only 1 resource this turn.'},
  calm:{n:'Calm Seas',d:'The player with the most buildings on harbors takes 1 resource of their choice.'},
  assist:{n:'Helpful Neighbor',d:'The player with more points gives 1 resource of their choice to the other.'}
};
const FISH_COST={robber:2,steal:3,resource:4,road:5,dev:7};
const TB_SCEN={
  fish:{name:'Fishermen',sub:'A lake and six fishing grounds catch fish when their numbers roll. Spend fish to chase off the robber, steal, take resources, build roads or draw development cards. Whoever holds the old boot needs 1 extra point.',target:10,tb:'fish'},
  rivers:{name:'Rivers',sub:'Two rivers cross the island. Roads and settlements along them, and bridges over them, earn gold. Most gold is +1 point; least gold is −2.',target:10,tb:'rivers'},
  caravans:{name:'Caravans',sub:'Camel trains leave the oasis. After a turn with new buildings, both players bid wool and grain for where the next camel goes. A building between two camels is worth +1; a road with a camel counts double.',target:12,tb:'caravans'},
  barbattack:{name:'Barbarian Attack',sub:'Every new building draws barbarians onto the coast. Three on a tile conquer it. Recruit knights through development cards, move them at the end of your turn and capture barbarians: every 2 prisoners is a point.',target:12,tb:'barbattack'}
};
Object.entries(TB_SCEN).forEach(([k,v])=>{SCEN[k]=Object.assign({classic:true,tbBoard:true},v);});
SCEN_ORDER.push('fish','rivers','caravans','barbattack');

/* ---- board modifications for the classic-island scenarios ---- */
const hexIndex=(hexes,q,r)=>hexes.findIndex(h=>h.q===q&&h.r===r);
function tbBoardMod(b,scen){
  const H=b.hexes;const tp=buildTopo(H);
  const renumber=(skip)=>{H.forEach(h=>h.n=null);const idx=H.map((h,i)=>i).filter(i=>!skip(H[i]));assignNumbers(H,tp.hexAdj,idx,numberPool(idx.length));};
  const center=hexIndex(H,0,0);
  if(scen==='fish'||scen==='caravans'||scen==='barbattack'){
    // put the special tile in the centre: swap the desert into the centre then convert it
    const d=H.findIndex(h=>h.t==='desert');const t=H[center].t;H[center].t='desert';H[d].t=t;
    H[center].t=scen==='fish'?'lake':scen==='caravans'?'oasis':'castle';
    if(scen==='barbattack'){const f=H.findIndex(h=>h.t==='forest');H[f].t='desert';}
    renumber(h=>!TERR_RES[h.t]);
    if(scen==='barbattack'){const elevens=H.map((h,i)=>i).filter(i=>H[i].n===11);if(elevens.length){H[elevens[0]].n=null;}}
    b.robber=null;
  }
  if(scen==='fish'){
    H[center].nums=[2,3,11,12];
    // fishing grounds on coastal edges, away from harbors
    const used=new Set();b.harbors.forEach(h=>{const E=tp.edges[h.e];used.add(E.a);used.add(E.b);});
    const perim=tp.edges.filter(e=>e.hexes.length===1).sort((a,c)=>Math.atan2(a.y,a.x)-Math.atan2(c.y,c.x));
    const nums=shuffle([4,5,6,8,9,10]);b.grounds=[];
    for(let off=0;off<30&&b.grounds.length<6;off++){b.grounds=[];const u=new Set(used);
      for(let k=0;k<30&&b.grounds.length<6;k++){const e=perim[(k*5+off)%30];if(u.has(e.a)||u.has(e.b))continue;if([...tp.verts[e.a].adj,...tp.verts[e.b].adj].some(v=>u.has(v)&&!used.has(v)))continue;b.grounds.push({e:e.i,n:nums[b.grounds.length]});u.add(e.a);u.add(e.b);}
      if(b.grounds.length===6)break;}
    if(b.grounds.length<6){b.grounds=[];const u=new Set(used);for(const e of shuffle(perim.slice())){if(b.grounds.length>=6)break;if(u.has(e.a)||u.has(e.b))continue;b.grounds.push({e:e.i,n:nums[b.grounds.length]});u.add(e.a);u.add(e.b);}}
  }
  if(scen==='rivers'){
    const A=[[-2,1],[-1,1],[0,1]],B=[[2,-1],[1,-1],[0,-1],[-1,-1]];
    const pool=shuffle(['forest','forest','forest','forest','fields','fields','fields','fields','pasture','pasture','hills','mountains']);
    H.forEach(h=>h.t=null);
    const riverTerr={A:['mountains','pasture','swamp'],B:['hills','mountains','pasture','swamp']};
    b.rivers=[];
    [[A,'A'],[B,'B']].forEach(([path,k])=>{const idx=path.map(([q,r])=>hexIndex(H,q,r));idx.forEach((i,j)=>{H[i].t=riverTerr[k][j];H[i].river=k;});b.rivers.push(idx);});
    H.forEach(h=>{if(!h.t)h.t=pool.pop();});
    renumber(h=>!TERR_RES[h.t]);
    const sw=H.map((h,i)=>i).filter(i=>H[i].t==='swamp');b.robber=pick(sw);
    // bridge sites: edges shared by consecutive river hexes, plus the river mouth on the coast
    b.bridges=[];
    b.rivers.forEach(idx=>{for(let j=0;j+1<idx.length;j++){const e=tp.hexes[idx[j]].e.find(x=>tp.hexes[idx[j+1]].e.includes(x));if(e!=null)b.bridges.push(e);}
      const first=tp.hexes[idx[0]],next=tp.hexes[idx[1]];const dx=first.c.x-next.c.x,dy=first.c.y-next.c.y;
      const mouth=first.e.filter(e=>tp.edges[e].hexes.length===1).sort((a,c)=>{const A2=tp.edges[a],C2=tp.edges[c];return ((C2.x-first.c.x)*dx+(C2.y-first.c.y)*dy)-((A2.x-first.c.x)*dx+(A2.y-first.c.y)*dy);})[0];
      if(mouth!=null)b.bridges.push(mouth);});
    b.harbors=b.harbors.filter(h=>!b.bridges.includes(h.e));
  }
  if(scen==='caravans'){
    const c=tp.hexes[center];b.camelStarts=[0,2,4].map(k=>{const v=c.v[k];const e=tp.verts[v].edges.find(x=>!c.e.includes(x));return e;}).filter(e=>e!=null);
  }
  if(scen==='barbattack'){
    const coast=H.map((h,i)=>i).filter(i=>tp.hexes[i].e.some(e=>tp.edges[e].hexes.length===1)&&TERR_RES[H[i].t]);
    b.barb={};const at=n=>coast.find(i=>H[i].n===n);[2,12].forEach(n=>{const i=at(n);if(i!=null)b.barb[i]=1;});
    b.castle=center;
  }
  return b;
}

/* ---- init ---- */
function tbInit(){
  const v=VARS(),sc=G.opts.scen;
  if(v.two){
    G.neutral=NEUTRAL_COLORS.map(c=>({color:c,roads:15,settlements:5}));G.tokenSupply=10;
    G.players.forEach(pl=>{pl.tokens=5;pl.tokenUsed=-1;pl.knightCash=-1;});
    // one neutral settlement each, far from each other, on the island interior
    const cands=shuffle(T.verts.filter(v=>T.verts[v.i].hexes.length===3&&vBuildable(v.i)).map(v=>v.i));
    let placed=0;for(const v of cands){if(placed>=2)break;if(G.vOwn[v]||T.verts[v].adj.some(u=>G.vOwn[u]))continue;
      if(placed===1){const o=G.vOwn.findIndex(x=>x&&x.p===2);const a=T.verts[o],b=T.verts[v];if(Math.hypot(a.x-b.x,a.y-b.y)<3)continue;}
      G.vOwn[v]={p:2+placed,city:false};G.neutral[placed].settlements--;placed++;}
  }
  if(v.events){G.evDeck=buildEventDeck();}
  if(v.harbor){G.harborMaster=null;}
  if(sc==='fish'){G.fishPool=shuffle([...rep(1,11),...rep(2,10),...rep(3,8),'boot']);G.fishSpent=[];G.boot=null;G.players.forEach(pl=>{pl.fish=[];pl.fishUsed=-1;});}
  if(sc==='rivers'){G.players.forEach(pl=>{pl.gold=0;pl.bridges=3;pl.goldBuys=0;pl.goldTurn=-1;});}
  if(sc==='caravans'){G.camels={};G.camelsLeft=22;G.trains=G.board.camelStarts.map(e=>({start:e,edges:[],front:null,ended:false}));G.builtThisTurn=false;}
  if(sc==='barbattack'){G.kt={};G.barbs=G.board.barb||{};G.conq={};G.players.forEach(pl=>{pl.knightsLeft=6;pl.prisoners=0;pl.gold=0;pl.goldBuys=0;pl.goldTurn=-1;});
    G.devDeck=shuffle([...rep('capture',4),...rep('knighthood',14),...rep('swift',4),...rep('treason',4)]);}
}
function buildEventDeck(){const cards=shuffle(EVENT_DECK.map(([n,ev])=>({n,ev})));const bottom=cards.slice(0,5),top=cards.slice(5);return [...bottom,{n:0,ev:'newyear'},...top];}

/* ---- helpers ---- */
const owners=()=>G.neutral?[0,1,2,3]:G.players.map((_,i)=>i);
function edgeWeight(e){return G.camels&&G.camels[e]?2:1;}
function pubVP(p){return vp(p,false);}
function coastVertex(v){return T.verts[v].hexes.length<3||T.verts[v].hexes.some(isSeaHex);}

/* ---- victory points ---- */
function tbVP(p){
  let s=0;const sc=G.opts.scen;
  if(G.harborMaster===p)s+=2;
  if(sc==='rivers'){const g=[0,1].map(q=>P(q).gold);const mx=Math.max(...g),mn=Math.min(...g);
    if(g[p]===mx&&g[1-p]<mx)s+=1;if(g[p]===mn&&g[1-p]>mn)s-=2;}
  if(sc==='caravans')s+=camelVP(p);
  if(sc==='barbattack'){s+=Math.floor(P(p).prisoners/2);s-=conqueredVP(p);}
  return s;
}
function tbTargetBonus(p){return (G.boot===p?1:0);}
function camelVP(p){let s=0;G.vOwn.forEach((o,v)=>{if(o&&o.p===p&&T.verts[v].edges.filter(e=>G.camels[e]).length>=2)s++;});return s;}

/* ---- road restrictions ---- */
function tbRoadBlocked(e,p){
  if(G.board.bridges&&G.board.bridges.includes(e))return true;
  if(G.eOwn.some(o=>o&&o.p===p&&o.dmg))return true;
  if(G.conq&&T.edges[e].hexes.every(h=>G.conq[h]))return true;
  return false;
}
function tbSettleBlocked(v){return !!(G.conq&&T.verts[v].hexes.filter(isLandHex).every(h=>G.conq[h]));}

/* ---- after building ---- */
function tbAfterBuild(kind,i,p,setup){
  const v=VARS(),sc=G.opts.scen;
  if(kind==='settlement'){
    if(v.two){let t=0;if(T.verts[i].hexes.some(h=>HT(h)==='desert'))t+=2;if(coastVertex(i))t+=1;const k=Math.min(t,G.tokenSupply);if(k){P(p).tokens+=k;G.tokenSupply-=k;log(`${nm(p)} received ${k} trade token${k>1?'s':''}.`);}}
    if(sc==='rivers'&&T.verts[i].hexes.some(h=>G.board.hexes[h].river)){P(p).gold++;log(`${nm(p)} settled by the river: +1 gold.`);}
    if(sc==='fish'&&setup&&G.si>=2&&fishSpotVertex(i))drawFish(p,1);
  }
  if(kind==='road'&&sc==='rivers'&&T.edges[i].hexes.some(h=>G.board.hexes[h].river)){P(p).gold++;log(`${nm(p)} built along the river: +1 gold.`);}
  if((kind==='settlement'||kind==='city')&&v.harbor)updateHarborMaster();
  if((kind==='settlement'||kind==='city')&&sc==='caravans'&&!setup)G.builtThisTurn=true;
  if(!setup&&v.two&&(kind==='road'||kind==='settlement'))queueNeutral(kind);
  if((kind==='settlement'||kind==='city')&&sc==='barbattack'&&!setup)barbLanding();
}

/* ---- Catan for Two ---- */
function neutralTargets(kind){
  const out={};
  [2,3].forEach(n=>{
    const list=kind==='settlement'?T.verts.filter(v=>{if(G.vOwn[v.i]||!vBuildable(v.i)||T.verts[v.i].adj.some(u=>G.vOwn[u]))return false;return v.edges.some(e=>G.eOwn[e]&&G.eOwn[e].p===n);}).map(v=>v.i)
      :T.edges.filter(e=>{if(G.eOwn[e.i]||!eLand(e.i)||(G.board.bridges&&G.board.bridges.includes(e.i)))return false;return [e.a,e.b].some(v=>{const o=G.vOwn[v];if(o)return o.p===n;return T.verts[v].edges.some(f=>f!==e.i&&G.eOwn[f]&&G.eOwn[f].p===n);});}).map(e=>e.i);
    if(G.neutral[n-2][kind==='settlement'?'settlements':'roads']>0)list.forEach(x=>{if(!(x in out))out[x]=n;});});
  return out;
}
function queueNeutral(kind){
  let k=kind;let t=neutralTargets(k);
  if(k==='settlement'&&!Object.keys(t).length){k='road';t=neutralTargets(k);}
  if(Object.keys(t).length)pushPending({type:'neutral',kind:k});
}
function placeNeutral(i){
  const pd=G.pending;if(!pd||pd.type!=='neutral')return false;const t=neutralTargets(pd.kind);if(!(i in t))return false;const n=t[i];
  if(pd.kind==='settlement'){G.vOwn[i]={p:n,city:false};G.neutral[n-2].settlements--;}else{G.eOwn[i]={p:n,k:'road',t:G.turn};G.neutral[n-2].roads--;}
  log(`${nm(G.cur)} built a neutral ${pd.kind}.`);nextPending();updateLongest();return true;
}
function tokenCost(p){return pubVP(p)<=pubVP(1-p)?1:2;}
function tokenBlock(p){const pl=P(p);if(G.phase!=='main'||G.pending||G.winner!=null)return 'Not now.';if(pl.tokenUsed===G.turn)return 'You already used trade tokens this turn.';if(pl.tokens<tokenCost(p))return `Needs ${tokenCost(p)} trade token${tokenCost(p)>1?'s':''}.`;return '';}
function forcedTrade(){
  const p=G.cur,q=1-p,pl=P(p);if(tokenBlock(p)||handCount(q)===0)return false;
  const c=tokenCost(p);pl.tokens-=c;G.tokenSupply+=c;pl.tokenUsed=G.turn;
  const bag=[];HANDK().forEach(k=>{for(let i=0;i<P(q).res[k];i++)bag.push(k);});shuffle(bag);const took=bag.slice(0,2);took.forEach(k=>{P(q).res[k]--;pl.res[k]++;});
  log(`${nm(p)} used trade tokens to force a trade and took ${took.length} card${took.length>1?'s':''}.`);
  if(handCount(p)>0)pushPending({type:'give',from:p,to:q,n:2,kinds:'all',why:'Forced trade'});
  return took;
}
function forcedTradeGiveable(p){const q=1-p;return Math.min(2,handCount(p)+Math.min(2,handCount(q)));}
function tokenRobber(){const p=G.cur,pl=P(p);if(tokenBlock(p))return false;const d=G.board.hexes.findIndex(h=>h.t==='desert');
  const c=tokenCost(p);pl.tokens-=c;G.tokenSupply+=c;pl.tokenUsed=G.turn;G.robber=d>=0?d:null;log(`${nm(p)} paid trade tokens to send the robber ${d>=0?'to the desert':'off the board'}.`);return true;}
function cashKnight(){const p=G.cur,pl=P(p);if(G.phase!=='main'||pl.knights<1||pl.knightCash===G.turn||G.tokenSupply<1)return false;
  pl.knights--;pl.knightCash=G.turn;const k=Math.min(2,G.tokenSupply);pl.tokens+=k;G.tokenSupply-=k;log(`${nm(p)} returned a played Knight for ${k} trade tokens.`);
  if(G.army===p&&(pl.knights<3||pl.knights<P(1-p).knights)){G.army=null;const q=1-p;if(P(q).knights>=3&&P(q).knights>pl.knights)G.army=q;log('Largest Army changes hands.');}
  return true;}

/* ---- Friendly robber ---- */
function friendlyBlocked(h){if(!VARS().friendly)return false;return T.hexes[h].v.some(v=>{const o=G.vOwn[v];return o&&o.p<2&&pubVP(o.p)<=2;});}

/* ---- Harbormaster ---- */
function harborPoints(p){const vs=new Set();G.board.harbors.forEach(h=>{const E=T.edges[h.e];vs.add(E.a);vs.add(E.b);});let s=0;vs.forEach(v=>{const o=G.vOwn[v];if(o&&o.p===p)s+=o.city?2:1;});return s;}
function updateHarborMaster(){const hp=[0,1].map(harborPoints);const h=G.harborMaster;
  if(h==null){[0,1].forEach(p=>{if(G.harborMaster==null&&hp[p]>=3&&hp[p]>hp[1-p]){G.harborMaster=p;log(`${nm(p)} becomes Harbormaster (+2 points).`);}});}
  else if(hp[1-h]>hp[h]&&hp[1-h]>=3){G.harborMaster=1-h;log(`${nm(1-h)} takes the Harbormaster title.`);}}

/* ---- Event cards ---- */
function drawEvent(){
  if(!G.evDeck||!G.evDeck.length)G.evDeck=buildEventDeck();
  let c=G.evDeck.pop();if(c.ev==='newyear'){log('New Year: the event deck is reshuffled.');G.evDeck=buildEventDeck();c=G.evDeck.pop();}
  return c;
}
function diceFor(n){const a=Math.max(1,Math.min(6,n-1-Math.floor(rnd()*Math.min(5,n-2,12-n+0)+0)));let x=Math.max(1,n-6),y=Math.min(6,n-1);const d1=x+Math.floor(rnd()*(y-x+1));return [d1,n-d1];}
function resolveEvent(ev){
  const p=G.cur,q=1-p;
  const stealRandom=(from,to)=>{const bag=[];RES.forEach(r=>{for(let i=0;i<P(from).res[r];i++)bag.push(r);});if(!bag.length)return null;const r=pick(bag);P(from).res[r]--;P(to).res[r]++;return r;};
  switch(ev){
    case 'plenty':[p,q].forEach(x=>addGold(x,1,'Plentiful Year'));break;
    case 'conflict':{let w=G.army;if(w==null){const k=[0,1].map(x=>P(x).knights);if(k[0]!==k[1])w=k[0]>k[1]?0:1;}if(w!=null){const r=stealRandom(1-w,w);if(r)log(`Conflict: ${nm(w)} stole a card from ${nm(1-w)}.`);}break;}
    case 'flees':{const d=G.board.hexes.findIndex(h=>h.t==='desert');G.robber=d>=0?d:null;log('The robber flees.');break;}
    case 'tradeadv':{const w=G.longest;if(w!=null&&w<2){const r=stealRandom(1-w,w);if(r)log(`Trade Advantage: ${nm(w)} took a card from ${nm(1-w)}.`);}break;}
    case 'tournament':{const k=[0,1].map(x=>P(x).knights);if(k[0]!==k[1]){const w=k[0]>k[1]?0:1;addGold(w,1,'Tournament');}break;}
    case 'neighbors':[p,q].forEach(x=>{if(sum(P(x).res)>0)pushPending({type:'give',from:x,to:1-x,n:1,kinds:'res',why:'Good Neighbors'});});break;
    case 'quake':[p,q].forEach(x=>{const rs=G.eOwn.map((o,i)=>({o,i})).filter(z=>z.o&&z.o.p===x&&z.o.k==='road'&&!z.o.dmg);if(rs.length){rs[rs.length-1].o.dmg=true;log(`Earthquake: one of ${nm(x)}’s roads is damaged.`);}});break;
    case 'calm':{const h=[0,1].map(harborBuildings);if(h[0]!==h[1]){const w=h[0]>h[1]?0:1;if(h[w]>0)addGold(w,1,'Calm Seas');}break;}
    case 'assist':{const s=[0,1].map(pubVP);if(s[0]!==s[1]){const rich=s[0]>s[1]?0:1;if(sum(P(rich).res)>0)pushPending({type:'give',from:rich,to:1-rich,n:1,kinds:'res',why:'Helpful Neighbor'});}break;}
  }
}
function harborBuildings(p){const vs=new Set();G.board.harbors.forEach(h=>{const E=T.edges[h.e];vs.add(E.a);vs.add(E.b);});let s=0;vs.forEach(v=>{const o=G.vOwn[v];if(o&&o.p===p)s++;});return s;}
function repairRoad(){const p=G.cur;const e=G.eOwn.findIndex(o=>o&&o.p===p&&o.dmg);if(e<0||G.phase!=='main'||!G.rolled||G.pending||!canAfford(p,COST.road))return false;
  pay(p,COST.road);G.eOwn[e].dmg=false;log(`${nm(p)} repaired a road.`);return true;}

/* ---- Fishermen ---- */
function fishSpotVertex(v){if(G.opts.scen!=='fish')return false;const lake=G.board.hexes.findIndex(h=>h.t==='lake');if(lake>=0&&T.hexes[lake].v.includes(v))return true;return (G.board.grounds||[]).some(g=>{const E=T.edges[g.e];return E.a===v||E.b===v;});}
function drawFish(p,n){
  const pl=P(p);let got=0;
  for(let i=0;i<n;i++){if(!G.fishPool.length){G.fishPool=shuffle(G.fishSpent);G.fishSpent=[];}if(!G.fishPool.length)break;const t=G.fishPool.pop();
    if(t==='boot'){G.boot=p;log(`${nm(p)} fished up the old boot! They need 1 extra point to win.`);continue;}
    pl.fish.push(t);got+=t;}
  if(pl.fish.length>7){pl.fish.sort((a,b)=>b-a);const extra=pl.fish.splice(7);G.fishSpent.push(...extra);}
  if(got)log(`${nm(p)} caught ${got} fish.`);
}
function fishProduce(n){
  if(G.opts.scen!=='fish')return;const lake=G.board.hexes.findIndex(h=>h.t==='lake');
  const draws=[0,0];
  if(lake>=0&&G.board.hexes[lake].nums.includes(n)&&G.robber!==lake)T.hexes[lake].v.forEach(v=>{const o=G.vOwn[v];if(o&&o.p<2)draws[o.p]+=o.city?2:1;});
  (G.board.grounds||[]).forEach(g=>{if(g.n!==n)return;const E=T.edges[g.e];[E.a,E.b].forEach(v=>{const o=G.vOwn[v];if(o&&o.p<2)draws[o.p]+=o.city?2:1;});});
  [G.cur,1-G.cur].forEach(p=>{if(draws[p])drawFish(p,draws[p]);});
}
const fishTotal=p=>(P(p).fish||[]).reduce((a,b)=>a+b,0);
function fishPayment(p,cost){
  const f=P(p).fish;let best=null;const n=f.length;
  for(let m=1;m<(1<<n);m++){let s=0,c=0;for(let i=0;i<n;i++)if(m&(1<<i)){s+=f[i];c++;}if(s>=cost&&(!best||s<best.s||(s===best.s&&c<best.c)))best={m,s,c};}
  return best;
}
function fishBlock(p,act){
  if(G.phase!=='main'||G.winner!=null||G.pending)return 'Not now.';if(!G.rolled)return 'Roll first.';
  const cost=FISH_COST[act];if(fishTotal(p)<cost)return `Needs ${cost} fish.`;
  if(act==='robber'&&G.robber==null)return 'The robber isn’t on the board.';
  if(act==='steal'&&sum(P(1-p).res)===0)return 'Your opponent has no resources.';
  if(act==='road'&&(P(p).roads<1||!validRoads(p).length))return 'There’s nowhere to build a road.';
  if(act==='dev'&&(!G.devDeck.length||G.opts.ck))return 'No development cards available.';
  return '';
}
function spendFish(act){
  const p=G.cur,pl=P(p);if(fishBlock(p,act))return false;const pay=fishPayment(p,FISH_COST[act]);if(!pay)return false;
  const keep=[],spent=[];pl.fish.forEach((v,i)=>((pay.m&(1<<i))?spent:keep).push(v));pl.fish=keep;G.fishSpent.push(...spent);
  let msg='';
  if(act==='robber'){G.robber=null;msg='sent the robber off the board';}
  else if(act==='steal'){const bag=[];RES.forEach(r=>{for(let i=0;i<P(1-p).res[r];i++)bag.push(r);});const r=pick(bag);P(1-p).res[r]--;pl.res[r]++;msg='stole a card';}
  else if(act==='resource'){addGold(p,1,'fish');msg='will take a resource';}
  else if(act==='road'){pushPending({type:'freeRoads',left:1,roadOnly:true});msg='will build a free road';}
  else if(act==='dev'){pl.dev.push({t:G.devDeck.pop(),turn:G.turn});msg='took a development card';}
  log(`${nm(p)} spent ${pay.s} fish and ${msg}.`);checkWin();return true;
}
function giveBoot(){const p=G.cur;if(G.boot!==p||G.phase!=='main'||G.pending)return false;const q=1-p;if(pubVP(q)<pubVP(p))return false;G.boot=q;log(`${nm(p)} handed the old boot to ${nm(q)}.`);return true;}

/* ---- Rivers ---- */
function bridgeSpots(p){if(!G.board.bridges||P(p).bridges<1)return [];
  return G.board.bridges.filter(e=>!G.eOwn[e]&&[T.edges[e].a,T.edges[e].b].some(v=>{const o=G.vOwn[v];if(o)return o.p===p;return T.verts[v].edges.some(f=>f!==e&&ownEdge(f,p,'road'));}));}
function buildBridge(e){const p=G.cur,pl=P(p);const cost={brick:2,wood:1};
  if(G.phase!=='main'||!G.rolled||G.pending||!bridgeSpots(p).includes(e)||!canAfford(p,cost))return false;
  pay(p,cost);G.eOwn[e]={p,k:'bridge',t:G.turn};pl.bridges--;pl.gold+=3;log(`${nm(p)} built a bridge: +3 gold.`);updateLongest();checkWin();return true;}
function goldBuyBlock(p){const pl=P(p);if(G.phase!=='main'||!G.rolled||G.pending)return 'Roll first.';if(pl.goldTurn!==G.turn)pl.goldBuys=0;if(pl.goldBuys>=2)return 'Only twice per turn.';if(pl.gold<2)return 'Needs 2 gold.';return '';}
function buyWithGold(r){const p=G.cur,pl=P(p);if(goldBuyBlock(p)||!RES.includes(r)||G.bank[r]<1)return false;pl.gold-=2;pl.goldTurn=G.turn;pl.goldBuys++;take(p,r,1);log(`${nm(p)} paid 2 gold for 1 ${RNAME[r]}.`);checkWin();return true;}
function sellForGold(r){const p=G.cur,pl=P(p);if(G.phase!=='main'||!G.rolled||G.pending)return false;const rate=rates(p)[r];if(pl.res[r]<rate)return false;pl.res[r]-=rate;G.bank[r]+=rate;pl.gold++;log(`${nm(p)} sold ${rate} ${RNAME[r]} for 1 gold.`);checkWin();return true;}

/* ---- Caravans ---- */
function camelSpots(){
  const out=new Set();if(G.camelsLeft<1)return [];
  G.trains.forEach(t=>{if(t.ended)return;
    if(!t.edges.length){if(!G.camels[t.start])out.add(t.start);return;}
    T.verts[t.front].edges.forEach(e=>{if(!G.camels[e])out.add(e);});});
  return [...out];
}
function placeCamel(e){
  const pd=G.pending;if(!pd||pd.type!=='camel'||!camelSpots().includes(e))return false;
  const t=G.trains.find(t=>!t.ended&&(t.edges.length?T.verts[t.front].edges.includes(e):t.start===e));
  const E=T.edges[e];let front;
  if(!t.edges.length){const oasis=G.board.hexes.findIndex(h=>h.t==='oasis');front=T.hexes[oasis].v.includes(E.a)?E.b:E.a;}else front=E.a===t.front?E.b:E.a;
  G.camels[e]=1;G.camelsLeft--;t.edges.push(e);t.front=front;
  if(T.verts[front].edges.some(x=>x!==e&&G.camels[x]))t.ended=true;
  if(!T.verts[front].edges.some(x=>!G.camels[x]))t.ended=true;
  log(`${nm(pd.chooser)} placed a camel.`);nextPending();updateLongest();checkWin();return true;
}
function startVote(){pushPending({type:'vote',bids:[null,null],order:[G.cur,1-G.cur]});}
function castVote(bid){
  const pd=G.pending;if(!pd||pd.type!=='vote')return false;const who=pd.order.find(x=>pd.bids[x]==null);const pl=P(who);
  if((bid.wool||0)>pl.res.wool||(bid.grain||0)>pl.res.grain)return false;
  pd.bids[who]={wool:bid.wool||0,grain:bid.grain||0};
  if(pd.bids.every(b=>b)){const v=pd.bids.map(b=>b.wool+b.grain);const chooser=v[0]===v[1]?G.cur:(v[0]>v[1]?0:1);
    [0,1].forEach(x=>{pay(x,pd.bids[x]);});log(`Camel vote: ${nm(0)} bid ${v[0]}, ${nm(1)} bid ${v[1]}. ${nm(chooser)} places the camel.`);
    nextPending();if(camelSpots().length)pushPending({type:'camel',chooser});}
  return true;
}
function tbBeforeEndTurn(){
  if(G.opts.scen==='caravans'&&G.builtThisTurn&&G.camelsLeft>0&&camelSpots().length){G.builtThisTurn=false;startVote();return false;}
  if(G.opts.scen==='barbattack'&&!G.knightsMoved){G.knightsMoved=true;pushPending({type:'kmoves'});return false;}
  return true;
}
function tbTurnReset(){G.builtThisTurn=false;G.knightsMoved=false;G.rollCount=0;G.firstN=null;}
