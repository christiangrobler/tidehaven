'use strict';
/* =====================================================================
   PHONE CONTROLLER
   Runs the same game code as the TV on a private copy of the game. When it
   is this player's move, the phone plays it locally and sends the new
   state to the TV. Dice are rolled by the TV.
   ===================================================================== */
(function(){
  if(PAD.role!=='pad')return;
  SND.ambOn=false;
  const CIDK='tidehaven.pad.cid',CODEK='tidehaven.pad.code';
  let cid=null;try{cid=localStorage.getItem(CIDK);}catch(e){}
  if(!cid){cid=Math.random().toString(36).slice(2,12)+Date.now().toString(36);try{localStorage.setItem(CIDK,cid);}catch(e){}}
  const hashCode=(location.hash||'').replace('#','').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  let wasReset=false;try{wasReset=localStorage.getItem('tidehaven.pad.bye')==='1';if(wasReset)localStorage.removeItem('tidehaven.pad.bye');}catch(e){}
  let noAuto=false;try{noAuto=localStorage.getItem('tidehaven.pad.noauto')==='1';if(noAuto)localStorage.removeItem('tidehaven.pad.noauto');}catch(e){}
  let code=hashCode;if(!code){try{code=localStorage.getItem(CODEK)||'';}catch(e){}}
  if(hashCode){try{localStorage.setItem(CODEK,hashCode);}catch(e){}}
  /* the page is served by the TV itself, so ask it which code it is using right now */
  function discover(){
    return new Promise(res=>{try{const ctl=window.AbortController?new AbortController():null,t=setTimeout(()=>{try{ctl&&ctl.abort();}catch(e){}res('');},3500);
      fetch('code.json',{cache:'no-store',signal:ctl?ctl.signal:undefined}).then(r=>r.ok?r.json():null).then(j=>{clearTimeout(t);res(j&&j.app==='tidehaven'?String(j.code||'').toUpperCase().replace(/[^A-Z0-9]/g,''):'');}).catch(()=>{clearTimeout(t);res('');});}catch(e){res('');}});}
  const autoFind=!hashCode&&!noAuto&&!wasReset;

  Object.assign(PAD,{wasReset,status:(autoFind||code)?(autoFind?'finding':'connecting'):'idle',welcomed:false,host:false,seats:[],free:[],allowed:[0,1],base:0,lastSnap:'',canPush:false,adopting:false,lobbySig:'',code});
  let link=null;
  PAD.send=m=>link?link.send(m):false;
  const PASSIVE=['menu','log','rules','villages','stats','evlist','badraw'];
  const NAMEK='tidehaven.pad.name';
  function myName(){try{return (localStorage.getItem(NAMEK)||'').trim();}catch(e){return '';}}
  function afterWelcome(){
    PAD.askName=false;if(PAD.seat==null)return;
    const nmv=myName();
    if(nmv){PAD.send({t:'name',name:nmv});}else if(!PAD.nameSkipped)PAD.askName=true;
  }

  /* ---------- state in ---------- */
  function adoptState(g,rev,ao,series){
    PAD.adopting=true;
    setG(g);PAD.base=rev||0;PAD.series=series||'';UI.aiOffer=ao||null;
    UI.busy=false;clearTimeout(PAD.busyT);
    if(G.winner==null)UI.winSeen=false;
    UI.mode=null;UI.shipFrom=null;UI.ktFrom=null;
    if(!(UI.sheet&&PASSIVE.includes(UI.sheet.type)))UI.sheet=null;
    PAD.lastSnap=JSON.stringify(G);PAD.canPush=PAD.seat!=null&&PAD.actor()===PAD.seat;PAD.lobbySig='';
    PAD.adopting=false;refresh(true);
  }
  function adoptPreview(opts,board){
    PAD.adopting=true;
    const g=newGame(opts,board);g.preview=true;
    PAD.lastSnap='';PAD.canPush=false;UI.aiOffer=null;UI.busy=false;
    UI.sheet=PAD.host?{type:'setup'}:null;PAD.adopting=false;
    PAD.lobbySig=PAD.host?sigLobby():'';
    refresh(true);
  }
  function sigLobby(){return JSON.stringify([UI.setup,G.board&&G.board.id,G.opts&&G.opts.scen]);}

  function onData(m){
    switch(m.t){
      case 'welcome':
        PAD.welcomed=true;PAD.seat=m.seat;PAD.free=m.free||[];PAD.seats=m.seats||[];PAD.allowed=m.allowed||[0,1];PAD.host=m.seat!=null&&m.seat===m.host;
        if(m.setup)UI.setup=Object.assign(UI.setup,m.setup);
        if(m.preview)adoptPreview(m.opts,m.board);else adoptState(m.G,m.rev,m.ao,m.series);
        afterWelcome();refresh();
        break;
      case 'roster':{
        const wasHost=PAD.host;PAD.seats=m.seats||PAD.seats;PAD.allowed=m.allowed||PAD.allowed;PAD.host=PAD.seat!=null&&PAD.seat===m.host;
        if(PAD.host&&!wasHost&&G&&G.preview)UI.sheet={type:'setup'};
        refresh();break;}
      case 'lobby':if(!PAD.host||m.force){UI.setup=Object.assign(UI.setup,m.setup||{});adoptPreview(m.opts,m.board);}break;
      case 'state':adoptState(m.G,m.rev,m.ao,m.series);break;
      case 'ack':PAD.base=m.rev;break;
      case 'offer':UI.padOffer={from:m.from,og:m.og,ot:m.ot};if(window.sfx)sfx('card');refresh();break;
      case 'offerCancel':if(UI.padOffer){UI.padOffer=null;refresh();}break;
      case 'offerReply':{
        if(!(UI.sheet&&UI.sheet.type==='pwait'))break;
        const tr=UI.trade,other=tradeQ();
        if(m.ok&&tr&&playerTrade(tr.og,tr.ot,other)){UI.sheet=null;tr.og=zero();tr.ot=zero();if(window.sfx)sfx('coin');toast(`${nm(other)} accepted the trade.`);}
        else{UI.sheet={type:'trade'};tradeDeclined(m.why==='offline'?`${nm(other)}’s phone is offline, so the offer didn’t reach them.`:`${nm(other)} declined your offer.`);}
        refresh();break;}
      case 'bye':try{localStorage.removeItem(CODEK);localStorage.setItem('tidehaven.pad.bye','1');localStorage.setItem('tidehaven.pad.noauto','1');}catch(e){}location.hash='';location.reload();break;
      case 'claimNo':PAD.free=m.free||[];toast('That player is already taken.');refresh();break;
    }
  }

  /* ---------- state out (after every refresh) ---------- */
  PAD.hook=function(){
    try{Mini.render();}catch(e){console.error('mini',e);}
    if(PAD.adopting||!G||!PAD.welcomed||PAD.seat==null)return;
    if(G.preview){
      if(PAD.host){const sg=sigLobby();if(sg!==PAD.lobbySig){PAD.lobbySig=sg;const o=setupOpts();o.priv=false;PAD.send({t:'lobby',setup:UI.setup,opts:o,board:G.board});}}
      return;
    }
    const snap=JSON.stringify(G);if(snap===PAD.lastSnap)return;
    if(!PAD.canPush){PAD.lastSnap=snap;return;}
    PAD.send({t:'state',base:PAD.base,G:Object.assign({},G,{log:G.log.slice(-120)})});
    PAD.base++;PAD.lastSnap=snap;PAD.canPush=PAD.actor()===PAD.seat;
  };
  PAD.sendRoll=function(){
    if(!PAD.mineToAct()||!canRoll())return;
    if(window.sfx){soundUnlock();sfx('dice');}
    PAD.send({t:'roll'});UI.busy=true;renderRail();
    clearTimeout(PAD.busyT);PAD.busyT=setTimeout(()=>{if(UI.busy){UI.busy=false;PAD.send({t:'resync'});refresh();}},14000);
  };

  /* ---------- which sheet to show ---------- */
  wantedSheet=(function(orig){return function(){
    if(!G)return null;
    if(PAD.status==='idle'||PAD.status!=='open'||!PAD.welcomed)return {type:'padconn'};
    if(PAD.seat==null)return {type:'padseat'};
    if(PAD.askName)return {type:'padname'};
    if(UI.padOffer)return {type:'poffer'};
    if(G.preview){return PAD.host?{type:'setup'}:{type:'padwait'};}
    if(G.winner!=null&&!UI.winSeen)return {type:'win'};
    if(UI.aiOffer&&G.winner==null&&(UI.aiOffer.to==null||UI.aiOffer.to===PAD.seat))return {type:'aioffer'};
    if(UI.sheet&&UI.sheet.type==='pwait')return UI.sheet;
    if(humanMustWait())return UI.sheet&&PASSIVE.includes(UI.sheet.type)?UI.sheet:null;
    return orig();
  };})(wantedSheet);

  /* ---------- sheets ---------- */
  function rosterLine(s){const on=isAI(s)||PAD.seats[s];const p=G&&G.players[s];const nmS=p?p.name:('Player '+(s+1));
    return `<li class="${on?'on':''}"><i style="--c:${p?p.color:'#888'}"></i><span>${esc(nmS)}${s===PAD.seat?' (you)':''}</span><b>${isAI(s)?'computer':on?'connected':'waiting'}</b></li>`;}
  sheetHTML=(function(orig){return function(s){
    switch(s&&s.type){
      case 'padconn':{
        if(PAD.status==='idle')return `<div class="sheet padsheet"><h2>Join the TV</h2><p class="lead">${PAD.wasReset?'The TV was reset and every device was disconnected. ':''}Scan the QR code on the TV with your camera, or type the 5-letter code shown there.</p>
          <input id="padcode" class="padcode" maxlength="5" autocomplete="off" autocapitalize="characters" placeholder="CODE" value="">
          <div class="btns"><button class="btn" data-act="padfind">Find the TV</button><button class="btn primary" data-act="padjoin">Connect</button></div></div>`;
        if(PAD.status==='finding')return `<div class="sheet padsheet"><h2>Looking for the TV</h2><p class="lead">Checking this network for a Tidehaven TV…</p><div class="spin" aria-hidden="true"></div></div>`;
        const msg=PAD.status==='tv-offline'?'The TV isn’t answering. Make sure Tidehaven is open on the TV, then this will reconnect by itself.':PAD.status==='lost'?'Connection lost. Reconnecting…':'Connecting to the TV…';
        return `<div class="sheet padsheet"><h2>${PAD.status==='tv-offline'?'Looking for the TV':'Connecting'}</h2><p class="lead">${msg}</p><div class="spin" aria-hidden="true"></div>
          <div class="btns"><button class="btn ghost" data-act="padforget">Use a different code</button></div></div>`;}
      case 'padname':
        return `<div class="sheet padsheet"><h2>${PAD.renaming?'Change your name':'What’s your name?'}</h2><p class="lead">This is how the others will see you on the TV. You are ${esc(nm(PAD.seat))} right now.</p>
          <input id="padnamein" class="padcode" style="letter-spacing:.02em;font-size:26px;text-transform:none" maxlength="14" autocomplete="off" autocapitalize="words" placeholder="Your name" value="${esc(PAD.renaming?myName():'')}">
          <div class="btns"><button class="btn" data-act="padnameskip">${PAD.renaming?'Cancel':'Skip'}</button><button class="btn primary" data-act="padname">${PAD.renaming?'Save':'Continue'}</button></div></div>`;
      case 'padseat':{
        const free=PAD.free||[];
        return `<div class="sheet padsheet"><h2>Who are you?</h2><p class="lead">${free.length?'Tap your name.':'Every player already has a phone connected.'}</p>
          <div class="btns col">${free.map(i=>`<button class="btn primary" data-act="padseat" data-s="${i}"><i class="dotc" style="--c:${G.players[i].color}"></i> ${esc(G.players[i].name)}</button>`).join('')}</div></div>`;}
      case 'padwait':
        return `<div class="sheet padsheet"><h2>You’re connected</h2><p class="lead">${esc(nm(PAD.seat))}, hang tight. ${PAD.seats[0]&&PAD.seat!==0?esc(nm(0)):'The first player'} is setting up the game.</p>
          <ul class="roster">${G.players.map((_,i)=>i).map(rosterLine).join('')}</ul></div>`;
      case 'pwait':{const o=tradeQ(),tr=UI.trade;
        return `<div class="sheet padsheet"><h2>Waiting for ${esc(nm(o))}</h2><p class="lead">Your offer is on ${esc(nm(o))}’s phone.</p>
          <div class="offer">${offerSide(tr.og)}<span class="arrow">for</span>${offerSide(tr.ot)}</div>
          <div class="btns"><button class="btn" data-act="pcancel">Cancel offer</button></div></div>`;}
      case 'poffer':{const o=UI.padOffer,can=canAfford(PAD.seat,o.ot);
        return `<div class="sheet padsheet"><h2>${esc(nm(PAD.seat))}, accept this trade?</h2><p class="lead">${esc(nm(o.from))} offers:</p>
          <div class="offer">${offerSide(o.og)}<span class="arrow">for your</span>${offerSide(o.ot)}</div>
          ${can?'':`<p class="note">You don’t hold those cards.</p>`}
          <div class="btns"><button class="btn" data-act="pno">Decline</button><button class="btn primary" data-act="pyes" ${can?'':'disabled'}>Accept</button></div></div>`;}
      case 'menu':
        return `<div class="sheet"><h2>Tidehaven</h2><div class="menu">
          <button class="btn" data-act="rules">How to play</button><button class="btn" data-act="log">Game log</button><button class="btn" data-act="stats">Game stats</button>
          ${G&&!G.preview?'<button class="btn" data-act="padnew">New game</button>':''}
          <button class="btn" data-act="padrename">Change my name</button>
          <button class="btn" data-act="paddetail">Detailed tiles: ${Mini.detail?'on':'off'}</button>
          <button class="btn" data-act="sound">Sound on this phone: ${SND.on?'on':'off'}</button>
          <button class="btn" data-act="padtest">Play a test sound</button>
          <button class="btn" data-act="padforget">Leave this TV</button>
          <button class="btn" data-act="padresetall">Reset all devices</button>
          <button class="btn ghost" data-act="close">Close</button></div></div>`;
    }
    return orig(s);
  };})(sheetHTML);

  /* ---------- actions ---------- */
  const _toffer=ACT.toffer,_newgame=ACT.newgame,_aiyes=ACT.aiyes,_aino=ACT.aino;
  Object.assign(ACT,{
    padjoin(){const el=document.getElementById('padcode');const v=((el&&el.value)||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');if(v.length<4){toast('Type the code shown on the TV.');return;}
      try{localStorage.setItem(CODEK,v);}catch(e){}location.hash='#'+v;location.reload();},
    padname(){const el=document.getElementById('padnamein');const v=((el&&el.value)||'').trim().slice(0,14);
      if(!v){toast('Type your name, or tap Skip.');return;}
      try{localStorage.setItem(NAMEK,v);}catch(e){}
      PAD.askName=false;PAD.renaming=false;PAD.send({t:'name',name:v});toast('Name saved.',1600);refresh();},
    padnameskip(){PAD.askName=false;if(!PAD.renaming)PAD.nameSkipped=true;PAD.renaming=false;refresh();},
    padtest(){if(!SND.on){toast('Sound is off. Turn it on first.',2200);return;}soundUnlock();sfx('settle');toast('If you heard hammers, sound works. If not, check the volume and the silent switch.',4200);},
    paddetail(){Mini.setDetail(!Mini.detail);refresh();},
    padrename(){if(PAD.seat==null)return;PAD.renaming=true;PAD.askName=true;UI.sheet=null;refresh();},
    padresetall(){if(!confirm('Disconnect every phone from this TV and start over with a new code? The game in progress will be lost.'))return;PAD.send({t:'resetall'});toast('Resetting all devices…',3000);},
    padnew(){if(G&&!G.preview&&G.winner==null&&!confirm('Start a new game? The game in progress will be lost for everyone.'))return;PAD.send({t:'newgame'});UI.sheet=null;toast('Starting a new game…',2400);refresh();},
    padfind(){PAD.status='finding';refresh();discover().then(c=>{if(c){try{localStorage.setItem(CODEK,c);}catch(e){}location.hash='#'+c;location.reload();}else{PAD.status='idle';toast('No TV found on this network. Type the code shown on the TV.',3600);refresh();}});},
    padforget(){try{localStorage.removeItem(CODEK);localStorage.setItem('tidehaven.pad.noauto','1');}catch(e){}location.hash='';location.reload();},
    padseat(d){PAD.send({t:'claim',seat:+d.s});},
    start(){const o=setupOpts();o.priv=false;PAD.send({t:'start',setup:UI.setup,opts:o,board:G.board});toast('Starting…',2000);},
    resetview(){Mini.fit();},
    hint(){
      if(!G||G.preview||G.winner!=null||!PAD.mineToAct()){toast('Wait for your turn.',1800);return;}
      let h=null;try{h=hintCompute(PAD.seat);}catch(e){}
      if(!h){toast('No suggestion right now.',2000);return;}
      Mini.setHint(h);toast(h.text,5600);setTimeout(()=>Mini.setHint(null),7000);},
    toffer(){if(aiOn()&&isAI(tradeQ()))return _toffer();const tr=UI.trade;PAD.send({t:'offer',og:tr.og,ot:tr.ot,to:tradeQ()});UI.sheet={type:'pwait'};refresh();},
    pcancel(){PAD.send({t:'offerCancel'});UI.sheet={type:'trade'};refresh();},
    pyes(){const o=UI.padOffer;if(!o)return;PAD.send({t:'offerReply',ok:true});UI.padOffer=null;toast('Trade accepted. Waiting for the new cards…',2200);refresh();},
    pno(){PAD.send({t:'offerReply',ok:false});UI.padOffer=null;refresh();},
    rematch(){PAD.send({t:'rematch'});toast('Starting a rematch…',2400);},
    newgame(){if(!PAD.host){toast('Only the first player can change the setup.',2400);return;}_newgame();},
    aiyes(){const o=UI.aiOffer;if(o&&o.mine){PAD.send({t:'aiyes'});UI.aiOffer=null;refresh();}else _aiyes();},
    aino(){const o=UI.aiOffer;if(o&&o.mine){PAD.send({t:'aino'});UI.aiOffer=null;refresh();}else _aino();}
  });
  Stats.series=function(){return PAD.series||'';};
  Feel.hint=ACT.hint;Feel.flyProduction=function(){};

  /* ---------- keep the screen awake ---------- */
  let wl=null;
  async function lock(){try{if('wakeLock' in navigator&&document.visibilityState==='visible'&&!wl){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>{wl=null;});}}catch(e){wl=null;}}
  document.addEventListener('visibilitychange',lock);lock();

  /* ---------- start ---------- */
  Mini.bind(document.getElementById('mini'));
  let probing=false;
  function startLink(c){
    code=c;PAD.code=c;PAD.status='connecting';
    link=Link.join({code:c,
      onStatus:s=>{PAD.status=s;if(s!=='open')PAD.welcomed=false;refresh();
        // the TV may have a new code (reset, restart): look again and follow it
        if((s==='tv-offline'||s==='lost')&&!probing){probing=true;setTimeout(()=>{discover().then(n=>{probing=false;if(n&&n!==code){try{localStorage.setItem(CODEK,n);}catch(e){}location.hash='#'+n;location.reload();}});},6000);}},
      onOpen:()=>{link.send({t:'hello',cid,ver:1});},
      onData});
  }
  if(autoFind){
    discover().then(live=>{
      if(live){try{localStorage.setItem(CODEK,live);}catch(e){}startLink(live);}
      else if(code)startLink(code);
      else{PAD.status='idle';}
      refresh();
    });
  }else if(code){startLink(code);}
  refresh();
})();
