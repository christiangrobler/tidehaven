'use strict';
/* =====================================================================
   SOUND — everything is synthesised (no audio files).
   Effects are panned to where they happen on screen; the island has a
   quiet ambience of surf, wind and the odd bird.
   ===================================================================== */
const SND={ac:null,master:null,noise:null,amb:null,on:true,ambOn:true,vol:.8};
const SNDKEY=(typeof PAD!=='undefined'&&PAD.role==='pad')?'tidehaven.snd.pad':'tidehaven.snd';
(function(){try{const v=localStorage.getItem(SNDKEY);if(v){const o=JSON.parse(v);SND.on=o.on!==false;SND.ambOn=o.amb!==false;if(typeof o.vol==='number')SND.vol=Math.max(0,Math.min(1,o.vol));}}catch(e){}})();
function sndSave(){try{localStorage.setItem(SNDKEY,JSON.stringify({on:SND.on,amb:SND.ambOn,vol:SND.vol}));}catch(e){}}

function audio(){
  if(!SND.on)return null;
  try{
    if(!SND.ac){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
      const ac=SND.ac=new AC();
      const comp=ac.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.2;
      SND.master=ac.createGain();SND.master.gain.value=SND.vol;SND.master.connect(comp);comp.connect(ac.destination);
      const n=ac.sampleRate*2,b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;SND.noise=b;
    }
    if(SND.ac.state==='suspended')SND.ac.resume();
    ambienceUpdate();
  }catch(e){SND.ac=null;return null;}
  return SND.ac;
}
function sOut(pan){const ac=SND.ac;if(!pan||!ac.createStereoPanner)return SND.master;const p=ac.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));p.connect(SND.master);return p;}
/* filtered noise burst with a fast attack and exponential decay */
function sNoise(t,dur,o){const ac=SND.ac,s=ac.createBufferSource();s.buffer=SND.noise;
  const f=ac.createBiquadFilter();f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||1000,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+dur);f.Q.value=o.q||1;
  const e=ac.createGain(),a=o.a||.002,g=o.g==null?.3:o.g;e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(g,t+a);e.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(f);f.connect(e);e.connect(o.out);s.start(t,Math.random()*1.6,dur+.05);}
function sTone(t,f0,dur,o){const ac=SND.ac,x=ac.createOscillator(),e=ac.createGain(),a=o.a||.004,g=o.g==null?.2:o.g;x.type=o.type||'sine';x.frequency.setValueAtTime(f0,t);if(o.f1)x.frequency.exponentialRampToValueAtTime(o.f1,t+dur);
  e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(g,t+a);e.gain.exponentialRampToValueAtTime(.0001,t+dur);x.connect(e);e.connect(o.out);x.start(t);x.stop(t+dur+.03);}

/* ---------- building sound pieces ---------- */
const rr=Math.random;
function bHit(t,o,s){s=s==null?1:s;sNoise(t,.05,{f:1600+rr()*700,q:2.6,g:.5*s,out:o.out});sTone(t,230+rr()*70,.1,{g:.3*s,f1:105,type:'triangle',out:o.out});sTone(t,2200+rr()*300,.06,{g:.05*s,out:o.out});}
function hammer(t,o,n,gap,s){let tt=t;for(let i=0;i<n;i++){bHit(tt,o,(s||1)*(.8+rr()*.3));tt+=gap*(1-.05*i)+rr()*.02;}return tt;}
function rumble(t,dur,o,g){g=g||.16;const steps=Math.floor(dur/.065);for(let k=0;k<steps;k++)sNoise(t+k*.065,.07,{type:'lowpass',f:260+rr()*120,q:.8,g:g*(.7+rr()*.5),a:.01,out:o.out});sNoise(t,dur,{type:'lowpass',f:170,f2:230,q:.7,g:g*1.1,a:.12,out:o.out});}
function creak(t,dur,o,g){const ac=SND.ac,x=ac.createOscillator(),lfo=ac.createOscillator(),lg=ac.createGain(),e=ac.createGain(),f=ac.createBiquadFilter();
  x.type='sawtooth';x.frequency.setValueAtTime(330,t);x.frequency.linearRampToValueAtTime(470,t+dur);lfo.frequency.value=7;lg.gain.value=22;lfo.connect(lg);lg.connect(x.frequency);
  f.type='bandpass';f.frequency.value=900;f.Q.value=5;e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(g||.035,t+dur*.3);e.gain.exponentialRampToValueAtTime(.0001,t+dur);
  x.connect(f);f.connect(e);e.connect(o.out);x.start(t);lfo.start(t);x.stop(t+dur+.05);lfo.stop(t+dur+.05);}
