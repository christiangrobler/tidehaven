'use strict';
/* =====================================================================
   ICONS, PAPER GRAIN, SOUND
   ===================================================================== */
function drawIcon(x,r,fill,ink){
  x.save();x.lineJoin='round';x.lineCap='round';
  const outline=(path)=>{x.lineWidth=9;x.strokeStyle=ink;x.stroke(path);x.fillStyle=fill;x.fill(path);};
  if(r==='wood'){
    const p=new Path2D();p.moveTo(50,5);p.lineTo(73,35);p.lineTo(62,35);p.lineTo(82,60);p.lineTo(68,60);p.lineTo(88,84);p.lineTo(12,84);p.lineTo(32,60);p.lineTo(18,60);p.lineTo(38,35);p.lineTo(27,35);p.closePath();
    const t=new Path2D();t.rect(43,82,14,14);outline(t);outline(p);x.fillStyle=fill;x.fill(t);
  }else if(r==='brick'){
    [[8,58,40,26],[52,58,40,26],[30,26,40,26]].forEach(([a,b,w,h])=>{const p=new Path2D();p.moveTo(a+5,b);p.lineTo(a+w-5,b);p.quadraticCurveTo(a+w,b,a+w,b+5);p.lineTo(a+w,b+h-5);p.quadraticCurveTo(a+w,b+h,a+w-5,b+h);p.lineTo(a+5,b+h);p.quadraticCurveTo(a,b+h,a,b+h-5);p.lineTo(a,b+5);p.quadraticCurveTo(a,b,a+5,b);outline(p);});
  }else if(r==='wool'){
    const legs=new Path2D();legs.rect(33,66,8,22);legs.rect(55,66,8,22);x.fillStyle=ink;x.fill(legs);
    const b=new Path2D();[[48,52,22],[31,48,15],[64,46,15],[38,64,14],[60,64,14],[48,36,14]].forEach(([cx,cy,cr])=>{b.moveTo(cx+cr,cy);b.arc(cx,cy,cr,0,Math.PI*2);});
    x.lineWidth=9;x.strokeStyle=ink;x.stroke(b);x.fillStyle=fill;x.fill(b);
    x.fillStyle=ink;x.beginPath();x.ellipse(82,46,11,14,.35,0,Math.PI*2);x.fill();
  }else if(r==='grain'){
    x.strokeStyle=ink;x.lineWidth=9;x.beginPath();x.moveTo(50,96);x.lineTo(50,24);x.stroke();
    x.strokeStyle=fill;x.lineWidth=4;x.beginPath();x.moveTo(50,95);x.lineTo(50,26);x.stroke();
    const el=[[50,16,0]];for(let k=0;k<4;k++){const y=38+k*14;el.push([39,y,-.55],[61,y,.55]);}
    x.lineWidth=7;x.strokeStyle=ink;el.forEach(([cx,cy,a])=>{x.beginPath();x.ellipse(cx,cy,7.5,13,a,0,Math.PI*2);x.stroke();});
    x.fillStyle=fill;el.forEach(([cx,cy,a])=>{x.beginPath();x.ellipse(cx,cy,7.5,13,a,0,Math.PI*2);x.fill();});
  }else if(r==='paper'){
    const p=new Path2D();p.moveTo(22,20);p.lineTo(74,14);p.quadraticCurveTo(88,14,86,28);p.lineTo(84,78);p.quadraticCurveTo(84,90,70,90);p.lineTo(20,92);p.quadraticCurveTo(10,92,12,80);p.lineTo(14,30);p.quadraticCurveTo(14,20,22,20);p.closePath();outline(p);
    x.strokeStyle=ink;x.globalAlpha=.5;x.lineWidth=4;[36,50,64].forEach(y=>{x.beginPath();x.moveTo(26,y);x.lineTo(72,y-3);x.stroke();});x.globalAlpha=1;
  }else if(r==='cloth'){
    const p=new Path2D();p.moveTo(14,30);p.lineTo(70,22);p.lineTo(70,74);p.lineTo(14,82);p.closePath();outline(p);
    const roll=new Path2D();roll.ellipse(74,48,14,27,0,0,Math.PI*2);outline(roll);x.fillStyle=ink;x.globalAlpha=.45;x.beginPath();x.ellipse(74,48,5,10,0,0,Math.PI*2);x.fill();x.globalAlpha=1;
    x.strokeStyle=ink;x.globalAlpha=.35;x.lineWidth=3;[40,52,64].forEach(y=>{x.beginPath();x.moveTo(18,y+4);x.lineTo(62,y-4);x.stroke();});x.globalAlpha=1;
  }else if(r==='coin'){
    [[50,70],[50,56],[50,42]].forEach(([cx,cy])=>{const p=new Path2D();p.ellipse(cx,cy,30,12,0,0,Math.PI*2);outline(p);});
    const t=new Path2D();t.ellipse(50,34,30,12,0,0,Math.PI*2);outline(t);x.strokeStyle=ink;x.globalAlpha=.5;x.lineWidth=3;x.beginPath();x.ellipse(50,34,18,6,0,0,Math.PI*2);x.stroke();x.globalAlpha=1;
  }else if(r==='ore'){
    const p=new Path2D();p.moveTo(16,80);p.lineTo(9,54);p.lineTo(28,27);p.lineTo(55,13);p.lineTo(81,30);p.lineTo(92,62);p.lineTo(71,87);p.closePath();outline(p);
    x.strokeStyle=ink;x.globalAlpha=.55;x.lineWidth=4;x.beginPath();x.moveTo(28,27);x.lineTo(47,52);x.lineTo(81,30);x.moveTo(47,52);x.lineTo(16,80);x.moveTo(47,52);x.lineTo(71,87);x.stroke();x.globalAlpha=1;
  }
  x.restore();
}
const ICON={light:{},color:{}};
function makeIcons(){
  RES.concat(COM).forEach(r=>{[['light','#f8eed6','rgba(30,18,8,.55)'],['color',(RCOL[r]||CCOL[r])[0],'#2b2017']].forEach(([k,fill,ink])=>{
    const c=mk(96);const x=c.getContext('2d');x.scale(.96,.96);x.translate(2,2);drawIcon(x,r,fill,ink);ICON[k][r]=c.toDataURL();});});
  const g=mk(160);const x=g.getContext('2d');const im=x.createImageData(160,160);
  for(let i=0;i<im.data.length;i+=4){const v=Math.random();im.data[i]=90;im.data[i+1]=60;im.data[i+2]=30;im.data[i+3]=v<.5?Math.floor(v*22):Math.floor(v*8);}
  x.putImageData(im,0,0);
  for(let i=0;i<180;i++){x.strokeStyle=`rgba(100,70,30,${Math.random()*.06})`;x.lineWidth=1;x.beginPath();const a=Math.random()*160,b=Math.random()*160;x.moveTo(a,b);x.lineTo(a+Math.random()*18-9,b+Math.random()*4-2);x.stroke();}
  document.documentElement.style.setProperty('--grain',`url(${g.toDataURL()})`);
}
const img=(r,k='color')=>`<img src="${ICON[k][r]}" alt="${KNAME(r)}">`;
const KCOLS=k=>RCOL[k]||CCOL[k];
const costIcons=c=>RES.concat(COM).flatMap(r=>rep(r,c[r]||0)).map(r=>`<img src="${ICON.color[r]}" alt="">`).join('');
/* =====================================================================
   INTERACTION
   ===================================================================== */
const UI={mode:null,sheet:null,gate:null,viewer:null,busy:false,trade:null,disc:zero(),discKey:'',goldSel:zero(),goldKey:'',winSeen:false,edgeKind:'road',shipFrom:null,
  setup:{n:2,names:['Player 1','Player 2','Player 3','Player 4','Player 5','Player 6'],colors:[0,1,2,3,4,5],target:null,priv:true,scen:'classic'}};

function targets(){
  if(G&&humanMustWait())return null;
  if(!G||G.preview||G.winner!=null||UI.busy)return null;
  const p=G.cur;
  if(G.pending){
    if(G.pending.type==='robber')return {k:'h',act:'robber',list:thiefTargets()};
    if(G.pending.type==='freeRoads')return {k:'e',act:'freeEdge',list:freeEdgeTargets(p),kind:'free'};
    if(CK()){const t=ckTargets(p);if(t!==undefined)return t;}
    {const t=tbTargets(p);if(t!==undefined)return t;}
    return null;
  }
  if(G.phase==='setup'){
    if(G.step==='settlement')return {k:'v',act:'setupV',list:validSettlements(p,true)};
    const l=[...new Set([...validRoads(p,G.lastV),...validShips(p,G.lastV)])];return {k:'e',act:'setupE',list:l,kind:'setup'};
  }
  if(UI.mode==='road')return {k:'e',act:'road',list:validRoads(p)};
  if(UI.mode==='ship')return {k:'e',act:'ship',list:validShips(p)};
  if(UI.mode==='settlement')return {k:'v',act:'settlement',list:validSettlements(p,false)};
  if(UI.mode==='city')return {k:'v',act:'city',list:validCities(p)};
  if(UI.mode==='move')return UI.shipFrom==null?{k:'e',act:'pickShip',list:movableShips(p),kind:'pick'}:{k:'e',act:'dropShip',list:shipDestinations(p,UI.shipFrom),kind:'drop'};
  if(UI.mode==='harbor')return {k:'e',act:'harbor',list:harborGiftSpots(p)};
  if(CK()){const t=ckTargets(p);if(t!==undefined)return t;}
  {const t=tbTargets(p);if(t!==undefined)return t;}
  return null;
}
function edgeChoiceNeeded(){const tg=targets();if(!tg||tg.k!=='e'||!(tg.kind==='setup'||tg.kind==='free'))return false;
  const p=G.cur;return tg.list.some(e=>{const from=tg.kind==='setup'?G.lastV:null;const r=tg.kind==='free'?(P(p).roads>0&&canRoad(p,e)):canRoad(p,e,from);const s=tg.kind==='free'?(P(p).ships>0&&canShip(p,e)):canShip(p,e,from);return r&&s;});}
