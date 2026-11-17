'use strict';
/* =====================================================================
   MINI MAP (phone): a 2D board you can pan and pinch, with tappable
   glowing spots that call exactly the same boardAction() as the 3D board.
   ===================================================================== */
const Mini=(function(){
  const NS='http://www.w3.org/2000/svg';
  const FILL={forest:'#3d6b34',hills:'#a8663a',pasture:'#8fba4e',fields:'#e5c04e',mountains:'#8f8a92',desert:'#d3b866',gold:'#f0c02e',
    sea:'#256a9f',lake:'#4fb0d6',swamp:'#6f8b5c',oasis:'#8fd3a2',castle:'#9a8f86',fog:'#6b7280',village:'#d6b57a'};
  const RESOF={forest:'wood',hills:'brick',pasture:'wool',fields:'grain',mountains:'ore'};
  const pcol=p=>p<G.players.length?G.players[p].color:(G.neutral&&G.neutral[p-G.players.length]?G.neutral[p-G.players.length].color:'#8a8a8a');
  const f=n=>Math.round(n*1000)/1000;
  let svg=null,vb={x:-5,y:-5,w:10,h:10},fitVB=null,boardId=null,ptrs=new Map(),tap=null;

  function bounds(){
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    const land=G.board.hexes.map((H,i)=>H.t!=='sea'?i:-1).filter(i=>i>=0);
    const src=land.length?land.flatMap(i=>T.hexes[i].v):T.verts.map(v=>v.i);
    src.forEach(vi=>{const v=T.verts[vi];x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);});
    const tvr=PAD.role==='tv',m=G.board.hexes.some(H=>H.t==='sea')?(tvr?1.35:1.7):(tvr?.95:1.25);return {x:x0-m,y:y0-m,w:x1-x0+2*m,h:y1-y0+2*m};
  }
  function apply(){if(svg)svg.setAttribute('viewBox',`${f(vb.x)} ${f(vb.y)} ${f(vb.w)} ${f(vb.h)}`);}
  function fit(){if(!T)return;fitVB=bounds();vb=Object.assign({},fitVB);apply();}
  function clamp(){
    if(!fitVB)return;
    const minW=fitVB.w/3.2,maxW=fitVB.w*1.25;const k=vb.w/vb.h;
    if(vb.w<minW){vb.w=minW;vb.h=minW/k;}if(vb.w>maxW){vb.w=maxW;vb.h=maxW/k;}
    const px=fitVB.w*.35,py=fitVB.h*.35;
    vb.x=Math.min(Math.max(vb.x,fitVB.x-px),fitVB.x+fitVB.w+px-vb.w);vb.y=Math.min(Math.max(vb.y,fitVB.y-py),fitVB.y+fitVB.h+py-vb.h);
  }
  const pt=(x,y)=>`${f(x)},${f(y)}`;

  /* ---------- painted tiles (optional): sand-framed tiles with textured terrain, like a classic printed board ---------- */
  let detail=!/[?&]detail=0/.test((typeof location!=='undefined'&&location.search)||'');
  try{if(typeof localStorage!=='undefined'&&localStorage.getItem('tidehaven.detail')==='0')detail=false;}catch(e){}
  const DETAILED=new Set(['forest','hills','pasture','fields','mountains','desert','gold','lake','swamp','oasis','castle','village']);
  const ALWAYS=new Set(['lake','swamp','oasis','castle','village']);
  const SAND='#ecd391',SAND_EDGE='#b8975a';
  const GRAD={forest:['#527f38','#2b4a2b'],hills:['#7c492d','#b97b3c'],pasture:['#a8cd5c','#84b04a'],fields:['#f3d65c','#d8a93c'],mountains:['#a8a097','#7c7880'],desert:['#ddc270','#bf9f55'],gold:['#f6d65a','#dba922'],lake:['#68bfe8','#3a8cc2'],swamp:['#82a262','#546f47'],oasis:['#efdca6','#d1b672'],castle:['#b0aaa1','#7d776e'],village:['#e0c98f','#bd9d60']};
  function rng(seed){let a=seed|0;return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function hstr(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  /* scatter points inside the painted part of a tile (the sand frame takes the outer edge) */
  function ring(R,count,minD,rmin,rmax){const pts=[];let tries=0;
    while(pts.length<count&&tries++<400){const a=R()*6.2832,r=rmin+R()*(rmax-rmin);const x=Math.cos(a)*r,y=Math.sin(a)*r;
      if(Math.abs(x)>.62||Math.abs(y)+Math.abs(x)*.577>.76)continue;
      if(pts.every(q=>Math.hypot(q[0]-x,q[1]-y)>minD))pts.push([x,y]);}
    return pts.sort((a,b)=>a[1]-b[1]);}
  function peak(x,y,s){return `<polygon points="${f(x-s)},${f(y+s*.7)} ${f(x)},${f(y-s)} ${f(x+s)},${f(y+s*.7)}" fill="#8d8896"/>`+
    `<polygon points="${f(x-s)},${f(y+s*.7)} ${f(x)},${f(y-s)} ${f(x+s*.06)},${f(y+s*.7)}" fill="#b9b2b3"/>`+
    `<polygon points="${f(x)},${f(y-s)} ${f(x+s)},${f(y+s*.7)} ${f(x+s*.06)},${f(y+s*.7)}" fill="#5f5b73"/>`+
    `<polygon points="${f(x-s*.3)},${f(y-s*.4)} ${f(x)},${f(y-s)} ${f(x+s*.3)},${f(y-s*.4)} ${f(x+s*.12)},${f(y-s*.52)} ${f(x)},${f(y-s*.34)} ${f(x-s*.14)},${f(y-s*.5)}" fill="#f4f2ea"/>`+
    `<polygon points="${f(x)},${f(y-s)} ${f(x+s*.3)},${f(y-s*.4)} ${f(x+s*.12)},${f(y-s*.52)} ${f(x)},${f(y-s*.34)}" fill="#d3d1d1"/>`;}
  function detailTile(i,t,h,c,poly){
    const R=rng(hstr((G.board.id||'b')+':'+i)),g=GRAD[t];let d='';
    const inner=h.v.map(v=>{const V=T.verts[v];return pt(c.x+(V.x-c.x)*.86,c.y+(V.y-c.y)*.86);}).join(' ');
    d+=`<polygon points="${poly}" transform="translate(.03 .06)" fill="rgba(0,0,0,.26)"/>`;
    d+=`<defs><radialGradient id="g${i}" cx=".5" cy=".5" r=".72"><stop offset="0" stop-color="${g[0]}"/><stop offset="1" stop-color="${g[1]}"/></radialGradient><clipPath id="c${i}"><polygon points="${inner}"/></clipPath></defs>`;
    d+=`<polygon points="${poly}" fill="${SAND}" stroke="${SAND_EDGE}" stroke-width=".035" stroke-linejoin="round"/>`;
    d+=`<polygon points="${inner}" fill="url(#g${i})"/>`;
    d+=`<g clip-path="url(#c${i})">`;
    if(t==='forest'){
      const cols=['#2e5230','#3a6934','#4d7d3b','#648f47'];
      ring(R,20,.2,0,.8).forEach(([x,y],k)=>{const r=.14+R()*.07,a=c.x+x,b=c.y+y;
        d+=`<circle cx="${f(a+.015)}" cy="${f(b+.03)}" r="${f(r)}" fill="rgba(8,28,10,.38)"/><circle cx="${f(a)}" cy="${f(b)}" r="${f(r)}" fill="${cols[Math.floor(R()*4)]}"/><circle cx="${f(a-r*.3)}" cy="${f(b-r*.35)}" r="${f(r*.42)}" fill="rgba(190,230,140,.32)"/>`;});
    }else if(t==='pasture'){
      ring(R,6,.35,0,.7).forEach(([x,y],k)=>{d+=`<circle cx="${f(c.x+x)}" cy="${f(c.y+y)}" r=".22" fill="${k%2?'#c4e472':'#74a53f'}" opacity=".3"/>`;});
      ring(R,14,.2,.05,.78).forEach(([x,y])=>{const a=c.x+x,b=c.y+y;d+=`<path d="M${f(a-.035)} ${f(b)}l.02 -.075M${f(a)} ${f(b)}v-.095M${f(a+.035)} ${f(b)}l-.02 -.075" stroke="#6c9c38" stroke-width=".022" stroke-linecap="round" fill="none"/>`;});
      ring(R,3,.5,.46,.7).forEach(([x,y])=>{const a=c.x+x,b=c.y+y;d+=`<ellipse cx="${f(a)}" cy="${f(b+.05)}" rx=".09" ry=".03" fill="rgba(20,50,10,.28)"/><ellipse cx="${f(a)}" cy="${f(b)}" rx=".085" ry=".057" fill="#f5f2ea" stroke="#bdb8a6" stroke-width=".012"/><circle cx="${f(a+.088)}" cy="${f(b-.008)}" r=".03" fill="#2d2a26"/>`;});
    }else if(t==='hills'){
      [.6,.46,.32,.18].forEach((rr,k)=>{d+=`<ellipse cx="${f(c.x)}" cy="${f(c.y)}" rx="${rr}" ry="${f(rr*.88)}" fill="none" stroke="rgba(60,28,16,${f(.32-.05*k)})" stroke-width=".04"/>`;});
      for(let k=0;k<7;k++){const a=R()*6.28,l=.35+R()*.35,b1=a+(R()-.5)*.9;d+=`<path d="M${f(c.x+Math.cos(a)*.12)} ${f(c.y+Math.sin(a)*.12)} L${f(c.x+Math.cos(a)*l)} ${f(c.y+Math.sin(a)*l)} l${f(Math.cos(b1)*.1)} ${f(Math.sin(b1)*.1)}" stroke="#44261a" stroke-width=".03" fill="none" stroke-linecap="round" opacity=".6"/>`;}
      ring(R,6,.3,.35,.75).forEach(([x,y])=>{d+=`<ellipse cx="${f(c.x+x)}" cy="${f(c.y+y)}" rx=".07" ry=".045" fill="#d29a55"/>`;});
    }else if(t==='fields'){
      d+=`<rect x="${f(c.x-1)}" y="${f(c.y-1)}" width="2" height="2" fill="url(#wheatp)"/>`;
      ring(R,2,.55,.5,.72).forEach(([x,y])=>{const a=c.x+x,b=c.y+y;d+=`<ellipse cx="${f(a)}" cy="${f(b+.05)}" rx=".105" ry=".04" fill="rgba(90,55,5,.28)"/><circle cx="${f(a)}" cy="${f(b)}" r=".085" fill="#efca55" stroke="#b58a2a" stroke-width=".022"/><path d="M${f(a-.04)} ${f(b)} a.04 .04 0 1 1 .08 0 a.022 .022 0 1 1 -.044 0" stroke="#b58a2a" stroke-width=".015" fill="none"/>`;});
    }else if(t==='mountains'){
      ring(R,4,.45,.3,.7).forEach(([x,y])=>{d+=`<ellipse cx="${f(c.x+x)}" cy="${f(c.y+y+.12)}" rx=".2" ry=".1" fill="#8fa06a" opacity=".45"/>`;});
      [[0,-.18,.42],[-.32,.14,.34],[.3,.16,.31]].forEach(([x,y,s])=>{d+=peak(c.x+x+(R()-.5)*.08,c.y+y+(R()-.5)*.06,s*(.92+R()*.16));});
    }else if(t==='desert'){
      ring(R,7,.3,.1,.75).forEach(([x,y])=>{const a=c.x+x,b=c.y+y;d+=`<path d="M${f(a-.22)} ${f(b+.04)} Q${f(a)} ${f(b-.1)} ${f(a+.22)} ${f(b+.04)}" stroke="#b3944a" stroke-width=".04" fill="none" stroke-linecap="round" opacity=".8"/><path d="M${f(a-.18)} ${f(b)} Q${f(a)} ${f(b-.12)} ${f(a+.18)} ${f(b)}" stroke="#f3e2a2" stroke-width=".025" fill="none" stroke-linecap="round"/>`;});
    }else if(t==='lake'){
      ring(R,6,.3,.45,.75).forEach(([x,y])=>{const a=c.x+x,b=c.y+y;d+=`<path d="M${f(a-.18)} ${f(b)} Q${f(a)} ${f(b-.08)} ${f(a+.18)} ${f(b)}" stroke="rgba(255,255,255,.42)" stroke-width=".026" fill="none" stroke-linecap="round"/>`;});
      ring(R,3,.5,.5,.75).forEach(([x,y])=>{const a=c.x+x,b=c.y+y;d+=`<path d="M${f(a-.08)} ${f(b)} Q${f(a)} ${f(b-.05)} ${f(a+.08)} ${f(b)} Q${f(a)} ${f(b+.05)} ${f(a-.08)} ${f(b)}Z M${f(a+.08)} ${f(b)} L${f(a+.13)} ${f(b-.04)} L${f(a+.13)} ${f(b+.04)}Z" fill="#eaf7fb" opacity=".85"/>`;});
    }else if(t==='swamp'){
      ring(R,5,.3,.3,.75).forEach(([x,y])=>{d+=`<ellipse cx="${f(c.x+x)}" cy="${f(c.y+y)}" rx=".15" ry=".07" fill="rgba(40,90,105,.6)"/>`;});
      ring(R,7,.24,.4,.76).forEach(([x,y])=>{const a=c.x+x,b=c.y+y;d+=`<path d="M${f(a)} ${f(b+.1)} l-.03 -.17 M${f(a)} ${f(b+.1)} v-.21 M${f(a)} ${f(b+.1)} l.03 -.17" stroke="#47672b" stroke-width=".024" stroke-linecap="round" fill="none"/><ellipse cx="${f(a)}" cy="${f(b-.13)}" rx=".016" ry=".042" fill="#7a4e24"/>`;});
    }else if(t==='oasis'){
      d+=`<ellipse cx="${f(c.x)}" cy="${f(c.y+.04)}" rx=".34" ry=".22" fill="#3a93b9" stroke="#9bdcec" stroke-width=".035"/><ellipse cx="${f(c.x-.07)}" cy="${f(c.y)}" rx=".14" ry=".05" fill="rgba(255,255,255,.28)"/>`;
      [[-.42,-.26],[.44,-.14],[.08,.44]].forEach(([x,y])=>{const a=c.x+x,b=c.y+y;d+=`<path d="M${f(a)} ${f(b+.18)} Q${f(a+.03)} ${f(b)} ${f(a)} ${f(b-.12)}" stroke="#7a5a34" stroke-width=".05" fill="none" stroke-linecap="round"/>`;
        [-50,-20,15,45,75].forEach(ang=>{const r=ang*Math.PI/180;d+=`<path d="M${f(a)} ${f(b-.12)} q${f(Math.sin(r)*.18)} ${f(-.09-Math.cos(r)*.03)} ${f(Math.sin(r)*.26)} ${f(.04+Math.abs(Math.sin(r))*.08)}" stroke="#3f8a3a" stroke-width=".05" fill="none" stroke-linecap="round"/>`;});});
    }else if(t==='castle'){
      const tower=(x,y,w,hh,col)=>{const a=c.x+x,b=c.y+y;let q=`<rect x="${f(a-w/2)}" y="${f(b-hh/2)}" width="${f(w)}" height="${f(hh)}" fill="${col}" stroke="#2b2824" stroke-width=".03"/>`;
        for(let k=0;k<3;k++)q+=`<rect x="${f(a-w/2+k*(w/2.6))}" y="${f(b-hh/2-.06)}" width="${f(w/4.2)}" height=".07" fill="${col}" stroke="#2b2824" stroke-width=".022"/>`;
        q+=`<rect x="${f(a-.018)}" y="${f(b-hh/4)}" width=".036" height=".085" rx=".015" fill="#2b2824"/>`;return q;};
      d+=`<ellipse cx="${f(c.x)}" cy="${f(c.y+.36)}" rx=".62" ry=".13" fill="rgba(0,0,0,.25)"/>`;
      d+=`<rect x="${f(c.x-.46)}" y="${f(c.y+.02)}" width=".92" height=".28" fill="#a39d94" stroke="#2b2824" stroke-width=".03"/>`;
      for(let k=0;k<7;k++)d+=`<rect x="${f(c.x-.46+k*.138)}" y="${f(c.y-.04)}" width=".09" height=".07" fill="#a39d94" stroke="#2b2824" stroke-width=".022"/>`;
      d+=`<path d="M${f(c.x-.1)} ${f(c.y+.3)} v-.13 a.1 .1 0 0 1 .2 0 v.13Z" fill="#2b2824"/>`;
      d+=tower(-.36,-.04,.2,.4,'#948e85')+tower(.36,-.04,.2,.4,'#948e85')+tower(0,-.2,.26,.5,'#a8a29a');
      d+=`<path d="M${f(c.x)} ${f(c.y-.58)} v-.2" stroke="#2b2824" stroke-width=".03"/><path d="M${f(c.x)} ${f(c.y-.78)} l.2 .06 l-.2 .06Z" fill="#c2392b" stroke="#2b2824" stroke-width=".02"/>`;
    }else if(t==='village'){
      const house=(x,y,w,col)=>{const a=c.x+x,b=c.y+y;return `<ellipse cx="${f(a)}" cy="${f(b+w*.42)}" rx="${f(w*.8)}" ry="${f(w*.16)}" fill="rgba(60,35,10,.25)"/><rect x="${f(a-w/2)}" y="${f(b-w*.3)}" width="${f(w)}" height="${f(w*.7)}" fill="${col}" stroke="#3a2512" stroke-width=".022"/><path d="M${f(a-w*.64)} ${f(b-w*.3)} L${f(a)} ${f(b-w*.95)} L${f(a+w*.64)} ${f(b-w*.3)} Z" fill="#a8402e" stroke="#3a2512" stroke-width=".022" stroke-linejoin="round"/><rect x="${f(a-w*.11)}" y="${f(b+w*.08)}" width="${f(w*.22)}" height="${f(w*.32)}" fill="#5a3a1c"/>`;};
      d+=house(-.36,-.4,.2,'#f4e6bd')+house(.36,-.4,.2,'#f4e6bd')+house(0,-.46,.25,'#ecd8a2');
    }else if(t==='gold'){
      ring(R,6,.3,.1,.75).forEach(([x,y])=>{const a=c.x+x,b=c.y+y,sz=.05+R()*.03;d+=`<path d="M${f(a)} ${f(b-sz*2)}L${f(a+sz*.5)} ${f(b-sz*.5)}L${f(a+sz*2)} ${f(b)}L${f(a+sz*.5)} ${f(b+sz*.5)}L${f(a)} ${f(b+sz*2)}L${f(a-sz*.5)} ${f(b+sz*.5)}L${f(a-sz*2)} ${f(b)}L${f(a-sz*.5)} ${f(b-sz*.5)}Z" fill="#fff7cf" opacity=".9"/>`;});
    }
    d+=`</g>`;
    d+=`<polygon points="${inner}" fill="none" stroke="rgba(70,45,10,.4)" stroke-width=".025" stroke-linejoin="round"/>`;
    return d;
  }
  /* the sea: lighter shallows around the land, and a scatter of wave marks */
  function drawSea(){
    const H=G.board.hexes,land=[];H.forEach((h,i)=>{if(h.t!=='sea')land.push(i);});
    if(!land.length)return '';
    const polyOf=i=>T.hexes[i].v.map(v=>pt(T.verts[v].x,T.verts[v].y)).join(' ');
    let o='<g fill="none" stroke-linejoin="round" opacity=".3" stroke="#bfe6fa">';
    land.forEach(i=>{o+=`<polygon points="${polyOf(i)}" stroke-width=".95"/>`;});
    o+='</g><g fill="none" stroke-linejoin="round" opacity=".34" stroke="#d6f0fd">';
    land.forEach(i=>{o+=`<polygon points="${polyOf(i)}" stroke-width=".46"/>`;});
    o+='</g>';
    const R=rng(hstr((G.board.id||'b')+':sea')),bb=fitVB||bounds();
    for(let k=0;k<46;k++){const x=bb.x+R()*bb.w,y=bb.y+R()*bb.h;
      if(land.some(i=>Math.hypot(T.hexes[i].c.x-x,T.hexes[i].c.y-y)<1.35))continue;
      const w=.16+R()*.14;o+=`<path d="M${f(x)} ${f(y)} q${f(w/4)} -.07 ${f(w/2)} 0 t${f(w/2)} 0" stroke="rgba(255,255,255,.4)" stroke-width=".03" fill="none" stroke-linecap="round"/>`;}
    return o;
  }

  /* ---------- drawing ---------- */
  function drawHexes(){
    let o='';
    let top='';
    G.board.hexes.forEach((H,i)=>{
      const h=T.hexes[i],c=h.c,poly=h.v.map(v=>pt(T.verts[v].x,T.verts[v].y)).join(' ');
      const t=H.t,sea=t==='sea';
      if(sea)return;
      const det=(detail&&DETAILED.has(t))||ALWAYS.has(t);
      o+=det?detailTile(i,t,h,c,poly):`<polygon points="${poly}" fill="${FILL[t]||'#777'}" stroke="${sea?'#2f7fb8':'#1c140d'}" stroke-width="${sea?.03:.05}" stroke-linejoin="round"/>`;
      if(G.conq&&G.conq[i])o+=`<polygon points="${poly}" fill="url(#hatch)" opacity=".7"/>`;
      const r=RESOF[t];
      if(r&&ICON.color[r]&&!det)o+=`<image href="${ICON.color[r]}" x="${f(c.x-.26)}" y="${f(c.y-.78)}" width=".52" height=".52" opacity=".72"/>`;
      if(t==='lake'&&H.nums){H.nums.forEach((n,k)=>{const x=c.x+(k%2?.21:-.21),y=c.y+(k<2?-.19:.2),hot=n===6||n===8;top+=`<circle cx="${f(x+.01)}" cy="${f(y+.03)}" r=".19" fill="rgba(0,0,0,.3)"/><circle cx="${f(x)}" cy="${f(y)}" r=".18" fill="#e3c586" stroke="#111" stroke-width=".022"/><text x="${f(x)}" y="${f(y+.1)}" class="mn s${hot?' hot':''}">${n}</text>`;});}
      if(t==='fog')o+=`<text x="${f(c.x)}" y="${f(c.y+.2)}" class="mq">?</text>`;
      if(t==='desert'&&!det)o+=`<text x="${f(c.x)}" y="${f(c.y+.12)}" class="mt dim">desert</text>`;
      if(H.n&&t!=='village'){const hot=H.n===6||H.n===8;
        top+=`<circle cx="${f(c.x+.015)}" cy="${f(c.y+.065)}" r=".345" fill="rgba(0,0,0,.3)"/><circle cx="${f(c.x)}" cy="${f(c.y+.05)}" r=".34" fill="#e3c586" stroke="#111" stroke-width=".025"/><text x="${f(c.x)}" y="${f(c.y+.2)}" class="mn${hot?' hot':''}">${H.n}</text>`;
        const pips=6-Math.abs(7-H.n);for(let k=0;k<pips;k++)top+=`<circle cx="${f(c.x+(k-(pips-1)/2)*.085)}" cy="${f(c.y+.315)}" r=".03" fill="${hot?'#d3161d':'#111'}"/>`;}
    });
    o+=drawRivers()+top;
    return o;
  }
  function drawVillages(){
    let o='';
    (G.board.villages||[]).forEach((v,j)=>{const c=T.hexes[v.h].c;const idx=(G.board.villages.filter(x=>x.h===v.h)).indexOf(v);
      const ox=(idx-.5)*.62;
      o+=`<circle cx="${f(c.x+ox)}" cy="${f(c.y)}" r=".27" fill="#e3c586" stroke="#111" stroke-width=".03"/><text x="${f(c.x+ox)}" y="${f(c.y+.12)}" class="mn s">${v.n}</text><text x="${f(c.x+ox)}" y="${f(c.y+.5)}" class="mt">${v.cloth}</text>`;});
    return o;
  }
  /* ---------- Traders & Barbarians extras ---------- */
  function drawRivers(){
    let o='';
    (G.board.rivers||[]).forEach(idx=>{
      const first=T.hexes[idx[0]];const mouth=(G.board.bridges||[]).find(e=>T.edges[e].hexes.length===1&&first.e.includes(e));
      const path=[];if(mouth!=null){const E=T.edges[mouth];path.push([E.x+(E.x-first.c.x)*.5,E.y+(E.y-first.c.y)*.5]);path.push([E.x,E.y]);}
      idx.forEach(i=>path.push([T.hexes[i].c.x,T.hexes[i].c.y]));
      const d='M'+path.map(q=>`${f(q[0])} ${f(q[1])}`).join('L');
      o+=`<path d="${d}" fill="none" stroke="#1f5f8a" stroke-width=".24" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><path d="${d}" fill="none" stroke="#5db6ea" stroke-width=".15" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width=".035" stroke-dasharray=".12 .18" stroke-linecap="round" stroke-linejoin="round"/>`;
    });
    (G.board.bridges||[]).forEach(e=>{if(G.eOwn[e])return;const E=T.edges[e],A=T.verts[E.a],B=T.verts[E.b];
      o+=`<line x1="${f(A.x)}" y1="${f(A.y)}" x2="${f(B.x)}" y2="${f(B.y)}" stroke="#e9d29d" stroke-width=".11" stroke-dasharray=".1 .08" stroke-linecap="round" opacity=".85"/>`;});
    return o;
  }
  function drawGrounds(){
    let o='';
    (G.board.grounds||[]).forEach(g=>{
      const E=T.edges[g.e];const land=E.hexes.find(i=>isLandHex(i));const c=land!=null?T.hexes[land].c:{x:0,y:0};
      let dx=E.x-c.x,dy=E.y-c.y;const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;const px=E.x+dx*.64,py=E.y+dy*.64,A=T.verts[E.a],B=T.verts[E.b],hot=g.n===6||g.n===8;
      o+=`<path d="M${pt(A.x,A.y)}L${pt(px,py)}L${pt(B.x,B.y)}" fill="none" stroke="#bfe3f0" stroke-width=".05" opacity=".9"/>`;
      o+=`<circle cx="${f(px+.012)}" cy="${f(py+.03)}" r=".31" fill="rgba(0,0,0,.28)"/><circle cx="${f(px)}" cy="${f(py)}" r=".3" fill="#d4edf6" stroke="#2b7fa6" stroke-width=".05"/>`;
      o+=`<path d="M${f(px-.12)} ${f(py-.1)} Q${f(px-.02)} ${f(py-.19)} ${f(px+.08)} ${f(py-.1)} Q${f(px-.02)} ${f(py-.01)} ${f(px-.12)} ${f(py-.1)}Z M${f(px+.08)} ${f(py-.1)} L${f(px+.15)} ${f(py-.16)} L${f(px+.15)} ${f(py-.04)}Z" fill="#2b7fa6"/>`;
      o+=`<text x="${f(px)}" y="${f(py+.2)}" class="mn s${hot?' hot':''}">${g.n}</text>`;
    });
    return o;
  }
  function barbIcon(x,y){return `<g transform="translate(${f(x)} ${f(y)})"><ellipse cy=".17" rx=".12" ry=".04" fill="#000" opacity=".3"/><path d="M-.1,.15 Q-.1,-.02 0,-.02 Q.1,-.02 .1,.15 Z" fill="#8f2418" stroke="#2b0d08" stroke-width=".025"/><circle cy="-.1" r=".075" fill="#d08a5c" stroke="#2b0d08" stroke-width=".025"/><path d="M-.075,-.14 L-.15,-.25 L-.03,-.18 M.075,-.14 L.15,-.25 L.03,-.18" fill="none" stroke="#efe4c6" stroke-width=".035" stroke-linecap="round"/></g>`;}
  function drawBarbs(){
    let o='';
    if(G.barbs)Object.keys(G.barbs).forEach(h=>{const n=Math.min(3,G.barbs[h]||0);if(!n||!T.hexes[h])return;const c=T.hexes[h].c;
      for(let k=0;k<n;k++){const a=(150-k*60)*Math.PI/180;o+=barbIcon(c.x+Math.cos(a)*.62,c.y+Math.sin(a)*.5+.12);}});
    return o;
  }
  function camelIcon(x,y){return `<g transform="translate(${f(x)} ${f(y)})"><ellipse cy=".15" rx=".17" ry=".04" fill="#000" opacity=".3"/><path d="M-.17,.12 L-.15,-.02 Q-.15,-.08 -.1,-.06 Q-.08,-.16 -.03,-.07 Q.02,-.17 .06,-.05 Q.09,-.1 .11,-.19 L.17,-.2 L.15,-.03 L.16,.12 H.12 L.1,.03 H-.06 L-.09,.12 Z" fill="#c08a46" stroke="#3c2410" stroke-width=".028" stroke-linejoin="round"/></g>`;}
  /* a little boat: hull, mast, pennant and a sail that carries the trade ratio. Drawn in boat units (waterline y=0, sail up to y=-.7) */
  function boat(x,y,k){
    return `<g transform="translate(${f(x)} ${f(y)}) scale(${k})"><ellipse cy=".2" rx=".5" ry=".09" fill="rgba(8,45,85,.38)"/>`+
      `<path d="M-.5,.2 Q-.25,.27 0,.26 Q.25,.27 .5,.2" fill="none" stroke="rgba(255,255,255,.6)" stroke-width=".035" stroke-linecap="round"/>`+
      `<path d="M-.44,0 L.44,0 L.3,.21 L-.3,.21 Z" fill="#8c5a2b" stroke="#35200f" stroke-width=".04" stroke-linejoin="round"/><path d="M-.36,.1 H.36" stroke="#c9945a" stroke-width=".03"/>`+
      `<path d="M0,0 V-.84" stroke="#4a2f17" stroke-width=".05" stroke-linecap="round"/><path d="M0,-.84 L.2,-.79 L0,-.73 Z" fill="#c2392b" stroke="#35200f" stroke-width=".022" stroke-linejoin="round"/>`+
      `<path d="M-.36,-.7 Q0,-.64 .36,-.7 Q.44,-.35 .36,-.03 H-.36 Q-.44,-.35 -.36,-.7 Z" fill="#f7f0da" stroke="#a9966a" stroke-width=".035" stroke-linejoin="round"/></g>`;
  }
  function drawHarbors(){
    let o='';
    const K=.82;
    G.board.harbors.forEach(h=>{
      const E=T.edges[h.e];const land=E.hexes.find(i=>isLandHex(i));const c=land!=null?T.hexes[land].c:{x:0,y:0};
      let dx=E.x-c.x,dy=E.y-c.y;const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;
      /* keep the boat clear of the coast: its mast reaches up, so boats below a coast sit further out */
      const ext=K*(.44*Math.abs(dx)+(dy>0?.84*dy:.21*-dy)),d=Math.max(.46,ext+.1);
      const px=E.x+dx*d,py=E.y+dy*d,A=T.verts[E.a],B=T.verts[E.b];
      const hl={x:px-.38*K,y:py+.06*K},hr={x:px+.38*K,y:py+.06*K};
      const straight=Math.hypot(A.x-hl.x,A.y-hl.y)+Math.hypot(B.x-hr.x,B.y-hr.y)<=Math.hypot(A.x-hr.x,A.y-hr.y)+Math.hypot(B.x-hl.x,B.y-hl.y);
      const P=straight?[[A,hl],[B,hr]]:[[A,hr],[B,hl]];
      P.forEach(([v,q])=>{const dd=`M${pt(v.x,v.y)}L${pt(q.x,q.y)}`;
        o+=`<path d="${dd}" fill="none" stroke="#4a3b2a" stroke-width=".105" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="#b79d72" stroke-width=".06" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="rgba(60,40,20,.55)" stroke-width=".06" stroke-dasharray=".03 .075"/>`;});
      o+=boat(px,py,K);
      if(h.t==='any')o+=`<text x="${f(px)}" y="${f(py-.25*K)}" class="mh" style="font-size:${f(.36*K)}px">3:1</text>`;
      else{
        o+=`<text x="${f(px)}" y="${f(py-.43*K)}" class="mh" style="font-size:${f(.28*K)}px">2:1</text>`;
        if(ICON.color[h.t])o+=`<image href="${ICON.color[h.t]}" x="${f(px-.15*K)}" y="${f(py-.38*K)}" width="${f(.3*K)}" height="${f(.3*K)}"/>`;
        else o+=`<circle cx="${f(px)}" cy="${f(py-.23*K)}" r="${f(.1*K)}" fill="${KCOLS(h.t)[0]}"/>`;}
    });
    return o+drawGrounds();
  }
  function drawEdges(){
    let o='';
    G.eOwn.forEach((e,i)=>{if(!e)return;const E=T.edges[i],A=T.verts[E.a],B=T.verts[E.b],c=pcol(e.p);
      const k=.14;const ax=A.x+(B.x-A.x)*k,ay=A.y+(B.y-A.y)*k,bx=B.x+(A.x-B.x)*k,by=B.y+(A.y-B.y)*k;
      if(e.k==='bridge'){o+=`<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="#120c07" stroke-width=".3" stroke-linecap="butt"/><line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="#a9763f" stroke-width=".24" stroke-linecap="butt"/><line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="#5a3a1c" stroke-width=".24" stroke-dasharray=".025 .09" stroke-linecap="butt"/><line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="${c}" stroke-width=".07" stroke-linecap="butt"/>`;return;}
      o+=`<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="#120c07" stroke-width="${e.k==='ship'?.24:.22}" stroke-linecap="round"/>`;
      o+=`<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="${c}" stroke-width=".14" stroke-linecap="round"/>`;
      if(e.k==='ship')o+=`<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="#fff" stroke-width=".05" stroke-dasharray=".16 .14" stroke-linecap="butt" opacity=".85"/>`;
      if(e.dmg){o+=`<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="#d8402c" stroke-width=".06" stroke-dasharray=".05 .1"/><path d="M${f(E.x-.07)} ${f(E.y-.07)} l.14 .14 M${f(E.x+.07)} ${f(E.y-.07)} l-.14 .14" stroke="#d8402c" stroke-width=".05" stroke-linecap="round"/>`;}
    });
    (G.board.camelStarts||[]).forEach(e=>{if(G.camels&&G.camels[e])return;const E=T.edges[e];o+=`<circle cx="${f(E.x)}" cy="${f(E.y)}" r=".15" fill="none" stroke="#e0b26a" stroke-width=".045" stroke-dasharray=".07 .06"/>`;});
    if(G.camels)Object.keys(G.camels).forEach(e=>{const E=T.edges[e];o+=camelIcon(E.x,E.y);});
    if(G.kt)Object.keys(G.kt).forEach(e=>{const k=G.kt[e],E=T.edges[e];o+=`<g transform="translate(${f(E.x)} ${f(E.y)})"><ellipse cy=".26" rx=".15" ry=".04" fill="#000" opacity=".3"/><path d="M-.15,-.18 H.15 V.04 Q.15,.2 0,.27 Q-.15,.2 -.15,.04 Z" fill="${pcol(k.p)}" stroke="#120c07" stroke-width=".045" stroke-linejoin="round"/><path d="M-.15,-.18 H.15 V-.1 H-.15Z" fill="rgba(255,255,255,.35)"/><path d="M-.06,0 H.06 M0,-.06 V.15" stroke="#fff" stroke-width=".045" stroke-linecap="round"/></g>`;});
    return o;
  }
  function drawVerts(){
    let o='';
    G.vOwn.forEach((v,i)=>{if(!v)return;const V=T.verts[i],c=pcol(v.p),x=V.x,y=V.y;
      if(v.city){
        o+=`<polygon points="${pt(x-.3,y+.2)} ${pt(x-.3,y-.04)} ${pt(x-.06,y-.04)} ${pt(x-.06,y-.28)} ${pt(x+.14,y-.28)} ${pt(x+.14,y-.04)} ${pt(x+.3,y-.04)} ${pt(x+.3,y+.2)}" fill="${c}" stroke="${v.metro?'#ffd34d':'#120c07'}" stroke-width="${v.metro?.07:.045}" stroke-linejoin="round"/>`;
        if(v.wall)o+=`<line x1="${f(x-.34)}" y1="${f(y+.26)}" x2="${f(x+.34)}" y2="${f(y+.26)}" stroke="#e8dcc0" stroke-width=".06" stroke-dasharray=".08 .05"/>`;
      }else o+=`<polygon points="${pt(x-.2,y+.17)} ${pt(x-.2,y-.04)} ${pt(x,y-.22)} ${pt(x+.2,y-.04)} ${pt(x+.2,y+.17)}" fill="${c}" stroke="#120c07" stroke-width=".045" stroke-linejoin="round"/>`;
    });
    if(G.kn)Object.keys(G.kn).forEach(i=>{const k=G.kn[i],V=T.verts[i];if(!k)return;
      o+=`<g transform="translate(${f(V.x)} ${f(V.y-.42)})"><path d="M-.16,-.16 H.16 V.04 Q.16,.2 0,.26 Q-.16,.2 -.16,.04 Z" fill="${k.act?pcol(k.p):'#d8d2c4'}" stroke="${pcol(k.p)}" stroke-width=".06"/><text y=".1" class="mk1">${k.lvl||k.level||1}</text></g>`;});
    return o;
  }
  function drawThieves(){
    let o='';
    if(G.robber!=null&&T.hexes[G.robber]){const c=T.hexes[G.robber].c;
      o+=`<g transform="translate(${f(c.x+.46)} ${f(c.y-.1)})"><ellipse cx="0" cy=".22" rx=".2" ry=".08" fill="#000" opacity=".3"/><path d="M-.15,.2 Q-.15,-.1 0,-.1 Q.15,-.1 .15,.2 Z" fill="#1d1a17" stroke="#f2e6c8" stroke-width=".03"/><circle cy="-.2" r=".1" fill="#1d1a17" stroke="#f2e6c8" stroke-width=".03"/></g>`;}
    if(G.pirate!=null&&T.hexes[G.pirate]){const c=T.hexes[G.pirate].c;
      o+=`<g transform="translate(${f(c.x)} ${f(c.y)})"><path d="M-.3,.12 H.3 L.2,.3 H-.2 Z" fill="#1d1a17" stroke="#f2e6c8" stroke-width=".03"/><path d="M0,-.34 V.1 H-.22 Z" fill="#1d1a17" stroke="#f2e6c8" stroke-width=".03"/><path d="M.04,-.24 L.22,.1 H.04 Z" fill="#3a332b" stroke="#f2e6c8" stroke-width=".03"/></g>`;}
    return o;
  }
  function drawMarkers(){
    const tg=targets();if(!tg||!tg.list.length)return '';
    const col=tg.k==='h'?'#f2c14e':pcol(G.cur);let o='';
    tg.list.forEach(i=>{
      if(tg.k==='v'){const V=T.verts[i];const up=!!G.vOwn[i];
        o+=`<g class="mk" data-act="${tg.act}" data-i="${i}"><circle cx="${f(V.x)}" cy="${f(V.y)}" r=".5" fill="transparent"/><g class="pulse"><circle cx="${f(V.x)}" cy="${f(V.y)}" r="${up?.4:.24}" fill="${up?'none':col}" fill-opacity=".92" stroke="#fff" stroke-width="${up?.09:.07}"${up?' stroke-dasharray=".14 .08"':''}/></g></g>`;}
      else if(tg.k==='e'){const E=T.edges[i],A=T.verts[E.a],B=T.verts[E.b];const k=.2;
        const ax=A.x+(B.x-A.x)*k,ay=A.y+(B.y-A.y)*k,bx=B.x+(A.x-B.x)*k,by=B.y+(A.y-B.y)*k;
        o+=`<g class="mk" data-act="${tg.act}" data-i="${i}"><line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="transparent" stroke-width=".7" stroke-linecap="round"/><g class="pulse"><line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="#fff" stroke-width=".26" stroke-linecap="round" opacity=".95"/><line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="${col}" stroke-width=".16" stroke-linecap="round"/></g></g>`;}
      else{const h=T.hexes[i],poly=h.v.map(v=>pt(T.verts[v].x,T.verts[v].y)).join(' ');
        o+=`<g class="mk" data-act="${tg.act}" data-i="${i}"><polygon points="${poly}" fill="${col}" fill-opacity=".3" stroke="${col}" stroke-width=".09" stroke-linejoin="round"/></g>`;}
    });
    return o;
  }

  let hint=null;
  function drawHint(){
    if(!hint)return '';let o='';
    (hint.v||[]).forEach(v=>{const V=T.verts[v];o+=`<g class="pulse"><circle cx="${f(V.x)}" cy="${f(V.y)}" r=".46" fill="none" stroke="#ffb81f" stroke-width=".13"/><path d="M${pt(V.x,V.y-.52)}l-.2,-.34h.4z" fill="#ffb81f"/></g>`;});
    (hint.e||[]).forEach(e=>{const E=T.edges[e],A=T.verts[E.a],B=T.verts[E.b];o+=`<g class="pulse"><line x1="${f(A.x)}" y1="${f(A.y)}" x2="${f(B.x)}" y2="${f(B.y)}" stroke="#ffb81f" stroke-width=".34" stroke-linecap="round" opacity=".85"/><path d="M${pt(E.x,E.y-.3)}l-.2,-.34h.4z" fill="#ffb81f"/></g>`;});
    return o;
  }
  function setHint(h){hint=h;render();}
  /* The tiles, tokens, rivers and harbours only change when the board changes, so they live in a cached layer.
     Pieces, the robber, hints and tap targets are redrawn on top whenever the game changes. */
  let gS=null,gD=null,sKey='',dKey='';
  function ensureLayers(){
    if(gS&&gS.parentNode===svg&&gD&&gD.parentNode===svg)return;
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    gS=document.createElementNS(NS,'g');gD=document.createElementNS(NS,'g');
    svg.appendChild(gS);svg.appendChild(gD);sKey='';dKey='';
  }
  function staticKey(){
    const b=G.board,H=b.hexes;let k=b.id+'|'+(b.ver||0)+'|'+(detail?1:0)+'|';
    for(let i=0;i<H.length;i++){const h=H[i];k+=h.t+(h.n||'')+(h.nums?h.nums.join('.'):'')+';';}
    k+='|'+b.harbors.map(x=>x.e+x.t).join(',')+'|'+(G.conq?Object.keys(G.conq).filter(x=>G.conq[x]).join(','):'')+'|'+(b.bridges||[]).map(e=>G.eOwn[e]?1:0).join('');
    return k;
  }
  function render(){
    if(!svg||!G||!T||!G.board)return;
    if(boardId!==G.board.id){boardId=G.board.id;fit();}
    ensureLayers();
    const k=staticKey();
    if(k!==sKey){
      const defs=`<defs><pattern id="hatch" width=".16" height=".16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width=".16" height=".16" fill="none"/><line x1="0" y1="0" x2="0" y2=".16" stroke="#222" stroke-width=".05"/></pattern><pattern id="wheatp" width=".17" height=".17" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><rect width=".17" height=".17" fill="#f2d558"/><rect width=".17" height=".075" fill="#dfae3e"/></pattern></defs>`;
      gS.innerHTML=defs+drawSea()+drawHexes()+drawHarbors();sKey=k;
    }
    const d=drawVillages()+drawEdges()+drawVerts()+drawThieves()+drawBarbs()+drawHint()+drawMarkers();
    if(d!==dKey){gD.innerHTML=d;dKey=d;}
  }

  /* ---------- gestures ---------- */
  const ctmK=()=>{const m=svg.getScreenCTM();return m?1/m.a:vb.w/svg.clientWidth;};
  function onDown(e){
    svg.setPointerCapture&&svg.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY});
    if(ptrs.size===1){const mk=e.target.closest&&e.target.closest('.mk');tap={mk,t:performance.now(),moved:false};}else if(tap)tap.moved=true;
  }
  function onMove(e){
    const p=ptrs.get(e.pointerId);if(!p)return;
    const k=ctmK();
    if(ptrs.size===1){
      const dx=e.clientX-p.x,dy=e.clientY-p.y;
      if(tap&&Math.hypot(e.clientX-p.x0,e.clientY-p.y0)>9)tap.moved=true;
      if(tap&&tap.moved){vb.x-=dx*k;vb.y-=dy*k;clamp();apply();}
      p.x=e.clientX;p.y=e.clientY;
    }else if(ptrs.size===2){
      const [a,b]=[...ptrs.values()];const pa={x:a.x,y:a.y},pb={x:b.x,y:b.y};
      if(ptrs.get(e.pointerId)===a){a.x=e.clientX;a.y=e.clientY;}else{b.x=e.clientX;b.y=e.clientY;}
      const d0=Math.hypot(pa.x-pb.x,pa.y-pb.y),d1=Math.hypot(a.x-b.x,a.y-b.y);
      if(d0>10&&d1>10){
        const r=svg.getBoundingClientRect(),mx=((a.x+b.x)/2-r.left),my=((a.y+b.y)/2-r.top);
        const wx=vb.x+mx*k,wy=vb.y+my*k;const s=d0/d1;
        vb.w*=s;vb.h*=s;clamp();const k2=ctmK();vb.x=wx-mx*k2;vb.y=wy-my*k2;clamp();apply();
      }
      if(tap)tap.moved=true;
    }
  }
  function onUp(e){
    const had=ptrs.has(e.pointerId);ptrs.delete(e.pointerId);
    if(!had)return;
    if(tap&&ptrs.size===0&&!tap.moved&&tap.mk&&performance.now()-tap.t<700){
      const act=tap.mk.dataset.act,i=+tap.mk.dataset.i;const tg=targets();
      if(tg&&tg.act===act&&tg.list.includes(i)){if(window.sfx)sfx('click');boardAction(act,i);}
    }
    if(ptrs.size===0)tap=null;
  }
  function onWheel(e){
    e.preventDefault();const k=ctmK(),r=svg.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
    const wx=vb.x+mx*k,wy=vb.y+my*k,s=e.deltaY>0?1.12:.89;vb.w*=s;vb.h*=s;clamp();const k2=ctmK();vb.x=wx-mx*k2;vb.y=wy-my*k2;clamp();apply();
  }
  function bind(el){
    svg=el;svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.addEventListener('pointerdown',onDown);svg.addEventListener('pointermove',onMove);
    svg.addEventListener('pointerup',onUp);svg.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);tap=null;});
    svg.addEventListener('wheel',onWheel,{passive:false});
    window.addEventListener('resize',()=>{clamp();apply();});
  }
  return {bind,render,fit,setHint,setDetail(v){detail=!!v;try{localStorage.setItem('tidehaven.detail',v?'1':'0');}catch(e){}render();},get detail(){return detail;},get vb(){return vb;}};
})();
