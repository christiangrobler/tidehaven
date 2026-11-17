'use strict';
/* =====================================================================
   GAME FEEL
   · cards fly from the tiles that produced them into the hand that earned them
   · a ring pulse where pieces land, haptic taps on phones
   · hint: points at a good move and says why
   · undo: take back builds and bank trades until something new happens
   · gentle camera follow when you've zoomed in and the action is off-screen
   ===================================================================== */
const Feel={hintObjs:[],hintKey:'',vib:true};

function vibe(ms){try{if(PAD.role!=='tv'&&Feel.vib&&SND.on&&navigator.vibrate)navigator.vibrate(ms);}catch(e){}}

/* ---------- screen helpers ---------- */
function worldToScreen(x,y,z){
  if(!GL.ready)return null;const v=new THREE.Vector3(x,y,z).project(GL.cam),r=GL.r.domElement.getBoundingClientRect();
  return {x:r.left+(v.x*.5+.5)*r.width,y:r.top+(-v.y*.5+.5)*r.height,ndc:v};
}

/* ---------- cards flying from tiles to hands ---------- */
Feel.flyProduction=function(res){if(PAD.role==='tv')return;
  if(!GL.ready||!res||REDUCED||document.hidden)return;
  try{
    const left=PL().map(p=>Object.assign({},res.gains[p])),items=[];
    G.board.hexes.forEach((H,i)=>{
      if(H.n!==res.n||i===G.robber||H.t==='sea'||(G.conq&&G.conq[i]))return;const base=TERR_RES[H.t];if(!base)return;
      T.hexes[i].v.forEach(v=>{const o=G.vOwn[v];if(!o||o.p>=NP())return;
        const give=[];if(G.opts.ck&&o.city){give.push(base);if(TERR_COM[H.t])give.push(TERR_COM[H.t]);}else{give.push(base);if(o.city)give.push(base);}
        give.forEach(r=>{if((left[o.p][r]||0)>0){left[o.p][r]--;items.push({h:i,p:o.p,r});}});});});
    if(!items.length)return;
    const viewer=aiOn()?humanP():G.cur,hk=HANDK();
    const dest=(p,r)=>{
      let el=null;
      if(p===viewer&&handVisible(p)){const k=hk.indexOf(r);el=$('#hand').children[k];}
      if(!el)el=document.querySelectorAll('#scores > *')[p];
      return el;};
    items.slice(0,14).forEach((it,n)=>{
      const from=worldToScreen(T.hexes[it.h].c.x,TOP+.2,T.hexes[it.h].c.y),el=dest(it.p,it.r);if(!from||!el)return;
      const b=el.getBoundingClientRect(),x1=b.left+b.width/2,y1=b.top+b.height/2;
      const card=document.createElement('div');card.className='flycard';card.style.cssText=`background-image:var(--grain),linear-gradient(160deg,${KCOLS(it.r)[0]},${KCOLS(it.r)[1]})`;
      card.innerHTML=`<img src="${ICON.light[it.r]}" alt="">`;document.body.appendChild(card);
      const x0=from.x-14,y0=from.y-19,mx=(x0+x1)/2+(Math.random()-.5)*40,my=Math.min(y0,y1)-50-Math.random()*30,delay=n*85+Math.random()*50,dur=950;
      const a=card.animate([
        {transform:`translate(${x0}px,${y0}px) scale(.3) rotate(${-14+Math.random()*28}deg)`,opacity:0},
        {transform:`translate(${x0}px,${y0-26}px) scale(1.1) rotate(${-8+Math.random()*16}deg)`,opacity:1,offset:.16},
        {transform:`translate(${mx}px,${my}px) scale(1) rotate(${-10+Math.random()*20}deg)`,opacity:1,offset:.55},
        {transform:`translate(${x1-14}px,${y1-19}px) scale(.62) rotate(0deg)`,opacity:.95}],
        {duration:dur,delay,easing:'cubic-bezier(.35,.1,.3,1)',fill:'both'});
      a.onfinish=()=>{card.remove();try{el.animate([{transform:'scale(1)'},{transform:'scale(1.09)'},{transform:'scale(1)'}],{duration:220});}catch(e){}};
      if(n<5)sfx('card',{delay:(delay+dur*.9)/1000,pan:it.p===viewer?0:.5,s:.8});
    });
  }catch(e){console.warn('fly',e);}
};