function boardTap(x,y){
  if(sheetOpen())return;
  const tg=targets();if(!tg||!tg.list.length){if(!G.pending&&!UI.mode)ckTapKnight(x,y);return;}
  let best=-1,bd=1e9;
  tg.list.forEach(i=>{const o=tg.k==='v'?T.verts[i]:tg.k==='e'?T.edges[i]:T.hexes[i].c;const d=Math.hypot(o.x-x,o.y-y);if(d<bd){bd=d;best=i;}});
  if(bd>(tg.k==='h'?.9:.45))return;
  boardAction(tg.act,best);
}
function resolveKind(e,from,free){
  const p=G.cur;const r=free?(P(p).roads>0&&canRoad(p,e)):canRoad(p,e,from);const s=free?(P(p).ships>0&&canShip(p,e)):canShip(p,e,from);
  if(r&&s)return UI.edgeKind;return s?'ship':'road';
}
function boardAction(a,i){
  let ok=false;const snap=Undo.snap(a);
  if(a==='setupV')ok=setupSettle(i);
  else if(a==='setupE'){const was=G.phase;ok=setupEdge(i,resolveKind(i,G.lastV,false));if(ok&&was==='setup'&&G.phase==='main')UI.viewer=G.cur;}
  else if(a==='robber'){const res=moveRobber(i);ok=!!res;if(res&&res.choose)toast('Choose who to steal from.',3000);else if(res)toast(res.stolen?`${nm(G.cur)} stole 1 ${res.stolen==='cloth'?'cloth':RNAME[res.stolen]} from ${nm(res.from)}.`:`No one to rob there.`);}
  else if(a==='freeEdge')ok=build(resolveKind(i,null,true),i,true);
  else if(a==='pickShip'){UI.shipFrom=i;refresh();return;}
  else if(a==='dropShip'){ok=moveShip(UI.shipFrom,i);if(ok){UI.mode=null;UI.shipFrom=null;}}
  else if(a==='harbor'){ok=placeHarborGift(i);if(ok&&!P(G.cur).harborGifts.length)UI.mode=null;}
  else{let r=CK()?ckBoardAction(a,i):null;if(r===null)r=tbBoardAction(a,i);if(r!==null)ok=r;else{ok=build(a,i);if(ok)UI.mode=null;}}
  if(ok){Undo.commit(snap);refresh(true);}
}
let toastTimer=null;
function toast(msg,ms=3400){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),ms);}
function diceDOM(){const n=CK()?3:2;const box=$('#dice');if(box.dataset.n===String(n))return;box.dataset.n=n;
  box.innerHTML=[...Array(n)].map((_,i)=>`<div class="die-wrap"><div class="tilt"><div class="die${i===1&&n===3?' red':''}${i===2?' event':''}">${[1,2,3,4,5,6].map(v=>`<div class="face f${v}">${i===2?eventFaceHTML(v):PIPS[v].map(k=>`<i style="grid-area:${Math.ceil(k/3)}/${(k-1)%3+1}"></i>`).join('')}</div>`).join('')}</div></div></div>`).join('');}
function animateDice(d){diceDOM();const box=$('#dice');box.classList.remove('idle');UI.spin=(UI.spin||0)+2;
  box.querySelectorAll('.die').forEach((el,i)=>{const [rx,ry]=ORI[d[i]||1];el.classList.add('rolling');el.style.transform=`rotateX(${rx+360*(UI.spin+i)}deg) rotateY(${ry+360*(UI.spin+1)}deg)`;});}
function showDice(){diceDOM();const d=G&&(G.dice||G.lastDice);const box=$('#dice');box.classList.toggle('idle',!(G&&G.dice));
  if(UI.busy)return;box.querySelectorAll('.die').forEach((el,i)=>{const v=d&&d[i]?d[i]:(i?6:1);const [rx,ry]=ORI[v];el.classList.remove('rolling');el.style.transform=`rotateX(${rx+360*((UI.spin||0)+i)}deg) rotateY(${ry+360*((UI.spin||0)+1)}deg)`;});}
function startRoll(){
  if(!G||!canRoll()||UI.busy)return;
  if(PAD.role==='pad'){PAD.sendRoll();return;}
  const card=VARS().events?drawEvent():null;
  const d=card?diceFor(card.n):G.alch?G.alch.slice():Stats.drawDice();if(CK())d.push(rollDie());
  UI.busy=true;UI.mode=null;Dice3D.hide();const land=Dice3D.toss(d);
  if(land){setTimeout(()=>{animateDice(d);},Math.max(0,land-260));}else{animateDice(d);sfx('dice');}
  renderRail();syncMarkers();
  setTimeout(()=>{UI.busy=false;const res=card?doRollCard(card,d):doRoll(d);
    if(res&&res.reroll){toast(`Rolled ${res.n} again. The second roll must differ, so roll once more.`,3600);refresh();return;}
    const cardMsg=res&&res.card?`${EVENTS[res.card.ev].n}${res.card.ev!=='none'&&res.card.ev!=='robber'?': '+EVENTS[res.card.ev].d:''} `:'';
    const evMsg=res&&res.ev?(res.ev.face==='ship'?(res.ev.attack?(res.ev.attack.losers?`Barbarians attack and win! ${res.ev.attack.losers.map(nm).join(' and ')} loses a city. `:res.ev.attack.defender!=null?`Barbarians repelled! ${nm(res.ev.attack.defender)} is Defender. `:'Barbarians repelled. '):`Barbarians advance (${G.barb}/7). `):(res.ev.drew&&res.ev.drew.length?`${TRACK[res.ev.face].n} gate: ${res.ev.drew.map(x=>nm(x.p)).join(' and ')} draw${res.ev.drew.length>1?'':'s'} a card. `:`${TRACK[res.ev.face].n} gate: no cards. `)):'';
    if(res){if(res.seven){toast(`${cardMsg}${evMsg}Rolled 7. ${res.discards.length?'Big hands lose half. ':''}${robberActive()?`Move the ${SC().sea?'robber or the pirate':'robber'}.`:'The robber sleeps until the barbarians attack.'}`,4600);}
      else{flashTokens(res.n);const parts=PL().filter(p=>sumH(res.gains[p])||res.gold[p]).map(p=>`${nm(p)} ${[...HANDK().filter(r=>res.gains[p][r]).map(r=>`+${res.gains[p][r]} ${KNAME(r)}`),...(res.gold[p]?[`+${res.gold[p]} gold pick`]:[])].join(', ')}`);
        toast(`${cardMsg}${evMsg}Rolled ${res.n}. ${parts.length?parts.join(' · '):'Nobody collects.'}${VARS().two&&!G.rolled?' Roll again for the second production.':''}`,4800);
        if(sum(res.gains[G.cur]))UI.bump=RES.filter(r=>res.gains[G.cur][r]);}}
    refresh(true);if(res&&!res.seven&&!res.reroll)Feel.flyProduction(res);},land?land+420:(REDUCED?200:1050));
}

/* =====================================================================
   HUD
   ===================================================================== */
function handVisible(p){if(!G||G.preview)return false;if(PAD.role)return G.winner!=null||(PAD.role==='pad'&&p===PAD.seat);if(aiOn())return p===humanP()||G.winner!=null;if(!G.opts.priv||G.winner!=null)return true;if(G.phase==='setup')return p===G.cur;return p===G.cur&&UI.viewer===p;}
function shownVP(p){const pub=vp(p,false);const hid=P(p).dev.filter(d=>d.t==='vp').length;
  const reveal=PAD.role?(G.winner!=null||(PAD.role==='pad'&&p===PAD.seat)):aiOn()?(p===humanP()||G.winner!=null):G.winner!=null||!G.opts.priv||(p===G.cur&&(G.phase!=='main'||UI.viewer===p));return reveal?pub+hid:pub;}
