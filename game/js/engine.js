'use strict';
/* =====================================================================
   CONSTANTS
   ===================================================================== */
const RES=['wood','brick','wool','grain','ore'];
const RNAME={wood:'Lumber',brick:'Brick',wool:'Wool',grain:'Grain',ore:'Ore'};
const RCOL={wood:['#3d7034','#1d3a1a'],brick:['#bb5a2e','#7a3418'],wool:['#95c55c','#568a31'],grain:['#e7bd48','#b0821a'],ore:['#8f97a1','#4f5660']};
const TERR_RES={forest:'wood',hills:'brick',pasture:'wool',fields:'grain',mountains:'ore'};
const COM=['paper','cloth','coin'];
const CNAME={paper:'Paper',cloth:'Cloth',coin:'Coin'};
const CCOL={paper:['#d9cfae','#9c8f68'],cloth:['#b0577a','#6e2a47'],coin:['#7f8fa6','#3e4a5e']};
const TERR_COM={forest:'paper',pasture:'cloth',mountains:'coin'};
const KNAME=k=>RNAME[k]||CNAME[k]||k;
const LAND_T=new Set(['forest','hills','pasture','fields','mountains','desert','gold']);
const TERR_NAME={forest:'Forest',hills:'Hills',pasture:'Pasture',fields:'Fields',mountains:'Mountains',desert:'Desert',gold:'Gold field',sea:'Sea',fog:'Fog',village:'Village'};
const COST={road:{wood:1,brick:1},ship:{wood:1,wool:1},settlement:{wood:1,brick:1,wool:1,grain:1},city:{grain:2,ore:3},dev:{wool:1,grain:1,ore:1}};
const DEV={
  knight:{n:'Knight',d:'Move the robber (or the pirate, on sea maps) and steal one card. Three or more Knights earns Largest Army.'},
  vp:{n:'Victory Point',d:'Worth 1 point while it sits in your hand. The other players can’t see it.'},
  road:{n:'Road Building',d:'Place 2 roads for free. On sea maps you may place ships instead, in any mix.'},
  plenty:{n:'Year of Plenty',d:'Take any 2 resource cards from the bank.'},
  monopoly:{n:'Monopoly',d:'Name a resource. Every other player hands you all their cards of it.'}
};
const DEV_ORDER=['knight','road','plenty','monopoly','vp'];
const COLORS=[{n:'Red',h:'#c23a2c'},{n:'Blue',h:'#2f66c6'},{n:'White',h:'#ebe5d6'},{n:'Orange',h:'#e07b22'},{n:'Green',h:'#3f9a4d'},{n:'Purple',h:'#8a56c4'}];
const PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const ORI={1:[0,0],2:[-90,0],3:[0,-90],4:[0,90],5:[90,0],6:[0,180]};
const ROB={x:-.35,y:-.31};
const SQ3=Math.sqrt(3);

/* =====================================================================
   UTILITIES
   ===================================================================== */
const $=s=>document.querySelector(s);
const rnd=Math.random;
/* one fair die: the browser's cryptographic random source, with rejection sampling so every face has exactly the same chance (252 = 6 x 42) */
function rollDie(){try{const a=new Uint8Array(1);do{crypto.getRandomValues(a);}while(a[0]>=252);return 1+a[0]%6;}catch(e){return 1+Math.floor(rnd()*6);}}
const rep=(x,n)=>Array(n).fill(x);
const zero=()=>({wood:0,brick:0,wool:0,grain:0,ore:0});
const sum=o=>RES.reduce((s,r)=>s+(o[r]||0),0);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h||w;return c;}
const pick=a=>a[Math.floor(rnd()*a.length)];

/* =====================================================================
   SCENARIOS
   ===================================================================== */
const TL=s=>s.split('').map(c=>({F:'forest',H:'hills',P:'pasture',W:'fields',M:'mountains',D:'desert',G:'gold','~':'sea'}[c]));
const BASE_POOL=TL('DFFFFHHHPPPPWWWWMMM');
const SCEN={
  classic:{name:'Classic island',sub:'The standard 19-tile island.',target:10,classic:true},
  shores:{name:'New Shores',sub:'Settle the small islands off the main coast. 1 bonus point for your first settlement on each small island.',target:13,sea:true,setupOn:'*',bonus:{per:1},harbors:9,
    map:['~~~~~~~~~~~~','~~~***~~~++~','~~~****~~~~~','~~*****~~~++','~~~****~~~+~','~~~***~~~~~~','~~~~~~~+~~~~','~~~~S~~++~~~','~~~~~~~~~~~~'],
    pools:{'*':BASE_POOL,'+':TL('GGWHMMPF')}},
  four:{name:'Four Islands',sub:'Start on one or two islands. Settling a foreign island earns 1 point, then 2 for each further one.',target:12,sea:true,setupOn:'*',bonus:{sched:[1,2,2]},harbors:10,
    map:['~~~~~~~~~~~','~~***~~***~','~***~~~***~','~~~~~S~~~~~','~~***~~***~','~***~~~***~','~~~~~~~~~~~'],
    pools:{'*':TL('FFFFFPPPPPWWWWHHHHMMMMDD')}},
  fog:{name:'Fog Islands',sub:'Sail into the fog. Every tile you reveal that is land pays you 1 resource.',target:12,sea:true,setupOn:'*',harbors:9,robberOn:'gold',
    map:['~~~~~~~~~~~~','~~***~~ffff~','~~****~ffff~','~*****~ffff~','~~****~ffff~','~~***~~~~~~~','~~~~~~~S~~~~','~~~~~~G~~G~~','~~~~~~~~~~~~'],
    pools:{'*':TL('FFFFPPPPWWWWHHHHMMM')},fogStack:TL('~~~~~~~~DFFWHMPG'),fogNums:[3,4,5,5,6,8,10]},
  desert:{name:'Through the Desert',sub:'A desert splits the island. 1 bonus point for your first settlement in each area beyond it, and on each small island.',target:12,sea:true,setupOn:'*',desertSplits:true,bonus:{per:1},harbors:9,
    map:['~~~~~~~~~~~~~','~~***D++~~~~~','~****D++~~~~~','~~***~D+~~++~','~****~~~~~~~~','~~***~~S~++~~','~~~~~~~~~~~~~'],
    pools:{'*':TL('FFFFHHHPPPPWWWMMM'),'+':TL('GGWHMPFHP')}},
  tribe:{name:'The Forgotten Tribe',sub:'Sail to the tribe’s islands. Ships that reach their shores collect victory points, development cards and harbors.',target:13,sea:true,setupOn:'*',harbors:0,
    map:['~~~~~~~~~~~~','~~T~~~~~~T~~','~~~~***~~~~~','~T~****~~T~~','~~~*****~~~~','~T~~****~T~~','~~~~***S~~~~','~~~T~~~~T~~~','~~~~~~~~~~~~'],
    pools:{'*':BASE_POOL,T:TL('PWFHMPWM')},gifts:true},
  cloth:{name:'Cloth Trade',sub:'Reach the villages by ship. They pay cloth when their numbers roll; every 2 cloth is 1 point. The game also ends when only 3 villages have cloth left.',target:14,sea:true,setupOn:'*',harbors:9,villages:true,noLongest:true,
    map:['~~~~~~~~~~~~~','~~*****~~~~~~','~~******~~~~~','~~~~~~~~~V~~~','~~V~~~S~~~~~~','~~~~~~~~~V~~~','~~V~~~~~~~~~~','~~~~******~~~','~~~~~*****~~~','~~~~~~~~~~~~~'],
    pools:{'*':TL('FFFFFHHHHPPPPPWWWWMMMD'),V:['village','village','village','village']}},
  newworld:{name:'New World',sub:'A random archipelago every game. 1 bonus point for your first settlement on each island you didn’t start on.',target:12,sea:true,setupOn:'*',bonus:{per:1},harbors:9,random:true}
};
const SCEN_ORDER=['classic','shores','four','fog','desert','tribe','cloth','newworld'];

