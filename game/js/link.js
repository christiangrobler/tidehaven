'use strict';
/* =====================================================================
   LINK: direct TV <-> phone connection (WebRTC data channels via PeerJS).
   The PeerJS cloud server is only used to introduce the two devices; game
   data then flows straight between them.
   Messages are JSON, split into small chunks so big game states are safe
   on every browser.
   ===================================================================== */
const Link=(function(){
  const PREFIX='tidehaven-';
  const ALPHA='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const CHUNK=12000;
  const newCode=()=>{let s='';for(let i=0;i<5;i++)s+=ALPHA[Math.floor(Math.random()*ALPHA.length)];return s;};

  function peerOpts(){
    const q=new URLSearchParams(location.search);const o={debug:1};
    const sig=q.get('sig');                                   // ?sig=host:port for a private signaling server
    if(sig){const [h,p]=sig.split(':');o.host=h;o.port=+p||9000;o.path='/';o.secure=q.get('secure')==='1';}
    if(q.get('ice')==='none')o.config={iceServers:[]};         // tests on one machine
    return o;
  }

  let seqId=0;
  function pack(msg){
    const s=JSON.stringify(msg);if(s.length<=CHUNK)return [s];
    const id=++seqId,n=Math.ceil(s.length/CHUNK),out=[];
    for(let i=0;i<n;i++)out.push(JSON.stringify({t:'chunk',id,i,n,d:s.slice(i*CHUNK,(i+1)*CHUNK)}));
    return out;
  }
  function makeRx(cb){
    const parts={};
    return raw=>{
      let m;try{m=JSON.parse(raw);}catch(e){return;}
      if(m&&m.t==='chunk'){
        const p=parts[m.id]||(parts[m.id]={n:m.n,got:0,a:[]});p.a[m.i]=m.d;p.got++;
        if(p.got===p.n){delete parts[m.id];try{cb(JSON.parse(p.a.join('')));}catch(e){}}
        return;
      }
      cb(m);
    };
  }
  const rawSend=(c,msg)=>{try{if(c&&c.open)pack(msg).forEach(s=>c.send(s));return true;}catch(e){return false;}};

  /* ---------- TV side ---------- */
  function host(o){
    let peer=null,closed=false,retry=0;
    function start(){
      if(closed)return;
      peer=new Peer(PREFIX+o.code,peerOpts());
      peer.on('open',()=>{retry=0;o.onStatus('ready');});
      peer.on('connection',c=>{
        const rx=makeRx(m=>o.onData(c,m));
        c.on('open',()=>o.onConn(c));
        c.on('data',d=>{if(typeof d==='string')rx(d);});
        c.on('close',()=>o.onClose(c));
        c.on('error',()=>o.onClose(c));
      });
      peer.on('disconnected',()=>{o.onStatus('reconnecting');try{peer.reconnect();}catch(e){}});
      peer.on('error',e=>{
        if(e.type==='unavailable-id'){o.onStatus('code-taken');return;}
        o.onStatus('error:'+e.type);
        if(['network','server-error','socket-error','socket-closed','disconnected'].includes(e.type)){
          setTimeout(()=>{if(!closed&&(!peer||peer.destroyed||!peer.open)){try{peer.destroy();}catch(_){}start();}},Math.min(15000,2000*(++retry)));
        }
      });
    }
    start();
    return {send:rawSend,destroy(){closed=true;try{peer.destroy();}catch(e){}},restart(code){o.code=code;try{peer.destroy();}catch(e){}start();}};
  }

  /* ---------- phone side ---------- */
  function join(o){
    let peer=null,conn=null,closed=false,retry=0,lastRx=0,timer=null;
    const rx=makeRx(m=>{lastRx=Date.now();if(m&&m.t==='pong')return;o.onData(m);});
    function later(){
      if(closed||timer)return;
      timer=setTimeout(()=>{timer=null;connect();},Math.min(5000,700+500*(retry++)));
    }
    function dial(){
      const c=conn=peer.connect(PREFIX+o.code,{reliable:true,serialization:'raw'});let opened=false;
      c.on('open',()=>{opened=true;retry=0;lastRx=Date.now();o.onStatus('open');o.onOpen();});
      c.on('data',d=>{if(typeof d==='string')rx(d);});
      c.on('close',()=>{if(conn===c){o.onStatus('lost');later();}});
      c.on('error',()=>{if(conn===c){o.onStatus('lost');later();}});
      setTimeout(()=>{if(!opened&&conn===c){try{c.close();}catch(e){}o.onStatus('lost');later();}},9000);
    }
    function connect(){
      if(closed)return;
      o.onStatus('connecting');
      if(peer&&!peer.destroyed&&!peer.disconnected&&peer.open){dial();return;}
      try{peer&&peer.destroy();}catch(e){}
      peer=new Peer(undefined,peerOpts());
      peer.on('open',()=>dial());
      peer.on('error',e=>{o.onStatus(e.type==='peer-unavailable'?'tv-offline':'lost');later();});
      peer.on('disconnected',()=>{try{peer.reconnect();}catch(e){}});
    }
    const hb=setInterval(()=>{
      if(conn&&conn.open){rawSend(conn,{t:'ping'});if(Date.now()-lastRx>16000){try{conn.close();}catch(e){}o.onStatus('lost');later();}}
    },4000);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible'&&!(conn&&conn.open)){clearTimeout(timer);timer=null;retry=0;connect();}
    });
    connect();
    return {send:msg=>rawSend(conn,msg),isOpen:()=>!!(conn&&conn.open),destroy(){closed=true;clearInterval(hb);try{peer.destroy();}catch(e){}}};
  }

  return {host,join,newCode,PREFIX};
})();
