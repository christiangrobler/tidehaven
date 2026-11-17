'use strict';
/* =====================================================================
   3D DICE
   Dice are tossed across a felt tray that appears over the table. The whole
   motion (bounces, spin, collisions) is simulated up front, so we know which
   face lands up and can print the rolled numbers on exactly the faces that
   end up on top. Bounces are played back as sounds, panned to where they hit.
   ===================================================================== */
const Dice3D=(function(){
  const TW=5.8,TD=3.5,RAIL=.34,RAILH=.7,S=1,R=S/6,H=S/2-R,G=-34,FACE_OPP=[1,0,3,2,5,4];
  const st={ok:null,r:null,scene:null,cam:null,cv:null,dice:[],tray:null,mats:[],raf:0,play:null,W:0,Hh:0,tex:{}};
  const reduced=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- textures ---------- */
  function faceTex(type,v){
    const key=type+v;if(st.tex[key])return st.tex[key];
    const N=128,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');
    const base=type==='red'?['#c8392e','#a52a21']:type==='event'?['#26262b','#141417']:['#f6eedb','#e4d8bd'];
    const g=x.createLinearGradient(0,0,N,N);g.addColorStop(0,base[0]);g.addColorStop(1,base[1]);x.fillStyle=g;x.fillRect(0,0,N,N);
    for(let i=0;i<260;i++){x.fillStyle=`rgba(${type==='event'?'255,255,255':'60,40,20'},${Math.random()*.035})`;x.fillRect(Math.random()*N,Math.random()*N,1+Math.random()*2,1+Math.random()*2);}
    // soft bevel: darker toward the rounded edges
    const rg=x.createRadialGradient(N/2,N/2,N*.34,N/2,N/2,N*.78);rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(1,'rgba(0,0,0,.26)');x.fillStyle=rg;x.fillRect(0,0,N,N);
    if(type==='event'){
      const f=typeof evFace==='function'?evFace(v):(v<=3?'ship':'trade');
      x.save();x.translate(N*.2,N*.2);x.scale(N*.6/24,N*.6/24);
      if(f==='ship'){x.fillStyle='#f4efe4';['M12 2v13H5.5L12 2z','M13 5l6 9h-6z','M2.5 16.5h19l-2.5 4h-14z'].forEach(p=>x.fill(new Path2D(p)));}
      else{x.fillStyle=(typeof TRACK!=='undefined'&&TRACK[f])?TRACK[f].col:'#d9a52a';x.fill(new Path2D('M4 21V9l8-6 8 6v12h-5v-6a3 3 0 0 0-6 0v6z'));}
      x.restore();
    }else{
      const pip=type==='red'?'#f6eedb':'#16130f',rim=type==='red'?'rgba(0,0,0,.35)':'rgba(255,255,255,.35)';
      (PIPS[v]||[]).forEach(k=>{const cx=N*(.24+((k-1)%3)*.26),cy=N*(.24+Math.floor((k-1)/3)*.26),r=N*(v===1?.1:.083);
        x.beginPath();x.arc(cx,cy,r+1.6,0,7);x.fillStyle=rim;x.fill();
        const pg=x.createRadialGradient(cx-r*.25,cy-r*.25,r*.1,cx,cy,r);pg.addColorStop(0,type==='red'?'#fff8e8':'#3a3530');pg.addColorStop(1,pip);
        x.beginPath();x.arc(cx,cy,r,0,7);x.fillStyle=type==='red'?pg:pip;x.fill();
        if(type!=='red'){x.beginPath();x.arc(cx-r*.3,cy-r*.3,r*.28,0,7);x.fillStyle='rgba(255,255,255,.12)';x.fill();}});
      if(v===1&&type!=='red'){x.beginPath();x.arc(N/2,N/2,N*.1,0,7);x.fillStyle='#b3261e';x.fill();}
    }
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return st.tex[key]=t;
  }
  function roundedCube(){
    const g=new THREE.BoxGeometry(S,S,S,6,6,6),p=g.attributes.position,n=g.attributes.normal,v=new THREE.Vector3(),c=new THREE.Vector3(),d=new THREE.Vector3();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);c.set(Math.max(-H,Math.min(H,v.x)),Math.max(-H,Math.min(H,v.y)),Math.max(-H,Math.min(H,v.z)));d.copy(v).sub(c);if(d.lengthSq()<1e-10)continue;d.normalize();v.copy(c).addScaledVector(d,R);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,d.x,d.y,d.z);}
    return g;
  }
  function feltTex(){
    const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#1a3a2a';x.fillRect(0,0,256,256);
    for(let i=0;i<5000;i++){x.fillStyle=`rgba(${Math.random()<.5?'255,255,255':'0,0,0'},${Math.random()*.07})`;x.fillRect(Math.random()*256,Math.random()*256,1.4,1.4);}
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,2);t.encoding=THREE.sRGBEncoding;return t;
  }

  /* ---------- scene ---------- */
  function init(){
    if(st.ok!==null)return st.ok;
    try{
      const stage=document.getElementById('stage');if(!stage||typeof THREE==='undefined')throw 0;
      const cv=document.createElement('canvas');cv.id='dice3d';cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4';stage.appendChild(cv);
      const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:'low-power'});
      r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=.82;
      r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;r.setClearColor(0x000000,0);
      const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,1,.5,80);
      scene.add(new THREE.HemisphereLight(0xfff0dc,0x2a1c10,.7));
      const sun=new THREE.DirectionalLight(0xfff0d8,1.1);sun.position.set(-4.5,9,5.5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
      const sc=sun.shadow.camera;sc.left=-6;sc.right=6;sc.top=5;sc.bottom=-5;sc.near=2;sc.far=26;sun.shadow.bias=-.0005;sun.shadow.radius=3;scene.add(sun);
      // tray: felt floor + walnut rails
      const tray=new THREE.Group();
      const felt=new THREE.Mesh(new THREE.PlaneGeometry(TW+RAIL,TD+RAIL),new THREE.MeshStandardMaterial({map:feltTex(),roughness:1,metalness:0}));felt.rotation.x=-Math.PI/2;felt.receiveShadow=true;tray.add(felt);
      const wood=new THREE.MeshStandardMaterial({color:0x3d2312,roughness:.45,metalness:.05});
      [[0,-(TD/2+RAIL/2),TW+RAIL*2,RAIL],[0,TD/2+RAIL/2,TW+RAIL*2,RAIL],[-(TW/2+RAIL/2),0,RAIL,TD],[TW/2+RAIL/2,0,RAIL,TD]].forEach(([x,z,w,d])=>{
        const m=new THREE.Mesh(new THREE.BoxGeometry(w,RAILH,d),wood);m.position.set(x,RAILH/2,z);m.castShadow=m.receiveShadow=true;tray.add(m);});
      scene.add(tray);
      const geo=roundedCube();
      for(let i=0;i<3;i++){const mats=[0,1,2,3,4,5].map(()=>new THREE.MeshStandardMaterial({roughness:.28,metalness:.05}));
        const m=new THREE.Mesh(geo,mats);m.castShadow=true;m.receiveShadow=false;m.visible=false;scene.add(m);st.dice.push({mesh:m,mats});}
      st.mats=[felt.material,wood].concat(st.dice.flatMap(d=>d.mats));
      Object.assign(st,{r,scene,cam,cv,tray,sun,ok:true});
    }catch(e){st.ok=false;}
    return st.ok;
  }
  function size(){
    const stage=document.getElementById('stage'),W=stage.clientWidth,Hh=stage.clientHeight;
    if(W===st.W&&Hh===st.Hh)return;st.W=W;st.Hh=Hh;st.r.setSize(W,Hh,false);st.cam.aspect=W/Hh;
    const px=Math.min(72,.86*W/(TW+RAIL*2));            // pixels per world unit: tray fits the stage width
    const D=Hh/(2*px*Math.tan(THREE.MathUtils.degToRad(st.cam.fov/2)));const tilt=THREE.MathUtils.degToRad(63);
    st.cam.position.set(0,D*Math.sin(tilt),D*Math.cos(tilt));st.cam.lookAt(0,0,0);
    st.cam.setViewOffset(W,Hh,0,-Math.round(Hh*.09),W,Hh);st.cam.updateProjectionMatrix();
  }

  /* ---------- physics (run once, up front) ---------- */
  const UP=new THREE.Vector3(0,1,0);
  function lowest(q){const m=new THREE.Matrix4().makeRotationFromQuaternion(q).elements;return H*(Math.abs(m[1])+Math.abs(m[5])+Math.abs(m[9]))+R;}
  function upFace(q){const m=new THREE.Matrix4().makeRotationFromQuaternion(q).elements,u=[m[1],-m[1],m[5],-m[5],m[9],-m[9]];let b=0;for(let i=1;i<6;i++)if(u[i]>u[b])b=i;return {face:b,up:u[b]};}
  function faceNormal(q,f){const ax=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]][f];return new THREE.Vector3(ax[0],ax[1],ax[2]).applyQuaternion(q);}
  function simulate(n){
    const dt=1/120,minX=-TW/2+S/2,maxX=TW/2-S/2,minZ=-TD/2+S/2,maxZ=TD/2-S/2;
    const D=[];for(let i=0;i<n;i++){
      const z0=(i-(n-1)/2)*1.05+(Math.random()-.5)*.5;
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random()*6,Math.random()*6,Math.random()*6));
      const ax=new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(15+Math.random()*9);
      D.push({p:new THREE.Vector3(-TW/2+.2+i*.15,3+Math.random()*.8,z0),v:new THREE.Vector3(6.2+Math.random()*3,1+Math.random()*3,(Math.random()-.5)*3.2),q,w:ax,rest:0,state:'fly',sn:0,frames:[],done:false,up:0});}
    const ev=[];let t=0,steps=0,allDone=false;
    const addEv=(kind,s,x)=>{if(s<.06)return;const last=ev[ev.length-1];if(last&&last.kind===kind&&t-last.t<.035)return;ev.push({t,kind,s:Math.min(1,s),x});};
    const dq=new THREE.Quaternion(),ax=new THREE.Vector3();
    while(!allDone&&t<4.2){
      allDone=true;
      D.forEach(d=>{
        if(d.state==='snap'){d.sn+=dt;const k=Math.min(1,d.sn/.2),e=k*k*(3-2*k);d.q=d.q0.clone().slerp(d.q1,e);d.p.y=d.py0+(S/2-d.py0)*e;if(k>=1){d.state='done';d.up=upFace(d.q).face;}allDone=false;return;}
        if(d.state==='done')return;
        allDone=false;
        d.v.y+=G*dt;d.p.addScaledVector(d.v,dt);
        const wl=d.w.length();if(wl>1e-4){dq.setFromAxisAngle(ax.copy(d.w).multiplyScalar(1/wl),wl*dt);d.q.premultiply(dq).normalize();}
        const low=lowest(d.q);
        if(d.p.y-low<0){
          d.p.y=low;
          if(d.v.y<-.01){const imp=-d.v.y;d.v.y=imp*.4;d.v.x*=.8;d.v.z*=.8;d.w.multiplyScalar(.74);
            d.w.add(new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(Math.min(imp,12)*.9));addEv('diceFelt',imp/13,d.p.x);}
          d.v.x*=1-dt*2.2;d.v.z*=1-dt*2.2;d.w.multiplyScalar(1-dt*1.1);
        }
        if(d.p.y<1.05){ // inside the rails
          if(d.p.x<minX){d.p.x=minX;if(d.v.x<0){addEv('diceWood',-d.v.x/9,d.p.x);d.v.x*=-.55;d.w.multiplyScalar(.85);}}
          if(d.p.x>maxX){d.p.x=maxX;if(d.v.x>0){addEv('diceWood',d.v.x/9,d.p.x);d.v.x*=-.55;d.w.multiplyScalar(.85);}}
          if(d.p.z<minZ){d.p.z=minZ;if(d.v.z<0){addEv('diceWood',-d.v.z/9,d.p.x);d.v.z*=-.55;}}
          if(d.p.z>maxZ){d.p.z=maxZ;if(d.v.z>0){addEv('diceWood',d.v.z/9,d.p.x);d.v.z*=-.55;}}
        }
        const onFloor=d.p.y-low<.02,sp=Math.hypot(d.v.x,d.v.z)+Math.abs(d.v.y);
        if(onFloor&&sp<.9&&d.w.length()<4.5)d.rest+=dt;else d.rest=0;
        if(d.rest>.07||t>3.6){
          const uf=upFace(d.q),nrm=faceNormal(d.q,uf.face),tilt=Math.acos(Math.max(-1,Math.min(1,nrm.y)));
          if(tilt>.5&&t<3.4){d.rest=0;d.w.copy(new THREE.Vector3().crossVectors(nrm,UP).normalize().multiplyScalar(4.2));d.v.y=1.1;}   // topple onto the nearest face
          else{d.state='snap';d.sn=0;d.q0=d.q.clone();d.q1=new THREE.Quaternion().setFromUnitVectors(nrm,UP).multiply(d.q).normalize();d.py0=d.p.y;d.v.set(0,0,0);d.w.set(0,0,0);}
        }
      });
      // dice knock each other
      for(let i=0;i<D.length;i++)for(let j=i+1;j<D.length;j++){const a=D[i],b=D[j];if(a.state==='done'&&b.state==='done')continue;
        const dx=b.p.x-a.p.x,dz=b.p.z-a.p.z,dist=Math.hypot(dx,dz);
        if(dist<1.2&&Math.abs(a.p.y-b.p.y)<.9&&dist>1e-4){const nx=dx/dist,nz=dz/dist,ov=1.2-dist;
          if(a.state!=='done'&&b.state!=='done'){a.p.x-=nx*ov/2;a.p.z-=nz*ov/2;b.p.x+=nx*ov/2;b.p.z+=nz*ov/2;}else if(a.state==='done'){b.p.x+=nx*ov;b.p.z+=nz*ov;}else{a.p.x-=nx*ov;a.p.z-=nz*ov;}
          const vn=(b.v.x-a.v.x)*nx+(b.v.z-a.v.z)*nz;if(vn<0){const j2=-(1+.5)*vn/2;a.v.x-=j2*nx;a.v.z-=j2*nz;b.v.x+=j2*nx;b.v.z+=j2*nz;addEv('diceDie',-vn/7,(a.p.x+b.p.x)/2);}}}
      if(steps%2===0)D.forEach(d=>d.frames.push(d.p.x,d.p.y,d.p.z,d.q.x,d.q.y,d.q.z,d.q.w));
      t+=dt;steps++;
    }
    // any die that never finished snaps where it is
    D.forEach(d=>{if(d.state!=='done'){d.state='done';d.up=upFace(d.q).face;}});
    return {D,ev,T:t};
  }

  /* ---------- API ---------- */
  function toss(vals,opts){
    if(reduced()||!init())return 0;
    try{
      if(!document.getElementById('stage').clientWidth)return 0;size();opts=opts||{};const n=vals.length,sim=simulate(n);
      const nf=Math.max(...sim.D.map(d=>d.frames.length/7));
      // print the rolled values on whichever faces ended up on top
      sim.D.forEach((d,i)=>{const type=opts.types?opts.types[i]:(i===2?'event':i===1&&n===3?'red':'ivory'),want=vals[i],fv=[0,0,0,0,0,0];
        fv[d.up]=want;fv[FACE_OPP[d.up]]=7-want;const rem=[1,2,3,4,5,6].filter(v=>v!==want&&v!==7-want),sides=[0,1,2,3,4,5].filter(f=>f!==d.up&&f!==FACE_OPP[d.up]);
        fv[sides[0]]=rem[0];fv[sides[1]]=7-rem[0];fv[sides[2]]=rem.find(v=>v!==rem[0]&&v!==7-rem[0]);fv[sides[3]]=7-fv[sides[2]];
        const die=st.dice[i];die.mats.forEach((m,f)=>{m.map=faceTex(type,fv[f]);m.needsUpdate=true;});die.mesh.visible=true;});
      for(let i=n;i<3;i++)st.dice[i].mesh.visible=false;
      st.play={t0:performance.now(),sim,n,nf,evi:0,landed:false,landMs:sim.T*1000,hold:1500};
      st.cv.style.display='block';
      cancelAnimationFrame(st.raf);st.raf=requestAnimationFrame(frame);
      return Math.round(sim.T*1000);
    }catch(e){console.error('dice3d',e);return 0;}
  }
  function alpha(a){st.mats.forEach(m=>{m.transparent=a<.999;m.opacity=a;});}
  function frame(now,once){
    const P=st.play;if(!P)return;
    const el=now-P.t0,secs=el/1000,fi=secs*60,i0=Math.min(P.nf-1,Math.floor(fi)),i1=Math.min(P.nf-1,i0+1),k=fi-Math.floor(fi);
    const q0=new THREE.Quaternion(),q1=new THREE.Quaternion();
    P.sim.D.forEach((d,i)=>{const f=d.frames,a=Math.min(f.length/7-1,i0)*7,b=Math.min(f.length/7-1,i1)*7,m=st.dice[i].mesh;
      m.position.set(f[a]+(f[b]-f[a])*k,f[a+1]+(f[b+1]-f[a+1])*k,f[a+2]+(f[b+2]-f[a+2])*k);
      q0.set(f[a+3],f[a+4],f[a+5],f[a+6]);q1.set(f[b+3],f[b+4],f[b+5],f[b+6]);m.quaternion.copy(q0).slerp(q1,k);});
    while(P.evi<P.sim.ev.length&&P.sim.ev[P.evi].t<=secs){const e=P.sim.ev[P.evi++];if(typeof sfx==='function')sfx(e.kind,{s:e.s,pan:e.x/(TW/2)*.7});}
    const fadeIn=Math.min(1,el/160),out=el>P.landMs+P.hold?Math.max(0,1-(el-P.landMs-P.hold)/450):1;
    alpha(Math.min(fadeIn,out));st.tray.position.y=(1-fadeIn)*.8;
    st.r.render(st.scene,st.cam);
    if(out<=0){st.cv.style.display='none';st.play=null;return;}
    if(!once)st.raf=requestAnimationFrame(frame);
  }
  function hide(){if(!st.play)return;st.play=null;cancelAnimationFrame(st.raf);if(st.cv)st.cv.style.display='none';}
  function freezeAt(ms){const P=st.play;if(!P)return;cancelAnimationFrame(st.raf);P.evi=1e9;frame(P.t0+ms,true);}
  return {toss,hide,freezeAt,available:()=>init()&&!reduced()};
})();