/* =====================================================================
   TOPOLOGY (built from any set of axial hexes)
   ===================================================================== */
function buildTopo(coords){
  const raw=coords.map(h=>({x:SQ3*(h.q+h.r/2),y:1.5*h.r}));
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;raw.forEach(p=>{x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);});
  const ox=(x0+x1)/2,oy=(y0+y1)/2;
  const hexes=coords.map((h,i)=>({i,q:h.q,r:h.r,c:{x:raw[i].x-ox,y:raw[i].y-oy},v:[],e:[]}));
  const verts=[],vKey={},edges=[],eKey={};
  const key=p=>Math.round(p.x*100)+','+Math.round(p.y*100);
  hexes.forEach(h=>{for(let k=0;k<6;k++){const a=Math.PI/180*(60*k+30);const p={x:h.c.x+Math.cos(a),y:h.c.y+Math.sin(a)};const kk=key(p);
    if(!(kk in vKey)){vKey[kk]=verts.length;verts.push({i:verts.length,x:p.x,y:p.y,hexes:[],adj:[],edges:[]});}
    const vi=vKey[kk];h.v.push(vi);verts[vi].hexes.push(h.i);}});
  hexes.forEach(h=>{for(let k=0;k<6;k++){const a=h.v[k],b=h.v[(k+1)%6];const lo=Math.min(a,b),hi=Math.max(a,b);const kk=lo+'-'+hi;
    if(!(kk in eKey)){eKey[kk]=edges.length;const e={i:edges.length,a:lo,b:hi,hexes:[],x:(verts[lo].x+verts[hi].x)/2,y:(verts[lo].y+verts[hi].y)/2};edges.push(e);
      verts[lo].adj.push(hi);verts[hi].adj.push(lo);verts[lo].edges.push(e.i);verts[hi].edges.push(e.i);}
    const ei=eKey[kk];h.e.push(ei);edges[ei].hexes.push(h.i);}});
  const hexAdj=hexes.map(()=>[]);
  edges.forEach(e=>{if(e.hexes.length===2){hexAdj[e.hexes[0]].push(e.hexes[1]);hexAdj[e.hexes[1]].push(e.hexes[0]);}});
  let bx=0,bz=0;verts.forEach(v=>{bx=Math.max(bx,Math.abs(v.x));bz=Math.max(bz,Math.abs(v.y));});
  return {hexes,verts,edges,hexAdj,bx,bz};
}
let T=null,T_ID=null;
function syncTopo(){if(G&&T_ID!==G.board.id){T=buildTopo(G.board.hexes);T_ID=G.board.id;}}

/* =====================================================================
   BOARD GENERATION
   ===================================================================== */
