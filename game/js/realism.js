'use strict';
/* =====================================================================
   REALISM LAYER
   · time-of-day sun (shadows swing round the board as the game goes on)
   · sky reflections (image-based lighting from a generated sky)
   · soft cloud shadows drifting over table, sea and land
   · rolling water with a bump-mapped swell
   · lapping foam and shallow water along every coastline
   ===================================================================== */
const RL={t:.4,goal:null,mode:'auto',U:null,envRT:null,envT:-9,waters:[],keys:[],pmrem:null,sky:null,ready:false};
(function(){try{const v=localStorage.getItem('tidehaven.light');if(v)RL.mode=v;}catch(e){}})();
const RL_MODES=['auto','morning','day','golden','dusk'];
const RL_FIXED={morning:.06,day:.46,golden:.8,dusk:1};
/* keyframes along the day: sun colour/strength/elevation/azimuth, sky light and sky gradient */
const RL_KEYS=[
  {t:0,  sun:'#ffb070',si:1.6, el:22,az:70,  hs:'#ffd2a0',hg:'#2a1a10',hi:.3, ex:.95,zen:'#5f86c2',hor:'#ffc08a',fi:.2},
  {t:.22,sun:'#ffdcae',si:1.9, el:40,az:42,  hs:'#fff0d8',hg:'#2c1d12',hi:.36,ex:1,  zen:'#6a9ad8',hor:'#ffe6c4',fi:.3},
  {t:.5, sun:'#fff3dc',si:2.05,el:58,az:-28, hs:'#fff6e8',hg:'#2c1d12',hi:.4, ex:1,  zen:'#78a8e4',hor:'#f6f0e2',fi:.32},
  {t:.8, sun:'#ffc88c',si:1.85,el:34,az:-66, hs:'#ffd9b0',hg:'#2a1a10',hi:.34,ex:.98,zen:'#5c7cc0',hor:'#ffb27a',fi:.25},
  {t:1,  sun:'#ff8f58',si:1.25,el:14,az:-88, hs:'#ffa880',hg:'#20120c',hi:.26,ex:.9, zen:'#323a74',hor:'#ff8a5c',fi:.18}
];
const rlHex=h=>new THREE.Color(h);
function rlSample(t){
  let a=RL_KEYS[0],b=RL_KEYS[RL_KEYS.length-1];
  for(let i=0;i<RL_KEYS.length-1;i++)if(t>=RL_KEYS[i].t&&t<=RL_KEYS[i+1].t){a=RL_KEYS[i];b=RL_KEYS[i+1];break;}
  const k=b.t===a.t?0:(t-a.t)/(b.t-a.t),L=(x,y)=>x+(y-x)*k,C=(x,y)=>rlHex(x).lerp(rlHex(y),k);
  return {sun:C(a.sun,b.sun),si:L(a.si,b.si),el:L(a.el,b.el),az:L(a.az,b.az),hs:C(a.hs,b.hs),hg:C(a.hg,b.hg),hi:L(a.hi,b.hi),ex:L(a.ex,b.ex),zen:C(a.zen,b.zen),hor:C(a.hor,b.hor),fi:L(a.fi,b.fi)};
}
function rlSunDir(s){const el=s.el*Math.PI/180,az=s.az*Math.PI/180;return new THREE.Vector3(Math.cos(el)*Math.sin(az),Math.sin(el),Math.cos(el)*Math.cos(az));}

RL.init=function(){
  if(RL.ready||!GL.r)return;RL.ready=true;
  const wave=noiseCanvas(256,41,3,3,v=>{const k=Math.floor(70+v*140);return [k,k,k];},4);
  const waveT=new THREE.CanvasTexture(wave);waveT.wrapS=waveT.wrapT=THREE.RepeatWrapping;
  const cloudC=noiseCanvas(256,57,4,4,v=>{const k=Math.floor(clamp((v-.12)*1.5)*255);return [k,k,k];},5);
  const cloudT=new THREE.CanvasTexture(cloudC);cloudT.wrapS=cloudT.wrapT=THREE.RepeatWrapping;
  const foamC=noiseCanvas(128,73,6,6,v=>{const k=Math.floor(v*255);return [k,k,k];},4);
  const foamT=new THREE.CanvasTexture(foamC);foamT.wrapS=foamT.wrapT=THREE.RepeatWrapping;
  RL.U={time:{value:0},cloudT:{value:0},cloud:{value:cloudT},wave:{value:new THREE.Vector2()},noise:{value:foamT}};
  RL.waveTex=waveT;
  RL.pmrem=new THREE.PMREMGenerator(GL.r);
  Object.keys(TERR_MAT).forEach(k=>RL.cloudify(TERR_MAT[k],'t'));
  if(GL.tbl)RL.cloudify(GL.tbl.material,'tb');
  RL.cloudify(MAT.frame,'fr');
  RL.water(MAT.ocean);
  RL.apply(RL.targetT(),true);
};