function hoof(t,o,s){s=s==null?1:s;sNoise(t,.035,{f:1000+rr()*200,q:4,g:.32*s,out:o.out});sTone(t,300+rr()*40,.06,{g:.22*s,f1:170,type:'triangle',out:o.out});}
/* a horse-drawn wagon passing by: rutted wheels, axle creaks, hooves at a walk, harness jingle, gravel */
function clop(t,o,s){s=s==null?1:s;sTone(t,540+rr()*40,.07,{g:.3*s,f1:300,type:'triangle',out:o.out});sNoise(t,.045,{f:1300,q:5,g:.38*s,out:o.out});sNoise(t+.004,.02,{type:'highpass',f:3200,g:.06*s,out:o.out});}
function cart(t,o,dur){
  const ac=SND.ac,sw=ac.createGain();
  if(ac.createStereoPanner){const p=ac.createStereoPanner();p.pan.setValueAtTime(-.45,t);p.pan.linearRampToValueAtTime(.45,t+dur);sw.connect(p);p.connect(o.out);}else sw.connect(o.out);
  sw.gain.setValueAtTime(.35,t);sw.gain.linearRampToValueAtTime(1,t+dur*.55);sw.gain.setValueAtTime(1,t+dur*.8);sw.gain.exponentialRampToValueAtTime(.3,t+dur+.1);
  const w={out:sw};
  sNoise(t,dur,{type:'lowpass',f:200,f2:280,q:.7,g:.2,a:.15,out:w.out});
  for(let k=0;k*.19<dur;k++){const tt=t+k*.19+rr()*.015;sNoise(tt,.12,{type:'lowpass',f:320,q:.9,g:.3,a:.01,out:w.out});sTone(tt,95,.1,{g:.2,f1:55,type:'triangle',out:w.out});}
  for(let k=0;k<16;k++)sNoise(t+rr()*dur,.03,{type:'bandpass',f:2400+rr()*1800,q:1.5,g:.07,out:w.out});
  [0,.42,.84].forEach(d=>{if(d<dur)creak(t+d+rr()*.06,.34,w,.05);});
  for(let k=0;k*.23<dur;k++)clop(t+k*.23+(k%2?.012:0),w,k%2?.75:1);
  for(let k=0;k<9;k++){const tt=t+rr()*dur;[2600,3400,4100].forEach(f=>sTone(tt,f*(.95+rr()*.1),.12,{g:.022,out:w.out}));}
}
function wagon(t,o,dur){rumble(t,dur,o);creak(t+.05,dur*.85,o);for(let k=0;k<Math.floor(dur/.18);k++)hoof(t+k*.18+(k%2?.03:0),o,.7);}