function numberPool(n){
  const p=[2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];
  const rm=[12,2,11,3,10,4,9,5,8,6],add=[5,9,4,10,3,11,6,8,2,12];
  for(let k=0;p.length>n;k++){const i=p.indexOf(rm[k%rm.length]);if(i>=0)p.splice(i,1);}
  for(let k=0;p.length<n;k++)p.push(add[k%add.length]);
  return p;
}
function assignNumbers(hexes,adj,idxs,pool){
  const red=n=>n===6||n===8;
  for(let tries=0;tries<30000;tries++){
    const p=shuffle(pool.slice());const m={};idxs.forEach((h,k)=>m[h]=p[k]);let ok=true;
    for(const h of idxs){const a=m[h];
      if(hexes[h].t==='gold'&&red(a)){ok=false;break;}
      for(const j of adj[h]){const b=m[j];if(b==null)continue;if(red(a)&&red(b)){ok=false;break;}if(a===b&&tries<20000){ok=false;break;}}
      if(!ok)break;}
    if(ok||tries===29999){idxs.forEach(h=>hexes[h].n=m[h]);return;}
  }
}
function classicBoard(){
  const hexes=[];
  for(let r=-2;r<=2;r++)for(let q=-2;q<=2;q++)if(Math.abs(q+r)<=2)hexes.push({q,r,ch:'*'});
  const terr=shuffle(BASE_POOL.slice());hexes.forEach((h,i)=>{h.t=terr[i];h.n=null;});
  const tp=buildTopo(hexes);
  assignNumbers(hexes,tp.hexAdj,hexes.map((h,i)=>i).filter(i=>hexes[i].t!=='desert'),numberPool(18));
  const perim=tp.edges.filter(e=>e.hexes.length===1).sort((a,b)=>Math.atan2(a.y,a.x)-Math.atan2(b.y,b.x)).map(e=>e.i);
  const types=shuffle(['any','any','any','any','wood','brick','wool','grain','ore']);
  const gaps=[3,3,4,3,3,4,3,3,4];const harbors=[];let pos=Math.floor(rnd()*30);
  for(let k=0;k<9;k++){harbors.push({e:perim[pos%30],t:types[k]});pos+=gaps[k];}
  return {hexes,harbors,robber:hexes.findIndex(h=>h.t==='desert'),pirate:null};
}
function bigClassicBoard(){
  const hexes=[];
  [3,4,5,6,5,4,3].forEach((c,k)=>{const r=k-3,q0=-(c-1)/2+.5-r/2;for(let i=0;i<c;i++)hexes.push({q:q0+i,r,ch:'*'});});
  const terr=shuffle(TL('DD'+'FFFFFF'+'PPPPPP'+'WWWWWW'+'HHHHH'+'MMMMM'));hexes.forEach((h,i)=>{h.t=terr[i];h.n=null;});
  const tp=buildTopo(hexes);
  assignNumbers(hexes,tp.hexAdj,hexes.map((h,i)=>i).filter(i=>hexes[i].t!=='desert'),numberPool(28));
  const perim=tp.edges.filter(e=>e.hexes.length===1).sort((a,b)=>Math.atan2(a.y,a.x)-Math.atan2(b.y,b.x)).map(e=>e.i);
  const types=shuffle(['any','any','any','any','any','any','wood','brick','wool','grain','ore']);
  const harbors=[],off=Math.floor(rnd()*perim.length);
  for(let k=0;k<11;k++)harbors.push({e:perim[(off+Math.round(k*perim.length/11))%perim.length],t:types[k]});
  const ds=hexes.map((h,i)=>i).filter(i=>hexes[i].t==='desert');
  return {hexes,harbors,robber:ds[0],pirate:null};
}
function oddrNeighbors(r,c){return (r&1)?[[r,c-1],[r,c+1],[r-1,c],[r-1,c+1],[r+1,c],[r+1,c+1]]:[[r,c-1],[r,c+1],[r-1,c-1],[r-1,c],[r+1,c-1],[r+1,c]];}
function randomWorld(){
  const R=9,C=12;const g=[...Array(R)].map(()=>rep(-1,C));
  const sizes=[9,7,5,4];const seeds=shuffle([[2,2],[2,8],[6,3],[6,9],[4,6]]).slice(0,4);
  const okCell=(r,c,id)=>r>=1&&r<R-1&&c>=1&&c<C-1&&g[r][c]<0&&oddrNeighbors(r,c).every(([a,b])=>!(g[a]&&g[a][b]>=0&&g[a][b]!==id));
  seeds.forEach(([r,c],id)=>{g[r][c]=id;let cells=[[r,c]];
    for(let t=0;t<200&&cells.length<sizes[id];t++){const [a,b]=pick(cells);const nb=oddrNeighbors(a,b).filter(([x,y])=>okCell(x,y,id));if(nb.length){const [x,y]=pick(nb);g[x][y]=id;cells.push([x,y]);}}});
  return g.map(row=>row.map(v=>v>=0?'*':'~').join(''));
}
function mapBoard(sc){
  const rows=sc.random?randomWorld():sc.map;
  const pools={};Object.keys(sc.pools||{}).forEach(k=>pools[k]=shuffle(sc.pools[k].slice()));
  if(sc.random){const n=rows.join('').split('*').length-1;pools['*']=shuffle(TL('FFFFFPPPPPWWWWWHHHHMMMMGG').concat(rep('fields',30)).slice(0,n));}
  const hexes=[];
  rows.forEach((row,r)=>{for(let c=0;c<row.length;c++){const ch=row[c];if(ch==='.'||ch===' ')continue;const q=c-((r-(r&1))>>1);const h={q,r,ch,n:null};
    if(ch==='~'||ch==='S')h.t='sea';else if(ch==='f')h.t='fog';else if(ch==='D')h.t='desert';else if(ch==='G')h.t='gold';else h.t=(pools[ch]&&pools[ch].pop())||'fields';
    if(ch==='T'){h.tribe=true;h.noSettle=true;h.noRobber=true;}
    if(ch==='V'){h.t='village';h.noSettle=true;h.noRobber=true;}
    hexes.push(h);}});
  const tp=buildTopo(hexes);
  const numbered=hexes.map((h,i)=>i).filter(i=>LAND_T.has(hexes[i].t)&&hexes[i].t!=='desert'&&!hexes[i].tribe);
  assignNumbers(hexes,tp.hexAdj,numbered,numberPool(numbered.length));
  const b={hexes,harbors:[],robber:null,pirate:hexes.findIndex(h=>h.ch==='S')};if(b.pirate<0)b.pirate=null;
  const deserts=hexes.map((h,i)=>i).filter(i=>hexes[i].t==='desert');
  if(sc.robberOn==='gold'){const gs=hexes.map((h,i)=>i).filter(i=>hexes[i].t==='gold');b.robber=gs.length?pick(gs):null;}
  else if(deserts.length)b.robber=pick(deserts);
  // harbors on coasts of buildable land
  const land=i=>LAND_T.has(hexes[i].t)&&!hexes[i].tribe;const sea=i=>hexes[i].t==='sea';
  const coast=shuffle(tp.edges.filter(e=>e.hexes.length===2&&e.hexes.some(land)&&e.hexes.some(sea)).map(e=>e.i));
  const used=new Set();const types=shuffle([...['wood','brick','wool','grain','ore'],...rep('any',Math.max(0,(sc.harbors||0)-5))]).slice(0,sc.harbors||0);
  for(const e of coast){if(b.harbors.length>=types.length)break;const E=tp.edges[e];if(used.has(E.a)||used.has(E.b))continue;
    const nb=new Set([E.a,E.b,...tp.verts[E.a].adj,...tp.verts[E.b].adj]);if([...nb].some(v=>used.has(v)))continue;
    b.harbors.push({e,t:types[b.harbors.length]});used.add(E.a);used.add(E.b);}
  if(sc.fogStack){b.fogStack=shuffle(sc.fogStack.slice());b.fogNums=shuffle(sc.fogNums.slice());}
  if(sc.gifts){
    const gifts=shuffle([...rep({k:'vp'},8),...rep({k:'dev'},4),...['wood','brick','wool','grain','ore','any'].map(t=>({k:'harbor',t}))]);
    const tribes=shuffle(hexes.map((h,i)=>i).filter(i=>hexes[i].tribe));b.gifts={};let gi=0,round=0;
    while(gi<gifts.length&&round<6){for(const h of tribes){if(gi>=gifts.length)break;
      const cand=shuffle(tp.hexes[h].e.filter(e=>tp.edges[e].hexes.length===2&&tp.edges[e].hexes.some(sea)&&!(e in b.gifts)&&!tp.edges[e].hexes.some(x=>x===b.pirate)));
      const free=cand.find(e=>{const E=tp.edges[e];return !Object.keys(b.gifts).some(o=>{const O=tp.edges[o];return O.a===E.a||O.a===E.b||O.b===E.a||O.b===E.b;});});
      if(free!=null){b.gifts[free]=Object.assign({},gifts[gi++]);}}round++;}
  }
  if(sc.villages){
    const vh=hexes.map((h,i)=>i).filter(i=>hexes[i].t==='village');const pairs=shuffle([[2,12],[3,11],[4,10],[5,9]]);
    b.villages=[];vh.forEach((h,k)=>pairs[k].forEach(n=>b.villages.push({h,n,cloth:5})));b.clothSupply=10;
  }
  return b;
}
function genBoard(scen,n){
  const sc=SCEN[scen]||SCEN.classic;
  let b=sc.classic?(n>=5?bigClassicBoard():classicBoard()):mapBoard(sc);if(sc.tbBoard)b=tbBoardMod(b,scen);
  b.id=Math.random().toString(36).slice(2,10);b.scen=scen;
  return b;
}

/* =====================================================================
   RULES ENGINE  (all state in G, plain JSON)
   ===================================================================== */