/* ---------- landing pulse + focus ---------- */
Feel.pulse=function(pos,col,big){
  if(!GL.ready||REDUCED)return;
  const geo=new THREE.RingGeometry(.1,.14,40),mat=new THREE.MeshBasicMaterial({color:lin(col||'#ffe6a8'),transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide});
  const m=new THREE.Mesh(geo,mat);m.rotation.x=-Math.PI/2;m.position.set(pos.x,Math.max(pos.y,TOP)+.02,pos.z);m.renderOrder=6;GL.scene.add(m);
  const s1=big?3.2:2.2;tween(650,k=>{m.scale.setScalar(1+(s1-1)*k);mat.opacity=.7*(1-k);},()=>{GL.scene.remove(m);geo.dispose();mat.dispose();});
};
Feel.focus=function(pos){
  if(!GL.ready||!GL.userMoved||REDUCED)return;
  const v=new THREE.Vector3(pos.x,pos.y,pos.z).project(GL.cam);if(Math.abs(v.x)<.78&&Math.abs(v.y)<.72)return;
  const t=GL.ctl.target,from=t.clone(),to=new THREE.Vector3(pos.x,0,pos.z).lerp(from,.45),d=to.sub(from),cam0=GL.cam.position.clone();
  tween(800,k=>{const e=easeOut(k);t.copy(from).addScaledVector(d,e);GL.cam.position.copy(cam0).addScaledVector(d,e);GL.ctl.update();});
};

/* ---------- hints ---------- */
function hexLabel(v){return [...new Set(T.verts[v].hexes.filter(h=>TERR_RES[HT(h)]&&G.board.hexes[h].n).map(h=>`${RNAME[TERR_RES[HT(h)]]} ${G.board.hexes[h].n}`))].join(', ')||'the coast';}
function hintCompute(p){
  const pl=P(p);
  if(G.phase==='setup'){
    if(G.step==='settlement'){const l=validSettlements(p,true);if(!l.length)return null;const v=argmax(l,v=>vertexValue(v,p));
      return {v:[v],text:`Try this corner: it touches ${hexLabel(v)}. Good numbers and a mix of resources win early.`};}
    const from=G.lastV,cand=[...new Set([...validRoads(p,from),...validShips(p,from)])];if(!cand.length)return null;
    const e=argmax(cand,e=>{const E=T.edges[e],w=E.a===from?E.b:E.a;let s=0;T.verts[w].adj.forEach(u=>{if(u!==from&&freeSpot(u))s=Math.max(s,vertexValue(u,p));});return s;});
    return {e:[e],text:'Point your road toward open ground. Roads that lead to a good future corner are worth the most.'};}
  if(!G.rolled)return {text:'Roll the dice first.'};
  if(G.pending)return {text:'Finish the current step first.'};
  if(pl.cities>0&&validCities(p).length&&canAfford(p,cityCost(p))){const l=validCities(p),v=argmax(l,v=>vertexValue(v,p));
    return {v:[v],text:`Upgrade this settlement to a city. It pays double on ${hexLabel(v)}.`};}
  if(pl.settlements>0&&canAfford(p,COST.settlement)){const l=validSettlements(p,false);if(l.length){const v=argmax(l,v=>vertexValue(v,p));
    return {v:[v],text:`You can settle here. It touches ${hexLabel(v)} and is worth a point.`};}}
  const route=planRoute(p),g=buildGoals(p)[0];
  if(route&&route.first&&canAfford(p,COST[route.first.k])&&(route.first.k==='road'?canRoad(p,route.first.e):canShip(p,route.first.e)))
    return {e:[route.first.e],text:`A ${route.first.k} here heads toward a strong corner (${hexLabel(route.target)}).`};
  if(g){const miss=[];Object.keys(g.cost).forEach(k=>{const d=(g.cost[k]||0)-(pl.res[k]||0);if(d>0)miss.push(`${d} ${KNAME(k)}`);});
    const name=({city:'a city',settlement:'a settlement',road:'a road',ship:'a ship',dev:'a development card',imp:'a city improvement',knight:'a knight'})[g.k]||g.k;
    const rt=rates(p),spare=HANDK().filter(k=>(pl.res[k]||0)-((g.cost[k]||0))>=rt[k]);
    const tr=spare.length&&miss.length?` You could trade ${rt[spare[0]]} ${KNAME(spare[0])} with the bank for what's missing.`:'';
    return {text:miss.length?`Your next goal is ${name}. You still need ${miss.join(' and ')}.${tr}`:`You can afford ${name}.`};}
  return {text:'Nothing useful to build right now. Trade, or end your turn.'};
}
Feel.clearHint=function(){Feel.hintObjs.forEach(o=>{GL.markG.remove(o.m);o.m.geometry.dispose();o.m.material.dispose();});Feel.hintObjs=[];GL.dirty=true;};
Feel.hint=function(){
  if(!G||G.preview||G.winner!=null)return;
  const p=aiOn()?humanP():G.cur;if(aiOn()&&isAI(G.cur)){toast('Wait for your turn.',1800);return;}
  let h;try{h=hintCompute(p);}catch(e){h=null;}
  if(!h){toast('No suggestion right now.',2000);return;}
  Feel.clearHint();Feel.hintKey=G.logId+':'+G.cur+':'+G.step+':'+G.rolled;
  const mat=()=>new THREE.MeshBasicMaterial({color:0xffb81f,transparent:true,opacity:.95,depthWrite:false,depthTest:false,side:THREE.DoubleSide,toneMapped:false});
  (h.v||[]).forEach(v=>{const V=T.verts[v];const m=new THREE.Mesh(new THREE.TorusGeometry(.34,.085,12,40),mat());m.rotation.x=Math.PI/2;m.position.set(V.x,TOP+.12,V.y);m.renderOrder=9;GL.markG.add(m);Feel.hintObjs.push({m});
    const arrow=new THREE.Mesh(new THREE.ConeGeometry(.17,.38,16),mat());arrow.rotation.x=Math.PI;arrow.position.set(V.x,TOP+.75,V.y);arrow.renderOrder=9;GL.markG.add(arrow);Feel.hintObjs.push({m:arrow,by:TOP+.75});});
  (h.e||[]).forEach(e=>{const E=T.edges[e],a=T.verts[E.a],b=T.verts[E.b];const m=new THREE.Mesh(new THREE.BoxGeometry(.7,.08,.18),mat());m.position.set(E.x,(eLand(e)?TOP+.1:SEA+.1),E.y);m.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);m.renderOrder=9;GL.markG.add(m);Feel.hintObjs.push({m});
    const arrow=new THREE.Mesh(new THREE.ConeGeometry(.17,.38,16),mat());arrow.rotation.x=Math.PI;arrow.position.set(E.x,TOP+.7,E.y);arrow.renderOrder=9;GL.markG.add(arrow);Feel.hintObjs.push({m:arrow,by:TOP+.7});});
  tween(Feel.hintMs||6500,k=>{const s=1+.14*Math.sin(k*45);Feel.hintObjs.forEach(o=>{if(o.by!=null)o.m.position.y=o.by+.1*Math.sin(k*90);else o.m.scale.setScalar(s);o.m.material.opacity=k>.85?.95*(1-(k-.85)/.15):.95;});},()=>Feel.clearHint());
  toast(h.text,5600);
};
/* a hint goes stale as soon as the game moves on */
Feel.sync=function(){if(Feel.hintObjs.length&&G&&Feel.hintKey!==G.logId+':'+G.cur+':'+G.step+':'+G.rolled)Feel.clearHint();};

