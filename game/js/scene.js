'use strict';
/* =====================================================================
   3D TABLETOP (three.js)
   ===================================================================== */
const TOP=.18,SEA=.04;
const REDUCED=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const GL={ready:false,vMesh:{},eMesh:{},xMesh:{},kMesh:{},wMesh:{},mMesh:{},markers:[],tokenMats:{},tweens:[],dirty:true,tkey:'',boardKey:null,robHex:undefined,pirHex:undefined,userMoved:false,flash:null,ptrs:0,multi:false};
const lin=h=>new THREE.Color(h).convertSRGBToLinear();

function makeNoise(seed){const R=mulberry32(seed),N=256,g=new Float32Array(N*N);for(let i=0;i<N*N;i++)g[i]=R();
  return (x,y,px,py)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const x0=((xi%px)+px)%px,x1=(x0+1)%px,y0=((yi%py)+py)%py,y1=(y0+1)%py;
    const a=g[(y0&255)*N+(x0&255)],b=g[(y0&255)*N+(x1&255)],c=g[(y1&255)*N+(x0&255)],d=g[(y1&255)*N+(x1&255)];const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};}
function noiseCanvas(size,seed,cx,cy,colorFn,oct=5){
  const c=mk(size),x=c.getContext('2d'),im=x.createImageData(size,size),n=makeNoise(seed);
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){let s=0,a=.5,t=0,f=1;for(let o=0;o<oct;o++){s+=a*n(i/size*cx*f,j/size*cy*f,cx*f,cy*f);t+=a;a*=.5;f*=2;}
    const col=colorFn(clamp((s/t-.5)*2.3+.5),i,j);const k=(j*size+i)*4;im.data[k]=col[0];im.data[k+1]=col[1];im.data[k+2]=col[2];im.data[k+3]=255;}
  x.putImageData(im,0,0);return c;}
const mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
function tex(c,rep){const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,GL.aniso||4);if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);}return t;}

function paintTerrain(type,seed){
  const S=512,c=mk(S),x=c.getContext('2d'),R=mulberry32(seed);
  const base=(a,b,cells)=>x.drawImage(noiseCanvas(256,seed,cells,cells,v=>mix(a,b,v)),0,0,S,S);
  const dot=(px,py,r,f)=>{x.fillStyle=f;x.beginPath();x.arc(px,py,r,0,Math.PI*2);x.fill();};
  const blob=(px,py,r,col)=>{const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(px-r,py-r,2*r,2*r);};
  if(type==='forest'){base([18,40,16],[46,84,32],6);
    for(let i=0;i<1500;i++){const px=R()*S,py=R()*S,r=6+R()*12,k=R();dot(px+3,py+4,r,'rgba(6,14,6,.38)');dot(px,py,r,`rgb(${18+k*30|0},${42+k*54|0},${16+k*20|0})`);dot(px-r*.3,py-r*.35,r*.45,'rgba(160,210,110,.13)');}
  }else if(type==='pasture'||type==='village'){base([66,112,40],[120,168,66],5);
    for(let i=0;i<10;i++)blob(R()*S,R()*S,40+R()*60,'rgba(190,225,120,.16)');
    x.lineCap='round';for(let i=0;i<8000;i++){const px=R()*S,py=R()*S,k=R();x.strokeStyle=`rgba(${50+k*90|0},${100+k*90|0},${30+k*40|0},.5)`;x.lineWidth=1+R();x.beginPath();x.moveTo(px,py);x.lineTo(px+(R()-.5)*5,py-4-R()*6);x.stroke();}
    for(let i=0;i<180;i++)dot(R()*S,R()*S,1.2+R()*1.2,R()<.5?'#fff5d8':'#f3d24b');
    if(type==='village'){x.strokeStyle='rgba(150,120,80,.7)';x.lineWidth=10;x.beginPath();x.moveTo(60,S/2);x.bezierCurveTo(S*.3,S*.3,S*.6,S*.7,S-60,S/2);x.stroke();}
  }else if(type==='fields'){base([178,124,30],[220,172,60],5);
    const split=R()*Math.PI;
    const rows=(ang,tone)=>{x.save();x.translate(S/2,S/2);x.rotate(ang);for(let k=-S;k<S;k+=11){x.fillStyle=`rgba(${120+tone},${84+tone*.6|0},24,.30)`;x.fillRect(-S,k,2*S,4);x.fillStyle='rgba(255,238,170,.20)';x.fillRect(-S,k+6,2*S,2);}x.restore();};
    [0,1].forEach(side=>{x.save();x.translate(S/2,S/2);x.rotate(split);x.beginPath();x.rect(-S,side?0:-S,2*S,S);x.restore();x.save();x.clip();rows(split+(side?.25:Math.PI/2+.1)+(R()-.5)*.3,side*25);if(side){x.fillStyle='rgba(120,140,40,.12)';x.fillRect(0,0,S,S);}x.restore();});
    x.save();x.translate(S/2,S/2);x.rotate(split);x.strokeStyle='rgba(52,74,26,.85)';x.lineWidth=7;x.setLineDash([6,4]);x.beginPath();x.moveTo(-S,0);x.lineTo(S,0);x.stroke();x.restore();
    for(let i=0;i<5000;i++){x.fillStyle=`rgba(255,${226+R()*25|0},150,${.15+R()*.2})`;x.fillRect(R()*S,R()*S,1+R()*2,1);}
  }else if(type==='hills'){base([116,54,30],[170,92,52],6);
    for(let i=0;i<26;i++)blob(R()*S,R()*S,25+R()*45,'rgba(96,118,50,.42)');
    x.lineCap='round';for(let i=0;i<70;i++){x.strokeStyle=`rgba(70,28,12,${.18+R()*.2})`;x.lineWidth=2+R()*3;x.beginPath();const cx=R()*S,cy=R()*S,r=20+R()*40,a=R()*6;x.arc(cx,cy,r,a,a+1+R()*1.5);x.stroke();}
    for(let i=0;i<14;i++){const px=R()*S,py=R()*S,w=14+R()*16;x.fillStyle='rgba(84,34,16,.55)';x.beginPath();x.ellipse(px,py,w,w*.6,R()*3,0,7);x.fill();x.fillStyle='rgba(190,96,52,.9)';x.beginPath();x.ellipse(px-1,py-1,w*.75,w*.42,R()*3,0,7);x.fill();}
  }else if(type==='mountains'){base([62,60,58],[128,124,118],7);
    x.lineCap='round';for(let i=0;i<110;i++){x.strokeStyle=`rgba(28,26,24,${.25+R()*.3})`;x.lineWidth=1+R()*1.5;x.beginPath();let px=R()*S,py=R()*S;x.moveTo(px,py);for(let k=0;k<6;k++){px+=(R()-.5)*30;py+=R()*16;x.lineTo(px,py);}x.stroke();}
    for(let i=0;i<70;i++){x.strokeStyle='rgba(235,230,220,.22)';x.lineWidth=2;x.beginPath();const px=R()*S,py=R()*S;x.moveTo(px,py);x.lineTo(px+(R()-.5)*24,py+(R()-.5)*10);x.stroke();}
    for(let i=0;i<9;i++)blob(R()*S,R()*S,10+R()*22,'rgba(250,250,255,.45)');
  }else if(type==='desert'){base([200,150,84],[232,192,122],4);
    for(let i=0;i<28;i++){const y0=R()*S,f=.01+R()*.02,ph=R()*6,A=6+R()*14;x.lineWidth=3;
      x.strokeStyle='rgba(255,244,214,.45)';x.beginPath();for(let px=0;px<=S;px+=8)x.lineTo(px,y0+Math.sin(px*f+ph)*A);x.stroke();
      x.strokeStyle='rgba(150,108,60,.25)';x.beginPath();for(let px=0;px<=S;px+=8)x.lineTo(px,y0+4+Math.sin(px*f+ph)*A);x.stroke();}
    for(let i=0;i<140;i++)dot(R()*S,R()*S,1+R()*2,'rgba(118,92,66,.5)');
  }else if(type==='gold'){base([150,110,40],[210,168,70],5);
    for(let i=0;i<20;i++)blob(R()*S,R()*S,20+R()*40,'rgba(255,220,120,.35)');
    x.strokeStyle='rgba(90,60,20,.4)';x.lineWidth=3;for(let i=0;i<30;i++){x.beginPath();const px=R()*S,py=R()*S;x.moveTo(px,py);x.quadraticCurveTo(px+(R()-.5)*60,py+(R()-.5)*60,px+(R()-.5)*90,py+(R()-.5)*90);x.stroke();}
    for(let i=0;i<500;i++){const px=R()*S,py=R()*S,r=1+R()*3;dot(px,py,r,`rgba(255,${210+R()*45|0},${80+R()*80|0},${.6+R()*.4})`);if(R()<.15){x.strokeStyle='rgba(255,255,230,.8)';x.lineWidth=1;x.beginPath();x.moveTo(px-5,py);x.lineTo(px+5,py);x.moveTo(px,py-5);x.lineTo(px,py+5);x.stroke();}}
  }else if(type==='lake'){x.drawImage(paintOcean(),0,0,S,S);for(let i=0;i<14;i++)blob(R()*S,R()*S,30+R()*50,'rgba(120,200,220,.25)');
    x.lineWidth=26;x.strokeStyle='rgba(120,150,70,.9)';x.beginPath();x.arc(S/2,S/2,S*.5,0,7);x.stroke();
  }else if(type==='swamp'){base([52,66,38],[96,104,58],6);for(let i=0;i<22;i++)blob(R()*S,R()*S,20+R()*40,'rgba(40,80,90,.55)');
    x.lineCap='round';for(let i=0;i<900;i++){const px=R()*S,py=R()*S;x.strokeStyle=`rgba(${120+R()*60|0},${130+R()*50|0},70,.6)`;x.lineWidth=1.5;x.beginPath();x.moveTo(px,py);x.lineTo(px+(R()-.5)*4,py-6-R()*8);x.stroke();}
  }else if(type==='oasis'){base([206,166,100],[236,206,146],4);const g=x.createRadialGradient(S/2,S/2,10,S/2,S/2,S*.32);g.addColorStop(0,'#2f7da0');g.addColorStop(.7,'#3f8f7a');g.addColorStop(1,'rgba(90,140,60,0)');x.fillStyle=g;x.fillRect(0,0,S,S);
  }else if(type==='castle'){base([96,92,86],[150,146,138],8);x.strokeStyle='rgba(40,38,34,.45)';x.lineWidth=2;for(let yy=0;yy<S;yy+=24){x.beginPath();x.moveTo(0,yy);x.lineTo(S,yy);x.stroke();for(let xx=(yy/24%2)*24;xx<S;xx+=48){x.beginPath();x.moveTo(xx,yy);x.lineTo(xx,yy+24);x.stroke();}}
  }else if(type==='fog'){base([150,156,162],[222,226,230],4);
    for(let i=0;i<40;i++)blob(R()*S,R()*S,30+R()*70,'rgba(255,255,255,.35)');
    for(let i=0;i<20;i++)blob(R()*S,R()*S,20+R()*50,'rgba(110,118,128,.25)');
  }
  return c;
}
function paintOcean(){const S=512,c=mk(S),x=c.getContext('2d');
  x.drawImage(noiseCanvas(256,77,4,4,v=>mix([18,62,98],[34,94,134],v)),0,0,S,S);
  x.lineCap='round';const R=mulberry32(9);
  for(let i=0;i<620;i++){const px=R()*S,py=R()*S,r=5+R()*10,a=.08+R()*.08;x.strokeStyle=`rgba(225,242,255,${a})`;x.lineWidth=1.2+R();
    for(const ox of [-S,0,S])for(const oy of [-S,0,S]){x.beginPath();x.arc(px+ox,py+oy,r,Math.PI*1.15,Math.PI*1.85);x.stroke();}}
  return c;}