let G=null;
function setG(g){G=g;T_ID=null;syncTopo();}
const SC=()=>SCEN[G.opts.scen]||SCEN.classic;
const P=p=>G.players[p];
const nm=p=>p<G.players.length?G.players[p].name:'Neutral';
const NP=()=>G.players.length;
const PL=()=>G.players.map((_,i)=>i);
const fromCur=()=>PL().map(i=>(G.cur+i)%G.players.length);
const HT=i=>G.board.hexes[i].t;
const isLandHex=i=>LAND_T.has(HT(i));
const isSeaHex=i=>HT(i)==='sea';
const HANDK=()=>G&&G.opts.ck?RES.concat(COM):RES;
function handCount(p){const r=P(p).res;return HANDK().reduce((s,k)=>s+(r[k]||0),0);}
function pushPending(x){if(!G.pending)G.pending=x;else (G.pq=G.pq||[]).push(x);}
function nextPending(){G.pending=null;if(G.pq&&G.pq.length)G.pending=G.pq.shift();}
function log(m){G.logId++;G.log.push({id:G.logId,t:G.turn,m});if(G.log.length>300)G.log.shift();}
function canAfford(p,c){return Object.keys(c).every(r=>(P(p).res[r]||0)>=(c[r]||0));}
function pay(p,c){Object.keys(c).forEach(r=>{const k=c[r]||0;P(p).res[r]-=k;G.bank[r]+=k;});}
function take(p,r,k){k=Math.min(k,G.bank[r]);P(p).res[r]+=k;G.bank[r]-=k;return k;}
function resList(o){return RES.concat(COM).filter(r=>o[r]).map(r=>`${o[r]} ${KNAME(r)}`).join(', ');}

function newGame(opts,board){
  const sc=SCEN[opts.scen]||SCEN.classic;
  const N=opts.players.length,big=N>=5;
  board=board||genBoard(opts.scen,N);
  const first=Math.floor(rnd()*N);const fw=[...Array(N).keys()].map(i=>(first+i)%N);
  const g={ver:2,opts,board,robber:board.robber,pirate:board.pirate,
    players:opts.players.map(p=>({name:p.name,color:p.color,res:zero(),dev:[],knights:0,roads:15,ships:sc.sea?15:0,settlements:5,cities:4,bonus:0,home:[],claimed:[],cloth:0,villages:[],harborGifts:[]})),
    bank:big?{wood:24,brick:24,wool:24,grain:24,ore:24}:{wood:19,brick:19,wool:19,grain:19,ore:19},
    devDeck:shuffle(big?[...rep('knight',20),...rep('vp',5),...rep('road',3),...rep('plenty',3),...rep('monopoly',3)]:[...rep('knight',14),...rep('vp',5),...rep('road',2),...rep('plenty',2),...rep('monopoly',2)]),
    vOwn:[],eOwn:[],areas:[],setupAreas:[],
    phase:'setup',order:fw.concat(fw.slice().reverse()),si:0,step:'settlement',lastV:null,
    cur:first,turn:0,rolled:false,dice:null,lastDice:null,devPlayed:false,shipMoved:false,pending:null,
    longest:null,army:null,roadLen:Array(N).fill(0),winner:null,log:[],logId:0,seen:Array(N).fill(0)};
  if(opts.ck){COM.forEach(c=>{g.bank[c]=12;g.players.forEach(p=>p.res[c]=0);});}
  setG(g);
  G.vOwn=Array(T.verts.length).fill(null);
  if(opts.ck)ckInit();
  tbInit();G.eOwn=Array(T.edges.length).fill(null);
  G.areas=computeAreas();
  const setupCh=sc.setupOn||'*';G.setupAreas=[...new Set(G.board.hexes.map((h,i)=>h.ch&&setupCh.includes(h.ch)?G.areas[i]:-1).filter(a=>a>=0))];
  log(`${nm(first)} won the coin toss and places first.`);
  return G;
}

/* ---- terrain / geometry helpers ---- */
function computeAreas(){
  const split=!!SC().desertSplits;const ok=i=>isLandHex(i)&&!(split&&HT(i)==='desert');
  const area=Array(T.hexes.length).fill(-1);let k=0;
  T.hexes.forEach(h=>{if(!ok(h.i)||area[h.i]>=0)return;const st=[h.i];area[h.i]=k;
    while(st.length){const x=st.pop();T.hexAdj[x].forEach(y=>{if(ok(y)&&area[y]<0){area[y]=k;st.push(y);}});}k++;});
  return area;
}
const vAreas=v=>[...new Set(T.verts[v].hexes.map(h=>G.areas[h]).filter(a=>a>=0))];
function vBuildable(v){const hs=T.verts[v].hexes.filter(isLandHex);return hs.length>0&&hs.some(h=>!G.board.hexes[h].noSettle);}
const eLand=e=>T.edges[e].hexes.some(h=>isLandHex(h)&&!G.board.hexes[h].noSettle);
const eSea=e=>{const E=T.edges[e];return E.hexes.length===2&&E.hexes.some(isSeaHex);};
const ownEdge=(e,p,k)=>{const o=G.eOwn[e];return o&&o.p===p&&(k==null||(k==='ship'?o.k==='ship':o.k!=='ship'));};

function canSettle(p,v,setup){
  if(G.vOwn[v]||!vBuildable(v)||(G.kn&&G.kn[v])||tbSettleBlocked(v))return false;
  if(T.verts[v].adj.some(u=>G.vOwn[u]))return false;
  if(setup)return SC().classic||vAreas(v).some(a=>G.setupAreas.includes(a));
  return T.verts[v].edges.some(e=>ownEdge(e,p));
}
function canRoad(p,e,from){
  if(G.eOwn[e]||!eLand(e)||tbRoadBlocked(e,p))return false;
  const E=T.edges[e];
  if(from!=null)return E.a===from||E.b===from;
  return [E.a,E.b].some(v=>{const o=G.vOwn[v];if(o)return o.p===p;if(oppKnight(v,p))return false;return T.verts[v].edges.some(f=>f!==e&&ownEdge(f,p,'road'));});
}
function canShip(p,e,from){
  if(!SC().sea||G.eOwn[e]||!eSea(e))return false;
  const E=T.edges[e];
  if(G.pirate!=null&&E.hexes.includes(G.pirate))return false;
  if(from!=null)return E.a===from||E.b===from;
  return [E.a,E.b].some(v=>{const o=G.vOwn[v];if(o)return o.p===p;if(oppKnight(v,p))return false;return T.verts[v].edges.some(f=>f!==e&&ownEdge(f,p,'ship'));});
}
const oppKnight=(v,p)=>!!(G.kn&&G.kn[v]&&G.kn[v].p!==p);
const validSettlements=(p,setup)=>T.verts.filter(v=>canSettle(p,v.i,setup)).map(v=>v.i);
const validRoads=(p,from)=>T.edges.filter(e=>canRoad(p,e.i,from)).map(e=>e.i);
const validShips=(p,from)=>T.edges.filter(e=>canShip(p,e.i,from)).map(e=>e.i);
const validCities=p=>T.verts.filter(v=>{const o=G.vOwn[v.i];return o&&o.p===p&&!o.city;}).map(v=>v.i);
function edgeKinds(p,e,from){const k=[];if(canRoad(p,e,from))k.push('road');if(canShip(p,e,from))k.push('ship');return k;}