/* drifting cloud shadows: darkens albedo by a slowly moving cloud mask in world space */
RL.cloudify=function(mat,key){
  const prev=mat.onBeforeCompile;
  mat.onBeforeCompile=sh=>{
    if(prev)prev(sh);
    sh.uniforms.uCloudT=RL.U.cloudT;sh.uniforms.uCloud=RL.U.cloud;
    sh.vertexShader='varying vec3 vWP;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n  vWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader='uniform float uCloudT;\nuniform sampler2D uCloud;\nvarying vec3 vWP;\n'+sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float cl1=texture2D(uCloud,vWP.xz*.042+vec2(uCloudT*.0042,uCloudT*.0021)).r;
      float cl2=texture2D(uCloud,vWP.xz*.11-vec2(uCloudT*.003,uCloudT*.0008)).r;
      diffuseColor.rgb*=1.0-.3*smoothstep(.5,.82,cl1*.72+cl2*.28);`);
  };
  mat.customProgramCacheKey=()=>'cl'+key+(mat.bumpMap&&mat.userData.water?'w':'');
  mat.needsUpdate=true;
};
/* water: reflective surface, bump-mapped swell that scrolls in two layers, plus the cloud shadows */
RL.water=function(mat){
  mat.userData.water=true;mat.bumpMap=RL.waveTex;mat.bumpScale=.34;mat.roughness=.26;mat.metalness=.08;
  const base=mat.onBeforeCompile;
  RL.cloudify(mat,'o');
  const cl=mat.onBeforeCompile;
  mat.onBeforeCompile=sh=>{
    cl(sh);sh.uniforms.uWave=RL.U.wave;
    let chunk=THREE.ShaderChunk.bumpmap_pars_fragment
      .replace(/texture2D\( bumpMap, ([^)]*?) \)\.x/g,'wHeight( $1 )')
      .replace('vec2 dHdxy_fwd()','uniform vec2 uWave;\n float wHeight(vec2 uv){return texture2D(bumpMap,uv+uWave).x*.62+texture2D(bumpMap,uv*2.37-uWave*1.41+vec2(.31,.17)).x*.38;}\n vec2 dHdxy_fwd()');
    sh.fragmentShader=sh.fragmentShader.replace('#include <bumpmap_pars_fragment>',chunk);
  };
  RL.waters.push(mat);
};

/* time of day */
RL.targetT=function(){
  if(RL.mode!=='auto')return RL_FIXED[RL.mode]!=null?RL_FIXED[RL.mode]:.46;
  if(!G||G.preview||G.phase==='setup'&&!G.turn)return .42;
  if(G.winner!=null)return .8;
  return .08+.84*clamp((G.turn||0)/96);
};
RL.apply=function(t,withEnv){
  if(!GL.sun)return;RL.t=t;const s=rlSample(t),d=rlSunDir(s);
  GL.sun.color.copy(s.sun);GL.sun.intensity=s.si;GL.sun.position.copy(d).multiplyScalar(15);GL.sun.target.position.set(0,0,0);
  if(GL.hemi){GL.hemi.color.copy(s.hs);GL.hemi.groundColor.copy(s.hg);GL.hemi.intensity=s.hi;}
  if(GL.fill){GL.fill.intensity=s.fi;}
  GL.r.toneMappingExposure=s.ex;GL.dirty=true;
  if(withEnv)RL.env(s,d);
};
RL.env=function(s,d){
  if(!RL.pmrem)return;
  try{
    if(!RL.sky){
      const mat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{zen:{value:new THREE.Color()},hor:{value:new THREE.Color()},gnd:{value:new THREE.Color('#1a120c')},sunDir:{value:new THREE.Vector3()},sunCol:{value:new THREE.Color()}},
        vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:`varying vec3 vD;uniform vec3 zen,hor,gnd,sunDir,sunCol;
          void main(){vec3 d=normalize(vD);float h=d.y;vec3 c=h>0.0?mix(hor,zen,pow(h,.55)):mix(hor*.35,gnd,smoothstep(0.0,-.4,h));
            float s=max(dot(d,normalize(sunDir)),0.0);c+=sunCol*(pow(s,700.0)*22.0+pow(s,14.0)*.3);gl_FragColor=linearToOutputTexel(vec4(c*.62,1.0));}`});
      const sc=new THREE.Scene();sc.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),mat));RL.sky={sc,mat};
    }
    const u=RL.sky.mat.uniforms;u.zen.value.copy(s.zen);u.hor.value.copy(s.hor);u.sunDir.value.copy(d);u.sunCol.value.copy(s.sun);
    const first=!RL.envRT;const rt=RL.pmrem.fromScene(RL.sky.sc,.02);if(RL.envRT)RL.envRT.dispose();RL.envRT=rt;GL.scene.environment=rt.texture;RL.envT=RL.t;if(first)GL.scene.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.needsUpdate=true;});});
  }catch(e){console.warn('env',e);}
};
RL.sync=function(anim){
  if(!RL.ready)return;const goal=RL.targetT();
  if(RL.goal!=null&&Math.abs(goal-RL.goal)<.003)return;
  const from=RL.t;RL.goal=goal;
  if(anim&&!REDUCED&&Math.abs(goal-from)>.01){tween(1800,k=>RL.apply(from+(goal-from)*k,false),()=>RL.apply(goal,true));}
  else RL.apply(goal,true);
};
RL.cycle=function(){const i=RL_MODES.indexOf(RL.mode);RL.mode=RL_MODES[(i+1)%RL_MODES.length];try{localStorage.setItem('tidehaven.light',RL.mode);}catch(e){}RL.goal=null;RL.sync(true);};
RL.label=()=>({auto:'follows the game',morning:'morning',day:'midday',golden:'golden hour',dusk:'dusk'})[RL.mode];

/* per-frame animation */
RL.tick=function(now){
  if(!RL.ready)return;const t=now/1000;
  RL.U.time.value=t;RL.U.cloudT.value=t;RL.U.wave.value.set(t*.011,t*.0065);
  RL.waters.forEach(m=>{if(m.map)m.map.offset.set(t*.0011,-t*.0007);});
};

/* shoreline: shallow turquoise water + lapping foam along every land edge that faces the sea */
RL.buildCoast=function(){
  if(!RL.ready)return;
  const strips=(w,inner)=>{
    const pos=[],uv=[],ph=[],idx=[];let n=0;
    G.board.hexes.forEach((H,i)=>{if(H.t==='sea'||H.t==='fog'||H.t==='lake')return;const c=T.hexes[i].c;
      T.hexes[i].e.forEach(e=>{const E=T.edges[e],other=E.hexes.find(x=>x!==i);if(other!=null&&!isSeaHex(other))return;
        const A=T.verts[E.a],B=T.verts[E.b];const dir=V=>{let dx=V.x-c.x,dy=V.y-c.y;const L=Math.hypot(dx,dy)||1;return [dx/L,dy/L];};
        const da=dir(A),db=dir(B),y=SEA+.004+(inner?.002:0),mi=1.155,p=((e*2654435761)>>>0)/4294967296;
        const q=(V,d,o)=>[V.x+d[0]*o,y,V.y+d[1]*o];
        [q(A,da,-inner),q(B,db,-inner),q(B,db,w*mi),q(A,da,w*mi)].forEach((P,k)=>{pos.push(...P);uv.push(k===1||k===2?1:0,k>=2?1:0);ph.push(p);});
        idx.push(n,n+1,n+2,n,n+2,n+3);n+=4;});});
    if(!n)return null;
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    // uv.x runs from the shore (0) outward (1); uv.y runs along the edge
    const U2=[];for(let k=0;k<n;k+=4){U2.push(0,0, 0,1, 1,1, 1,0);}g.setAttribute('uv',new THREE.Float32BufferAttribute(U2,2));
    g.setAttribute('ph',new THREE.Float32BufferAttribute(ph,1));g.setIndex(idx);return g;};
  const vs='attribute float ph;varying vec2 vUv;varying float vPh;void main(){vUv=uv;vPh=ph;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
  const foam=strips(.3,.035),shallow=strips(.62,.035);
  if(shallow){const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:RL.U.time},vertexShader:vs,
    fragmentShader:`uniform float uTime;varying vec2 vUv;varying float vPh;
      void main(){float u=vUv.x;float a=pow(1.0-smoothstep(.04,1.0,u),1.8)*(.5+.1*sin(uTime*.5+vPh*6.0));
        vec3 col=mix(vec3(.10,.50,.58),vec3(.22,.68,.70),.5+.5*sin(uTime*.35+vPh*5.0));gl_FragColor=vec4(col,a);}`});
    const mesh=new THREE.Mesh(shallow,m);mesh.renderOrder=1;mesh.userData.ownGeo=true;GL.board.add(mesh);}
  if(foam){const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:RL.U.time,uNoise:RL.U.noise},vertexShader:vs,
    fragmentShader:`uniform float uTime;uniform sampler2D uNoise;varying vec2 vUv;varying float vPh;
      void main(){float u=vUv.x,v=vUv.y;
        float n=texture2D(uNoise,vec2(v*2.2+vPh*7.0,u*1.1-uTime*.025)).r;
        float shore=smoothstep(.02,.14,u)*(1.0-smoothstep(.14,.42,u));
        float band=pow(.5+.5*sin(u*17.0-uTime*1.25+n*3.2+vPh*9.0),4.0)*smoothstep(.14,.3,u)*(1.0-smoothstep(.3,1.0,u));
        float a=shore*(.45+.85*n)+band*.6*n;a*=.78+.22*sin(uTime*.8+vPh*6.0);
        gl_FragColor=vec4(.94,.98,1.0,clamp(a,0.0,.88));}`});
    const mesh=new THREE.Mesh(foam,m);mesh.renderOrder=2;mesh.userData.ownGeo=true;GL.board.add(mesh);}
};