function paintWood(size,seed,dark,light,cells){return noiseCanvas(size,seed,cells[0],cells[1],v=>{const ring=.5+.5*Math.sin(v*34);return mix(dark,light,clamp(ring*.75+v*.25));},4);}
function discCanvas(draw,bg){const S=256,c=mk(S),x=c.getContext('2d');
  const g=x.createRadialGradient(S*.42,S*.38,S*.05,S/2,S/2,S*.52);g.addColorStop(0,bg?bg[0]:'#f8eed6');g.addColorStop(.78,bg?bg[1]:'#e9d8b0');g.addColorStop(1,bg?bg[2]:'#c7b084');x.fillStyle=g;x.fillRect(0,0,S,S);
  for(let i=0;i<1600;i++){x.fillStyle=`rgba(120,90,50,${Math.random()*.07})`;x.fillRect(Math.random()*S,Math.random()*S,1+Math.random()*2,1);}
  x.strokeStyle='rgba(110,80,40,.5)';x.lineWidth=5;x.beginPath();x.arc(S/2,S/2,S*.44,0,7);x.stroke();
  x.textAlign='center';x.textBaseline='middle';draw(x,S);return c;}
function tokenCanvas(n,small){return discCanvas((x,S)=>{const red=n===6||n===8;x.fillStyle=red?'#a5221a':'#2b2118';
  x.font=`bold ${n>=10?118:138}px "IM Fell English SC", Georgia, serif`;x.fillText(String(n),S/2,S*.44);
  const pips=6-Math.abs(7-n);for(let i=0;i<pips;i++){x.beginPath();x.arc(S/2+(i-(pips-1)/2)*21,S*.78,8,0,7);x.fill();}});}
function harborCanvas(t){return discCanvas((x,S)=>{x.fillStyle='#2b2118';
  if(t==='any'){x.font='92px "IM Fell English SC", Georgia, serif';x.fillText('3:1',S/2,S*.47);x.font='bold 30px Georgia, serif';x.fillText('ANY',S/2,S*.73);}
  else{x.save();x.translate(S*.31,S*.12);drawIcon(x,t,RCOL[t][0],'#2b2017');x.restore();x.font='78px "IM Fell English SC", Georgia, serif';x.fillText('2:1',S/2,S*.78);}},['#f4e7c7','#e2cfa2','#cdb68a']);}
function giftCanvas(g){return discCanvas((x,S)=>{x.fillStyle='#3a2410';
  if(g.k==='vp'){x.font='bold 120px "IM Fell English SC", Georgia, serif';x.fillText('1',S/2,S*.44);x.font='bold 34px Georgia, serif';x.fillText('POINT',S/2,S*.76);}
  else if(g.k==='dev'){x.font='bold 46px Georgia, serif';x.fillText('DEV',S/2,S*.4);x.fillText('CARD',S/2,S*.62);}
  else{x.font='bold 70px "IM Fell English SC", Georgia, serif';x.fillText(g.t==='any'?'3:1':'2:1',S/2,S*.42);x.font='bold 30px Georgia, serif';x.fillText(g.t==='any'?'HARBOR':RNAME[g.t].toUpperCase(),S/2,S*.7);}},
  ['#ffe9a6','#e8c463','#b98d2c']);}

const GEO={},MAT={},MATC={},TERR_MAT={},TEXCACHE={};
function extrudeProfile(pts,depth,bev=.012){const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>s.lineTo(p[0],p[1]));s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:bev>0,bevelThickness:bev,bevelSize:bev,bevelSegments:2});g.translate(0,0,-depth/2);return g;}
function pieceMat(hex){return MATC[hex]||(MATC[hex]=new THREE.MeshPhysicalMaterial({color:lin(hex),map:MAT.grain,roughness:.46,metalness:0,clearcoat:.45,clearcoatRoughness:.3}));}
function cachedTex(key,fn){return TEXCACHE[key]||(TEXCACHE[key]=tex(fn()));}