function vp(p,hidden){
  let s=0;G.vOwn.forEach(o=>{if(o&&o.p===p)s+=o.city?2:1;});
  if(G.longest===p)s+=2;if(G.army===p)s+=2;
  const pl=P(p);s+=pl.bonus||0;s+=Math.floor((pl.cloth||0)/2);
  if(G.opts.ck)s+=ckVP(p);
  s+=tbVP(p);
  if(hidden)s+=pl.dev.filter(d=>d.t==='vp').length;
  return s;
}
function rates(p){
  const r={wood:4,brick:4,wool:4,grain:4,ore:4};
  if(G.opts.ck)COM.forEach(c=>r[c]=4);
  G.board.harbors.forEach(h=>{const E=T.edges[h.e];
    if([E.a,E.b].some(v=>G.vOwn[v]&&G.vOwn[v].p===p)){if(h.t==='any')Object.keys(r).forEach(x=>r[x]=Math.min(r[x],3));else r[h.t]=2;}});
  if(G.opts.ck)ckRates(p,r);
  return r;
}
function longestRoadOf(p){
  if(SC().noLongest)return 0;
  let best=0;const used=new Set();
  const blocked=v=>{const o=G.vOwn[v];return (o&&o.p!==p)||oppKnight(v,p);};
  function dfs(v,len,pk){
    if(len>best)best=len;
    if(len>0&&blocked(v))return;
    const own=G.vOwn[v]&&G.vOwn[v].p===p;
    for(const e of T.verts[v].edges){
      if(!ownEdge(e,p)||used.has(e))continue;
      const k=G.eOwn[e].k==='ship'?'ship':'road';
      if(len>0&&pk!==k&&!own)continue;
      used.add(e);const E=T.edges[e];dfs(E.a===v?E.b:E.a,len+edgeWeight(e),k);used.delete(e);
    }
  }
  G.eOwn.forEach((o,i)=>{if(o&&o.p===p){dfs(T.edges[i].a,0,null);dfs(T.edges[i].b,0,null);}});
  return best;
}
function updateLongest(){
  if(SC().noLongest){G.roadLen=PL().map(()=>0);return;}
  const O=owners();const L={};O.forEach(p=>L[p]=longestRoadOf(p));G.roadLen=PL().map(p=>L[p]);
  const h=G.longest;let nh=h;const others=p=>Math.max(0,...O.filter(x=>x!==p).map(x=>L[x]));
  if(h!==null&&L[h]>=5&&L[h]>=others(h))nh=h;
  else{nh=null;const mx=Math.max(...O.map(x=>L[x]));const top=O.filter(x=>L[x]===mx);if(mx>=5&&top.length===1)nh=top[0];}
  if(nh!==h){G.longest=nh;
    if(nh!==null)log(`${nm(nh)} takes ${SC().sea?'Longest Trade Route':'Longest Road'} (${L[nh]}).`);
    else log('The longest route is broken and goes back to the box.');}
}
function updateArmy(){const p=G.cur,k=P(p).knights;
  if(k>=3&&G.army!==p&&(G.army===null||k>P(G.army).knights)){G.army=p;log(`${nm(p)} takes Largest Army (${k} knights).`);}}
function winTarget(p){return G.opts.target+(p==null?0:tbTargetBonus(p));}
function checkWin(){
  if(G.phase==='main'&&G.winner==null&&vp(G.cur,true)>=winTarget(G.cur)){G.winner=G.cur;G.phase='over';G.pending=null;G.pq=[];log(`${nm(G.cur)} reaches ${vp(G.cur,true)} points and wins!`);}
}

/* ---- seafaring extras ---- */
function islandBonus(p,v){
  const b=SC().bonus;if(!b)return 0;const pl=P(p);let got=0;
  vAreas(v).forEach(a=>{if(pl.home.includes(a)||pl.claimed.includes(a))return;
    const k=pl.claimed.length;pl.claimed.push(a);const val=b.sched?b.sched[Math.min(k,b.sched.length-1)]:b.per;pl.bonus+=val;got+=val;});
  if(got)log(`${nm(p)} settled a new island area: +${got} bonus point${got>1?'s':''}.`);
  return got;
}
function revealFog(e,p){
  const out=[];const E=T.edges[e];
  [E.a,E.b].forEach(v=>T.verts[v].hexes.forEach(h=>{
    if(HT(h)!=='fog')return;const H=G.board.hexes[h];
    const t=(G.board.fogStack&&G.board.fogStack.pop())||'sea';H.t=t;
    if(LAND_T.has(t)&&t!=='desert')H.n=(G.board.fogNums&&G.board.fogNums.pop())||null;
    out.push(h);
    if(TERR_RES[t]){const k=take(p,TERR_RES[t],1);log(`${nm(p)} discovered ${TERR_NAME[t]} and took ${k} ${RNAME[TERR_RES[t]]}.`);}
    else if(t==='gold'){log(`${nm(p)} discovered a gold field.`);addGold(p,1);}
    else log(`${nm(p)} revealed ${t==='sea'?'open sea':TERR_NAME[t]}.`);
  }));
  if(out.length){G.areas=computeAreas();G.board.ver=(G.board.ver||0)+1;}
  return out;
}
function addGold(p,n,why){if(n<=0)return;const q={p,n,why:why||'gold'};
  const all=[G.pending,...(G.pq||[])].filter(x=>x&&x.type==='gold');
  const tgt=all.find(x=>x!==G.pending)||(G.pending&&G.pending.type==='gold'?G.pending:null);
  if(tgt){const ex=tgt.queue.find(x=>x.p===p&&x.why===q.why);if(ex)ex.n+=n;else tgt.queue.push(q);}
  else pushPending({type:'gold',queue:[q]});}
