'use strict';
/* =====================================================================
   GAME STATS, FAIR DICE AND HEAD-TO-HEAD RECORD
   Wraps a few engine functions so the rules code stays untouched.
   ===================================================================== */
const Stats=(function(){
  const PN=n=>n>=2&&n<=12?6-Math.abs(7-n):0;
  const KEY='tidehaven.record';
  const fresh=(n)=>{n=n||(G&&G.players?G.players.length:2);const a=f=>Array.from({length:n},f);return {rolls:Array(13).fill(0),n:0,sevens:0,prod:a(()=>0),exp:a(()=>0),by:a(()=>({})),dry:a(()=>0),maxDry:a(()=>0),bank:a(()=>0),ptn:0,built:a(()=>({}))};};
  const S=()=>{if(!G.stats)G.stats=fresh();return G.stats;};

  /* expected cards per roll for a player, given what they own right now */
  function expectedProd(p){
    let e=0;
    T.hexes.forEach((h,i)=>{const H=G.board.hexes[i];if(!H.n||i===G.robber||(G.conq&&G.conq[i]))return;
      if(H.t!=='gold'&&!TERR_RES[H.t])return;
      const pr=PN(H.n)/36;
      h.v.forEach(v=>{const o=G.vOwn[v];if(o&&o.p===p)e+=pr*(o.city?2:1);});});
    return e;
  }

  /* ---- wrap the engine ---- */
  const _doRoll=doRoll;
  doRoll=function(d){
    const live=!!(G&&G.phase==='main'&&canRoll());
    const pre=live?PL().map(expectedProd):null;
    const res=_doRoll(d);
    if(res&&pre&&!res.reroll){
      const s=S();s.n++;if(res.n>=2&&res.n<=12)s.rolls[res.n]++;
      PL().forEach(p=>{
        s.exp[p]+=pre[p];
        let got=0;
        if(res.gains){got+=sumH(res.gains[p]);HANDK().forEach(r=>{if(res.gains[p][r])s.by[p][r]=(s.by[p][r]||0)+res.gains[p][r];});}
        if(res.gold)got+=res.gold[p]||0;
        s.prod[p]+=got;
        if(got>0)s.dry[p]=0;else{s.dry[p]++;if(s.dry[p]>s.maxDry[p])s.maxDry[p]=s.dry[p];}
      });
      if(res.seven)s.sevens++;
    }
    return res;
  };
  const _bankTrade=bankTrade;
  bankTrade=function(a,b){const p=G.cur;const r=_bankTrade(a,b);if(r)S().bank[p]++;return r;};
  const _playerTrade=playerTrade;
  playerTrade=function(a,b){const r=_playerTrade(a,b);if(r)S().ptn++;return r;};
  const _build=build;
  build=function(k,i,free){const p=G.cur;const r=_build(k,i,free);if(r){const b=S().built[p];b[k]=(b[k]||0)+1;}return r;};
  const _buyDev=buyDev;
  buyDev=function(){const p=G.cur;const r=_buyDev();if(r){const b=S().built[p];b.dev=(b.dev||0)+1;}return r;};

  /* ---- fair dice: a shuffled deck of all 36 rolls ---- */
  function drawDice(){
    if(!(G&&G.opts&&G.opts.fair))return [1+Math.floor(rnd()*6),1+Math.floor(rnd()*6)];
    if(!G.fair||G.fair.length<5)G.fair=shuffle([...Array(36).keys()]);
    const c=G.fair.pop();return [1+Math.floor(c/6),1+c%6];
  }

  /* ---- head-to-head record ---- */
  const nameOf=p=>String(p.name||'').trim().toLowerCase();
  function recKey(o){if(o.players.length!==2)return 'multi';const a=o.players.map(nameOf);return (a[0]<=a[1]?a:[a[1],a[0]]).join('|')+(o.ai!=null?'|ai:'+(o.diff||'normal'):'');}
  function loadRec(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){return {};}}
  function recordWin(){
    const all=loadRec(),k=recKey(G.opts);const r=all[k]||{games:0,wins:{}};
    r.games++;const w=nameOf(G.players[G.winner]);r.wins[w]=(r.wins[w]||0)+1;all[k]=r;
    try{localStorage.setItem(KEY,JSON.stringify(all));}catch(e){}
  }
  /* ---- all-time high score: most victory points any winner has finished with.
     Stored in its own key so new games, resets and restarts never clear it. ---- */
  const HSKEY='tidehaven.highscore';
  function highScore(){try{const v=parseInt(localStorage.getItem(HSKEY),10);return v>0?v:0;}catch(e){return 0;}}
  function recordHigh(){
    const pts=Math.max(...PL().map(p=>vp(p,true)));
    if(pts>highScore()){try{localStorage.setItem(HSKEY,String(pts));}catch(e){}}
  }
  function winCheck(){
    if(!(G&&G.winner!=null&&!G.preview&&PAD.role!=='pad'))return;
    if(!G.highDone){G.highDone=true;recordHigh();}
    if(!G.recorded&&G.players.length===2){G.recorded=true;recordWin();}
  }
  function series(o){
    if(o.players.length!==2)return '';
    const r=loadRec()[recKey(o)];if(!r||!r.games)return '';
    const a=o.players.map(p=>String(p.name||'').trim()||'Player');const w=o.players.map(p=>r.wins[nameOf(p)]||0);
    const lead=w[0]===w[1]?'All square':`${esc(a[w[0]>w[1]?0:1])} leads`;
    return `<p class="rec"><b>${esc(a[0])} ${w[0]} – ${w[1]} ${esc(a[1])}</b><span>${lead} after ${r.games} game${r.games===1?'':'s'}${o.ai!=null?` on ${esc(o.diff||'normal')}`:''}</span></p>`;
  }

  /* ---- display ---- */
  const f1=x=>(Math.round(x*10)/10).toFixed(1);
  function luck(p){const s=S();if(s.exp[p]<2)return {t:'–',c:''};const d=s.prod[p]/s.exp[p]-1;
    const pct=Math.round(d*100);return {t:`${pct>=0?'+':''}${pct}%`,c:d>=.15?'good':d<=-.15?'bad':'',w:d>=.15?'lucky':d<=-.15?'unlucky':'about average'};}
  function html(){
    const s=S(),n=s.n;if(!n)return '<p class="lead">Nobody has rolled yet.</p>';
    const exp=k=>n*PN(k)/36;const ks=[2,3,4,5,6,7,8,9,10,11,12];
    const mx=Math.max(1,...ks.map(k=>Math.max(s.rolls[k],exp(k))));
    const bars=ks.map(k=>{const h=s.rolls[k]/mx*100,e=exp(k)/mx*100;
      return `<div class="hb"><div class="plot"><span class="hv" style="bottom:calc(${h}% + 1px)">${s.rolls[k]||''}</span><i class="${k===7?'seven':''}" style="height:${h}%"></i><u style="bottom:${e}%"></u></div><b>${k}</b></div>`;}).join('');
    const row=(l,f)=>`<tr><td>${l}</td>${PL().map(p=>`<td>${f(p)}</td>`).join('')}</tr>`;
    const bt=(p,k)=>s.built[p][k]||0;
    const L=PL().map(luck);
    const fairLeft=G.opts.fair&&G.fair?` Fair dice: ${G.fair.length} roll${G.fair.length===1?'':'s'} left in the deck.`:'';
    return `<p class="lead">${n} roll${n===1?'':'s'}. A 7 came up ${s.sevens} time${s.sevens===1?'':'s'} (about ${f1(n/6)} expected).${fairLeft}</p>
      <div class="hist" role="img" aria-label="How often each number was rolled compared with what is expected">${bars}</div>
      <p class="hist-key"><i></i> rolled <u></u> expected</p>
      <table class="score-table"><tr><th></th>${PL().map(p=>`<th>${esc(nm(p))}</th>`).join('')}</tr>
      ${row('Cards from the dice',p=>s.prod[p])}${row('Expected from the dice',p=>f1(s.exp[p]))}
      ${row('Dice luck',p=>`<span class="luck ${L[p].c}">${L[p].t}</span>`)}
      ${row('Longest dry spell',p=>`${s.maxDry[p]} roll${s.maxDry[p]===1?'':'s'}`)}
      ${row('Bank trades',p=>s.bank[p])}${row('Roads and ships',p=>bt(p,'road')+bt(p,'ship'))}${row('Settlements',p=>bt(p,'settlement'))}${row('Cities',p=>bt(p,'city'))}${CK()?'':row('Development cards bought',p=>bt(p,'dev'))}${row('Knights played',p=>P(p).knights||0)}
      </table>
      <p class="hist-key" style="margin-top:6px">${s.ptn} trade${s.ptn===1?'':'s'} between players. ${L.length===2&&L[0].w&&L[1].w?(L[0].w===L[1].w?`Both players had ${L[0].w} dice.`:`${esc(nm(0))} had ${L[0].w} dice and ${esc(nm(1))} had ${L[1].w} dice.`):''}</p>`;
  }

  return {S,fresh,expectedProd,drawDice,series,html,winCheck,recKey,loadRec,highScore};
})();