function setH(el,h){if(el.__h!==h){el.innerHTML=h;el.__h=h;}}   // only touch the DOM when the markup really changed
function renderScores(){
  const sc=SC();const sEl=$('#scores');sEl.dataset.n=G.players.length;document.documentElement.classList.toggle('manyp',G.players.length>2);
  setH(sEl,G.players.map((pl,p)=>{const on=p===G.cur&&!G.preview&&G.winner==null;
    const extra=[];if(sc.sea)extra.push(`<span>ships <b>${15-pl.ships}</b></span>`);if(pl.bonus)extra.push(`<span>bonus <b>+${pl.bonus}</b></span>`);if(sc.villages)extra.push(`<span>cloth <b>${pl.cloth}</b></span>`);
    return `<div class="pc${on?' on':''}${PAD.role==='pad'&&p===PAD.seat?' me':''}" style="--pc:${pl.color}">
      <div class="pname">${esc(pl.name)}</div>
      <div class="vp">${shownVP(p)}<small>/${winTarget(p)}</small></div>
      <div class="pstats"><span><b>${handCount(p)}</b> cards</span>${CK()?ckScoreExtra(pl,p):G.opts.scen==='barbattack'?'':`<span><b>${pl.dev.length}</b> dev</span><span><b>${pl.knights}</b> knights</span>`}${tbScoreExtra(pl,p)}${sc.noLongest?'':`<span>route <b>${G.roadLen[p]}</b></span>`}${extra.join('')}</div>
      ${(()=>{const b=[];if(G.longest===p)b.push(sc.sea?'Longest route':'Longest road');if(G.army===p)b.push('Largest army');if(CK()){TRACKS.forEach(t=>{if(G.metro[t]&&G.metro[t].p===p)b.push(TRACK[t].n+' metropolis');});if(pl.defender)b.push('Defender ×'+pl.defender);if(G.merchant&&G.merchant.p===p)b.push('Merchant');if(pl.progVP)b.push('Progress ×'+pl.progVP);}b.push(...tbBadges(p));return b.length?`<div class="badges">${b.map(x=>`<span class="badge">${x}</span>`).join('')}</div>`:'';})()}
    </div>`;}).join(''));
}
function statusHTML(){
  if(G.preview)return 'Set up a game to begin.';
  if(G.winner!=null)return `<b>${esc(nm(G.winner))}</b> wins.`;
  if(UI.busy)return 'Rolling…';
  if(humanMustWait()){const a=PAD.role?PAD.actor():(pendingActor()!=null?pendingActor():G.cur);const pd0=G.pending;
    if(PAD.role&&pd0&&pd0.type==='discard')return `Waiting for ${esc(nm(a))} to discard.`;
    return `${esc(nm(a))} is playing…<span class="sub">${esc((G.log[G.log.length-1]||{}).m||'')}</span>`;}
  const pd=G.pending;
  if(CK()){const c=ckStatus();if(c)return c;}
  {const c=tbStatus();if(c)return c;}
  if(pd){if(pd.type==='discard')return `Waiting for ${esc(nm(pd.queue[0].p))} to discard.`;
    if(pd.type==='gold')return `Waiting for ${esc(nm(pd.queue[0].p))} to choose gold.`;
    if(pd.type==='steal')return 'Choose who to steal from.<span class="sub">More than one player has a building there.</span>';
    if(pd.type==='robber')return SC().sea?'Move the robber or the pirate.<span class="sub">Tap a land tile for the robber, or a sea ring for the pirate.</span>':'Move the robber.<span class="sub">Tap any other tile.</span>';
    if(pd.type==='freeRoads')return `Place a free ${SC().sea?'road or ship':'road'}.<span class="sub">${pd.left} left from Road Building.</span>`;}
  if(G.phase==='setup')return G.step==='settlement'
    ?`Place your ${G.si<NP()?'first':'second'} settlement.<span class="sub">${G.si<NP()?'Tap a glowing corner.':'It collects one card from each tile it touches.'}</span>`
    :`Place a ${SC().sea?'road or ship':'road'} next to it.<span class="sub">Tap a glowing edge.</span>`;
  if(UI.mode==='move')return UI.shipFrom==null?'Move a ship.<span class="sub">Tap the ship at the open end of a route.</span>':'Move a ship.<span class="sub">Tap where it should go.</span>';
  if(UI.mode==='harbor')return 'Place your harbor.<span class="sub">Tap a coast edge next to your settlement.</span>';
  if(UI.mode)return `Build a ${UI.mode}.<span class="sub">Tap a glowing spot, or Cancel.</span>`;
  if(G.sbp)return `Special building phase.<span class="sub">${esc(nm(G.cur))} may build, then press Done. No trading or dice.</span>`;
  if(!G.rolled)return 'Roll the dice.<span class="sub">You may play a Knight first.</span>';
  return `Rolled ${G.dice[0]+G.dice[1]}.<span class="sub">Build, trade, or end your turn.</span>`;
}
function buildState(k){
  if(G&&humanMustWait())return false;
  if(G&&tbAlwaysOpen(k))return !G.preview&&G.phase==='main'&&G.winner==null&&!G.pending&&!UI.busy;
  if(!G||G.preview||G.winner!=null||G.phase!=='main'||G.pending||UI.busy||!G.rolled)return false;
  const p=G.cur,pl=P(p);
  if(k==='road')return pl.roads>0&&canAfford(p,COST.road)&&validRoads(p).length>0;
  if(k==='ship')return pl.ships>0&&canAfford(p,COST.ship)&&validShips(p).length>0;
  if(k==='settlement')return pl.settlements>0&&canAfford(p,COST.settlement)&&validSettlements(p,false).length>0;
  if(k==='city')return pl.cities>0&&canAfford(p,COST.city)&&validCities(p).length>0;
  if(k==='dev')return canBuyDev();
  if(k==='move')return movableShips(p).some(e=>shipDestinations(p,e).length>0);
  if(k==='harbor')return pl.harborGifts.length>0&&harborGiftSpots(p).length>0;
  if(k==='trade')return !G.sbp;
  if(CK()&&ckBuildState(k,p))return true;
  return tbBuildState(k,p);
}
const GLYPH={
  road:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2.5" y="10" width="19" height="5" rx="1.2" transform="rotate(-22 12 12.5)"/></svg>',
  ship:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2v13H5.5L12 2z" opacity=".85"/><path d="M13 5l6 9h-6z"/><path d="M2.5 16.5h19l-2.5 4h-14z"/></svg>',
  settlement:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 20v-8.5L12 5l7 6.5V20z"/></svg>',
  city:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 20v-9l5-4.5 5 4.5v2h9v7z"/></svg>',
  dev:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 3h11a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3zm5.5 4.2l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4z" fill-rule="evenodd"/></svg>',
  trade:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/></svg>',
  move:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h11M10 13l4 4-4 4"/><path d="M14 3v9h-6z" fill="currentColor" stroke="none"/></svg>',
  harbor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v13M5 13a7 7 0 0 0 14 0M8 10h8"/></svg>',
  wall:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9h3V6h3v3h2V6h2v3h2V6h3v3h3v12H3zm2 4v2h4v-2zm6 0v2h4v-2zm6 0v2h2v-2zM5 17v2h2v-2zm4 0v2h4v-2zm6 0v2h4v-2z" fill-rule="evenodd"/></svg>',
  knight:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a6 6 0 0 0-6 6v3h12V9a6 6 0 0 0-6-6zm-1 2h2v5h-2z" fill-rule="evenodd"/><path d="M5 14h14v2.5H5zM6 18h12v3H6z"/></svg>',
  improve:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 20V10l4-3 4 3v10zM14 20V6l3-3 3 3v14z"/><path d="M9 3h6v2H9z" opacity=".6"/></svg>',
  bridge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10h20M4 10v8M20 10v8M4 18c3-6 13-6 16 0"/></svg>',
  gold:'<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 8.5v3.5c0 1.7 3.1 3 7 3s7-1.3 7-3V8.5c0 1.7-3.1 3-7 3s-7-1.3-7-3z"/><path d="M5 14v3.5c0 1.7 3.1 3 7 3s7-1.3 7-3V14c0 1.7-3.1 3-7 3s-7-1.3-7-3z"/></svg>',
  fish:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 12c3-5.5 10-6.5 14-3l5-3.5v13l-5-3.5c-4 3.5-11 2.5-14-3z"/><circle cx="8" cy="11" r="1.2" fill="#2a1d12"/></svg>',
  tokens:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7l1.6 3.2 3.5.5-2.5 2.5.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.5 3.5-.5z" fill="currentColor" stroke="none"/></svg>',
  repair:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 3a5 5 0 0 0-4.6 6.9L3 16.8 7.2 21l6.9-6.9A5 5 0 0 0 21 9.5l-3.4 3.4-3-.9-.9-3L17 5.7A5 5 0 0 0 14.5 3z"/></svg>'
};
function renderRail(){
  const hpl=aiOn()?humanP():null;
  const p=PAD.role==='pad'?(PAD.seat==null?G.cur:PAD.seat):(hpl!=null?hpl:G.cur),pl=P(p),show=handVisible(p),sc=SC();
  setH($('#msg'),statusHTML()+(Undo.can()?'<button class="undo" data-act="undo">↶ Undo</button>':''));Feel.sync();
  {const ec=$('#evcard');if(ec)setH(ec,tbEventChip());}
  const pb=$('#primary');pb.classList.remove('pulse');
  if(G.preview||G.winner!=null){pb.textContent='New game';pb.dataset.act='newgame';pb.disabled=false;}
  else if(aiOn()&&isAI(G.cur)){pb.textContent=`${P(G.cur).name}’s turn`;pb.dataset.act='noop';pb.disabled=true;}
  else if(PAD.role==='pad'&&PAD.actor()!==PAD.seat){pb.textContent=`${P(PAD.actor()).name}’s turn`;pb.dataset.act='noop';pb.disabled=true;}
  else if(G.phase==='setup'||!G.rolled){pb.textContent=G.rollCount===1?'Roll again':VARS().events?'Draw event':'Roll dice';pb.dataset.act='roll';pb.disabled=!canRoll()||UI.busy;if(!pb.disabled)pb.classList.add('pulse');}
  else{pb.textContent=G.sbp?'Done building':'End turn';pb.dataset.act='end';pb.disabled=!!G.pending||UI.busy;}
  const bump=UI.bump||[];UI.bump=null;
  if(PAD.role==='tv'){showDice();return;}                    // the TV hides the hand, cards and build buttons
  const hk=HANDK();$('#hand').style.setProperty('--hcols',hk.length);$('#hand').classList.toggle('ck',hk.length>5);
  setH($('#hand'),hk.map(r=>{const n=show?pl.res[r]:null;
    return `<div class="card${n===0?' zero':''}${bump.includes(r)?' bump':''}${COM.includes(r)?' com':''}" style="--c1:${KCOLS(r)[0]};--c2:${KCOLS(r)[1]}" aria-label="${n==null?'Hidden':n} ${KNAME(r)}"><img src="${ICON.light[r]}" alt=""><span class="lbl">${KNAME(r)}</span><span class="count">${n==null?'–':n}</span></div>`;}).join(''));
  const devs=show?pl.dev:[];
  setH($('#devs'),CK()?ckProgChips(pl,show):DEV_ORDER.filter(t=>devs.some(c=>c.t===t)).map(t=>{const cs=devs.filter(c=>c.t===t);const fresh=cs.every(c=>c.turn>=G.turn)&&t!=='vp';
    return `<button class="devchip${fresh?' new':''}" data-act="devinfo" data-t="${t}"><span class="n">${DEV[t].n}</span>${cs.length>1?`×${cs.length}`:''}${fresh?'<em>next turn</em>':''}</button>`;}).join(''));
  const B=[['road','Road',COST.road,pl.roads]];
  if(sc.sea)B.push(['ship','Ship',COST.ship,pl.ships]);
  B.push(['settlement','Settle',COST.settlement,pl.settlements],['city','City',cityCost(p),pl.cities]);
  if(CK())B.push(...ckBuildButtons(pl,p));else B.push(['dev','Dev card',COST.dev,G.devDeck.length]);
  B.push(['trade','Trade',null,null]);B.push(...tbBuildButtons(pl,p));
  if(sc.sea)B.push(['move','Move ship',null,null]);
  if(pl.harborGifts&&pl.harborGifts.length)B.push(['harbor','Harbor',null,pl.harborGifts.length]);
  const bEl=$('#builds');bEl.style.setProperty('--cols',B.length>6?4:B.length);
  setH(bEl,B.map(([k,l,c,left])=>`<button class="bbtn${UI.mode===k?' on':''}" data-act="build" data-k="${k}" ${buildState(k)||UI.mode===k?'':'disabled'} aria-label="${l}">${left!=null?`<span class="left">${left}</span>`:''}${GLYPH[k]||''}<span class="bl">${l}</span><span class="cost">${c?costIcons(c):''}</span></button>`).join(''));
  const chip=$('#modechip');const tg=targets();const skippable=!!(G.pending&&(['smith','deserter','engineer','treason'].includes(G.pending.type)||(G.pending.type==='freeRoads'&&CK())));
  if(G.pending&&G.pending.type==='kmoves'){chip.hidden=false;$('#modetext').innerHTML=`<span>Knights</span><button class="${UI.ktBoost?'sel':''}" data-act="ktboost" style="${UI.ktBoost?'background:var(--brass);color:#2a1b06':'background:transparent;color:var(--parchment);border:1px solid rgba(240,220,180,.3)'}">+2 for grain</button><button data-act="ktdone" ${kmovesBlock()?'disabled':''}>Done</button>`;chip.querySelector('[data-act=cancelmode]').hidden=true;chip.querySelector('[data-act=skip]').hidden=true;showDice();return;}
  if(tg&&(UI.mode||edgeChoiceNeeded()||skippable)){chip.hidden=false;
    const kindToggle=edgeChoiceNeeded()?`<span class="kind"><button class="${UI.edgeKind==='road'?'sel':''}" data-act="ekind" data-v="road">Road</button><button class="${UI.edgeKind==='ship'?'sel':''}" data-act="ekind" data-v="ship">Ship</button></span>`:'';
    $('#modetext').innerHTML=(UI.mode?`Tap to place: ${({move:'ship',kmove:'knight move',knight:'knight',wall:'city wall'})[UI.mode]||UI.mode}`:skippable?'Tap a glowing spot':'Build a')+kindToggle;
    chip.querySelector('[data-act=cancelmode]').hidden=!UI.mode;chip.querySelector('[data-act=skip]').hidden=!skippable||!!UI.mode;}
  else chip.hidden=true;
  showDice();
}
function renderTicker(){const t=$('#ticker');const last=G&&G.log[G.log.length-1];t.hidden=!last||!$('#modechip').hidden;if(last)t.innerHTML=`<b>Log</b> · ${esc(last.m)}`;
  renderBarb();
  $('#railLog').innerHTML=G&&!G.preview?G.log.slice(-12).reverse().map(l=>`<li><span class="t">${l.t?'Turn '+l.t:'Setup'}</span>${esc(l.m)}</li>`).join(''):'';}