function doGold(sel){
  const pd=G.pending;if(!pd||pd.type!=='gold')return false;const q=pd.queue[0];
  const need=Math.min(q.n,sum(G.bank));if(sum(sel)!==need||RES.some(r=>(sel[r]||0)>G.bank[r]))return false;
  RES.forEach(r=>{if(sel[r])take(q.p,r,sel[r]);});log(`${nm(q.p)} took ${resList(sel)} from ${q.why==='aqueduct'?'the aqueduct':'gold'}.`);
  pd.queue.shift();if(!pd.queue.length)nextPending();return true;
}
function claimGift(e,p){
  const gifts=G.board.gifts;if(!gifts||!gifts[e])return null;const g=gifts[e];delete gifts[e];const pl=P(p);
  if(g.k==='vp'){pl.bonus++;log(`${nm(p)} received a victory point from the tribe.`);}
  else if(g.k==='dev'){if(G.devDeck.length){pl.dev.push({t:G.devDeck.pop(),turn:G.turn});log(`${nm(p)} received a development card from the tribe.`);}}
  else if(g.k==='harbor'){pl.harborGifts.push(g.t);log(`${nm(p)} received a ${g.t==='any'?'3:1':'2:1 '+RNAME[g.t]} harbor from the tribe.`);}
  G.board.ver=(G.board.ver||0)+1;return g;
}
function connectVillages(e,p){
  const vs=G.board.villages;if(!vs)return;const pl=P(p);
  T.edges[e].hexes.forEach(h=>{if(HT(h)!=='village'||pl.villages.includes(h))return;pl.villages.push(h);
    const v=vs.find(x=>x.h===h&&x.cloth>0);if(v){v.cloth--;pl.cloth++;}else if(G.board.clothSupply>0){G.board.clothSupply--;pl.cloth++;}
    log(`${nm(p)} reached a village and received 1 cloth.`);});
}
function villageProduce(n){
  const vs=G.board.villages;if(!vs)return;
  vs.forEach(v=>{if(v.n!==n||v.cloth<=0)return;PL().forEach(p=>{if(!P(p).villages.includes(v.h))return;
    if(v.cloth>0){v.cloth--;P(p).cloth++;}else if(G.board.clothSupply>0){G.board.clothSupply--;P(p).cloth++;}});});
  if(vs.filter(v=>v.cloth>0).length<=3&&G.winner==null){
    const s=PL().map(p=>vp(p,true));let w=0;PL().forEach(p=>{if(s[p]>s[w]||(s[p]===s[w]&&P(p).cloth>P(w).cloth))w=p;});
    G.winner=w;G.phase='over';log(`Only three villages still have cloth. ${nm(w)} wins with ${s[w]} points.`);
  }
}
function afterEdgeBuilt(e,p){
  if(G.eOwn[e].k==='ship'){claimGift(e,p);connectVillages(e,p);}
  revealFog(e,p);
}
function harborGiftSpots(p){
  return T.edges.filter(E=>{if(E.hexes.length!==2||!E.hexes.some(isSeaHex)||!E.hexes.some(isLandHex))return false;
    if(![E.a,E.b].some(v=>G.vOwn[v]&&G.vOwn[v].p===p))return false;
    return !G.board.harbors.some(h=>{const H=T.edges[h.e];return h.e===E.i||[H.a,H.b].some(x=>x===E.a||x===E.b);});}).map(E=>E.i);
}
function placeHarborGift(e){const p=G.cur,pl=P(p);if(!pl.harborGifts.length||!harborGiftSpots(p).includes(e))return false;
  const t=pl.harborGifts.shift();G.board.harbors.push({e,t});G.board.ver=(G.board.ver||0)+1;log(`${nm(p)} placed a ${t==='any'?'3:1':'2:1'} harbor.`);return true;}

/* ---- setup ---- */
function setupSettle(v){
  const p=G.cur,pl=P(p);
  if(G.phase!=='setup'||G.step!=='settlement'||!canSettle(p,v,true))return false;
  const asCity=(G.opts.ck||G.opts.scen==='barbattack')&&G.si>=NP();
  if(asCity){G.vOwn[v]={p,city:true};pl.cities--;}else{G.vOwn[v]={p,city:false};pl.settlements--;}G.lastV=v;
  vAreas(v).forEach(a=>{if(!pl.home.includes(a))pl.home.push(a);});
  if(G.si>=NP()){const got=zero();let gold=0;T.verts[v].hexes.forEach(h=>{const t=HT(h);const r=TERR_RES[t];if(r)got[r]+=take(p,r,1);else if(t==='gold')gold++;});
    log(`${nm(p)} placed ${asCity?'a city':'a second settlement'} and collected ${resList(got)||'nothing'}${gold?` plus ${gold} gold pick`:''}.`);if(gold)addGold(p,gold);}
  else log(`${nm(p)} placed a settlement.`);
  tbAfterBuild('settlement',v,p,true);
  G.step='road';updateLongest();return true;
}
function setupEdge(e,kind){
  const p=G.cur,pl=P(p);
  if(G.phase!=='setup'||G.step!=='road'||G.pending)return false;
  const ks=edgeKinds(p,e,G.lastV);if(!ks.length)return false;const k=ks.includes(kind)?kind:ks[0];
  G.eOwn[e]={p,k,t:G.turn};if(k==='ship')pl.ships--;else pl.roads--;
  afterEdgeBuilt(e,p);if(k==='road')tbAfterBuild('road',e,p,true);G.si++;updateLongest();
  if(G.si>=2*NP()){G.phase='main';G.cur=G.order[0];G.turn=1;G.step=null;G.lastV=null;log(`Setup done. ${nm(G.cur)} rolls first.`);}
  else{G.cur=G.order[G.si];G.step='settlement';}
  return true;
}
const setupRoad=e=>setupEdge(e,'road');

/* ---- turn ---- */
function canRoll(){return G.phase==='main'&&!G.rolled&&!G.pending&&G.winner==null;}
function doRollCard(c,d){if(!canRoll())return null;c=c||drawEvent();G.lastEvent=c;G.epidemic=c.ev==='epidemic';if(c.ev==='flees')resolveEvent('flees');
  const res=doRoll(d||diceFor(c.n));G.epidemic=false;if(res&&!['flees','epidemic','none','robber'].includes(c.ev))resolveEvent(c.ev);if(res)res.card=c;return res;}