/* ---------- undo ---------- */
const Undo={stack:[]};
Undo.WHITE=['setupV','setupE','settlement','city','road','ship'];
Undo.snap=function(a){
  if(!G||G.preview||G.winner!=null||(aiOn()&&isAI(G.cur))||(a&&!Undo.WHITE.includes(a)&&a!=='trade'))return null;
  return {s:JSON.stringify(G),hexes:JSON.stringify(G.board.hexes),cur:G.cur,turn:G.turn,label:a};
};
Undo.commit=function(snap){
  if(!snap)return;
  if(G.pending||JSON.stringify(G.board.hexes)!==snap.hexes){Undo.stack.length=0;return;}   // random reveals or choices can't be taken back
  snap.after=G.logId;Undo.stack.push(snap);if(Undo.stack.length>10)Undo.stack.shift();
};
Undo.can=function(){
  const t=Undo.stack[Undo.stack.length-1];
  return !!(t&&G&&!G.preview&&G.winner==null&&!G.pending&&t.after===G.logId&&t.cur===G.cur&&t.turn===G.turn&&!UI.busy&&!(aiOn()&&isAI(G.cur)));
};
Undo.run=function(){
  if(!Undo.can())return false;const t=Undo.stack.pop();
  setG(JSON.parse(t.s));UI.mode=null;UI.shipFrom=null;UI.sheet=null;UI.ktFrom=null;Feel.clearHint();sfx('card');toast('Undone.',1400);return true;
};
