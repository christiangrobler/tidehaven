'use strict';
/* =====================================================================
   TV MODE
   The TV holds the game, shows the board and public information, and shows
   a QR code so phones can join. It never shows anybody's cards.
   Phones play their own turns and send the new game state back; the TV
   checks that the sender is the player whose move it is, then adopts it.
   ===================================================================== */
(function(){
  if(PAD.role!=='tv')return;
  const META='tidehaven.tv';
  const TV=window.TV={code:null,link:null,rev:0,lastSig:'',status:'starting',recs:new Set(),seatCid:[null,null,null,null,null,null],offer:null,linkHTML:''};

  /* ---------- persistent code + seat memory ---------- */
  function loadMeta(){try{return JSON.parse(localStorage.getItem(META)||'{}')||{};}catch(e){return {};}}
  function saveMeta(){try{localStorage.setItem(META,JSON.stringify({code:TV.code,seatCid:TV.seatCid}));}catch(e){}}
  const meta=loadMeta();
  TV.code=meta.code||Link.newCode();if(Array.isArray(meta.seatCid))TV.seatCid=meta.seatCid;saveMeta();
  TV.url=()=>{const u=new URL('pad.html',location.href),q=new URLSearchParams(location.search);['sig','secure','ice'].forEach(k=>{if(q.has(k))u.searchParams.set(k,q.get(k));});u.hash=TV.code;return u.href;};
  TV.plainUrl=()=>new URL('pad.html',location.href).href.replace(/^https?:\/\//,'');

  /* ---------- seats ---------- */
  const online=s=>[...TV.recs].some(r=>r.seat===s&&r.conn.open);
  const recOf=s=>[...TV.recs].find(r=>r.seat===s&&r.conn.open);
  const cpuN=()=>(G&&G.opts&&G.opts.aiSeats?G.opts.aiSeats.length:0);
  const humanCount=()=>G.players.length-cpuN();
  const allowed=()=>G&&G.preview?[...Array(6-cpuN()).keys()]:PL().filter(p=>!isAI(p));
  const lobbySeats=()=>G&&G.preview?[...Array(humanCount()).keys()]:allowed();
  AIS.reachable=s=>[...TV.recs].some(r=>r.seat===s&&r.conn.open);
  const hostSeat=()=>{const s=allowed().filter(online);return s.length?Math.min(...s):null;};
  /* disconnect every phone, forget all seats, pick a new code and start over at the front page */
  function resetAll(){
    sendAll({t:'bye'});
    setTimeout(()=>{
      [...TV.recs].forEach(r=>{try{r.conn.close();}catch(e){}});TV.recs.clear();
      TV.seatCid=[null,null,null,null,null,null];TV.offer=null;TV.code=Link.newCode();saveMeta();
      try{localStorage.removeItem('tidehaven.save.v2');}catch(e){}
      Object.assign(UI.setup,{n:2,cpu:0,ai:false,scen:'classic',ck:false,vars:{},target:null,names:['Player 1','Player 2','Player 3','Player 4','Player 5','Player 6'],colors:[0,1,2,3,4,5]});
      UI.winSeen=false;UI.aiOffer=null;UI.sheet=null;UI.mode=null;if(window.Undo)Undo.stack.length=0;
      previewGame(null);TV.lastSig='';TV.status='starting';
      announce();TV.link.restart(TV.code);refresh(true);
    },500);
  }
  /* a phone took a seat beyond the current player count: grow the lobby to fit */
  function growLobby(seat){
    if(seat==null||!G||!G.preview||seat<humanCount())return;
    const st=UI.setup;st.n=seat+1;if(st.n+setupCpu()>6)st.cpu=6-st.n;st.target=null;fitSetup();previewGame(null);
    TV.lastSig='';sendAll(lobbyMsg());refresh(true);
  }
  function freeSeats(){return allowed().filter(s=>!online(s));}
  function assign(rec){
    const al=allowed();let s=TV.seatCid.indexOf(rec.cid);
    if(s>=0&&al.includes(s)){rec.seat=s;return;}
    if(G&&!G.preview){rec.seat=null;return;}                // game running: a new phone picks its player
    for(const x of al){if(!online(x)){rec.seat=x;TV.seatCid[x]=rec.cid;saveMeta();return;}}
    rec.seat=null;
  }
  function claim(rec,s){
    if(!allowed().includes(s))return false;
    const cur=recOf(s);if(cur&&cur!==rec)return false;
    if(rec.seat!=null&&TV.seatCid[rec.seat]===rec.cid&&G&&G.preview)TV.seatCid[rec.seat]=null;
    rec.seat=s;TV.seatCid[s]=rec.cid;saveMeta();return true;
  }

  /* ---------- messages out ---------- */
  const trim=g=>Object.assign({},g,{log:g.log.slice(-120)});
  const seriesNow=()=>G&&!G.preview&&G.winner!=null?Stats.series(G.opts):'';
  function stateMsg(){return {t:'state',rev:TV.rev,G:trim(G),ao:UI.aiOffer||null,series:seriesNow()};}
  function lobbyMsg(){return {t:'lobby',setup:UI.setup,opts:G.opts,board:G.board,force:true};}
  function rosterMsg(){return {t:'roster',seats:[0,1,2,3,4,5].map(online),host:hostSeat(),names:G.players.map(p=>p.name),allowed:allowed()};}
  function sendAll(msg,except){TV.recs.forEach(r=>{if(r!==except&&r.conn.open&&r.hello)TV.link.send(r.conn,msg);});}
  function welcome(rec){
    const m={t:'welcome',seat:rec.seat,free:freeSeats(),host:hostSeat(),seats:[0,1,2,3,4,5].map(online),code:TV.code,names:G.players.map(p=>p.name),setup:UI.setup,preview:!!G.preview,rev:TV.rev,allowed:allowed()};
    if(G.preview){m.opts=G.opts;m.board=G.board;}else{m.G=trim(G);m.ao=UI.aiOffer||null;m.series=seriesNow();}
    TV.link.send(rec.conn,m);
  }
  function roster(){sendAll(rosterMsg());paint();if(G&&G.preview)refresh();}

  /* ---------- messages in ---------- */
  const cleanName=v=>String(v==null?'':v).replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,14);
  const SETUP_KEYS=['n','cpu','ai','names','colors','target','priv','scen','ck','vars','diff','fair'];
  function pickSetup(s){const o={};if(!s||typeof s!=='object')return o;SETUP_KEYS.forEach(k=>{if(k in s)o[k]=s[k];});
    if(Array.isArray(o.names))o.names=o.names.slice(0,6).map((x,i)=>cleanName(x)||('Player '+(i+1)));return o;}
  function saneOpts(o){
    if(!o||typeof o!=='object'||!Array.isArray(o.players)||o.players.length<2||o.players.length>6||!SCEN[o.scen])return false;
    o.players.forEach((p,i)=>{p.name=cleanName(p&&p.name)||('Player '+(i+1));p.color=/^#[0-9a-fA-F]{6}$/.test(p&&p.color)?p.color:COLORS[i%COLORS.length].h;});
    if(o.aiSeats&&(!Array.isArray(o.aiSeats)||o.aiSeats.some(x=>!(x>=0&&x<o.players.length))))o.aiSeats=null;
    return true;}
  function saneState(g){
    return !!(g&&typeof g==='object'&&g.ver===2&&Array.isArray(g.players)&&g.players.length===G.players.length&&g.board&&g.board.id===G.board.id&&
      Array.isArray(g.vOwn)&&g.vOwn.length===G.vOwn.length&&Array.isArray(g.eOwn)&&g.eOwn.length===G.eOwn.length&&Array.isArray(g.log));}
  function onData(conn,msg){try{onDataRaw(conn,msg);}catch(e){console.error('link message',e);}}
  function onDataRaw(conn,msg){
    let rec=[...TV.recs].find(r=>r.conn===conn);if(!rec||!msg||!msg.t)return;
    if(msg.t==='ping'){TV.link.send(conn,{t:'pong'});return;}
    if(msg.t==='hello'){
      rec.cid=String(msg.cid||'').slice(0,40)||('x'+Math.random());
      [...TV.recs].forEach(o=>{if(o!==rec&&o.cid===rec.cid){TV.recs.delete(o);try{o.conn.close();}catch(e){}}});
      rec.hello=true;assign(rec);growLobby(rec.seat);welcome(rec);roster();return;
    }
    if(!rec.hello)return;
    const seat=rec.seat;
    switch(msg.t){
      case 'claim':if(claim(rec,+msg.seat)){welcome(rec);roster();}else TV.link.send(conn,{t:'claimNo',free:freeSeats()});break;
      case 'lobby':{
        if(seat==null||seat!==hostSeat()||!msg.board||!saneOpts(msg.opts))break;
        UI.setup=Object.assign(UI.setup,pickSetup(msg.setup));
        const g=newGame(msg.opts,msg.board);g.preview=true;UI.winSeen=false;UI.aiOffer=null;UI.sheet=null;TV.lastSig='';
        sendAll(lobbyMsg(),rec);roster();refresh(true);break;}
      case 'start':{
        if(seat==null||seat!==hostSeat()||!msg.board||!saneOpts(msg.opts))break;
        const o=msg.opts;o.priv=false;UI.setup=Object.assign(UI.setup,pickSetup(msg.setup));
        newGame(o,msg.board);UI.winSeen=false;UI.aiOffer=null;UI.sheet=null;UI.mode=null;if(window.Undo)Undo.stack.length=0;
        TV.lastSig='';refresh(true);toast(`${nm(G.cur)} won the coin toss and places first.`,3600);break;}
      case 'state':{
        if(G.preview||seat==null||!saneState(msg.G)){if(seat!=null&&!G.preview)TV.link.send(conn,stateMsg());break;}
        if(msg.base!==TV.rev||PAD.actor()!==seat){TV.link.send(conn,stateMsg());break;}   // stale: send the truth back
        setG(msg.G);UI.busy=false;
        if(G.winner==null)UI.winSeen=false;
        TV.rev++;TV.lastSig=JSON.stringify(G)+'|'+JSON.stringify(UI.aiOffer||null);
        TV.link.send(conn,{t:'ack',rev:TV.rev});sendAll(stateMsg(),rec);
        refresh(true);break;}
      case 'roll':
        if(!G.preview&&seat!=null&&PAD.actor()===seat&&canRoll()&&!UI.busy)startRoll();
        else TV.link.send(conn,stateMsg());
        break;
      case 'offer':{
        if(seat==null)break;const to=Number.isInteger(msg.to)?msg.to:1-seat;const o=to!==seat&&allowed().includes(to)?recOf(to):null;
        if(!o){TV.link.send(conn,{t:'offerReply',ok:false,why:'offline'});break;}
        TV.offer={from:seat,to};TV.link.send(o.conn,Object.assign({},msg,{from:seat}));break;}
      case 'offerCancel':{
        if(seat==null||!TV.offer)break;const o=recOf(TV.offer.to);TV.offer=null;
        if(o)TV.link.send(o.conn,Object.assign({},msg,{from:seat}));break;}
      case 'offerReply':{
        if(seat==null||!TV.offer||TV.offer.to!==seat)break;const o=recOf(TV.offer.from);TV.offer=null;
        if(o)TV.link.send(o.conn,Object.assign({},msg,{from:seat}));break;}
      case 'aiyes':case 'aino':
        if(seat!=null&&UI.aiOffer&&UI.aiOffer.mine&&(UI.aiOffer.to==null||UI.aiOffer.to===seat)&&ACT[msg.t]){ACT[msg.t]();}break;
      case 'rematch':
        if(G.winner!=null&&seat!=null){ACT.rematch();}break;
      case 'name':{
        if(seat==null||seat>=G.players.length)break;
        const nmv=String(msg.name||'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,14);if(!nmv)break;
        UI.setup.names[seat]=nmv;G.players[seat].name=nmv;if(G.opts&&G.opts.players&&G.opts.players[seat])G.opts.players[seat].name=nmv;
        if(G.preview){sendAll(lobbyMsg());roster();refresh(true);}else{TV.lastSig='';refresh(true);}
        break;}
      case 'resetall':resetAll();break;
      case 'newgame':{
        if(seat==null||G.preview)break;
        UI.setup.n=G.players.length;previewGame(null);UI.winSeen=false;UI.aiOffer=null;UI.sheet=null;UI.mode=null;
        if(window.Undo)Undo.stack.length=0;TV.lastSig='';TV.offer=null;
        sendAll(lobbyMsg());roster();refresh(true);toast(`${nm(seat)} started a new game.`,3000);break;}
      case 'resync':TV.link.send(conn,G.preview?lobbyMsg():stateMsg());break;
    }
  }

  /* ---------- TV hook after every refresh ---------- */
  PAD.hook=function(){
    try{Mini.render();}catch(e){console.error('mini',e);}
    paint();
    if(!TV.link||G.preview)return;
    const sig=JSON.stringify(G)+'|'+JSON.stringify(UI.aiOffer||null);
    if(sig!==TV.lastSig){TV.lastSig=sig;TV.rev++;sendAll(stateMsg());}
  };

  /* tell the app's built-in server our current code, so phones on the same network can ask for it */
  function announce(){try{fetch('/tv-code?c='+encodeURIComponent(TV.code),{cache:'no-store'}).catch(()=>{});}catch(e){}}
  /* ---------- link start ---------- */
  function start(){announce();
    TV.link=Link.host({code:TV.code,
      onStatus:s=>{TV.status=s;if(s==='code-taken'){TV.code=Link.newCode();saveMeta();announce();TV.link.restart(TV.code);}paint();if(G&&G.preview)refresh();},
      onConn:c=>{TV.recs.add({conn:c,cid:null,seat:null,hello:false});},
      onData,
      onClose:c=>{const r=[...TV.recs].find(x=>x.conn===c);if(r){TV.recs.delete(r);roster();if(G&&!G.preview)refresh();}}
    });
  }

  /* ---------- QR ---------- */
  const qrCache={};
  function qrSVG(text,px){const key=text+'|'+px;return qrCache[key]||(qrCache[key]=qrSVGmake(text,px));}
  function qrSVGmake(text,px){
    try{const qr=qrcode(0,'M');qr.addData(text);qr.make();
      const n=qr.getModuleCount();let d='';
      for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c))d+=`M${c+2} ${r+2}h1v1h-1z`;
      return `<svg class="qr" viewBox="0 0 ${n+4} ${n+4}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="QR code to join"><rect width="100%" height="100%" fill="#fff" rx="2"/><path d="${d}" fill="#1b130c"/></svg>`;
    }catch(e){return '';}
  }

  /* ---------- screens ---------- */
  function rosterHTML(){
    const al=lobbySeats();
    return al.map(s=>{const nmS=(G.players[s]&&G.players[s].name)||UI.setup.names[s]||('Player '+(s+1));const col=(G.players[s]&&G.players[s].color)||'#888';const on=online(s);
      return `<li class="${on?'on':''}"><i style="--c:${col}"></i><span>${esc(nmS)}</span><b>${on?'Phone connected':'Waiting for a phone…'}</b></li>`;}).join('')+
      PL().filter(p=>isAI(p)).map(p=>`<li class="on"><i style="--c:${G.players[p].color}"></i><span>${esc(G.players[p].name)}</span><b>Computer · ${esc(G.opts.diff||UI.setup.diff||'normal')}</b></li>`).join('');
  }
  function lobbyHTML(){
    const st=TV.status;
    const stat=st==='ready'?'':`<p class="tl-warn">${st==='starting'||st==='reconnecting'?'Connecting to the link service…':st.startsWith('error')?'Can’t reach the link service. Check that the TV is online.':'…'}</p>`;
    const inGame=G&&!G.preview;
    return `<div class="fp"><div class="fp-brand"><img class="fp-logo" src="icons/logo.png" alt="Tidehaven"><p class="fp-tag">Settle the island, trade, and build.</p><p class="fp-sub">2 to 6 players, played on your phones</p></div>
      <div class="fp-join"><p class="fp-scan">${inGame?'Game paused. Scan to rejoin.':'Scan with your phone’s camera to join'}</p>
      <div class="tl-qr">${qrSVG(TV.url(),300)}</div>
      <p class="tl-code">${esc(TV.plainUrl())}<br>code <b>${TV.code}</b></p>${stat}
      <ul class="roster">${rosterHTML()}</ul>
      <p class="tl-note">${inGame?'Each player rejoins by scanning the code and tapping their name.':'The first phone to join sets up the game. Cards stay private on each phone.'}<br>Tip: open the link above on your phone and choose Add to Home Screen. Next time, just open the app and it finds this TV by itself.</p></div></div>`;
  }
  function linkWidgetHTML(){
    if(!G||G.preview)return '';
    const al=allowed();const off=al.filter(s=>!online(s));
    const dots=al.map(s=>`<span class="${online(s)?'on':'off'}"><i style="--c:${G.players[s].color}"></i>${esc(G.players[s].name)}</span>`).join('');
    return `<div class="tvl ${off.length?'warn':''}"><div class="tvl-qr">${qrSVG(TV.url(),off.length?80:64)}</div><div class="tvl-t"><b>${off.length?esc(G.players[off[0]].name)+'’s phone is offline':'Phones linked'}</b><div class="tvl-dots">${dots}</div>${off.length?'<small>Scan to rejoin</small>':''}</div></div>`;
  }
  function paint(){
    const el=document.getElementById('tvlink');if(!el)return;
    const h=linkWidgetHTML();if(h!==TV.linkHTML){TV.linkHTML=h;el.innerHTML=h;}
  }

  /* wrap the pieces of ui.js that need a TV-specific answer */
  const _wanted=wantedSheet;
  wantedSheet=function(){
    if(!G)return null;
    if(!G.preview)document.documentElement.classList.remove('tvlobby');
    if(G.preview)return {type:'tvlobby'};
    if(G.winner!=null&&!UI.winSeen)return {type:'win'};
    return null;
  };
  const _sheet=sheetHTML;
  sheetHTML=function(s){const lb=!!(s&&s.type==='tvlobby');document.documentElement.classList.toggle('tvlobby',lb);if(lb)return lobbyHTML();return _sheet(s);};
  statusHTML=function(){
    if(G.preview)return 'Waiting for the game to start.';
    if(G.winner!=null)return `<b>${esc(nm(G.winner))}</b> wins.`;
    if(UI.busy)return 'Rolling…';
    const a=PAD.actor(),pd=G.pending;
    const last=esc((G.log[G.log.length-1]||{}).m||'');
    let head=`${esc(nm(a))}’s turn`;
    if(pd&&pd.type==='discard')head=`${esc(nm(a))} is choosing cards to discard`;
    else if(pd&&pd.type==='robber')head=`${esc(nm(a))} is moving the robber`;
    else if(G.phase==='setup')head=`${esc(nm(a))} is placing a ${G.step==='settlement'?'settlement':'road'}`;
    else if(G.sbp)head=`${esc(nm(a))} may build (special building)`;
    else if(!G.rolled&&!pd)head=`${esc(nm(a))} to roll`;
    return `${head}<span class="sub">${last}</span>`;
  };

  /* ---------- boot ---------- */
  const s0=(function(){try{return loadSave();}catch(e){return null;}})();
  if(s0){setG(s0);UI.setup.names=s0.players.map(p=>p.name);UI.setup.cpu=s0.opts.aiSeats?s0.opts.aiSeats.length:(s0.opts.ai!=null?1:0);UI.setup.ai=UI.setup.cpu>0;UI.setup.n=s0.players.length-UI.setup.cpu;UI.sheet=null;}
  const box=document.createElement('div');box.id='tvlink';(document.getElementById('rail')||document.body).appendChild(box);
  Mini.bind(document.getElementById('mini'));
  Feel.hint=function(){};                                   // the 3D hint needs the 3D board, which the TV does not use
  start();
  refresh(true);
})();