/* TV quality: 0 = phone/desktop, 1 = TV (resolution capped), 2 = TV with ?lowq=1 (no shadows, no smoothing, slower ambient frames) */
const TVQ=PAD.role==='tv'?(new URLSearchParams(location.search).has('lowq')?2:1):0;
function initGL(){
  const canvas=$('#gl');let r;
  try{r=GL.r=new THREE.WebGLRenderer({canvas,antialias:TVQ!==2,powerPreference:'high-performance'});}catch(e){$('#nogl').hidden=false;return false;}
  if(!r.getContext()){$('#nogl').hidden=false;return false;}
  r.setPixelRatio(TVQ===2?1:Math.min(window.devicePixelRatio||1,TVQ===1?1.5:2));
  r.shadowMap.enabled=TVQ!==2;r.shadowMap.type=THREE.PCFSoftShadowMap;r.shadowMap.autoUpdate=false;
  GL.windU={value:0};GL.anim=animPref();document.documentElement.classList.toggle('calm',!GL.anim);
  {const c=mk(64),x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,30);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.45,'rgba(255,255,255,.85)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);MAT.flake=new THREE.CanvasTexture(c);}
  r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.0;
  GL.aniso=r.capabilities.getMaxAnisotropy();
  const sc=GL.scene=new THREE.Scene();sc.background=new THREE.Color(0x120c08);sc.fog=new THREE.Fog(0x120c08,30,80);
  GL.cam=new THREE.PerspectiveCamera(36,1,.1,200);
  const ctl=GL.ctl=new THREE.OrbitControls(GL.cam,canvas);
  ctl.enableDamping=true;ctl.dampingFactor=.12;ctl.minDistance=3.5;ctl.maxDistance=60;ctl.maxPolarAngle=1.22;ctl.rotateSpeed=.55;ctl.zoomSpeed=.9;ctl.panSpeed=.7;
  ctl.addEventListener('change',()=>{GL.dirty=true;});ctl.addEventListener('start',()=>{GL.userMoved=true;});
  GL.hemi=new THREE.HemisphereLight(0xfff0d8,0x2c1d12,.4);sc.add(GL.hemi);
  const sun=GL.sun=new THREE.DirectionalLight(0xffe0b4,1.9);sun.position.set(-5.5,12,6.5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  sun.shadow.bias=-.0005;sun.shadow.normalBias=.02;sc.add(sun);sc.add(sun.target);
  const fill=new THREE.DirectionalLight(0xa8c0ff,.32);fill.position.set(7,6,-7);sc.add(fill);GL.fill=fill;

  MAT.grain=tex(noiseCanvas(128,5,2,16,v=>{const k=228+27*(.5+.5*Math.sin(v*30));return [k,k*.97,k*.93];},3),3);
  MAT.side=new THREE.MeshStandardMaterial({color:lin('#4d3a27'),roughness:.95});
  MAT.tokenSide=new THREE.MeshStandardMaterial({color:lin('#d8c69c'),roughness:.8});
  MAT.wood=new THREE.MeshStandardMaterial({color:lin('#8a6440'),map:MAT.grain,roughness:.7});
  MAT.sail=new THREE.MeshStandardMaterial({color:lin('#efe6d2'),roughness:.9,side:THREE.DoubleSide});
  MAT.blackSail=new THREE.MeshStandardMaterial({color:lin('#26221f'),roughness:.9,side:THREE.DoubleSide});
  MAT.pirateHull=new THREE.MeshStandardMaterial({color:lin('#2b2420'),map:MAT.grain,roughness:.6});
  MAT.goldNug=new THREE.MeshStandardMaterial({color:lin('#f2c440'),metalness:.85,roughness:.28});
  ['forest','hills','pasture','fields','mountains','desert','gold','fog','village','lake','swamp','oasis','castle'].forEach((t,i)=>{const tx=tex(paintTerrain(t,101+i*17));TERR_MAT[t]=new THREE.MeshStandardMaterial({map:tx,bumpMap:tx,bumpScale:.03,roughness:t==='gold'?.6:.93,metalness:t==='gold'?.15:0});});
  GEO.tile=new THREE.CylinderGeometry(.955,.975,TOP,6,1);GEO.tile.translate(0,TOP/2,0);
  GEO.fogTile=new THREE.CylinderGeometry(.955,.975,TOP+.06,6,1);GEO.fogTile.translate(0,(TOP+.06)/2,0);
  GEO.token=new THREE.CylinderGeometry(.3,.3,.045,40);GEO.tokenTop=new THREE.CircleGeometry(.295,48);
  GEO.sToken=new THREE.CylinderGeometry(.22,.22,.045,36);GEO.sTokenTop=new THREE.CircleGeometry(.215,40);
  GEO.hToken=new THREE.CylinderGeometry(.27,.27,.05,40);GEO.hTokenTop=new THREE.CircleGeometry(.265,48);
  GEO.settle=extrudeProfile([[-.12,0],[.12,0],[.12,.13],[0,.235],[-.12,.13]],.2);
  GEO.city=extrudeProfile([[-.2,0],[.2,0],[.2,.15],[.02,.15],[.02,.25],[-.09,.35],[-.2,.25]],.2);
  GEO.road=new THREE.BoxGeometry(.6,.075,.095);
  GEO.hull=extrudeProfile([[-.26,.05],[.26,.05],[.2,-.03],[-.2,-.03]],.14,.015);
  GEO.mast=new THREE.CylinderGeometry(.012,.012,.36,6);
  const sail=new THREE.Shape();sail.moveTo(0,0);sail.lineTo(.2,0);sail.lineTo(0,.28);sail.closePath();GEO.sail=new THREE.ShapeGeometry(sail);
  GEO.mV=new THREE.SphereGeometry(.085,20,14);GEO.mE=new THREE.BoxGeometry(.56,.07,.12);GEO.mH=new THREE.RingGeometry(.34,.44,48);
  GEO.plank=new THREE.BoxGeometry(1,.025,.075);GEO.post=new THREE.CylinderGeometry(.018,.018,.16,8);
  GEO.camelBody=new THREE.SphereGeometry(.06,12,8);GEO.camelHead=new THREE.BoxGeometry(.03,.09,.03);GEO.barbFig=new THREE.ConeGeometry(.045,.13,10);GEO.barbHead=new THREE.SphereGeometry(.03,10,8);
  GEO.conq=new THREE.CircleGeometry(.9,6);GEO.bridge=new THREE.BoxGeometry(.66,.05,.13);GEO.riverSeg=new THREE.BoxGeometry(1,.012,.17);
  MAT.camel=new THREE.MeshStandardMaterial({color:lin('#b07f45'),roughness:.9});MAT.bronze=new THREE.MeshStandardMaterial({color:lin('#8c5a2b'),metalness:.6,roughness:.4});
  MAT.conq=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.42,depthWrite:false});MAT.river=new THREE.MeshStandardMaterial({color:lin('#2f7fb0'),roughness:.25,metalness:.1});
  GEO.hut=extrudeProfile([[-.06,0],[.06,0],[.06,.06],[0,.11],[-.06,.06]],.08,0);
  GEO.kDisc=new THREE.CylinderGeometry(.11,.115,.04,28);GEO.kRing=new THREE.RingGeometry(.075,.092,28);
  GEO.helmet=new THREE.SphereGeometry(.072,18,10,0,Math.PI*2,0,Math.PI/2);GEO.plume=new THREE.ConeGeometry(.025,.09,8);
  GEO.wall=new THREE.TorusGeometry(.25,.032,6,28);GEO.tower=new THREE.CylinderGeometry(.05,.06,.34,10);GEO.towerRoof=new THREE.ConeGeometry(.075,.12,10);
  GEO.mBody=new THREE.ConeGeometry(.07,.2,14);GEO.mHead=new THREE.SphereGeometry(.045,14,10);GEO.trackDot=new THREE.CylinderGeometry(.12,.12,.02,20);
  MAT.kRing=new THREE.MeshStandardMaterial({color:lin('#f3ead6'),roughness:.6,side:THREE.DoubleSide});
  MAT.helmet=new THREE.MeshStandardMaterial({color:lin('#c9ccd2'),metalness:.85,roughness:.3});
  MAT.stone=new THREE.MeshStandardMaterial({color:lin('#8f8a82'),roughness:.9,flatShading:true});
  MAT.barbHull=new THREE.MeshStandardMaterial({color:lin('#3b1d16'),map:MAT.grain,roughness:.6});
  MAT.barbSail=new THREE.MeshStandardMaterial({color:lin('#8e2a1d'),roughness:.9,side:THREE.DoubleSide});
  MAT.track=new THREE.MeshStandardMaterial({color:lin('#c9b48a'),roughness:.7});MAT.trackOn=new THREE.MeshStandardMaterial({color:lin('#b8402e'),roughness:.6});

  const tbl=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.MeshStandardMaterial({map:tex(paintWood(256,3,[34,21,13],[74,48,30],[3,40]),20),roughness:.7}));
  tbl.rotation.x=-Math.PI/2;tbl.position.y=-.1;tbl.receiveShadow=true;sc.add(tbl);GL.tbl=tbl;
  MAT.ocean=new THREE.MeshStandardMaterial({map:tex(paintOcean(),4),roughness:.32,metalness:.05});
  const ft=tex(paintWood(256,8,[88,56,32],[150,104,60],[2,24]));ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(.18,.18);
  MAT.frame=new THREE.MeshStandardMaterial({map:ft,roughness:.55});
  RL.init();

  GL.tableG=new THREE.Group();GL.board=new THREE.Group();GL.pieces=new THREE.Group();GL.markG=new THREE.Group();sc.add(GL.tableG,GL.board,GL.pieces,GL.markG);
  const prof=[[0,0],[.12,0],[.126,.02],[.1,.046],[.075,.07],[.066,.17],[.094,.214],[.097,.236],[.07,.262],[.058,.292],[.084,.33],[.088,.37],[.07,.41],[.036,.437],[0,.444]].map(p=>new THREE.Vector2(p[0],p[1]));
  GL.robber=new THREE.Mesh(new THREE.LatheGeometry(prof,28),new THREE.MeshStandardMaterial({color:lin('#2b2723'),roughness:.42,metalness:.18}));
  GL.robber.castShadow=true;sc.add(GL.robber);
  GL.pirate=makeShip(MAT.pirateHull,MAT.blackSail,1.5);sc.add(GL.pirate);
  GL.barbG=new THREE.Group();sc.add(GL.barbG);GL.barbShip=makeShip(MAT.barbHull,MAT.barbSail,2.4);GL.barbShip.visible=false;sc.add(GL.barbShip);

  const ro=new ResizeObserver(resizeGL);ro.observe($('#stage'));
  canvas.addEventListener('pointerdown',e=>{GL.ptrs++;if(GL.ptrs>1)GL.multi=true;GL.down={x:e.clientX,y:e.clientY,t:performance.now()};});
  const up=e=>{GL.ptrs=Math.max(0,GL.ptrs-1);const d=GL.down,multi=GL.multi;if(GL.ptrs===0)GL.multi=false;
    if(e.type!=='pointerup'||!d||multi)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>10||performance.now()-d.t>650)return;tapAt(e.clientX,e.clientY);};
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  GL.ready=true;resizeGL();requestAnimationFrame(loop);
  return true;
}
function makeShip(hullMat,sailMat,scale=1){
  const g=new THREE.Group();
  const h=new THREE.Mesh(GEO.hull,hullMat);h.position.y=.03;h.castShadow=true;h.receiveShadow=true;g.add(h);
  const m=new THREE.Mesh(GEO.mast,MAT.wood);m.position.set(.02,.24,0);m.castShadow=true;g.add(m);
  const s=new THREE.Mesh(GEO.sail,sailMat);s.position.set(.03,.1,0);s.castShadow=true;g.add(s);
  const s2=new THREE.Mesh(GEO.sail,sailMat);s2.scale.set(-.7,.8,1);s2.position.set(.01,.12,0);g.add(s2);
  g.scale.setScalar(scale);return g;
}
function resizeGL(){if(!GL.r)return;const el=$('#stage');const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;
  GL.r.setSize(w,h,false);GL.cam.aspect=w/h;GL.cam.updateProjectionMatrix();if(!GL.userMoved)fitCamera();GL.dirty=true;}