function produce(n){
  const NPl=NP(),gains=PL().map(()=>zero()),gold=PL().map(()=>0);
  const epi=!!G.epidemic;
  T.hexes.forEach((h,i)=>{const H=G.board.hexes[i];if(H.n!==n||i===G.robber||(G.conq&&G.conq[i]))return;
    if(H.t==='gold'){h.v.forEach(v=>{const o=G.vOwn[v];if(o&&o.p<NPl)gold[o.p]+=o.city?2:1;});return;}
    const r=TERR_RES[H.t];if(!r)return;const cm=G.opts.ck&&TERR_COM[H.t];
    h.v.forEach(v=>{const o=G.vOwn[v];if(!o||o.p>=NPl)return;if(o.city&&epi){gains[o.p][r]+=1;}else if(o.city&&cm){gains[o.p][r]+=1;gains[o.p][cm]=(gains[o.p][cm]||0)+1;}else gains[o.p][r]+=o.city?2:1;});});
  HANDK().forEach(r=>{const tot=gains.reduce((a,g)=>a+(g[r]||0),0);
    if(tot>G.bank[r]){const recv=PL().filter(p=>gains[p][r]>0);if(recv.length===1)gains[recv[0]][r]=G.bank[r];else recv.forEach(p=>{gains[p][r]=0;});}});
  PL().forEach(p=>HANDK().forEach(r=>{if(gains[p][r]){P(p).res[r]+=gains[p][r];G.bank[r]-=gains[p][r];}}));
  return {gains,gold};
}
function doRoll(d){
  if(!canRoll())return null;
  if(G.opts.ck&&d.length<3)d=d.concat([rollDie()]);
  const need=VARS().two?2:1;const n0=d[0]+d[1];
  if(need===2&&(G.rollCount||0)===1&&n0===G.firstN){G.dice=d;return {n:n0,reroll:true};}
  G.rollCount=(G.rollCount||0)+1;if(G.rollCount===1)G.firstN=n0;
  G.dice=d;G.rolled=G.rollCount>=need;const n=d[0]+d[1];
  log(`${nm(G.cur)} rolled ${n}.`);
  const ev=G.opts.ck?ckEvent(d[2],d[1]):null;
  if(G.winner!=null)return {n,ev};
  if(n===7){
    const q=[];fromCur().forEach(p=>{const c=handCount(p);if(c>handLimit(p))q.push({p,n:Math.floor(c/2)});});
    if(q.length)pushPending({type:'discard',queue:q});
    if(robberActive())pushPending({type:'robber'});
    return {n,seven:true,discards:q.slice(),ev};
  }
  const {gains,gold}=produce(n);
  PL().forEach(p=>{if(sum(gains[p])||COM.some(c=>gains[p][c]))log(`${nm(p)} collected ${resList(gains[p])}.`);});
  fromCur().forEach(p=>{if(gold[p])addGold(p,gold[p]);});
  villageProduce(n);fishProduce(n);
  if(G.opts.ck)ckAqueduct(gains,gold);
  return {n,gains,gold,ev};
}
function handLimit(p){return 7+(G.opts.ck?2*ckWalls(p):0);}
function robberActive(){if(G.opts.scen==='barbattack')return false;return !G.opts.ck||!!G.robberOn;}
function sumH(o){return HANDK().reduce((s,k)=>s+(o[k]||0),0);}
function doDiscard(sel){
  const pd=G.pending;if(!pd||pd.type!=='discard')return false;
  const q=pd.queue[0];if(sumH(sel)!==q.n)return false;
  if(HANDK().some(r=>(sel[r]||0)>P(q.p).res[r]||(sel[r]||0)<0))return false;
  pay(q.p,sel);log(`${nm(q.p)} discarded ${q.n} cards.`);
  pd.queue.shift();if(!pd.queue.length)nextPending();
  return true;
}
function pirateAllowed(p){if(!SC().sea||G.board.pirate===undefined)return false;if(SC().villages)return P(p).villages.length>0;return true;}
function thiefTargets(){
  const p=G.cur,out=[];
  T.hexes.forEach((h,i)=>{const H=G.board.hexes[i];
    if(H.t==='sea'){if(pirateAllowed(p)&&i!==G.pirate&&T.hexes[i].e.some(e=>T.edges[e].hexes.length===2))out.push(i);}
    else if((LAND_T.has(H.t))&&!H.noRobber&&i!==G.robber&&!friendlyBlocked(i))out.push(i);});
  if(VARS().friendly&&!out.some(i=>!isSeaHex(i))){const d=G.board.hexes.findIndex(h=>h.t==='desert');if(d>=0&&d!==G.robber)out.push(d);}
  return out;
}
function thiefVictims(h){
  const p=G.cur,s=new Set();
  if(isSeaHex(h))T.hexes[h].e.forEach(e=>{const o=G.eOwn[e];if(o&&o.k==='ship'&&o.p<NP()&&o.p!==p)s.add(o.p);});
  else T.hexes[h].v.forEach(v=>{const o=G.vOwn[v];if(o&&o.p<NP()&&o.p!==p)s.add(o.p);});
  return [...s].filter(q=>handCount(q)+(isSeaHex(h)&&SC().villages?P(q).cloth:0)>0&&!(VARS().friendly&&pubVP(q)<=2));
}
function moveRobber(h){
  if(!G.pending||G.pending.type!=='robber'||!thiefTargets().includes(h))return null;
  const p=G.cur;const sea=isSeaHex(h);const all=!!G.pending.all;
  if(sea)G.pirate=h;else G.robber=h;nextPending();
  const H=G.board.hexes[h];
  log(sea?`${nm(p)} moved the pirate.`:`${nm(p)} moved the robber to ${H.n?`the ${H.n}`:'the '+(TERR_NAME[H.t]||'tile').toLowerCase()}.`);
  const vs=thiefVictims(h);
  if(!vs.length){return {stolen:null,pirate:sea};}
  if(vs.length>1){if(G.pending)(G.pq=G.pq||[]).unshift(G.pending);G.pending={type:'steal',vs,pirate:sea};return {stolen:null,choose:true,vs,pirate:sea};}
  return doSteal(vs[0],sea);
}
function stealFrom(q){const pd=G.pending;if(!pd||pd.type!=='steal'||!pd.vs.includes(q))return null;const sea=pd.pirate;nextPending();return doSteal(q,sea);}
function doSteal(q,sea){
  const p=G.cur;const bag=[];HANDK().forEach(r=>{for(let i=0;i<P(q).res[r];i++)bag.push(r);});
  if(sea&&SC().villages)for(let i=0;i<P(q).cloth;i++)bag.push('cloth');
  const r=pick(bag);
  if(r==='cloth'){P(q).cloth--;P(p).cloth++;}else{P(q).res[r]--;P(p).res[r]++;}
  log(`${nm(p)} stole a card from ${nm(q)}.`);checkWin();
  return {stolen:r,from:q,pirate:sea};
}
function build(kind,i,free){
  if(G.phase!=='main'||G.winner!=null)return false;
  const p=G.cur,pl=P(p);
  if(kind==='road'||kind==='ship'){
    const ok=kind==='road'?canRoad(p,i):canShip(p,i);if(!ok)return false;
    const left=kind==='road'?pl.roads:pl.ships;if(left<1)return false;
    if(free){if(!(G.pending&&G.pending.type==='freeRoads'))return false;}
    else{if(G.pending||!G.rolled||!canAfford(p,COST[kind]))return false;pay(p,COST[kind]);}
    G.eOwn[i]={p,k:kind,t:G.turn};if(kind==='road')pl.roads--;else pl.ships--;
    log(`${nm(p)} built a ${kind}${free?' with Road Building':''}.`);
    if(free){const pd=G.pending;pd.left--;if(pd.left<=0||!freeEdgeTargets(p).length)nextPending();}
    afterEdgeBuilt(i,p);if(kind==='road')tbAfterBuild('road',i,p);
  }else if(kind==='settlement'){
    if(G.pending||!G.rolled||!canSettle(p,i,false)||pl.settlements<1||!canAfford(p,COST.settlement))return false;
    pay(p,COST.settlement);G.vOwn[i]={p,city:false};pl.settlements--;log(`${nm(p)} built a settlement.`);
    islandBonus(p,i);tbAfterBuild('settlement',i,p);
  }else if(kind==='city'){
    const o=G.vOwn[i];const cost=cityCost(p);
    if(G.pending||!G.rolled||!o||o.p!==p||o.city||pl.cities<1||!canAfford(p,cost))return false;
    pay(p,cost);o.city=true;pl.cities--;pl.settlements++;log(`${nm(p)} upgraded a settlement to a city${cost.ore===2?' with Medicine':''}.`);if(G.medicine===p)G.medicine=null;if(G.opts.ck)ckAfterCity(p);tbAfterBuild('city',i,p);
  }else return false;
  updateLongest();checkWin();return true;
}
function cityCost(p){return G.medicine===p?{grain:1,ore:2}:COST.city;}
function freeEdgeTargets(p){const pl=P(p);const s=new Set();if(pl.roads>0)validRoads(p).forEach(e=>s.add(e));if(pl.ships>0&&!(G.pending&&G.pending.roadOnly))validShips(p).forEach(e=>s.add(e));return [...s];}
function shipMovable(p,e){
  const o=G.eOwn[e];if(!o||o.p!==p||o.k!=='ship'||o.t===G.turn)return false;
  const E=T.edges[e];if(G.pirate!=null&&E.hexes.includes(G.pirate))return false;
  return [E.a,E.b].some(v=>{const b=G.vOwn[v];if(b&&b.p===p)return false;return !T.verts[v].edges.some(f=>f!==e&&ownEdge(f,p,'ship'));});
}
function movableShips(p){if(G.phase!=='main'||G.shipMoved||!G.rolled||G.pending||G.winner!=null)return [];return G.eOwn.map((o,i)=>i).filter(i=>shipMovable(p,i));}
function shipDestinations(p,from){const save=G.eOwn[from];G.eOwn[from]=null;const l=validShips(p).filter(e=>e!==from);G.eOwn[from]=save;return l;}
function moveShip(from,to){
  const p=G.cur;if(!movableShips(p).includes(from)||!shipDestinations(p,from).includes(to))return false;
  G.eOwn[to]=Object.assign({},G.eOwn[from]);G.eOwn[from]=null;G.shipMoved=true;
  log(`${nm(p)} moved a ship.`);afterEdgeBuilt(to,p);updateLongest();checkWin();return true;
}
function canBuyDev(){const p=G.cur;return !G.opts.ck&&G.phase==='main'&&G.rolled&&!G.pending&&G.winner==null&&G.devDeck.length>0&&canAfford(p,COST.dev);}
function buyDev(){
  if(!canBuyDev())return null;
  const p=G.cur;pay(p,COST.dev);const t=G.devDeck.pop();
  if(G.opts.scen==='barbattack'){log(`${nm(p)} bought a development card.`);baDevBought(t);checkWin();return t;}
  P(p).dev.push({t,turn:G.turn});
  log(`${nm(p)} bought a development card.`);checkWin();return t;
}
function devBlock(t){
  if(G.phase!=='main'||G.winner!=null)return 'Not available right now.';
  if(G.pending)return 'Finish the current step first.';
  if(G.sbp)return 'No development cards during the special building phase.';
  if(t==='vp')return 'Victory Point cards count automatically. Keep it secret.';
  const pl=P(G.cur);
  if(!pl.dev.some(c=>c.t===t))return 'You don’t have this card.';
  if(G.devPlayed)return 'You already played a development card this turn.';
  if(!pl.dev.some(c=>c.t===t&&c.turn<G.turn))return 'Bought this turn. You can play it from your next turn.';
  if(t==='road'&&!freeEdgeTargets(G.cur).length)return 'There’s nowhere to build.';
  if(t==='plenty'&&sum(G.bank)===0)return 'The bank is empty.';
  return '';
}
function takeDev(t){const pl=P(G.cur);const i=pl.dev.findIndex(c=>c.t===t&&c.turn<G.turn);pl.dev.splice(i,1);G.devPlayed=true;}
function playKnight(){if(devBlock('knight'))return false;takeDev('knight');P(G.cur).knights++;
  log(`${nm(G.cur)} played a Knight.`);updateArmy();G.pending={type:'robber'};checkWin();return true;}