const FX={
  diceFelt(t,o){const s=o.s;sNoise(t,.08,{type:'lowpass',f:700+s*600,g:.55*s,out:o.out});sTone(t,150+Math.random()*40,.09,{g:.32*s,f1:70,out:o.out});sNoise(t,.03,{type:'highpass',f:3500,g:.1*s,out:o.out});},
  diceWood(t,o){const s=o.s;sNoise(t,.045,{f:2000+Math.random()*900,q:2.2,g:.6*s,out:o.out});sTone(t,500+Math.random()*130,.08,{g:.26*s,f1:300,type:'triangle',out:o.out});},
  diceDie(t,o){const s=o.s;sNoise(t,.03,{f:3900,q:4,g:.4*s,out:o.out});sTone(t,1900,.05,{g:.07*s,out:o.out});},
  place(t,o){sTone(t,190,.12,{g:.3,f1:90,type:'triangle',out:o.out});sNoise(t,.05,{f:900,q:1.5,g:.5,out:o.out});sNoise(t,.02,{type:'highpass',f:3000,g:.09,out:o.out});},
  /* building: hammers, a wagon pulled by a horse, planks and stone */
  settle(t,o){hammer(t,o,4,.15,1);sTone(t+.66,140,.22,{g:.3,f1:60,type:'triangle',out:o.out});sNoise(t+.66,.12,{type:'lowpass',f:520,g:.25,out:o.out});creak(t+.67,.22,o,.02);},
  city(t,o){cart(t,o,.8);hammer(t+.85,o,6,.13,1.05);sNoise(t+1.65,.14,{type:'lowpass',f:380,g:.35,out:o.out});sTone(t+1.65,90,.3,{g:.34,f1:45,type:'triangle',out:o.out});
    [1180,1760,2490].forEach((f,i)=>sTone(t+1.67,f,.9/(1+i*.55),{g:.06/(1+i*.4),out:o.out}));},
  road(t,o){cart(t,o,1.4);sNoise(t+1.42,.16,{type:'lowpass',f:420,g:.3,out:o.out});sTone(t+1.42,110,.2,{g:.26,f1:60,type:'triangle',out:o.out});hammer(t+1.55,o,2,.13,.85);},
  ship(t,o){hammer(t,o,3,.14,.95);creak(t+.3,.55,o,.04);sNoise(t+.5,.4,{f:1200,f2:420,q:.6,g:.2,a:.05,out:o.out});sTone(t+.5,200,.35,{g:.06,f1:120,type:'sine',out:o.out});},
  card(t,o){sNoise(t,.09,{type:'highpass',f:2500,f2:6500,g:.2,a:.012,out:o.out});sNoise(t+.07,.06,{f:4200,q:2,g:.13,out:o.out});},
  coin(t,o){[1760,2349,2637].forEach((f,i)=>sTone(t+i*.065,f,.34,{g:.1,out:o.out}));sNoise(t,.04,{f:6200,q:3,g:.07,out:o.out});},
  robber(t,o){sTone(t,95,.45,{g:.5,f1:42,out:o.out});sNoise(t,.4,{type:'lowpass',f:520,f2:110,g:.4,out:o.out});},
  knight(t,o){sNoise(t,.13,{f:5200,q:6,g:.22,out:o.out});sTone(t,1250,.2,{g:.06,type:'square',out:o.out});FX.place(t+.02,o);},
  bell(t,o){[523,784,1046].forEach((f,i)=>sTone(t,f,1.2/(1+i*.55),{g:.1/(1+i*.5),out:o.out}));},
  win(t,o){[523,659,784,1046,1319].forEach((f,i)=>sTone(t+i*.13,f,1,{g:.14,type:'triangle',out:o.out}));},
  bad(t,o){sTone(t,230,.2,{g:.13,f1:140,type:'sawtooth',out:o.out});},
  horn(t,o){sTone(t,118,1,{g:.12,f1:104,type:'sawtooth',a:.12,out:o.out});sTone(t,177,1,{g:.06,f1:156,type:'sawtooth',a:.15,out:o.out});},
  click(t,o){sNoise(t,.02,{f:2600,q:3,g:.18,out:o.out});}
};
const BUILDK={settle:1,city:1,road:1,ship:1};
function sfx(kind,o){o=o||{};const ac=audio();if(!ac)return;
  try{const t=ac.currentTime+(o.delay||0);let out=sOut(o.pan);
    if(BUILDK[kind]&&o.s!=null&&o.s!==1){const g=ac.createGain();g.gain.value=o.s;g.connect(out);out=g;}
    const opt={out,s:BUILDK[kind]?1:(o.s==null?1:o.s)};
    if(kind==='dice'){for(let i=0;i<9;i++)FX.diceWood(t+.04+Math.pow(i/9,1.5)*.8,{out,s:.7*(1-i/12)});return;}
    const f=FX[kind];if(f)f(t,opt);}catch(e){}}