/* =====================================================================
   SHEETS
   ===================================================================== */
function sheetOpen(){return $('#ov').classList.contains('show');}
function privateFor(p,why){if(aiOn())return false;if(G.opts.priv&&UI.viewer!==p){UI.gate={p,why};return true;}return false;}
function wantedSheet(){
  if(!G)return UI.sheet;
  if(UI.gate)return {type:'gate'};
  if(G.winner!=null&&!UI.winSeen)return {type:'win'};
  if(UI.aiOffer&&G.winner==null&&!G.preview)return {type:'aioffer'};
  if(UI.sheet&&UI.sheet.type==='setup')return UI.sheet;
  if(G.preview)return UI.sheet;
  if(aiOn()&&G.pending&&isAI(pendingActor()))return UI.sheet&&['menu','log','rules','villages','improve','stats'].includes(UI.sheet.type)?UI.sheet:null;
  const pd=G.pending;
  if(pd&&pd.type==='discard'){const q=pd.queue[0];
    if(privateFor(q.p,`A 7 was rolled. Discard ${q.n} of your ${sum(P(q.p).res)} cards.`))return {type:'gate'};
    const key=q.p+':'+G.logId;if(UI.discKey!==key){UI.discKey=key;UI.disc=zero();}return {type:'discard'};}
  if(pd&&pd.type==='steal')return {type:'steal'};
  if(pd&&pd.type==='gold'){const q=pd.queue[0];
    if(G.phase==='main'&&privateFor(q.p,`Your gold field paid out. Choose ${q.n} resource${q.n>1?'s':''}.`))return {type:'gate'};
    const key=q.p+':'+q.n+':'+G.logId;if(UI.goldKey!==key){UI.goldKey=key;UI.goldSel=zero();}return {type:'gold'};}
  {const w=tbWanted();if(w)return w;}
  if(CK()){const w=ckWanted();if(w)return w;}
  if(G.opts.priv&&G.phase==='main'&&G.winner==null&&UI.viewer!==G.cur){
    UI.gate={p:G.cur,why:pd&&pd.type==='robber'?'Move the robber, then carry on with your turn.':'Your turn.'};return {type:'gate'};}
  return UI.sheet;
}
function stepper(key,r,val,max,note){return `<div class="stp">${img(r)}<div class="stp-ctl"><button data-act="step" data-k="${key}" data-r="${r}" data-d="-1" ${val<=0?'disabled':''} aria-label="One less ${KNAME(r)}">−</button><b>${val}</b><button data-act="step" data-k="${key}" data-r="${r}" data-d="1" ${val>=max?'disabled':''} aria-label="One more ${KNAME(r)}">+</button></div>${note!=null?`<span class="have">${note}</span>`:''}</div>`;}
function offerSide(o){const s=RES.concat(COM).filter(r=>o[r]).map(r=>`<span>${o[r]}${img(r)}</span>`).join('');return `<div class="side">${s||'<span>nothing</span>'}</div>`;}
function vp0(g,p){let s=0;g.vOwn.forEach(o=>{if(o&&o.p===p)s+=o.city?2:1;});if(g.longest===p)s+=2;if(g.army===p)s+=2;s+=(g.players[p].bonus||0)+Math.floor((g.players[p].cloth||0)/2);return s;}
function sheetHTML(s){
  const pl=G&&!G.preview?P(G.cur):null;
  switch(s.type){
  case 'setup':{const st=UI.setup;const n=setupN();const cpu=setupCpu();const multi=n>2;const save=loadSave();const scen=SCEN[st.scen];const target=st.target||baseTarget();const std=baseTarget();
    const minN=PAD.role==='pad'?Math.max(1,...(PAD.seats||[]).map((on,i)=>on?i+1:0)):1;
    const pe=setupPeople();
    const seat=i=>`<div class="seat"><label for="n${i}">Player ${i+1}</label><input id="n${i}" value="${esc(st.names[i])}" maxlength="14" autocomplete="off"><div class="sw" role="radiogroup" aria-label="Color for player ${i+1}">${COLORS.map((c,k)=>`<button class="${st.colors[i]===k?'sel':''}" style="--c:${c.h}" data-act="color" data-s="${i}" data-c="${k}" aria-label="${c.n}"></button>`).join('')}</div></div>`;
    return `<div class="sheet"><div class="brand"><h1><img class="brand-logo" src="icons/logo.png" alt="Tidehaven"></h1><p class="tag">Settle the island, trade, and build.</p></div>
      <h3>People</h3><div class="seg">${[1,2,3,4,5,6].map(k=>`<button class="${pe===k?'sel':''}" data-act="nplayers" data-v="${k}" ${k<minN||k+cpu>6?'disabled':''}>${k}</button>`).join('')}</div>
      ${n>=5?'<p class="lead scen-sub">5\u20136 players use the large island with 24 cards of each resource and a bigger development deck.</p>':''}
      <h3>Computer opponents</h3><div class="seg">${[0,1,2,3].map(k=>`<button class="${cpu===k?'sel':''}" data-act="cpu" data-v="${k}" ${pe+k>6?'disabled':''}>${k?k:'None'}</button>`).join('')}</div>
      ${cpu?`<div class="seg" style="margin-top:6px">${['easy','normal','hard'].map(d=>`<button class="${(st.diff||'normal')===d?'sel':''}" data-act="diff" data-v="${d}">${d[0].toUpperCase()+d.slice(1)}</button>`).join('')}</div>`:''}
      ${[...Array(n).keys()].map(seat).join('')}
      ${Stats.series(setupOpts())}
      <h3>Board</h3><div class="scen">${SCEN_ORDER.filter(k=>scenAllowed(k,n)).map(k=>`<button class="${st.scen===k?'sel':''}" data-act="scen" data-v="${k}"><b>${SCEN[k].name}</b><span>${SCEN[k].tbBoard?'Frontier &amp; Raiders':SCEN[k].classic?'Base game':'Voyagers'} \u00b7 ${SCEN[k].target+(st.ck&&k!=='barbattack'&&!multi?3:0)+(st.vars&&st.vars.harbor&&!multi?1:0)} points</span></button>`).join('')}</div>
      <p class="lead scen-sub">${esc(scen.sub)}</p>
      ${multi?'':`<h3>Expansions</h3><div class="menu"><button class="btn tog${st.ck&&ckAllowed()?' on':''}" data-act="cktoggle" aria-pressed="${!!st.ck}" ${ckAllowed()?'':'disabled'}><b>Guilds &amp; Garrisons</b><span>${ckAllowed()?'Commodities, city improvements, knights, barbarian attacks and progress cards. Adds 3 points to the target.':'Not combinable with Barbarian Attack.'}</span></button></div>
      <h3>Frontier &amp; Raiders variants</h3><div class="menu">${VAR_LIST.map(([k,nn,d])=>`<button class="btn tog${st.vars&&st.vars[k]?' on':''}" data-act="vtoggle" data-v="${k}" aria-pressed="${!!(st.vars&&st.vars[k])}"><b>${nn}</b><span>${d}</span></button>`).join('')}</div>`}
      <h3>Dice</h3><div class="menu"><button class="btn tog${st.fair?' on':''}" data-act="fairtoggle" aria-pressed="${!!st.fair}"><b>Fair dice</b><span>Rolls come from a shuffled deck of all 36 combinations, so every number turns up as often as it should and long streaks are rare.</span></button></div>
      <h3>Points to win</h3><div class="seg">${[std-2,std,std+2].map(v=>`<button class="${target===v?'sel':''}" data-act="target" data-v="${v}">${v}${v===std?' (standard)':v<std?' (quick)':''}</button>`).join('')}</div>
      <label class="check"${st.ai||PAD.role==='pad'?' hidden':''}><input type="checkbox" id="priv" ${st.priv?'checked':''}> <span>Hide hands between turns<br><small style="color:#6d5638">A \u201cpass the device\u201d screen appears so you don\u2019t see each other\u2019s cards.</small></span></label>
      <div class="btns"><button class="btn ghost" data-act="reshuffle">Reshuffle board</button><button class="btn primary" data-act="start">Start game</button></div>
      ${save?`<div class="btns" style="margin-top:8px"><button class="btn" data-act="resume">Continue saved game (${save.players.map((p,i)=>esc(p.name)+' '+vp0(save,i)).join(' \u00b7 ')})</button></div>`:''}
      ${G&&!G.preview?'<div class="btns" style="margin-top:8px"><button class="btn ghost" data-act="close">Back to the current game</button></div>':''}</div>`;}
  case 'gate':{const g=UI.gate;const seen=G.seen[g.p]||0;const recap=G.log.filter(l=>l.id>seen).slice(-6);
    return `<div class="gate"><p class="eyebrow">Pass the device</p><h1>${esc(nm(g.p))}</h1><p class="why">${esc(g.why)}</p>
      <ul class="recap">${recap.map(l=>`<li>${esc(l.m)}</li>`).join('')}</ul>
      <button class="btn primary" data-act="gateok">Show ${esc(nm(g.p))}’s cards</button></div>`;}
  case 'discard':{const q=G.pending.queue[0],hp=P(q.p),n=sumH(UI.disc);
    return `<div class="sheet"><h2>${esc(nm(q.p))}, discard ${q.n}</h2><p class="lead">${G.dice&&G.dice[0]+G.dice[1]===7?'A 7 was rolled':'The Saboteur struck'} and you hold ${handCount(q.p)} cards. Choose ${q.n} to give back to the bank.</p>
      <div class="stps${HANDK().length>5?' stps8':''}">${HANDK().map(r=>stepper('disc',r,UI.disc[r]||0,Math.min(hp.res[r],(UI.disc[r]||0)+(q.n-n)),`of ${hp.res[r]}`)).join('')}</div>
      <div class="btns"><button class="btn primary" data-act="discard" ${n===q.n?'':'disabled'}>${n===q.n?`Discard ${q.n} cards`:`Pick ${q.n-n} more`}</button></div></div>`;}
  case 'gold':{const q=G.pending.queue[0],need=Math.min(q.n,sum(G.bank)),n=sum(UI.goldSel);
    return `<div class="sheet"><h2>${esc(nm(q.p))}, choose ${need} from gold</h2><p class="lead">Gold fields pay any resource you like.</p>
      <div class="stps">${RES.map(r=>stepper('gold',r,UI.goldSel[r],Math.min(G.bank[r],UI.goldSel[r]+(need-n)),`bank ${G.bank[r]}`)).join('')}</div>
      <div class="btns"><button class="btn primary" data-act="gold" ${n===need?'':'disabled'}>${n===need?`Take ${need}`:`Pick ${need-n} more`}</button></div></div>`;}
  case 'trade':{const tr=UI.trade,rt=rates(G.cur),q=tradeQ();let body='';
    if(tr.tab==='bank'){const ok=tr.give&&tr.get&&tr.give!==tr.get&&pl.res[tr.give]>=rt[tr.give]&&G.bank[tr.get]>0;
      const hk=HANDK();const pc=`style="grid-template-columns:repeat(${hk.length>5?4:5},minmax(0,1fr))"`;
      body=`<h3>Give</h3><div class="pick" ${pc}>${hk.map(r=>`<button class="rt${tr.give===r?' sel':''}" data-act="tgive" data-r="${r}" ${pl.res[r]<rt[r]?'disabled':''}>${img(r)}<span class="rate">${rt[r]}:1</span><span class="have">have ${pl.res[r]}</span></button>`).join('')}</div>
        <h3>Get 1</h3><div class="pick" ${pc}>${hk.map(r=>`<button class="rt${tr.get===r?' sel':''}" data-act="tget" data-r="${r}" ${r===tr.give||G.bank[r]<1?'disabled':''}>${img(r)}<span class="have">bank ${G.bank[r]}</span></button>`).join('')}</div>
        <p class="lead" style="font-size:13.5px;margin-top:10px">4:1 with the bank. A settlement or city on a harbor’s dock gives 3:1 on anything, or 2:1 on that harbor’s resource.</p>
        <div class="btns"><button class="btn primary" data-act="tbank" ${ok?'':'disabled'}>${ok?`Trade ${rt[tr.give]} ${KNAME(tr.give)} for 1 ${KNAME(tr.get)}`:'Pick what to give and get'}</button></div>`;}
    else{const hk=HANDK();const overlap=hk.some(r=>tr.og[r]&&tr.ot[r]);const ok=sumH(tr.og)>0&&sumH(tr.ot)>0&&!overlap&&canAfford(G.cur,tr.og);const cls=hk.length>5?' stps8':'';
      body=`${NP()>2?`<h3>Trade with</h3><div class="seg" style="flex-wrap:wrap">${PL().filter(x=>x!==G.cur).map(x=>`<button class="${x===q?'sel':''}" data-act="tpartner" data-q="${x}">${esc(nm(x))}</button>`).join('')}</div>`:''}<h3>You give</h3><div class="stps${cls}">${hk.map(r=>stepper('og',r,tr.og[r]||0,pl.res[r],`have ${pl.res[r]}`)).join('')}</div>
        <h3>You get from ${esc(nm(q))}</h3><div class="stps${cls}">${hk.map(r=>stepper('ot',r,tr.ot[r]||0,9,null)).join('')}</div>
        <p class="lead" style="font-size:13.5px;margin-top:10px">${esc(nm(q))} holds ${handCount(q)} cards. Talk it over, then send the offer.</p>
        <div class="btns"><button class="btn primary" data-act="toffer" ${ok?'':'disabled'}>Offer to ${esc(nm(q))}</button></div>`;}
    const dn=tr.note&&tr.note.sig===tradeSig()?`<p class="note declined" role="alert"><b>${esc(tr.note.txt)}</b> Change the offer and try again, or pick something else.</p>`:'';
    return `<div class="sheet"><h2>Trade</h2><div class="tabs"><button class="${tr.tab==='bank'?'sel':''}" data-act="ttab" data-v="bank">Bank &amp; harbors</button><button class="${tr.tab==='player'?'sel':''}" data-act="ttab" data-v="player">With ${esc(nm(q))}</button></div>${dn}${body}
      <div class="btns"><button class="btn ghost" data-act="close">Done</button></div></div>`;}
  case 'offer':{const tr=UI.trade,q=tradeQ(),can=canAfford(q,tr.ot);
    return `<div class="sheet"><h2>${esc(nm(q))}, accept this trade?</h2><p class="lead">${esc(nm(G.cur))} offers:</p>
      <div class="offer">${offerSide(tr.og)}<span class="arrow">for your</span>${offerSide(tr.ot)}</div>
      ${can?'':`<p class="note">${esc(nm(q))} doesn’t hold those cards, so this trade can’t go through.</p>`}
      <div class="btns"><button class="btn" data-act="tdecline">Decline</button><button class="btn primary" data-act="taccept" ${can?'':'disabled'}>Accept</button></div></div>`;}
  case 'dev':{const t=s.t,cs=pl.dev.filter(c=>c.t===t),why=devBlock(t);
    return `<div class="sheet"><h2>${DEV[t].n}${cs.length>1?` ×${cs.length}`:''}</h2><p>${DEV[t].d}</p>${why?`<p class="note">${why}</p>`:''}
      <div class="btns"><button class="btn ghost" data-act="close">Keep it</button>${t!=='vp'?`<button class="btn primary" data-act="playdev" data-t="${t}" ${why?'disabled':''}>Play ${DEV[t].n}</button>`:''}</div></div>`;}
  case 'plenty':{const sel=s.sel,need=Math.min(2,sum(G.bank)),n=sum(sel);
    return `<div class="sheet"><h2>Year of Plenty</h2><p class="lead">Take any ${need} cards from the bank. Two of the same is fine.</p>
      <div class="stps">${RES.map(r=>stepper('plen',r,sel[r],Math.min(G.bank[r],sel[r]+(need-n)),`bank ${G.bank[r]}`)).join('')}</div>
      <div class="btns"><button class="btn ghost" data-act="close">Cancel</button><button class="btn primary" data-act="plenty" ${n===need?'':'disabled'}>Take ${need} cards</button></div></div>`;}
  case 'monopoly':{
    return `<div class="sheet"><h2>Monopoly</h2><p class="lead">Name a resource. ${NP()>2?'Every other player gives':esc(nm((G.cur+1)%NP()))+' gives'} you every card of it.</p>
      <div class="pick">${RES.map(r=>`<button class="rt${s.r===r?' sel':''}" data-act="mono" data-r="${r}">${img(r)}<span class="rate">${RNAME[r]}</span></button>`).join('')}</div>
      <div class="btns"><button class="btn ghost" data-act="close">Cancel</button><button class="btn primary" data-act="monogo" ${s.r?'':'disabled'}>${s.r?`Take all ${RNAME[s.r]}`:'Pick a resource'}</button></div></div>`;}
  case 'menu':return `<div class="sheet"><h2>Tidehaven</h2><p class="lead">High score: <b>${Stats.highScore()?Stats.highScore()+' points':'none yet'}</b></p><div class="menu">
      <button class="btn" data-act="rules">How to play</button><button class="btn" data-act="log">Game log</button><button class="btn" data-act="stats">Game stats</button>
      ${SC().villages?'<button class="btn" data-act="villages">Villages and cloth</button>':''}
      <button class="btn" data-act="sound">Sound: ${SND.on?'on':'off'}</button><button class="btn" data-act="ambience">Ambience: ${SND.ambOn?'on':'off'}</button><button class="btn" data-act="volume">Volume: ${SND.vol<.4?'low':SND.vol<.75?'medium':'high'}</button>${aiOn()?`<button class="btn" data-act="aispeed">Computer speed: ${AIS.speed}</button>`:''}<button class="btn" data-act="scenery">Moving scenery: ${GL.anim?'on':'off'}</button><button class="btn" data-act="lighting">Light: ${RL.label()}</button><button class="btn" data-act="newgame">New game</button>
      <button class="btn ghost" data-act="close">Close</button></div></div>`;
  case 'villages':{const vs=G.board.villages||[];
    return `<div class="sheet"><h2>Villages</h2><p class="lead">Each village pays 1 cloth to every player with a ship touching its island when its number rolls. ${G.players.map(p=>esc(p.name)+': '+p.cloth+' cloth').join(' · ')}. Spare supply: ${G.board.clothSupply}.</p>
      <table class="score-table"><tr><th>Number</th><th>Cloth left</th><th>Reached by</th></tr>${vs.map(v=>`<tr><td>${v.n}</td><td>${v.cloth}</td><td>${PL().filter(p=>P(p).villages.includes(v.h)).map(p=>esc(nm(p))).join(', ')||'–'}</td></tr>`).join('')}</table>
      <div class="btns"><button class="btn ghost" data-act="close">Close</button></div></div>`;}
  case 'log':return `<div class="sheet"><h2>Game log</h2><ul class="loglist">${G.log.slice().reverse().map(l=>`<li><span class="t">${l.t?'Turn '+l.t:'Setup'}</span>${esc(l.m)}</li>`).join('')}</ul><div class="btns"><button class="btn ghost" data-act="close">Close</button></div></div>`;
  case 'rules':return rulesHTML();
  case 'improve':case 'knight':case 'prog':case 'progDiscard':case 'progChoose':case 'give':return ckSheet(s)||'';
  case 'tokens':case 'fish':case 'tbgold':case 'vote':case 'badraw':case 'evlist':return tbSheet(s)||'';
  case 'win':{const w=G.winner;const row=(l,f)=>`<tr><td>${l}</td>${PL().map(p=>`<td>${f(p)}</td>`).join('')}</tr>`;
    const cnt=(p,c)=>G.vOwn.filter(o=>o&&o.p===p&&o.city===c).length;const sc=SC();
    return `<div class="sheet"><h2>${esc(nm(w))} wins</h2><p class="lead">After ${G.turn} turn${G.turn===1?'':'s'}. Hidden cards are revealed below.</p>
      <table class="score-table"><tr><th></th>${PL().map(p=>`<th>${esc(nm(p))}</th>`).join('')}</tr>
      ${row('Settlements',p=>cnt(p,false))}${row('Cities (2 each)',p=>cnt(p,true)*2)}${sc.noLongest?'':row(sc.sea?'Longest Trade Route':'Longest Road',p=>G.longest===p?2:0)}${CK()?'':row('Largest Army',p=>G.army===p?2:0)}
      ${sc.sea?row('Bonus points',p=>P(p).bonus):''}${sc.villages?row('Cloth (2 = 1 point)',p=>Math.floor(P(p).cloth/2)):''}${CK()?row('Metropolises (+2 each)',p=>G.vOwn.filter(o=>o&&o.p===p&&o.metro).length*2)+row('Defender of the island',p=>P(p).defender)+row('Printer / Constitution',p=>P(p).progVP)+row('Merchant',p=>G.merchant&&G.merchant.p===p?1:0):row('Victory Point cards',p=>P(p).dev.filter(d=>d.t==='vp').length)}
      <tr class="total"><td>Total</td>${PL().map(p=>`<td>${vp(p,true)}</td>`).join('')}</tr></table>
      <h3 style="margin-top:14px">How the game went</h3>${Stats.html()}${Stats.series(G.opts)}
      <div class="btns"><button class="btn ghost" data-act="winseen">Look at the board</button><button class="btn" data-act="newgame">Change setup</button><button class="btn primary" data-act="rematch">Rematch</button></div></div>`;}
  case 'stats':return `<div class="sheet"><h2>Game stats</h2>${Stats.html()}<div class="btns"><button class="btn ghost" data-act="close">Close</button></div></div>`;
  case 'steal':{const pd=G.pending;
    return `<div class="sheet"><h2>Steal from whom?</h2><p class="lead">${esc(nm(G.cur))}, more than one player has a building there. Pick one and take a random card.</p>
      <div class="btns col">${pd.vs.map(q=>`<button class="btn primary" data-act="steal" data-q="${q}"><i class="dotc" style="--c:${P(q).color}"></i> ${esc(nm(q))} · ${handCount(q)} card${handCount(q)===1?'':'s'}</button>`).join('')}</div></div>`;}
  case 'aioffer':{const o=UI.aiOffer;if(!o)return '';const ai=o.ai!=null?o.ai:G.opts.ai,to=o.to!=null?o.to:humanP(),can=canAfford(to,o.aiGets)&&canAfford(ai,o.aiGives);
    return `<div class="sheet"><h2>${o.kind==='counter'?'A counter-offer':esc(nm(ai))+' has an offer'}</h2><p class="lead">${o.kind==='counter'?esc(nm(ai))+' would do this instead:':esc(nm(ai))+' would give you'}</p>
      <div class="offer">${offerSide(o.aiGives)}<span class="arrow">for your</span>${offerSide(o.aiGets)}</div>
      ${can?'':'<p class="note">One of you no longer holds those cards.</p>'}
      <div class="btns"><button class="btn" data-act="aino">No thanks</button><button class="btn primary" data-act="aiyes" ${can?'':'disabled'}>Accept</button></div></div>`;}
  }
  return '';
}
function rulesHTML(){
  const sc=G?SC():SCEN.classic;const tgt=G?winTarget():10;
  return `<div class="sheet rules"><h2>How to play</h2><dl>
    <dt>Goal</dt><dd>Be first to ${tgt} points on your own turn.</dd>
    <dt>Points</dt><dd>Settlement 1 · City 2 · ${sc.noLongest?'':`${sc.sea?'Longest Trade Route':'Longest Road'} (5+ in a row) 2 · `}Largest Army (3+ Knights) 2 · Victory Point card 1.</dd>
    <dt>Setup</dt><dd>Each player places a settlement and a ${sc.sea?'road or ship':'road'}, in the order first, second, second, first. Your second settlement collects one card from every tile it touches.</dd>
    <dt>Your turn</dt><dd>Roll. Every tile showing that number pays 1 card to each settlement touching it and 2 to each city. The robber’s tile pays nothing. Then trade and build in any order, and end your turn.</dd>
    <dt>Rolling 7</dt><dd>Anyone holding more than 7 cards discards half, rounded down. The roller moves the robber${sc.sea?' or the pirate':''} and steals 1 random card from a player with a building on that tile (you choose if there are several).</dd>
    <dt>Costs</dt><dd><div class="costs"><div><span>Road</span>${costIcons(COST.road)}</div>${sc.sea?`<div><span>Ship</span>${costIcons(COST.ship)}</div>`:''}<div><span>Settlement</span>${costIcons(COST.settlement)}</div><div><span>City</span>${costIcons(COST.city)}</div><div><span>Dev card</span>${costIcons(COST.dev)}</div></div></dd>
    <dt>Placing</dt><dd>Settlements need an empty corner with no building on any neighbouring corner, and one of your roads${sc.sea?' or ships':''} leading to it. Roads extend your roads or buildings; an opponent’s building cuts your road.</dd>
    ${sc.sea?`<dt>Ships</dt><dd>Ships sail on edges next to the sea and extend from your coastal settlements or other ships. Roads and ships only join at one of your settlements or cities. Once per turn you may move the last ship of an open route (not one built this turn) to another legal spot.</dd>
    <dt>Gold fields</dt><dd>Pay 1 resource of your choice per settlement, 2 per city.</dd>
    <dt>The pirate</dt><dd>On a 7 or a Knight, move the pirate to a sea tile instead of the robber and steal from a player with a ship beside it. No ships can be built or moved on the pirate’s edges.</dd>
    <dt>This scenario</dt><dd>${esc(sc.sub)}</dd>`:''}
    ${tbRulesHTML(sc)}
    ${G&&G.opts.ck?`<dt>Guilds &amp; Garrisons</dt><dd>Your second starting building is a city. Cities on forest, pasture and mountains produce 1 resource plus 1 commodity (paper, cloth, coin). Spend commodities on city improvements in Trade, Politics and Science; level 3 unlocks a special ability and level 4 founds a metropolis worth 2 more points. Knights (wool + ore) defend the island: activate them with grain, promote them with wool + ore, and tap a knight on the board for its actions. The event die moves the barbarian ship; when it lands, their strength (one per city) is compared with all active knights. If the knights lose, the weakest defender loses a city; if they win, the strongest defender gets a point. City gate faces hand out progress cards to players whose improvement level is high enough for the red die. City walls (2 brick) raise your hand limit by 2. The robber waits in the desert until the first barbarian attack. Development cards and Largest Army are not used.</dd>`:''}
    <dt>Trading</dt><dd>Bank 4:1. Harbors 3:1 on anything, or 2:1 on their resource, once you have a building on one of the two dock corners. You can trade with another player on your turn after rolling.</dd>${G&&G.players.length>=5?'<dt>Special building phase</dt><dd>With 5 or 6 players, after each turn every other player in order may build: roads, settlements, cities or a development card. No trading, no playing development cards and no dice. Press Done building to pass.</dd>':''}
    <dt>Development cards</dt><dd>Play at most one per turn, never on the turn you bought it. Knights can be played before you roll.</dd>
    <dt>Camera</dt><dd>Drag to turn the table, pinch or scroll to zoom, two-finger drag or right-drag to slide. The circular-arrow button resets the view.</dd></dl>
    <div class="btns"><button class="btn ghost" data-act="close">Close</button></div></div>`;
}
let lastSheet='';
function renderSheet(){
  const s=wantedSheet();const ov=$('#ov');
  if(!s){if(lastSheet){ov.className='';ov.innerHTML='';lastSheet='';ov.dataset.type='';}return;}
  const html=sheetHTML(s);const fresh=!ov.classList.contains('show')||ov.dataset.type!==s.type;
  if(html!==lastSheet){const keep=ov.firstElementChild&&ov.firstElementChild.scrollTop;ov.innerHTML=html;lastSheet=html;
    const el=ov.firstElementChild;if(el){if(fresh)el.classList.add('enter');else if(keep)el.scrollTop=keep;}}
  ov.dataset.type=s.type;ov.className='show'+(s.type==='gate'?' opaque':'');
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
function ckAllowed(){return UI.setup.scen!=='barbattack';}
function setupCpu(){const st=UI.setup;const c=st.cpu!=null?st.cpu:(st.ai?1:0);return c<0?0:c>3?3:c;}
function setupPeople(){const n=UI.setup.n||2;return n<1?1:n>6?6:n;}
function setupN(){const t=setupPeople()+setupCpu();return t<2?2:t>6?6:t;}
function scenAllowed(k,n){const sc=SCEN[k];if(n<=2)return true;if(sc.tbBoard||sc.tb)return false;if(n<=4)return true;return !!sc.classic;}
function tradeQ(){const tr=UI.trade,q=tr&&tr.q;return (q!=null&&q!==G.cur&&q<NP())?q:(G.cur+1)%NP();}
function fitSetup(){const st=UI.setup;const cpu=setupCpu();let pe=setupPeople();
  if(cpu===0&&pe<2)pe=2;
  if(pe+cpu>6)pe=6-cpu;
  if(!PAD.role&&cpu>0)pe=1;                  // one shared device: one person against the computers
  st.cpu=cpu;st.n=pe;st.ai=cpu>0;const n=pe+cpu;
  for(let i=0;i<6;i++){const cur=st.names[i];
    if(i>=pe&&i<n)st.names[i]=cpu===1?'Computer':'Computer '+(i-pe+1);
    else if(!cur||/^Computer( \d)?$/.test(cur))st.names[i]='Player '+(i+1);}
  if(n>2){st.ck=false;st.vars={};}
  if(!scenAllowed(st.scen,n))st.scen='classic';
  const used=new Set();for(let i=0;i<n;i++){let c=st.colors[i];if(c==null||used.has(c)){c=COLORS.findIndex((x,k)=>!used.has(k));}st.colors[i]=c;used.add(c);}}
function baseTarget(){const st=UI.setup;return SCEN[st.scen].target+(st.ck&&ckAllowed()?3:0)+(st.vars&&st.vars.harbor?1:0);}
function setupOpts(){const st=UI.setup,n=setupN(),multi=n>2;const cpu=setupCpu(),pe=setupPeople();const aiS=cpu>0?Array.from({length:cpu},(_,i)=>pe+i):null;return {scen:st.scen,ai:aiS?aiS[0]:null,aiSeats:aiS,diff:st.diff||'normal',ck:!multi&&!!st.ck&&ckAllowed(),vars:multi?{}:Object.assign({},st.vars||{}),fair:!!st.fair,target:st.target||baseTarget(),priv:cpu>0?false:st.priv,players:[...Array(n).keys()].map(i=>({name:(st.names[i]||'').trim()||`Player ${i+1}`,color:COLORS[st.colors[i]].h}))};}
function previewGame(board){const g=newGame(setupOpts(),board);g.preview=true;return g;}
const ACT={
  menu(){UI.sheet={type:'menu'};refresh();},
  close(){UI.sheet=null;refresh();},
  resetview(){if(GL.ready){GL.userMoved=false;fitCamera();}},
  log(){UI.sheet={type:'log'};refresh();},
  rules(){UI.sheet={type:'rules'};refresh();},
  villages(){UI.sheet={type:'villages'};refresh();},
  sound(){SND.on=!SND.on;sndSave();if(SND.on)audio();else if(SND.ac)ambienceUpdate();refresh();},
  lighting(){RL.cycle();refresh();},
  hint(){Feel.hint();},
  undo(){if(Undo.run())refresh(true);},
  aispeed(){const o=['normal','fast','slow'];AIS.speed=o[(o.indexOf(AIS.speed)+1)%3];try{localStorage.setItem('tidehaven.aispeed',AIS.speed);}catch(e){}refresh();},
  ambience(){SND.ambOn=!SND.ambOn;sndSave();audio();ambienceUpdate();refresh();},
  volume(){setVolume(SND.vol<.4?.65:SND.vol<.75?1:.3);sfx('place');refresh();},
  scenery(){GL.anim=!GL.anim;document.documentElement.classList.toggle('calm',!GL.anim);try{localStorage.setItem('tidehaven.anim',GL.anim?'1':'0');}catch(e){}GL.dirty=true;refresh();},
  newgame(){UI.sheet={type:'setup'};if(!G||G.winner!=null){previewGame(null);}refresh();},
  reshuffle(){previewGame(null);refresh();},
  scen(d){UI.setup.scen=d.v;UI.setup.target=null;previewGame(null);refresh();},
  cktoggle(){UI.setup.ck=!UI.setup.ck;UI.setup.target=null;previewGame(null);refresh();},
  start(){UI.aiOffer=null;Undo.stack.length=0;Feel.clearHint&&GL.ready&&Feel.clearHint();const board=G&&G.preview&&G.opts.scen===UI.setup.scen?G.board:null;newGame(setupOpts(),board);UI.viewer=null;UI.gate=null;UI.sheet=null;UI.mode=null;UI.winSeen=false;UI.shipFrom=null;refresh(true);toast(`${nm(G.cur)} won the coin toss and places first.`);},
  resume(){const s=loadSave();if(s){UI.aiOffer=null;setG(s);UI.viewer=null;UI.gate=null;UI.sheet=null;UI.mode=null;UI.winSeen=false;refresh();}},
  color(d){const s=+d.s,c=+d.c,n=setupN();const o=UI.setup.colors.findIndex((x,i)=>i!==s&&i<n&&x===c);if(o>=0)UI.setup.colors[o]=UI.setup.colors[s];UI.setup.colors[s]=c;if(G&&G.preview){const op=setupOpts();G.players.forEach((p,i)=>{p.color=op.players[i].color;});}refresh();},
  target(d){UI.setup.target=+d.v;if(G&&G.preview)G.opts.target=+d.v;refresh();},
  gateok(){const p=UI.gate.p;UI.viewer=p;G.seen[p]=G.logId;UI.gate=null;refresh();},
  winseen(){UI.winSeen=true;refresh();},
  roll(){startRoll();},
  end(){const r=endTurn();if(r){UI.mode=null;UI.shipFrom=null;sfx('card');if(aiOn()&&isAI(G.cur))toast(`${nm(G.cur)}’s turn.`,1800);}refresh();},
  build(d){const k=d.k;
    if(k==='improve'){UI.sheet={type:'improve'};refresh();return;}
    if(['tokens','fish','gold'].includes(k)){UI.sheet={type:k==='gold'?'tbgold':k};refresh();return;}
    if(k==='repair'){if(repairRoad())sfx('place');refresh(true);return;}
    if(k==='trade'){UI.trade={tab:'bank',give:null,get:null,og:zero(),ot:zero(),q:null};UI.sheet={type:'trade'};}
    else if(k==='dev'){const t=buyDev();if(t){sfx('card');const dn=(DEV[t]||(typeof BA_DEV!=='undefined'&&BA_DEV[t])||{n:t}).n;if(G.opts.scen==='barbattack'&&BA_DEV[t])UI.sheet={type:'badraw',t};else toast(`You drew: ${dn}${t==='vp'?' (+1 point, hidden)':''}.`);}}
    else{UI.mode=UI.mode===k?null:k;UI.shipFrom=null;}
    refresh();},
  cancelmode(){UI.mode=null;UI.shipFrom=null;refresh();},
  ekind(d){UI.edgeKind=d.v;refresh();},
  devinfo(d){UI.sheet={type:'dev',t:d.t};refresh();},
  playdev(d){const t=d.t;
    if(t==='plenty'){UI.sheet={type:'plenty',sel:zero()};refresh();return;}
    if(t==='monopoly'){UI.sheet={type:'monopoly',r:null};refresh();return;}
    const ok=t==='knight'?playKnight():t==='road'?playRoadBuilding():false;
    if(ok){UI.sheet=null;UI.mode=null;sfx('card');toast(t==='knight'?`Knight played. Move the ${SC().sea?'robber or pirate':'robber'}.`:`Road Building: place 2 free ${SC().sea?'roads or ships':'roads'}.`);}
    refresh(true);},
  plenty(){if(playPlenty(UI.sheet.sel)){UI.sheet=null;sfx('card');toast('Year of Plenty: cards taken.');}refresh();},
  mono(d){UI.sheet.r=d.r;refresh();},
  monogo(){const r=UI.sheet.r;const k=playMonopoly(r);if(k!==false){UI.sheet=null;sfx('card');toast(`Monopoly: you took ${k} ${RNAME[r]}.`);}refresh();},
  step(d){const k=d.k,r=d.r,dl=+d.d;let o,max;
    if(k==='og'){o=UI.trade.og;max=P(G.cur).res[r];}
    else if(k==='ot'){o=UI.trade.ot;max=9;}
    else if(k==='disc'){o=UI.disc;if(o[r]==null)o[r]=0;const q=G.pending.queue[0];max=Math.min(P(q.p).res[r],o[r]+(q.n-sumH(o)));}
    else if(k==='gold'){o=UI.goldSel;const q=G.pending.queue[0];const need=Math.min(q.n,sum(G.bank));max=Math.min(G.bank[r],o[r]+(need-sum(o)));}
    else if(k==='plen'){o=UI.sheet.sel;const need=Math.min(2,sum(G.bank));max=Math.min(G.bank[r],o[r]+(need-sum(o)));}
    else{const c=ckStep(k,r)||tbStep(k,r);if(c){o=c.o;max=c.max;}}
    if(!o)return;if(o[r]==null)o[r]=0;o[r]=dl>0?Math.min(max,o[r]+1):Math.max(0,o[r]-1);refresh();},
  discard(){if(doDiscard(UI.disc)){UI.disc=zero();UI.discKey='';sfx('card');}refresh();},
  gold(){if(doGold(UI.goldSel)){UI.goldSel=zero();UI.goldKey='';sfx('card');}refresh();},
  ttab(d){UI.trade.tab=d.v;refresh();},
  tgive(d){UI.trade.give=d.r;if(UI.trade.get===d.r)UI.trade.get=null;refresh();},
  tget(d){UI.trade.get=d.r;refresh();},
  tbank(){const tr=UI.trade;const snap=Undo.snap('trade');if(bankTrade(tr.give,tr.get)){Undo.commit(snap);sfx('coin');UI.bump=[tr.get];if(P(G.cur).res[tr.give]<rates(G.cur)[tr.give])tr.give=null;}refresh();},
  toffer(){if(aiOn()){const tr=UI.trade,ai=tradeQ();if(aiAcceptTrade(tr.og,tr.ot,ai)&&playerTrade(tr.og,tr.ot,ai)){sfx('coin');toast(`${nm(ai)} accepts the trade.`);tr.og=zero();tr.ot=zero();UI.sheet=null;}else{const c=aiCounter(tr.og,tr.ot,ai);if(c){UI.aiOffer={kind:'counter',mine:false,ai,aiGives:c.aiGives,aiGets:c.aiGets};UI.sheet=null;sfx('card');}else tradeDeclined(`${nm(ai)} declined your offer.`);}refresh();return;}UI.sheet={type:'offer'};refresh();},
  nplayers(d){UI.setup.n=+d.v;if(+d.v===1&&setupCpu()===0)UI.setup.cpu=1;UI.setup.target=null;fitSetup();previewGame(null);refresh();},
  tpartner(d){UI.trade.q=+d.q;refresh();},
  steal(d){const r=stealFrom(+d.q);if(r){sfx('card');toast(r.stolen?`${nm(G.cur)} stole 1 ${r.stolen==='cloth'?'cloth':RNAME[r.stolen]} from ${nm(r.from)}.`:'Nothing to steal.');}refresh();},
  cpu(d){const st=UI.setup;st.cpu=+d.v;if(st.cpu===0&&setupPeople()<2)st.n=2;st.target=null;fitSetup();previewGame(null);refresh();},
  diff(d){UI.setup.diff=d.v;refresh();},
  noop(){},
  stats(){UI.sheet={type:'stats'};refresh();},
  fairtoggle(){UI.setup.fair=!UI.setup.fair;if(G&&G.preview)G.opts.fair=!!UI.setup.fair;refresh();},
  rematch(){const o=G.opts,st=UI.setup;
    st.names=o.players.map(p=>p.name);st.colors=o.players.map(p=>Math.max(0,COLORS.findIndex(c=>c.h===p.color)));st.scen=o.scen;st.ck=!!o.ck;st.vars=Object.assign({},o.vars||{});st.target=o.target;st.cpu=o.aiSeats?o.aiSeats.length:(o.ai!=null?1:0);st.ai=st.cpu>0;st.n=o.players.length-st.cpu;st.diff=o.diff||'normal';st.fair=!!o.fair;st.priv=o.priv;
    G.preview=true;ACT.start();},
  aiyes(){const o=UI.aiOffer;if(!o)return;const ai=o.ai!=null?o.ai:G.opts.ai,mine=!!o.mine;
    const ok=(mine===(G.cur===ai))&&(mine?playerTrade(o.aiGives,o.aiGets,o.to!=null?o.to:humanP()):playerTrade(o.aiGets,o.aiGives,ai));UI.aiOffer=null;UI.sheet=null;
    if(ok){sfx('coin');toast(`Trade done with ${nm(ai)}.`);if(!mine&&UI.trade){UI.trade.og=zero();UI.trade.ot=zero();}}else if(!mine&&UI.trade)UI.sheet={type:'trade'};refresh();},
  aino(){const o=UI.aiOffer;if(!o)return;const ai=o.ai!=null?o.ai:G.opts.ai;UI.aiOffer=null;
    if(o.kind==='propose'&&o.mine){const sw=aiSweeten(o);if(sw){UI.aiOffer=sw;sfx('card');refresh();return;}}
    UI.sheet=!o.mine&&UI.trade?{type:'trade'}:null;toast(o.mine?`${nm(ai)} shrugs and carries on.`:`${nm(ai)} keeps its cards.`,1600);refresh();},
  taccept(){const tr=UI.trade,q=tradeQ();if(playerTrade(tr.og,tr.ot,q)){sfx('coin');toast(`${nm(q)} accepted the trade.`);UI.trade.og=zero();UI.trade.ot=zero();UI.sheet=null;}refresh();},
  tdecline(){tradeDeclined(`${nm(tradeQ())} declined your offer.`);UI.sheet={type:'trade'};refresh();}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const f=ACT[b.dataset.act];if(f){e.preventDefault();f(b.dataset,b);}});