function playRoadBuilding(){if(devBlock('road'))return false;takeDev('road');
  log(`${nm(G.cur)} played Road Building.`);G.pending={type:'freeRoads',left:2};return true;}
function playPlenty(sel){
  if(devBlock('plenty'))return false;
  const need=Math.min(2,sum(G.bank));if(sum(sel)!==need||RES.some(r=>(sel[r]||0)>G.bank[r]))return false;
  takeDev('plenty');RES.forEach(r=>{if(sel[r])take(G.cur,r,sel[r]);});
  log(`${nm(G.cur)} played Year of Plenty and took ${resList(sel)}.`);return true;
}
function playMonopoly(r){
  if(devBlock('monopoly')||!RES.includes(r))return false;
  takeDev('monopoly');let k=0;PL().forEach(q=>{if(q===G.cur)return;k+=P(q).res[r];P(q).res[r]=0;});P(G.cur).res[r]+=k;
  log(`${nm(G.cur)} played Monopoly on ${RNAME[r]} and took ${k}.`);return k;
}
function bankTrade(gv,gt){
  const p=G.cur;if(G.sbp||G.phase!=='main'||!G.rolled||G.pending||gv===gt||!HANDK().includes(gv)||!HANDK().includes(gt))return false;
  const rate=rates(p)[gv];if(P(p).res[gv]<rate||G.bank[gt]<1)return false;
  P(p).res[gv]-=rate;G.bank[gv]+=rate;P(p).res[gt]++;G.bank[gt]--;
  log(`${nm(p)} traded ${rate} ${KNAME(gv)} at ${rate}:1 for 1 ${KNAME(gt)}.`);return true;
}
function playerTrade(give,get,q){
  const p=G.cur;if(q==null)q=(p+1)%NP();if(q===p)return false;
  if(G.sbp||G.phase!=='main'||!G.rolled||G.pending||!sumH(give)||!sumH(get))return false;
  if(!canAfford(p,give)||!canAfford(q,get))return false;
  HANDK().forEach(r=>{const a=give[r]||0,b=get[r]||0;P(p).res[r]+=b-a;P(q).res[r]+=a-b;});
  log(`${nm(p)} traded ${resList(give)} to ${nm(q)} for ${resList(get)}.`);return true;
}
function endTurn(){
  if(G.phase!=='main'||!G.rolled||G.pending||G.winner!=null)return false;
  if(!tbBeforeEndTurn()){G.endingTurn=true;return false;}
  return endTurnCore();
}
/* 5-6 players: after every turn, each other player in order may build before the next roll */
function sbpSetup(){G.rolled=true;G.devPlayed=true;G.shipMoved=true;G.crane=null;G.medicine=null;G.fleet=null;G.alch=null;}
function endTurnCore(){
  G.endingTurn=false;tbTurnReset();
  const N=NP();
  if(G.sbp){const s=G.sbp;s.i++;
    if(s.i<s.order.length){G.cur=s.order[s.i];sbpSetup();checkWin();return true;}
    G.cur=(s.base+1)%N;G.sbp=null;
  }else if(N>=5&&G.phase==='main'){
    const order=[];for(let k=1;k<N;k++)order.push((G.cur+k)%N);
    G.sbp={base:G.cur,order,i:0};G.cur=order[0];sbpSetup();
    log('Special building phase: everyone else may build before the next roll.');checkWin();return true;
  }else G.cur=(G.cur+1)%N;
  G.turn++;G.rolled=false;G.lastDice=G.dice;G.dice=null;G.devPlayed=false;G.shipMoved=false;G.crane=null;G.medicine=null;G.fleet=null;G.alch=null;
  checkWin();return true;
}