function sfxAt(kind,pos,o){let pan=0;try{if(pos&&typeof screenPan==='function')pan=screenPan(pos);}catch(e){}sfx(kind,Object.assign({pan},o||{}));}

/* ---------- ambience: surf, wind, birds ---------- */
function ambienceUpdate(){
  if(!SND.ac)return;const want=SND.on&&SND.ambOn&&!document.hidden;
  if(want&&!SND.amb)SND.amb=startAmbience();else if(!want&&SND.amb)stopAmbience();
}
function startAmbience(){
  const ac=SND.ac,out=ac.createGain();out.gain.value=.0001;out.connect(SND.master);out.gain.exponentialRampToValueAtTime(1,ac.currentTime+3);
  const nodes=[];
  const loop=()=>{const s=ac.createBufferSource();s.buffer=SND.noise;s.loop=true;s.start(0,Math.random()*1.6);nodes.push(s);return s;};
  const lfo=(rate,depth,target)=>{const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=rate;g.gain.value=depth;o.connect(g);g.connect(target);o.start();nodes.push(o);};
  const bp=(type,f,q)=>{const b=ac.createBiquadFilter();b.type=type;b.frequency.value=f;b.Q.value=q;return b;};
  // surf: low rumble that swells every ~9 s, plus a hissier layer that peaks off-beat
  const w1=loop(),f1=bp('lowpass',480,.7),g1=ac.createGain();g1.gain.value=.045;lfo(.11,.035,g1.gain);w1.connect(f1);f1.connect(g1);g1.connect(out);
  const w2=loop(),f2=bp('bandpass',1900,.5),g2=ac.createGain();g2.gain.value=.012;lfo(.085,.01,g2.gain);w2.connect(f2);f2.connect(g2);g2.connect(out);
  // wind: slow gusts that also sweep the filter
  const w3=loop(),f3=bp('bandpass',360,.9),g3=ac.createGain();g3.gain.value=.025;lfo(.043,.02,g3.gain);lfo(.031,140,f3.frequency);w3.connect(f3);f3.connect(g3);g3.connect(out);
  const A={out,nodes,timer:null};
  const bird=()=>{if(SND.amb!==A)return;try{chirp();}catch(e){}A.timer=setTimeout(bird,3500+Math.random()*8000);};
  A.timer=setTimeout(bird,2500);return A;
}
function stopAmbience(){const A=SND.amb,ac=SND.ac;SND.amb=null;if(!A||!ac)return;clearTimeout(A.timer);
  try{A.out.gain.cancelScheduledValues(ac.currentTime);A.out.gain.setValueAtTime(Math.max(.0001,A.out.gain.value),ac.currentTime);A.out.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+.8);}catch(e){}
  setTimeout(()=>A.nodes.forEach(n=>{try{n.stop();}catch(e){}}),1000);}
function chirp(){
  const ac=SND.ac;if(!ac||!SND.amb)return;const t=ac.currentTime+.03,out=sOut((Math.random()*2-1)*.75);
  if(Math.random()<.2){ // gull
    [0,.32].forEach((d,i)=>{const o=ac.createOscillator(),e=ac.createGain(),f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=1400;f.Q.value=1.2;o.type='sawtooth';
      o.frequency.setValueAtTime(1050-i*80,t+d);o.frequency.exponentialRampToValueAtTime(640,t+d+.34);e.gain.setValueAtTime(.0001,t+d);e.gain.linearRampToValueAtTime(.025,t+d+.05);e.gain.exponentialRampToValueAtTime(.0001,t+d+.4);
      o.connect(f);f.connect(e);e.connect(out);o.start(t+d);o.stop(t+d+.45);});return;}
  const base=2400+Math.random()*1800,n=2+Math.floor(Math.random()*4);
  for(let i=0;i<n;i++){const tt=t+i*(.11+Math.random()*.03),o=ac.createOscillator(),e=ac.createGain();o.type='sine';
    o.frequency.setValueAtTime(base,tt);o.frequency.exponentialRampToValueAtTime(base*(Math.random()<.5?1.35:.78),tt+.07);
    e.gain.setValueAtTime(.0001,tt);e.gain.linearRampToValueAtTime(.04,tt+.012);e.gain.exponentialRampToValueAtTime(.0001,tt+.09);o.connect(e);e.connect(out);o.start(tt);o.stop(tt+.12);}
}
function setVolume(v){SND.vol=Math.max(0,Math.min(1,v));if(SND.master)SND.master.gain.value=SND.vol;sndSave();}
document.addEventListener('visibilitychange',()=>{if(!SND.ac)return;if(document.hidden){try{SND.ac.suspend();}catch(e){}}else{try{SND.ac.resume();}catch(e){}ambienceUpdate();}});