document.addEventListener('input',e=>{const id=e.target.id;if(/^n[0-5]$/.test(id)){UI.setup.names[+id[1]]=e.target.value;if(G&&G.preview&&G.players[+id[1]]){G.players[+id[1]].name=e.target.value.trim()||`Player ${+id[1]+1}`;renderScores();}}});
document.addEventListener('change',e=>{if(e.target.id==='priv'){UI.setup.priv=e.target.checked;if(G&&G.preview)G.opts.priv=e.target.checked;}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const s=wantedSheet();if(s&&['menu','log','rules','dev','trade','villages','improve','knight','prog','badraw','evlist'].includes(s.type)){UI.sheet=null;refresh();}else if(UI.mode){UI.mode=null;UI.shipFrom=null;refresh();}}});
Object.assign(ACT,CKACT,TBACT);

/* =====================================================================
   SAVE / BOOT
   ===================================================================== */
/* remembers that the other player turned the offer down, and shows it inside the trade window until the offer changes */
function tradeSig(){return UI.trade?JSON.stringify([UI.trade.og,UI.trade.ot,tradeQ()]):'';}
function tradeDeclined(txt){if(UI.trade)UI.trade.note={sig:tradeSig(),txt};}
const SAVE_KEY='tidehaven.save.v2';
function save(){if(!G||G.preview||PAD.role==='pad')return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(G));}catch(e){}}
function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s&&s.ver===2&&s.winner==null)return s;}catch(e){}return null;}
function refresh(anim){
  if(!G)return;
  if(G.endingTurn&&!G.pending&&G.winner==null&&G.phase==='main'){if(endTurn()){UI.mode=null;UI.shipFrom=null;}}
  syncTopo();
  if(GL.ready)syncScene(anim);
  Stats.winCheck();
  renderScores();renderRail();renderSheet();renderTicker();save();
  if(typeof sndWatch==='function')sndWatch();
  if(PAD.hook)PAD.hook();
  aiSchedule();
}
function boot(data){
  makeIcons();

  if(data&&data.setup)UI.setup=Object.assign(UI.setup,data.setup);
  if(data&&data.G&&data.G.ver===2){setG(data.G);UI.viewer=data.viewer??null;}
  else{previewGame(null);UI.sheet={type:'setup'};}
  refresh();
  if(PAD.role==='pad'||document.getElementById('mini'))return;
  const fontReady=(document.fonts&&document.fonts.load)?Promise.race([document.fonts.load('120px "IM Fell English SC"'),new Promise(r=>setTimeout(r,2500))]):Promise.resolve();
  fontReady.catch(()=>{}).then(()=>{if(typeof THREE==='undefined'||!THREE.OrbitControls){$('#nogl').hidden=false;return;}if(initGL())refresh();});
}
window.TH={Stats,tb:{neutralTargets,placeNeutral,forcedTrade,tokenRobber,cashKnight,tokenBlock,spendFish,fishBlock,fishTotal,giveBoot,bridgeSpots,buildBridge,buyWithGold,sellForGold,goldBuyBlock,camelSpots,placeCamel,castVote,kplace,kplaceSpots,capture,captureTargets,treason,treasonTargets,knightCanMove,knightRange,moveEdgeKnight,finishKnightMoves,kmovesBlock,repairRoad,doRollCard,drawEvent,harborPoints},CK:()=>CK(),ck:{improve,improveBlock,buildKnight,knightSpots,promoteKnight,promoteBlock,activateKnight,knightMoves,moveKnight,canChase,chaseRobber,buildWall,wallSpots,playProg,progBlock,doGive,progDiscard,progChoose,engineerPick,inventorPick,inventorHexes,merchantPick,merchantHexes,deserterPick,diplomatPick,openRoads,intriguePick,intrigueTargets,smithPick,smithTargets,skipPending,knightCanAct,handCount,activeStrength,knightsOf},get G(){return G;},set G(v){setG(v);},get T(){return T;},SCEN,newGame,genBoard,setupSettle,setupEdge,setupRoad,doRoll,doDiscard,doGold,moveRobber,thiefTargets,build,buyDev,devBlock,playKnight,playRoadBuilding,playPlenty,playMonopoly,bankTrade,playerTrade,endTurn,
  validSettlements,validRoads,validShips,validCities,edgeKinds,freeEdgeTargets,movableShips,shipDestinations,moveShip,harborGiftSpots,placeHarborGift,vp,rates,longestRoadOf,refresh,UI,GL,ACT,winTarget};
if(window.claude&&window.claude.hot&&window.claude.hot.snapshot)window.claude.hot.snapshot(()=>({G:G&&!G.preview?G:null,viewer:UI.viewer,setup:UI.setup}));
(window.claude&&window.claude.hot&&window.claude.hot.ready)?window.claude.hot.ready(boot):boot((window.claude&&window.claude.hot&&window.claude.hot.data)||{});