function fitCamera(){
  if(!T)return;const cam=GL.cam,v=cam.fov*Math.PI/180,hf=2*Math.atan(Math.tan(v/2)*cam.aspect),pol=.58;
  const classic=SC().classic;const rot=!classic&&cam.aspect<.95&&T.bx>T.bz*1.15;GL.viewRot=rot?Math.PI/2:0;
  const RX=classic?4.7:(rot?T.bz:T.bx)+.25,RZ=classic?5.3:(rot?T.bx:T.bz)+.7;
  const d=Math.max(RX/Math.tan(hf/2)+RX*.15,(RZ*Math.cos(pol))/Math.tan(v/2)+RZ*Math.sin(pol));
  if(rot){GL.ctl.target.set(.3,0,0);cam.position.set(.3+d*Math.sin(pol),d*Math.cos(pol),0);}
  else{GL.ctl.target.set(0,0,.3);cam.position.set(0,d*Math.cos(pol),.3+d*Math.sin(pol));}
  cam.lookAt(GL.ctl.target);GL.ctl.update();applyDecalRot();GL.dirty=true;
}
function applyDecalRot(){if(!GL.board)return;GL.board.traverse(o=>{if(o.userData.decal)o.rotation.z=GL.viewRot||0;});}
function tapAt(cx,cy){
  const rect=GL.r.domElement.getBoundingClientRect();
  const ndc=new THREE.Vector2(((cx-rect.left)/rect.width)*2-1,-((cy-rect.top)/rect.height)*2+1);
  const rc=new THREE.Raycaster();rc.setFromCamera(ndc,GL.cam);
  const hit=new THREE.Vector3();if(!rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-TOP),hit))return;
  boardTap(hit.x,hit.z);
}
function tween(dur,fn,done){GL.tweens.push({t0:performance.now(),dur:REDUCED?1:dur,fn,done});GL.dirty=true;}
const easeOut=k=>1-Math.pow(1-k,3);
function bounce(k){const n=7.5625,d=2.75;if(k<1/d)return n*k*k;if(k<2/d)return n*(k-=1.5/d)*k+.75;if(k<2.5/d)return n*(k-=2.25/d)*k+.9375;return n*(k-=2.625/d)*k+.984375;}
function loop(now){
  requestAnimationFrame(loop);if(!GL.ready)return;
  const moved=GL.ctl.update();
  if(GL.tweens.length){GL.tweens=GL.tweens.filter(tw=>{const k=clamp((now-tw.t0)/tw.dur);tw.fn(k);if(k>=1){tw.done&&tw.done();return false;}return true;});GL.dirty=true;}
  if(GL.markers.length){const s=1+.16*Math.sin(now/170);GL.markers.forEach(m=>m.scale.setScalar(s));GL.dirty=true;}
  if(GL.flash){const f=GL.flash,k=(now-f.t0)/1900;
    if(k>=1){f.ids.forEach(i=>GL.tokenMats[i]&&(GL.tokenMats[i].emissiveIntensity=0));GL.flash=null;}
    else f.ids.forEach(i=>GL.tokenMats[i]&&(GL.tokenMats[i].emissiveIntensity=.55*Math.abs(Math.sin(k*Math.PI*3))));GL.dirty=true;}
  if(GL.dirty||moved){if(GL.anim)ambient(now);GL.r.shadowMap.needsUpdate=true;GL.r.render(GL.scene,GL.cam);GL.dirty=false;GL.lastFrame=now;}
  else if(GL.anim&&now-(GL.lastFrame||0)>(TVQ===2?66:33)){ambient(now);GL.r.render(GL.scene,GL.cam);GL.lastFrame=now;}
}
function disposeGroup(g){while(g.children.length){const c=g.children.pop();if(c.isInstancedMesh&&c.dispose)c.dispose();if(c.userData.ownMat)c.material.dispose();if(c.userData.ownGeo)c.geometry.dispose();}}
function scatter(R,c,n,minD,rMin=.47,rMax=.73){
  const pts=[];for(let t=0;t<600&&pts.length<n;t++){const a=R()*Math.PI*2,r=Math.sqrt(rMin*rMin+R()*(rMax*rMax-rMin*rMin));const x=Math.cos(a)*r,y=Math.sin(a)*r;
    if(Math.hypot(x-ROB.x,y-ROB.y)<.2)continue;if(pts.some(p=>Math.hypot(p.x-x,p.y-y)<minD))continue;pts.push({x,y});}
  return pts.map(p=>({x:c.x+p.x,y:c.y+p.y}));
}
function animPref(){try{const v=localStorage.getItem('tidehaven.anim');if(v!=null)return v==='1';}catch(e){}return !REDUCED;}
function windify(mat,base){
  mat.onBeforeCompile=sh=>{sh.uniforms.uTime=GL.windU;sh.uniforms.uBase={value:base};
    sh.vertexShader='uniform float uTime;\nuniform float uBase;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    #ifdef USE_INSTANCING
      vec2 ip=vec2(instanceMatrix[3][0],instanceMatrix[3][2]);
    #else
      vec2 ip=vec2(0.0);
    #endif
    float hh=max(position.y+uBase,0.0);
    float gust=sin(uTime*1.7+ip.x*1.9+ip.y*1.3)*.65+sin(uTime*3.3+ip.x*3.7-ip.y*2.1)*.25+sin(uTime*.6+ip.y*.8)*.35;
    transformed.x+=gust*hh*hh*.26;transformed.z+=gust*hh*hh*.12;`);};
  mat.customProgramCacheKey=()=>'wind'+base;
}
function buildSnow(R){
  const mts=G.board.hexes.map((h,i)=>i).filter(i=>G.board.hexes[i].t==='mountains');if(!mts.length)return;
  const per=70,n=mts.length*per,pos=new Float32Array(n*3),d=[];
  mts.forEach((h,j)=>{const c=T.hexes[h].c;for(let k=0;k<per;k++){const a=R()*6.283,r=Math.sqrt(R())*.78;
    const o={cx:c.x,cz:c.y,ox:Math.cos(a)*r,oz:Math.sin(a)*r,y:TOP+.05+R()*.8,spd:.1+R()*.12,ph:R()*6.283,amp:.02+R()*.04};d.push(o);const i=(j*per+k)*3;pos[i]=c.x+o.ox;pos[i+1]=o.y;pos[i+2]=c.y+o.oz;}});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
  const mat=new THREE.PointsMaterial({size:.085,map:MAT.flake,transparent:true,depthWrite:false,color:0xffffff,opacity:1,sizeAttenuation:true});
  const pts=new THREE.Points(geo,mat);pts.userData.ownGeo=true;pts.userData.ownMat=true;pts.renderOrder=4;pts.frustumCulled=false;GL.board.add(pts);
  GL.snow={pts,d,R};
}
let _M,_Q,_S,_V,_Y;
function ambient(now){
  if(!_M){_M=new THREE.Matrix4();_Q=new THREE.Quaternion();_S=new THREE.Vector3();_V=new THREE.Vector3();_Y=new THREE.Vector3(0,1,0);}
  const t=now/1000,dt=Math.min(.05,Math.max(0,(now-(GL.ambT||now))/1000));GL.ambT=now;GL.windU.value=t;RL.tick(now);
  if(GL.sheepBody&&GL.sheepHead&&GL.sheepData.length){
    GL.sheepData.forEach((q,i)=>{
      const u=q.ph+q.dir*(.22*t+.73*Math.sin(.3*t+q.ph)),walk=.5+.5*Math.cos(.3*t+q.ph);
      const x=q.hx+Math.cos(u)*q.rad,z=q.hz+Math.sin(u)*q.rad*.7;
      const yaw=Math.atan2(-Math.cos(u)*.7*q.dir,-Math.sin(u)*q.dir),graze=Math.max(0,1-walk*1.6),s=q.s;
      const bob=Math.abs(Math.sin(t*7+q.ph))*.006*walk;
      _Q.setFromAxisAngle(_Y,yaw);_S.set(s*1.35,s,s);_V.set(x,TOP+.065+bob,z);_M.compose(_V,_Q,_S);GL.sheepBody.setMatrixAt(i,_M);
      _S.set(s,s,s);_V.set(x+Math.cos(yaw)*.08*s,TOP+.08-graze*.035+bob,z-Math.sin(yaw)*.08*s);_M.compose(_V,_Q,_S);GL.sheepHead.setMatrixAt(i,_M);});
    GL.sheepBody.instanceMatrix.needsUpdate=true;GL.sheepHead.instanceMatrix.needsUpdate=true;}
  if(GL.snow){const a=GL.snow.pts.geometry.attributes.position,p=a.array,R=GL.snow.R;
    GL.snow.d.forEach((o,k)=>{o.y-=o.spd*dt;if(o.y<TOP+.03){o.y=TOP+.7+R()*.2;const an=R()*6.283,r=Math.sqrt(R())*.78;o.ox=Math.cos(an)*r;o.oz=Math.sin(an)*r;}
      const i=k*3;p[i]=o.cx+o.ox+Math.sin(t*1.3+o.ph)*o.amp;p[i+1]=o.y;p[i+2]=o.cz+o.oz+Math.cos(t*.9+o.ph)*o.amp*.6;});
    a.needsUpdate=true;}
}
function buildTable(){
  disposeGroup(GL.tableG);
  if(SC().classic){
    const ocean=new THREE.Mesh(new THREE.CylinderGeometry(5.84,5.84,.12,6,1),[new THREE.MeshStandardMaterial({color:lin('#1d3d55')}),MAT.ocean,MAT.side]);
    ocean.rotation.y=Math.PI/6;ocean.position.y=SEA-.06;ocean.receiveShadow=true;ocean.userData.ownGeo=true;GL.tableG.add(ocean);
    const hexShape=(R)=>{const s=new THREE.Shape();for(let k=0;k<6;k++){const a=k*Math.PI/3;const p=[Math.cos(a)*R,Math.sin(a)*R];k?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]);}s.closePath();return s;};
    const fs=hexShape(6.32);const hole=new THREE.Path();for(let k=0;k<6;k++){const a=k*Math.PI/3;const p=[Math.cos(a)*5.84,Math.sin(a)*5.84];k?hole.lineTo(p[0],p[1]):hole.moveTo(p[0],p[1]);}hole.closePath();fs.holes.push(hole);
    const fg=new THREE.ExtrudeGeometry(fs,{depth:.22,bevelEnabled:true,bevelThickness:.03,bevelSize:.03,bevelSegments:3});fg.rotateX(-Math.PI/2);
    const frame=new THREE.Mesh(fg,MAT.frame);frame.position.y=-.1;frame.castShadow=true;frame.receiveShadow=true;frame.userData.ownGeo=true;GL.tableG.add(frame);
    setShadowBox(8.5);
  }else{
    const W=T.bx+.75,D=T.bz+.75;
    const om=MAT.ocean.clone();om.map=MAT.ocean.map.clone();om.map.needsUpdate=true;om.map.repeat.set(W/3,D/3);RL.waters=[MAT.ocean];RL.water(om);
    const ocean=new THREE.Mesh(new THREE.BoxGeometry(2*W,.12,2*D),[MAT.side,MAT.side,om,MAT.side,MAT.side,MAT.side]);
    ocean.position.y=SEA-.06;ocean.receiveShadow=true;ocean.userData.ownGeo=true;GL.tableG.add(ocean);
    const s=new THREE.Shape();const o=.42;s.moveTo(-W-o,-D-o);s.lineTo(W+o,-D-o);s.lineTo(W+o,D+o);s.lineTo(-W-o,D+o);s.closePath();
    const h=new THREE.Path();h.moveTo(-W,-D);h.lineTo(W,-D);h.lineTo(W,D);h.lineTo(-W,D);h.closePath();s.holes.push(h);
    const fg=new THREE.ExtrudeGeometry(s,{depth:.22,bevelEnabled:true,bevelThickness:.03,bevelSize:.03,bevelSegments:3});fg.rotateX(-Math.PI/2);
    const frame=new THREE.Mesh(fg,MAT.frame);frame.position.y=-.1;frame.castShadow=true;frame.receiveShadow=true;frame.userData.ownGeo=true;GL.tableG.add(frame);
    setShadowBox(Math.max(W,D)+1.5);
  }
}
function setShadowBox(R){const c=GL.sun.shadow.camera;Object.assign(c,{left:-R,right:R,top:R,bottom:-R,near:1,far:40+R*2});c.updateProjectionMatrix();
  if(typeof RL!=='undefined'&&RL.ready)RL.apply(RL.t,false);else{GL.sun.position.set(-5.5,12,6.5);GL.sun.target.position.set(0,0,0);}}
function seaSideDir(e){
  const E=T.edges[e];const land=E.hexes.find(h=>!isSeaHex(h));const sea=E.hexes.find(h=>isSeaHex(h));
  if(land!=null&&sea!=null){const a=T.hexes[land].c,b=T.hexes[sea].c;let dx=b.x-a.x,dy=b.y-a.y;const L=Math.hypot(dx,dy);return {x:dx/L,y:dy/L};}
  const c=T.hexes[E.hexes[0]].c;let dx=E.x-c.x,dy=E.y-c.y;const L=Math.hypot(dx,dy)||1;return {x:dx/L,y:dy/L};
}
function buildBoard(){
  syncTopo();disposeGroup(GL.board);GL.tokenMats={};buildTable();GL.sheepData=[];GL.sheepBody=null;GL.sheepHead=null;GL.snow=null;
  const R=mulberry32(hashStr(G.board.id));
  G.board.hexes.forEach((H,i)=>{const c=T.hexes[i].c;
    if(H.t==='sea')return;
    const mat=TERR_MAT[H.t];if(!mat)return;
    const m=new THREE.Mesh(H.t==='fog'?GEO.fogTile:GEO.tile,[MAT.side,mat,MAT.side]);
    m.position.set(c.x,0,c.y);m.rotation.y=Math.floor(R()*6)*Math.PI/3;m.castShadow=true;m.receiveShadow=true;GL.board.add(m);});
  RL.buildCoast();
  const addToken=(i,n,ox,oy,small)=>{const c=T.hexes[i].c;
    const b=new THREE.Mesh(small?GEO.sToken:GEO.token,MAT.tokenSide);b.position.set(c.x+ox,TOP+.0225,c.y+oy);b.castShadow=true;b.receiveShadow=true;GL.board.add(b);
    const mat=new THREE.MeshPhysicalMaterial({map:cachedTex('n'+n,()=>tokenCanvas(n)),roughness:.6,clearcoat:.55,clearcoatRoughness:.35,emissive:new THREE.Color(0xffb84a),emissiveIntensity:0});
    const t=new THREE.Mesh(small?GEO.sTokenTop:GEO.tokenTop,mat);t.rotation.x=-Math.PI/2;t.position.set(c.x+ox,TOP+.0458,c.y+oy);t.receiveShadow=true;t.userData.ownMat=true;t.userData.decal=true;GL.board.add(t);return mat;};
  G.board.hexes.forEach((H,i)=>{if(H.n&&H.t!=='village')GL.tokenMats[i]=addToken(i,H.n,0,0,false);});
  if(G.board.villages){const seen={};G.board.villages.forEach(v=>{const k=seen[v.h]=(seen[v.h]||0)+1;const mat=addToken(v.h,v.n,k===1?-.26:.26,.12,true);(GL.tokenMats['v'+v.h+'_'+v.n]=mat);});}
  // harbors with docks
  G.board.harbors.forEach(hb=>{const e=T.edges[hb.e];const d=seaSideDir(hb.e);
    const tp={x:e.x+d.x*.76,y:e.y+d.y*.76};
    const b=new THREE.Mesh(GEO.hToken,MAT.tokenSide);b.position.set(tp.x,SEA+.025,tp.y);b.castShadow=true;GL.board.add(b);
    const t=new THREE.Mesh(GEO.hTokenTop,new THREE.MeshStandardMaterial({map:cachedTex('h'+hb.t,()=>harborCanvas(hb.t)),roughness:.8}));t.rotation.x=-Math.PI/2;t.position.set(tp.x,SEA+.0505,tp.y);t.userData.ownMat=true;t.userData.decal=true;GL.board.add(t);
    [e.a,e.b].forEach(vi=>{const v=T.verts[vi];const s={x:v.x+d.x*.02,y:v.y+d.y*.02};let dx=tp.x-s.x,dy=tp.y-s.y;const D=Math.hypot(dx,dy);dx/=D;dy/=D;const en={x:tp.x-dx*.24,y:tp.y-dy*.24};
      const len=Math.hypot(en.x-s.x,en.y-s.y);const pl=new THREE.Mesh(GEO.plank,MAT.wood);pl.scale.x=len;pl.position.set((s.x+en.x)/2,.105,(s.y+en.y)/2);pl.rotation.y=-Math.atan2(dy,dx);pl.castShadow=true;pl.receiveShadow=true;GL.board.add(pl);
      const po=new THREE.Mesh(GEO.post,MAT.wood);po.position.set(en.x,.04,en.y);po.castShadow=true;GL.board.add(po);});
  });
  // frontier & raiders statics
  const lake=G.board.hexes.findIndex(h=>h.t==='lake');
  if(lake>=0){const c=T.hexes[lake].c;const b=new THREE.Mesh(GEO.token,MAT.tokenSide);b.position.set(c.x,TOP+.0225,c.y);GL.board.add(b);
    const t=new THREE.Mesh(GEO.tokenTop,new THREE.MeshStandardMaterial({map:cachedTex('lake',()=>discCanvas((x,S)=>{x.fillStyle='#2b2118';x.font='bold 64px Georgia, serif';x.fillText('2 · 3',S/2,S*.38);x.fillText('11 · 12',S/2,S*.62);x.font='bold 26px Georgia';x.fillText('FISH',S/2,S*.84);})),roughness:.8}));
    t.rotation.x=-Math.PI/2;t.position.set(c.x,TOP+.0458,c.y);t.userData.ownMat=true;t.userData.decal=true;GL.board.add(t);}
  (G.board.grounds||[]).forEach(g=>{const e=T.edges[g.e];const d=seaSideDir(g.e);const tp={x:e.x+d.x*.62,y:e.y+d.y*.62};
    const b=new THREE.Mesh(GEO.hToken,MAT.tokenSide);b.position.set(tp.x,SEA+.025,tp.y);b.castShadow=true;GL.board.add(b);
    const t=new THREE.Mesh(GEO.hTokenTop,new THREE.MeshStandardMaterial({map:cachedTex('fg'+g.n,()=>discCanvas((x,S)=>{const red=g.n===6||g.n===8;x.fillStyle='#2f6f8f';x.beginPath();x.ellipse(S/2,S*.3,52,22,0,0,7);x.fill();x.beginPath();x.moveTo(S/2+44,S*.3);x.lineTo(S/2+78,S*.3-22);x.lineTo(S/2+78,S*.3+22);x.fill();
      x.fillStyle=red?'#a5221a':'#2b2118';x.font='bold 100px "IM Fell English SC", Georgia, serif';x.fillText(String(g.n),S/2,S*.66);},['#e3f1f5','#b9d9e3','#8bb7c6'])),roughness:.8}));
    t.rotation.x=-Math.PI/2;t.position.set(tp.x,SEA+.0505,tp.y);t.userData.ownMat=true;t.userData.decal=true;GL.board.add(t);});
  (G.board.rivers||[]).forEach(idx=>{const pts=[];const first=T.hexes[idx[0]];const mouth=(G.board.bridges||[]).find(e=>T.edges[e].hexes.length===1&&first.e.includes(e));
    if(mouth!=null)pts.push({x:T.edges[mouth].x,y:T.edges[mouth].y});
    idx.forEach((h,j)=>{pts.push(T.hexes[h].c);if(j+1<idx.length){const e=T.hexes[h].e.find(x=>T.hexes[idx[j+1]].e.includes(x));pts.push({x:T.edges[e].x,y:T.edges[e].y});}});
    for(let j=0;j+1<pts.length;j++){const a=pts[j],b=pts[j+1];const L=Math.hypot(b.x-a.x,b.y-a.y);const m=new THREE.Mesh(GEO.riverSeg,MAT.river);m.scale.x=L+.12;m.position.set((a.x+b.x)/2,TOP+.007,(a.y+b.y)/2);m.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);m.receiveShadow=true;GL.board.add(m);}});
  // tribe gifts floating at the shore
  if(G.board.gifts)Object.keys(G.board.gifts).forEach(k=>{const g=G.board.gifts[k];const e=T.edges[+k];const d=seaSideDir(+k);const p={x:e.x+d.x*.34,y:e.y+d.y*.34};
    const b=new THREE.Mesh(GEO.sToken,MAT.tokenSide);b.position.set(p.x,SEA+.025,p.y);b.castShadow=true;GL.board.add(b);
    const t=new THREE.Mesh(GEO.sTokenTop,new THREE.MeshStandardMaterial({map:cachedTex('g'+g.k+(g.t||''),()=>giftCanvas(g)),roughness:.6}));t.rotation.x=-Math.PI/2;t.position.set(p.x,SEA+.0475,p.y);t.userData.ownMat=true;t.userData.decal=true;GL.board.add(t);});
  // scenery props (instanced)
  const L={};const add=(k,x,y,z,yaw,sx,sy,sz,col)=>(L[k]=L[k]||[]).push({x,y,z,yaw,sx,sy,sz,col});
  G.board.hexes.forEach((H,i)=>{const c=T.hexes[i].c;
    if(H.tribe||H.t==='village'){scatter(R,c,H.t==='village'?4:2,.16,.3,.6).forEach(p=>{const yaw=R()*6;add('hut',p.x,TOP,p.y,yaw,1,1,1,'#c9a774');add('roof',p.x,TOP+.06,p.y,yaw,1,1,1,'#8b5a2b');});}
    if(H.t==='forest'){scatter(R,c,14,.13).forEach(p=>{const s=.75+R()*.5,col=['#2c5a26','#23481e','#3a6d2f','#2f6230'][Math.floor(R()*4)];
      add('trunk',p.x,TOP+.04*s,p.y,0,s,s,s,'#5a3d22');add('cone1',p.x,TOP+.16*s,p.y,R()*6,s,s,s,col);add('cone2',p.x,TOP+.255*s,p.y,R()*6,s,s,s,col);});}
    else if(H.t==='mountains'){scatter(R,c,3,.3,.46,.66).forEach(p=>{const s=.75+R()*.4,yaw=R()*6,g=['#6e6a66','#7b7570','#5f5c59'][Math.floor(R()*3)];
      add('peak',p.x,TOP+.22*s,p.y,yaw,s,s,s,g);add('snow',p.x,TOP+.357*s,p.y,yaw,s,s,s,'#f4f6fa');});
      scatter(R,c,4,.12).forEach(p=>{const s=.6+R()*.7;add('rock',p.x,TOP+.02,p.y,R()*6,s,s*.8,s,'#77716a');});}
    else if(H.t==='hills'){scatter(R,c,4,.26,.46,.68).forEach(p=>{const s=.65+R()*.4;add('mound',p.x,TOP,p.y,R()*6,s,s*.42,s,['#a65a32','#8f4b28','#b8693a'][Math.floor(R()*3)]);});
      const sp=scatter(R,c,1,.1,.5,.62)[0];if(sp){const yaw=R()*3;[[0,0],[.062,0],[-.062,0],[.031,.03],[-.031,.03],[0,.06]].forEach(([ox,oy])=>{add('brick',sp.x+Math.cos(yaw)*ox,TOP+.016+oy,sp.y-Math.sin(yaw)*ox,yaw,1,1,1,'#b4532a');});}}
    else if(H.t==='pasture'){scatter(R,c,6,.15).forEach((p,k)=>{if(k<4){const yaw=R()*6,s=.9+R()*.25;add('body',p.x,TOP+.065,p.y,yaw,s*1.35,s,s,'#f2efe6');add('head',p.x+Math.cos(yaw)*.08*s,TOP+.08,p.y-Math.sin(yaw)*.08*s,yaw,s,s,s,'#2a2420');
        const hx=p.x-c.x,hz=p.y-c.y,hr=Math.hypot(hx,hz)||1,rad=.05+R()*.05,pull=Math.max(0,hr+rad-.74);GL.sheepData.push({hx:p.x-hx/hr*pull,hz:p.y-hz/hr*pull,s,rad,ph:R()*6.283,dir:R()<.5?1:-1});}
      else{const s=.8+R()*.6;add('bush',p.x,TOP+.03*s,p.y,0,s,s*.8,s,'#3b6a2c');}});}
    else if(H.t==='fields'){scatter(R,c,2,.25).forEach(p=>{const s=.85+R()*.3;add('hay',p.x,TOP+.04*s,p.y,0,s,s,s,'#d9b453');add('hayTop',p.x,TOP+.12*s,p.y,0,s,s,s,'#caa143');});}
    else if(H.t==='desert'){scatter(R,c,5,.14).forEach(p=>{const s=.5+R()*.8;add('rock',p.x,TOP+.015,p.y,R()*6,s,s*.7,s,['#9b8468','#857158'][Math.floor(R()*2)]);});}
    else if(H.t==='gold'){scatter(R,c,7,.12).forEach(p=>{const s=.5+R()*.7;add('nug',p.x,TOP+.02,p.y,R()*6,s,s*.7,s,'#ffffff');});}
    else if(H.t==='swamp'){scatter(R,c,10,.1).forEach(p=>{const s=.6+R()*.6;add('trunk',p.x,TOP+.04*s,p.y,0,s*.6,s*1.4,s*.6,'#6b7a3a');});}
    else if(H.t==='oasis'){scatter(R,c,4,.2,.42,.62).forEach(p=>{const s=.9+R()*.3;add('trunk',p.x,TOP+.06*s,p.y,0,s*.8,s*1.6,s*.8,'#7a5a34');add('cone1',p.x,TOP+.2*s,p.y,R()*6,s*1.2,s*.35,s*1.2,'#3f7a2e');});}
    else if(H.t==='castle'){[[0,-.3],[.28,.15],[-.28,.15]].forEach(([ox,oy])=>{add('tower',c.x+ox,TOP+.17,c.y+oy,0,1,1,1,'#9c968c');add('troof',c.x+ox,TOP+.38,c.y+oy,0,1,1,1,'#7a3a2a');});}
  });
  const pg={trunk:new THREE.CylinderGeometry(.02,.027,.08,6),cone1:new THREE.ConeGeometry(.1,.2,7),cone2:new THREE.ConeGeometry(.073,.17,7),peak:new THREE.ConeGeometry(.2,.44,6,1),snow:new THREE.ConeGeometry(.2*.4,.44*.38,6,1),
    rock:new THREE.DodecahedronGeometry(.055),mound:new THREE.SphereGeometry(.2,14,9),brick:new THREE.BoxGeometry(.058,.028,.028),body:new THREE.SphereGeometry(.052,12,9),head:new THREE.SphereGeometry(.028,8,6),
    bush:new THREE.IcosahedronGeometry(.055,1),hay:new THREE.CylinderGeometry(.072,.082,.08,12),hayTop:new THREE.ConeGeometry(.084,.08,12),nug:new THREE.DodecahedronGeometry(.04),
    hut:new THREE.BoxGeometry(.11,.07,.09),roof:new THREE.ConeGeometry(.085,.08,4),tower:new THREE.CylinderGeometry(.08,.09,.34,10),troof:new THREE.ConeGeometry(.11,.14,10)};
  pg.hut.translate(0,.035,0);pg.roof.translate(0,.05,0);
  const flat=new Set(['cone1','cone2','peak','snow','rock','bush','nug','roof']);
  const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),S=new THREE.Vector3(),V=new THREE.Vector3(),Y=new THREE.Vector3(0,1,0);
  Object.keys(L).forEach(k=>{const list=L[k];const mat=k==='nug'?MAT.goldNug:new THREE.MeshStandardMaterial({color:0xffffff,roughness:k==='snow'?.6:.88,flatShading:flat.has(k)});
    if(k==='cone1'||k==='cone2')windify(mat,k==='cone1'?.1:.285);
    const m=new THREE.InstancedMesh(pg[k],mat,list.length);
    list.forEach((o,i)=>{Q.setFromAxisAngle(Y,o.yaw+(k==='roof'?Math.PI/4:0));S.set(o.sx,o.sy,o.sz);V.set(o.x,o.y,o.z);M.compose(V,Q,S);m.setMatrixAt(i,M);m.setColorAt(i,lin(o.col));});
    m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.castShadow=k!=='body'&&k!=='head';
    if(k==='body'){GL.sheepBody=m;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);}if(k==='head'){GL.sheepHead=m;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);}m.receiveShadow=true;m.userData.ownMat=k!=='nug';m.userData.ownGeo=true;GL.board.add(m);});
  Object.keys(pg).forEach(k=>{if(!L[k])pg[k].dispose();});
  buildSnow(R);
  GL.boardKey=G.board.id+':'+(G.board.ver||0);GL.robHex=undefined;GL.pirHex=undefined;
  if(GL.boardIdForPieces!==G.board.id){disposeGroup(GL.pieces);GL.vMesh={};GL.eMesh={};GL.kMesh={};GL.wMesh={};GL.mMesh={};GL.merchant=null;GL.boardIdForPieces=G.board.id;}
  buildBarbTrack();
  GL.tkey='';fitIfNeeded();applyDecalRot();
}
function fitIfNeeded(){if(GL.fitFor!==G.board.id){GL.fitFor=G.board.id;GL.userMoved=false;fitCamera();}}
function screenPan(pos){const v=new THREE.Vector3(pos.x,pos.y,pos.z).project(GL.cam);return Math.max(-.85,Math.min(.85,v.x*.85));}
function drop(m,kind){const pos=m.position.clone();const mine=!(typeof aiOn==='function'&&aiOn()&&isAI(G.cur));if(REDUCED){sfxAt(kind||'place',pos);return;}const y0=m.position.y;m.position.y=y0+.9;tween(480,k=>{m.position.y=y0+(1-bounce(k))*.9;});
  setTimeout(()=>{sfxAt(kind||'place',pos);Feel.pulse(pos,null,kind==='city');Feel.focus(pos);if(mine)vibe(kind==='city'?24:14);},175);}
function placeShipMesh(m,e){const E=T.edges[e],a=T.verts[E.a],b=T.verts[E.b];const coastal=E.hexes.some(h=>!isSeaHex(h));const d=seaSideDir(e);const off=coastal?.2:0;
  m.position.set(E.x+d.x*off,SEA,E.y+d.y*off);m.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);}
function syncScene(anim){
  if(!GL.ready||!G)return;
  syncTopo();RL.sync(anim);
  if(GL.boardKey!==G.board.id+':'+(G.board.ver||0))buildBoard();
  T.verts.forEach(v=>{const o=G.vOwn[v.i];const want=o?(o.city?'c':'s')+o.p+pcolor(o.p):'';const cur=GL.vMesh[v.i];
    if(cur&&cur.userData.key===want)return;if(cur){GL.pieces.remove(cur);delete GL.vMesh[v.i];}
    if(want){const m=new THREE.Mesh(o.city?GEO.city:GEO.settle,pieceMat(pcolor(o.p)));m.position.set(v.x,TOP+.012,v.y);m.rotation.y=(((v.i*37)%7)-3)*.09;
      m.castShadow=m.receiveShadow=true;m.userData.key=want;GL.pieces.add(m);GL.vMesh[v.i]=m;if(anim)drop(m,o.city?'city':'settle');}});
  T.edges.forEach(e=>{const o=G.eOwn[e.i];const want=o?o.k+o.p+pcolor(o.p)+(o.dmg?'d':''):'';const cur=GL.eMesh[e.i];
    if(cur&&cur.userData.key===want)return;if(cur){GL.pieces.remove(cur);delete GL.eMesh[e.i];}
    if(want){let m;const a=T.verts[e.a],b=T.verts[e.b];
      if(o.k==='ship'){m=makeShip(pieceMat(pcolor(o.p)),MAT.sail,1);placeShipMesh(m,e.i);}
      else if(o.k==='bridge'){m=new THREE.Mesh(GEO.bridge,pieceMat(pcolor(o.p)));m.position.set(e.x,TOP+.07,e.y);m.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);m.castShadow=m.receiveShadow=true;}
      else{m=new THREE.Mesh(GEO.road,pieceMat(pcolor(o.p)));m.position.set(e.x,TOP+.0375,e.y);m.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x)+(o.dmg?Math.PI/2:0);if(o.dmg){m.rotation.z=.35;m.scale.x=.5;}m.castShadow=m.receiveShadow=true;}
      m.userData.key=want;GL.pieces.add(m);GL.eMesh[e.i]=m;if(anim)drop(m,o.k==='ship'?'ship':'road');}});
  const movePiece=(obj,to,last,setLast)=>{
    if(to==null){obj.visible=false;setLast(null);return;}
    obj.visible=true;
    if(anim&&last!=null&&last!==undefined&&!REDUCED){const f={x:obj.position.x,z:obj.position.z},y0=to.y;tween(650,k=>{const e=easeOut(k);obj.position.set(f.x+(to.x-f.x)*e,y0+Math.sin(k*Math.PI)*.9,f.z+(to.z-f.z)*e);});setTimeout(()=>{const P3=new THREE.Vector3(to.x,to.y,to.z);sfxAt(obj===GL.pirate?'ship':'robber',P3);Feel.pulse(P3,'#b3261e',true);Feel.focus(P3);vibe(40);},600);}
    else obj.position.set(to.x,to.y,to.z);};
  if(GL.robHex!==G.robber){const c=G.robber!=null?T.hexes[G.robber].c:null;movePiece(GL.robber,c?{x:c.x+ROB.x,y:TOP,z:c.y+ROB.y}:null,GL.robHex,v=>{});GL.robHex=G.robber;}
  if(GL.pirHex!==G.pirate){const c=G.pirate!=null?T.hexes[G.pirate].c:null;movePiece(GL.pirate,c?{x:c.x,y:SEA,z:c.y}:null,GL.pirHex,v=>{});GL.pirHex=G.pirate;}
  syncCK(anim);syncTB(anim);
  syncMarkers();GL.dirty=true;
}
function syncTB(anim){
  GL.tbG=GL.tbG||new THREE.Group();if(!GL.tbG.parent)GL.scene.add(GL.tbG);
  const key=JSON.stringify([G.board.id,G.camels||null,G.barbs||null,G.conq||null,G.kt||null,(G.players||[]).map(p=>p.color)]);if(GL.tbKey===key)return;GL.tbKey=key;
  disposeGroup(GL.tbG);
  if(G.camels)Object.keys(G.camels).forEach(e=>{const E=T.edges[e],a=T.verts[E.a],b=T.verts[E.b];const g=new THREE.Group();
    const body=new THREE.Mesh(GEO.camelBody,MAT.camel);body.scale.set(1.5,.8,.8);body.position.y=.09;body.castShadow=true;g.add(body);
    const hump=new THREE.Mesh(GEO.camelBody,MAT.camel);hump.scale.set(.6,.6,.6);hump.position.set(0,.14,0);g.add(hump);
    const head=new THREE.Mesh(GEO.camelHead,MAT.camel);head.position.set(.1,.14,0);head.rotation.z=-.4;g.add(head);
    [-.05,.05].forEach(lx=>[-.025,.025].forEach(lz=>{const l=new THREE.Mesh(GEO.camelHead,MAT.camel);l.scale.set(.6,.8,.6);l.position.set(lx,.035,lz);g.add(l);}));
    const off=.12;g.position.set(E.x+(b.y-a.y)*off,TOP,E.y-(b.x-a.x)*off);g.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);GL.tbG.add(g);});
  if(G.barbs)Object.keys(G.barbs).forEach(h=>{const n=G.barbs[h]||0;const c=T.hexes[h].c;for(let k=0;k<n;k++){const a=k*2.1+.6;const x=c.x+Math.cos(a)*.42,z=c.y+Math.sin(a)*.42;
    const f=new THREE.Mesh(GEO.barbFig,MAT.bronze);f.position.set(x,TOP+.065,z);f.castShadow=true;GL.tbG.add(f);const hd=new THREE.Mesh(GEO.barbHead,MAT.bronze);hd.position.set(x,TOP+.15,z);GL.tbG.add(hd);}});
  if(G.conq)Object.keys(G.conq).forEach(h=>{const c=T.hexes[h].c;const m=new THREE.Mesh(GEO.conq,MAT.conq);m.rotation.x=-Math.PI/2;m.rotation.z=Math.PI/6;m.position.set(c.x,TOP+.06,c.y);m.renderOrder=3;GL.tbG.add(m);});
  if(G.kt)Object.keys(G.kt).forEach(e=>{const k=G.kt[e];const E=T.edges[e];const m=knightMesh({p:k.p,lvl:1,act:true});m.position.set(E.x,TOP,E.y);GL.tbG.add(m);});
  GL.dirty=true;
}
function barbTrackPos(i){const z=SC().classic?-6.25:-(T.bz+1.95);const x=-3.5+i*1.0;return {x,z};}
function buildBarbTrack(){
  disposeGroup(GL.barbG);GL.barbDots=[];GL.barbAt=undefined;
  if(!G.opts.ck){GL.barbShip.visible=false;return;}
  for(let i=0;i<=7;i++){const p=barbTrackPos(i);const d=new THREE.Mesh(GEO.trackDot,i===7?MAT.trackOn:MAT.track);d.position.set(p.x,-.09,p.z);d.receiveShadow=true;GL.barbG.add(d);GL.barbDots.push(d);}
  GL.barbShip.visible=true;
}
function knightMesh(k){
  const g=new THREE.Group();const mat=pieceMat(pcolor(k.p));
  for(let i=0;i<k.lvl;i++){const d=new THREE.Mesh(GEO.kDisc,mat);d.position.y=.02+i*.045;d.castShadow=true;d.receiveShadow=true;g.add(d);
    const r=new THREE.Mesh(GEO.kRing,MAT.kRing);r.rotation.x=-Math.PI/2;r.position.y=.0405+i*.045;g.add(r);}
  if(k.act){const h=new THREE.Mesh(GEO.helmet,MAT.helmet);h.position.y=.045*k.lvl;h.castShadow=true;g.add(h);
    const pl=new THREE.Mesh(GEO.plume,mat);pl.position.y=.045*k.lvl+.1;g.add(pl);}
  return g;
}
function syncCK(anim){
  const ck=!!G.opts.ck,kn=ck?G.kn:{};
  Object.keys(GL.kMesh).forEach(v=>{const k=kn[v];const want=k?`k${k.p}${k.lvl}${k.act}${pcolor(k.p)}`:'';if(GL.kMesh[v].userData.key!==want){GL.pieces.remove(GL.kMesh[v]);delete GL.kMesh[v];}});
  Object.keys(kn).forEach(v=>{if(GL.kMesh[v])return;const k=kn[v],V=T.verts[v];const m=knightMesh(k);m.position.set(V.x,TOP,V.y);m.userData.key=`k${k.p}${k.lvl}${k.act}${pcolor(k.p)}`;GL.pieces.add(m);GL.kMesh[v]=m;if(anim)drop(m,'knight');});
  T.verts.forEach(V=>{const o=G.vOwn[V.i];
    const wantW=ck&&o&&o.city&&o.wall;if(!!GL.wMesh[V.i]!==!!wantW){if(GL.wMesh[V.i]){GL.pieces.remove(GL.wMesh[V.i]);delete GL.wMesh[V.i];}
      else{const w=new THREE.Mesh(GEO.wall,MAT.stone);w.rotation.x=-Math.PI/2;w.position.set(V.x,TOP+.03,V.y);w.castShadow=true;GL.pieces.add(w);GL.wMesh[V.i]=w;}}
    const wantM=ck&&o&&o.city&&o.metro?o.metro:'';const curM=GL.mMesh[V.i];if((curM?curM.userData.key:'')!==wantM){if(curM){GL.pieces.remove(curM);delete GL.mMesh[V.i];}
      if(wantM){const g=new THREE.Group();const tw=new THREE.Mesh(GEO.tower,pieceMat(pcolor(o.p)));tw.position.y=.17;tw.castShadow=true;g.add(tw);
        const rf=new THREE.Mesh(GEO.towerRoof,new THREE.MeshStandardMaterial({color:lin(TRACK[wantM].col),roughness:.5}));rf.position.y=.4;rf.castShadow=true;rf.userData.ownMat=true;g.add(rf);
        g.position.set(V.x+.13,TOP,V.y-.1);g.userData.key=wantM;GL.pieces.add(g);GL.mMesh[V.i]=g;}}});
  const mw=ck&&G.merchant?G.merchant.h+':'+G.merchant.p:'';
  if((GL.merchant?GL.merchant.userData.key:'')!==mw){if(GL.merchant){GL.pieces.remove(GL.merchant);GL.merchant=null;}
    if(mw){const g=new THREE.Group();const mat=pieceMat(pcolor(G.merchant.p));const b=new THREE.Mesh(GEO.mBody,mat);b.position.y=.1;b.castShadow=true;g.add(b);const h=new THREE.Mesh(GEO.mHead,mat);h.position.y=.22;h.castShadow=true;g.add(h);
      const c=T.hexes[G.merchant.h].c;g.position.set(c.x+.33,TOP,c.y+.22);g.userData.key=mw;GL.pieces.add(g);GL.merchant=g;if(anim)drop(g);}}
  if(ck&&GL.barbAt!==G.barb){const to=barbTrackPos(G.barb),y=-.06;
    if(anim&&GL.barbAt!=null){const f={x:GL.barbShip.position.x,z:GL.barbShip.position.z};tween(900,k=>{const e=easeOut(k);GL.barbShip.position.set(f.x+(to.x-f.x)*e,y+Math.sin(k*Math.PI)*.15,f.z+(to.z-f.z)*e);});}
    else GL.barbShip.position.set(to.x,y,to.z);
    GL.barbDots&&GL.barbDots.forEach((d,i)=>d.material=i===7||i<=G.barb&&G.barb>0&&i>0?MAT.trackOn:MAT.track);GL.barbAt=G.barb;}
}
function pcolor(p){return p<G.players.length?G.players[p].color:(G.neutral&&G.neutral[p-G.players.length]?G.neutral[p-G.players.length].color:'#8a8a8a');}
function syncMarkers(){
  const tg=targets();const key=tg?tg.k+G.cur+(tg.kind||'')+':'+tg.list.join(','):'';if(key===GL.tkey)return;GL.tkey=key;
  GL.markers.forEach(m=>{GL.markG.remove(m);});GL.markers=[];
  if(tg){const col=tg.k==='h'?'#f2c14e':pcolor(G.cur);
    const mat=new THREE.MeshBasicMaterial({color:lin(col),transparent:true,opacity:.92,depthWrite:false,side:THREE.DoubleSide});
    const seaMat=new THREE.MeshBasicMaterial({color:lin('#9fd6ff'),transparent:true,opacity:.92,depthWrite:false,side:THREE.DoubleSide});
    tg.list.forEach(i=>{let m;
      if(tg.k==='v'){const v=T.verts[i];m=new THREE.Mesh(GEO.mV,mat);m.position.set(v.x,TOP+(G.vOwn[i]?.42:.1),v.y);}
      else if(tg.k==='e'){const e=T.edges[i],a=T.verts[e.a],b=T.verts[e.b];m=new THREE.Mesh(GEO.mE,mat);const sea=!eLand(i);m.position.set(e.x,(sea?SEA+.06:TOP+.04),e.y);m.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);}
      else{const c=T.hexes[i].c;m=new THREE.Mesh(GEO.mH,isSeaHex(i)?seaMat:mat);m.rotation.x=-Math.PI/2;m.position.set(c.x,isSeaHex(i)?SEA+.05:TOP+.07,c.y);}
      m.renderOrder=5;GL.markG.add(m);GL.markers.push(m);});}
  GL.dirty=true;
}
function flashTokens(n){if(!GL.ready)return;const ids=[];G.board.hexes.forEach((H,i)=>{if(H.n===n&&i!==G.robber)ids.push(i);});
  (G.board.villages||[]).forEach(v=>{if(v.n===n)ids.push('v'+v.h+'_'+v.n);});GL.flash={ids,t0:performance.now()};}