/* ---------- play a building sound whenever a piece appears (phones, TV and the 2D board) ---------- */
const SW={id:null,v:[],e:[]};
function sndWatch(){
  try{
    if(!G||G.preview||!G.vOwn||!G.eOwn){SW.id=null;return;}
    if(typeof GL!=='undefined'&&GL.ready)return;              // the 3D board plays its own building sounds
    const id=G.board.id;
    const vs=G.vOwn.map(o=>o?(o.p+(o.city?'c':'s')):''),es=G.eOwn.map(o=>o?(o.p+(o.k||'road')):'');
    const dk=G.dice?G.turn+':'+G.dice.join(','):'';
    if(SW.id!==id){SW.id=id;SW.v=vs;SW.e=es;SW.d=dk;return;}   // first sight of a board: stay quiet
    if(dk&&dk!==SW.d&&typeof PAD!=='undefined'&&PAD.role==='pad'&&G.cur!==PAD.seat)sfx('dice',{s:.5});   // someone else rolled
    SW.d=dk;
    const ev=[];
    vs.forEach((x,i)=>{if(x&&x!==SW.v[i])ev.push({k:/c$/.test(x)?'city':'settle',p:parseInt(x)});});
    es.forEach((x,i)=>{if(x&&x!==SW.e[i])ev.push({k:/ship/.test(x)?'ship':'road',p:parseInt(x)});});
    SW.v=vs;SW.e=es;
    if(!ev.length||ev.length>2)return;                         // a big jump is a resync, not a build
    const mine=(typeof PAD!=='undefined'&&PAD.role==='pad')?PAD.seat:null;
    sfx(ev[0].k,{s:(mine==null||ev[0].p===mine)?1:.55});
  }catch(e){}
}
if(typeof PAD!=='undefined'&&PAD.role)SND.ambOn=false;          // no surf and gulls on the phones and TV


/* ---------- phones and tablets only play sound after a tap, and iPhones mute it with the silent switch ---------- */
const SU={sil:null,done:false};
function soundUnlock(){
  if(!SND.on)return;
  try{
    try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}   // ignore the ringer switch (iOS 16.4+)
    const ac=audio();if(!ac)return;
    if(ac.state!=='running')ac.resume();
    const b=ac.createBuffer(1,1,22050),src=ac.createBufferSource();src.buffer=b;src.connect(ac.destination);src.start(0);
    if(!SU.sil){                                                                         // a silent looping clip also switches older iPhones to "playback" audio
      const n=8000,u=new Uint8Array(44+n),dv=new DataView(u.buffer),W=(o,t)=>{for(let i=0;i<t.length;i++)dv.setUint8(o+i,t.charCodeAt(i));};
      W(0,'RIFF');dv.setUint32(4,36+n,true);W(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,8000,true);dv.setUint32(28,8000,true);dv.setUint16(32,1,true);dv.setUint16(34,8,true);W(36,'data');dv.setUint32(40,n,true);u.fill(128,44);
      const a=document.createElement('audio');a.src=URL.createObjectURL(new Blob([u],{type:'audio/wav'}));a.loop=true;a.setAttribute('playsinline','');a.volume=.02;SU.sil=a;
    }
    if(SU.sil.paused){const p=SU.sil.play();if(p&&p.catch)p.catch(()=>{});}
    SU.done=true;
  }catch(e){}
}
['touchend','pointerup','click','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(!SU.done||(SND.ac&&SND.ac.state!=='running'))soundUnlock();},true));
