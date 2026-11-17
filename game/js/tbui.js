'use strict';
/* =====================================================================
   FRONTIER & RAIDERS: interface pieces
   ===================================================================== */
const VAR_LIST=[['two','Two-player rules','Two neutral players grow whenever you build roads and settlements, you roll twice each turn, and trade tokens let you force trades or send the robber home.'],
  ['friendly','Friendly Robber','The robber leaves players with 2 points or fewer alone.'],
  ['events','Event cards','A deck of 36 event cards replaces the dice, with the same odds and an event on some cards. Adds no points.'],
  ['harbor','Harbormaster','First to 3 harbor points (settlement 1, city 2 on harbors) gets 2 points. Adds 1 point to the target.']];
function tbTargets(p){
  const pd=G.pending;
  if(pd){
    if(pd.type==='neutral'){const t=neutralTargets(pd.kind);return {k:pd.kind==='settlement'?'v':'e',act:'neutral',list:Object.keys(t).map(Number),neutral:true};}
    if(pd.type==='camel')return {k:'e',act:'camel',list:camelSpots()};
    if(pd.type==='kplace')return {k:'e',act:'kplace',list:kplaceSpots(pd)};
    if(pd.type==='capture')return {k:'h',act:'capture',list:captureTargets()};
    if(pd.type==='treason')return {k:'h',act:'treason',list:treasonTargets()};
    if(pd.type==='kmoves'){if(UI.ktFrom==null)return {k:'e',act:'ktpick',list:Object.keys(G.kt).map(Number).filter(knightCanMove)};
      return {k:'e',act:'ktdrop',list:knightRange(UI.ktFrom,UI.ktBoost?5:3)};}
    return undefined;
  }
  if(UI.mode==='bridge')return {k:'e',act:'bridge',list:bridgeSpots(p)};
  return undefined;
}
function tbBoardAction(a,i){
  switch(a){
    case 'neutral':return placeNeutral(i);
    case 'camel':return placeCamel(i);
    case 'kplace':return kplace(i);
    case 'capture':return capture(i);
    case 'treason':return treason(i);
    case 'ktpick':UI.ktFrom=i;refresh();return false;
    case 'ktdrop':{const ok=moveEdgeKnight(UI.ktFrom,i,!!UI.ktBoost);if(ok){UI.ktFrom=null;UI.ktBoost=false;}return ok;}
    case 'bridge':{const ok=buildBridge(i);if(ok)UI.mode=null;return ok;}
  }
  return null;
}
function tbStatus(){
  const pd=G.pending;
  if(pd){const m={neutral:`Build a neutral ${pd.kind}.<span class="sub">Every ${pd.kind} you build gives a neutral player one too. Tap a grey spot.</span>`,
      camel:`${esc(nm(pd.chooser||G.cur))}, place the camel.<span class="sub">Extend a caravan from the oasis.</span>`,
      kplace:`Place your knight.<span class="sub">${pd.castle?'On an empty edge of the castle.':'On any empty edge.'}</span>`,
      capture:'Capture a barbarian.<span class="sub">Tap a coastal tile with barbarians.</span>',
      treason:pd.from==null?'Treason: pick barbarians to move.<span class="sub">Tap a coastal tile with barbarians, or Skip.</span>':'Treason: where do they go?<span class="sub">Tap another coastal tile.</span>',
      kmoves:UI.ktFrom==null?'Move your knights, then tap Done.<span class="sub">Tap a knight. Each moves up to 3 edges (5 for 1 grain).</span>':'Tap where the knight should ride.',
      vote:'Camel vote in progress.'};
    if(m[pd.type])return m[pd.type];}
  if(UI.mode==='bridge')return 'Build a bridge.<span class="sub">Tap a river crossing next to your road.</span>';
  return null;
}
function tbWanted(){
  const pd=G.pending;if(!pd)return null;
  if(pd.type==='give'&&!CK()){const why=`${pd.why}: give ${pd.n} card${pd.n>1?'s':''} of your choice to ${nm(pd.to)}.`;
    if(pd.from!==G.cur&&privateFor(pd.from,why))return {type:'gate'};const key=pd.from+':'+G.logId+':'+pd.why;if(UI.giveKey!==key){UI.giveKey=key;UI.giveSel={};}return {type:'give'};}
  if(pd.type==='vote'){const who=pd.order.find(x=>pd.bids[x]==null);if(privateFor(who,'Camel vote: bid wool and grain for the right to place the next camel.'))return {type:'gate'};
    const key='vote'+who+G.logId;if(UI.voteKey!==key){UI.voteKey=key;UI.vote={wool:0,grain:0};}return {type:'vote',who};}
  return null;
}
function tbBuildButtons(pl,p){
  const B=[],sc=G.opts.scen,v=VARS();
  if(sc==='rivers')B.push(['bridge','Bridge',{brick:2,wood:1},pl.bridges]);
  if(sc==='rivers'||sc==='barbattack')B.push(['gold','Gold',null,pl.gold]);
  if(sc==='fish')B.push(['fish','Fish',null,fishTotal(p)]);
  if(v.two)B.push(['tokens','Tokens',null,pl.tokens]);
  if(G.eOwn.some(o=>o&&o.p===p&&o.dmg))B.push(['repair','Repair road',COST.road,null]);
  return B;
}
function tbBuildState(k,p){
  if(k==='bridge')return bridgeSpots(p).length>0&&canAfford(p,{brick:2,wood:1});
  if(k==='repair')return canAfford(p,COST.road);
  if(['gold','fish','tokens'].includes(k))return true;
  return false;
}
function tbAlwaysOpen(k){return ['tokens','fish','gold'].includes(k);}
function tbScoreExtra(pl,p){
  const out=[],sc=G.opts.scen,v=VARS();
  if(v.two)out.push(`<span>tokens <b>${pl.tokens}</b></span>`);
  if(v.harbor)out.push(`<span>harbor pts <b>${harborPoints(p)}</b></span>`);
  if(sc==='fish')out.push(`<span>fish <b>${handVisible(p)?fishTotal(p):(pl.fish.length+' tokens')}</b></span>`);
  if(sc==='rivers'||sc==='barbattack')out.push(`<span>gold <b>${pl.gold}</b></span>`);
  if(sc==='barbattack')out.push(`<span>prisoners <b>${pl.prisoners}</b></span><span>knights <b>${6-pl.knightsLeft}</b></span>`);
  return out.join('');
}
function tbBadges(p){
  const b=[],sc=G.opts.scen;
  if(G.harborMaster===p)b.push('Harbormaster');
  if(G.boot===p)b.push('Old boot (+1 to win)');
  if(sc==='rivers'){const g=[0,1].map(q=>P(q).gold);if(g[p]===Math.max(...g)&&g[1-p]<g[p])b.push('Wealthiest +1');if(g[p]===Math.min(...g)&&g[1-p]>g[p])b.push('Poor −2');}
  if(sc==='caravans'){const c=camelVP(p);if(c)b.push(`Camels +${c}`);}
  return b;
}
function tbSheet(s){
  const p=G.cur,q=1-p,pl=P(p);
  switch(s.type){
  case 'tokens':{const why=tokenBlock(p),c=tokenCost(p);const kc=pl.knights>0&&pl.knightCash!==G.turn&&G.tokenSupply>0;
    return `<div class="sheet"><h2>Trade tokens</h2><p class="lead">You hold ${pl.tokens}. Each action costs ${c} token${c>1?'s':''} (2 when you are ahead on points). One action per turn, before rolling or after.</p>
      <div class="menu"><button class="btn" data-act="tforce" ${why||handCount(q)===0?'disabled':''}>Forced trade: take 2 random cards from ${esc(nm(q))}, then give back 2 of your choice</button>
      <button class="btn" data-act="trob" ${why||G.robber==null?'disabled':''}>Send the robber ${G.board.hexes.some(h=>h.t==='desert')?'to the desert':'off the board'}</button>
      <button class="btn" data-act="tcash" ${kc?'':'disabled'}>Return a played Knight for 2 tokens${pl.knights?'':' (none played)'}</button></div>
      ${why?`<p class="note">${why}</p>`:''}<div class="btns"><button class="btn ghost" data-act="close">Close</button></div></div>`;}
  case 'fish':{const tot=fishTotal(p);const opts=[['robber','Send the robber off the board'],['steal','Steal a random resource'],['resource','Take a resource of your choice'],['road','Build a road for free'],['dev','Take a development card']];
    return `<div class="sheet"><h2>Fish</h2><p class="lead">You hold ${tot} fish in ${pl.fish.length} token${pl.fish.length===1?'':'s'} (${pl.fish.join(', ')||'none'}). Tokens can’t be split, so extra fish is lost. You may hold up to 7 tokens.</p>
      <div class="fishtoks">${pl.fish.slice().sort((a,c)=>c-a).map(v=>`<span class="fishtok" title="${v} fish">${v}</span>`).join('')||'<em>No fish yet.</em>'}${G.boot===p?'<span class="fishtok boot" title="Old boot">boot</span>':''}</div>
      <div class="menu">${opts.map(([k,l])=>{const w=fishBlock(p,k);return `<button class="btn" data-act="fishgo" data-v="${k}" ${w?'disabled':''}>${FISH_COST[k]} fish: ${l}${w&&w!=='Not now.'?` (${w})`:''}</button>`;}).join('')}
      ${G.boot===p?`<button class="btn" data-act="boot" ${pubVP(q)>=pubVP(p)&&!G.pending?'':'disabled'}>Hand the old boot to ${esc(nm(q))}${pubVP(q)>=pubVP(p)?'':' (only to a player with at least your points)'}</button>`:''}</div>
      <div class="btns"><button class="btn ghost" data-act="close">Close</button></div></div>`;}
  case 'tbgold':{const w=goldBuyBlock(p),rt=rates(p);
    return `<div class="sheet"><h2>Gold</h2><p class="lead">You hold ${pl.gold} gold. Gold can’t be stolen and doesn’t count toward your hand. Buy a resource for 2 gold, twice per turn.</p>
      <h3>Buy for 2 gold</h3>${pickRow('gbuy',RES,null,k=>w||G.bank[k]<1?'disabled':'')}
      ${G.opts.scen==='rivers'?`<h3>Sell for 1 gold</h3><div class="pick">${RES.map(k=>`<button class="rt" data-act="gsell" data-r="${k}" ${pl.res[k]<rt[k]||!G.rolled||G.pending?'disabled':''}>${img(k)}<span class="rate">${rt[k]}:1</span></button>`).join('')}</div>`:''}
      ${w?`<p class="note">${w}</p>`:''}<div class="btns"><button class="btn ghost" data-act="close">Close</button></div></div>`;}
  case 'vote':{const who=s.who,wp=P(who),b=UI.vote;
    return `<div class="sheet"><h2>${esc(nm(who))}, place your bid</h2><p class="lead">Bid any number of wool and grain. Whoever bids more places the next camel; on a tie, ${esc(nm(G.cur))} places it. Bids go to the bank.</p>
      <div class="stps" style="grid-template-columns:repeat(2,minmax(0,1fr))">${['wool','grain'].map(k=>stepper('vote',k,b[k],wp.res[k],`have ${wp.res[k]}`)).join('')}</div>
      <div class="btns"><button class="btn primary" data-act="vote">Bid ${b.wool+b.grain}</button></div></div>`;}
  case 'badraw':{const t=s.t,c=BA_DEV[t];if(!c)return '';const pd=G.pending;const more=pd&&['kplace','capture','treason'].includes(pd.type)?'Now choose on the board.':(t==='treason'?'You took 2 gold. There were no barbarians to move.':'Nothing could be done with it right now.');
    return `<div class="sheet"><h2>You drew a card</h2><div class="tbc"><b>${c.n}</b><p>${c.d}</p></div><p class="lead">Barbarian Attack cards are played the moment you buy them. ${more}</p><div class="btns"><button class="btn primary" data-act="close">Continue</button></div></div>`;}
  case 'evlist':{const nums={};EVENT_DECK.forEach(([n,ev])=>{(nums[ev]=nums[ev]||new Set()).add(n);});const left=tbDeckLeft();
    return `<div class="sheet rules"><h2>Event cards</h2><p class="lead">The deck holds 36 cards and replaces the dice. ${left!=null?`${left} card${left===1?'':'s'} before the next reshuffle.`:''}</p>
      ${Object.keys(EVENTS).map(k=>`<div class="tbc"><b>${EVENTS[k].n}</b> <small>on ${[...nums[k]].sort((a,c)=>a-c).join(', ')}</small><p>${EVENTS[k].d}</p></div>`).join('')}
      <div class="btns"><button class="btn ghost" data-act="close">Close</button></div></div>`;}
  case 'give':return ckSheet(s);
  }
  return null;
}
const TBACT={
  evlist(){UI.sheet={type:'evlist'};refresh();},
  tforce(){const took=forcedTrade();if(took){UI.sheet=null;sfx('card');toast(`You took ${took.map(KNAME).join(' and ')||'nothing'}. Now give 2 back.`);}refresh();},
  trob(){if(tokenRobber()){UI.sheet=null;sfx('place');}refresh(true);},
  tcash(){if(cashKnight())sfx('card');refresh();},
  fishgo(d){if(spendFish(d.v)){UI.sheet=null;sfx('card');}refresh(true);},
  boot(){if(giveBoot()){UI.sheet=null;}refresh();},
  gbuy(d){if(buyWithGold(d.r))sfx('card');refresh();},
  gsell(d){if(sellForGold(d.r))sfx('card');refresh();},
  vote(){if(castVote(UI.vote)){UI.vote={wool:0,grain:0};sfx('card');}refresh();},
  ktdone(){if(finishKnightMoves()!==false){UI.ktFrom=null;sfx('place');}refresh(true);},
  ktboost(){UI.ktBoost=!UI.ktBoost;refresh();},
  vtoggle(d){UI.setup.vars=UI.setup.vars||{};UI.setup.vars[d.v]=!UI.setup.vars[d.v];UI.setup.target=null;previewGame(G&&G.preview?null:null);refresh();}
};
function tbStep(k,r){if(k==='vote'){const pd=G.pending;const who=pd.order.find(x=>pd.bids[x]==null);return {o:UI.vote,max:P(who).res[r]};}return null;}

/* ---- event card display ---- */
function tbDeckLeft(){if(!G||!G.evDeck)return null;const i=G.evDeck.findIndex(c=>c.ev==='newyear');return i<0?null:G.evDeck.length-1-i;}
function tbEventChip(){
  if(!G||G.preview||!VARS().events)return '';
  const c=G.lastEvent,left=tbDeckLeft();
  if(!c)return `<button class="evc" data-act="evlist"><span class="num">?</span><span><b>Event cards</b><small>Draw an event to start. Tap to see every card.</small></span></button>`;
  const e=EVENTS[c.ev]||EVENTS.none;
  return `<button class="evc" data-act="evlist"><span class="num${c.n===6||c.n===8?' hot':''}">${c.n}</span><span><b>${e.n}</b><small>${e.d}${left!=null?` · ${left} left before reshuffle`:''}</small></span></button>`;
}

/* ---- how to play: Frontier & Raiders ---- */
function tbRulesHTML(sc){
  const o=[];const row=(h,t)=>o.push(`<dt>${h}</dt><dd>${t}</dd>`);const card=(h,t)=>`<div class="tbc"><b>${h}</b><p>${t}</p></div>`;
  const id=sc&&sc.tb;
  if(sc&&sc.tbBoard)row('Frontier &amp; Raiders: '+esc(sc.name),esc(sc.sub)+' Scenarios are for two players, on the Tidehaven island, and every normal rule still applies.');
  if(id==='fish'){
    row('Fishermen: the board','A lake sits in the middle of the island (numbers 2, 3, 11 and 12) and six fishing grounds ring the coast (4, 5, 6, 8, 9, 10). A settlement or city touching the lake or a ground catches fish when its number rolls: 1 fish token for a settlement, 2 for a city. The robber on the lake stops it.');
    row('Fish tokens','There are tokens worth 1, 2 and 3 fish. You may hold up to 7 tokens, keeping the biggest if you catch more. Your second starting settlement also catches fish at once if it touches the lake or a ground. Fish are not cards: they cannot be stolen, traded or discarded on a 7.');
    row('Spending fish','Open <b>Fish</b> after rolling. 2 fish: send the robber off the board. 3: steal a random card from your opponent. 4: take any resource. 5: build a free road. 7: take a development card. Tokens are not split, so pay with the smallest tokens that cover the price; extra fish is lost.');
    row('The old boot','One token in the pool is an old boot. Whoever catches it needs 11 points to win instead of 10. On your turn you may hand it to your opponent if they have at least as many points as you.');
  }
  if(id==='rivers'){
    row('Rivers: the board','Two rivers run across the island. Each river tile is a mountain, hill, pasture or swamp, and the robber starts in a swamp.');
    row('Earning gold','+1 gold for every settlement you build touching a river tile and +1 for every road along a river. Gold is not a card: it cannot be stolen or discarded.');
    row('Bridges','You have 3 bridges. A bridge costs 2 brick + 1 lumber and goes on a marked river crossing next to one of your roads or buildings. It earns 3 gold at once. Bridges count as roads for Longest Road, but normal roads cannot be built on those spots.');
    row('Spending gold','Open <b>Gold</b>. Buy any resource for 2 gold, up to twice per turn. You can also sell resources for 1 gold each at your trade rate (4:1, 3:1 or 2:1).');
    row('Wealth and poverty','When your gold is higher than your opponent’s you are the Wealthiest Settler: +1 point. When it is lower you are the Poor Settler: −2 points. If you are level, nobody gets either card.');
  }
  if(id==='caravans'){
    row('Caravans: the board','The middle of the island is an oasis. Three camel trails start from it and the bank holds 22 camels. A camel sits on an edge, just like a road.');
    row('Placing camels','After a turn in which you built a settlement or city, both players secretly bid wool and grain. The higher total wins and places the next camel at the end of any open caravan (tie: the player whose turn it is). All bids go to the bank. A caravan stops when it meets another camel or runs out of room.');
    row('Camel points','A settlement or city touching two or more camels is worth +1 point. A road with a camel on it counts as two roads for Longest Road. You need 12 points to win.');
  }
  if(id==='barbattack'){
    row('Barbarian Attack: the board','The Castle is in the middle. One forest has become desert. Barbarians come from the sea onto the coastal land tiles; they start on the coastal 2 and 12. You need 12 points to win.');
    row('Barbarian landings','Every time any player builds a settlement or city after setup, three barbarians land: roll two dice three times (ignoring 7s and repeats) and add a barbarian to a coastal tile with that number. A tile with 3 barbarians is conquered: it produces nothing and nobody can build roads or new settlements where every neighbouring land tile is conquered. A settlement or city that touches only conquered tiles costs its owner 1 point (2 for a city).');
    row('Buying knights','A development card costs wool, grain and ore, and a Barbarian Attack card is played the moment you buy it. Each player has 6 knights. Knights stand on edges, like roads.');
    row('The cards','<div class="tbcs">'+Object.keys(BA_DEV).map(k=>card(BA_DEV[k].n,BA_DEV[k].d)).join('')+'</div>The deck holds 14 Knighthood, 4 Swift Knight, 4 Capture and 4 Treason cards.');
    row('Moving knights','At the end of your turn you move each of your knights up to 3 edges, or up to 5 for 1 grain. Knights on the Castle must ride out first. Tap a knight, then tap where it should go, then press Done.');
    row('Battle','After the moves, every coastal tile with barbarians is checked, starting at the 4 and going round the coast. If more knights touch a tile than it has barbarians, the knights win: each side with a knight there takes a prisoner, and any left over go to the side with more knights. The tile is freed. Then a die is rolled and the knights on two of the tile’s six edges fall; their owners each receive 3 gold. Knights that did not outnumber the barbarians stay put.');
    row('Prisoners and gold','Every 2 prisoners are worth 1 point. Gold buys a resource at 2 gold each, twice per turn (open <b>Gold</b>).');
  }
  const v=(G&&G.opts.vars)||{};
  if(v.two)row('Two-player rules','Two grey neutral players sit on the island. Whenever you build a road or settlement, tap a grey spot to build the same for a neutral player. You roll twice each turn (the second roll must differ from the first). <b>Trade tokens:</b> you start with 5 and gain 1 for a coastal settlement and 2 for one touching the desert. Once per turn, for 1 token (2 if you are ahead on points) you may force a trade (take 2 random cards from your opponent, then give back 2 of your choice) or send the robber to the desert. You may also return a played Knight for 2 tokens.');
  if(v.friendly)row('Friendly Robber','The robber may not be placed on a tile next to a player with 2 points or fewer.');
  if(v.events){const nums={};EVENT_DECK.forEach(([n,ev])=>{(nums[ev]=nums[ev]||new Set()).add(n);});
    row('Event cards','Instead of rolling dice you draw a card from a 36-card deck. Each card shows a number, which produces like a dice roll, and some also trigger an event. The numbers appear exactly as often as two dice would roll them. When the New Year card comes up, the deck is reshuffled. The current card is always shown above your hand; tap it to see them all.<div class="tbcs">'+Object.keys(EVENTS).map(k=>card(EVENTS[k].n+' <small>('+[...nums[k]].sort((a,c)=>a-c).join(', ')+')</small>',EVENTS[k].d)).join('')+'</div>');}
  if(v.harbor)row('Harbormaster','A settlement on a harbor scores 1 harbor point and a city 2. The first player to reach 3 harbor points takes the Harbormaster title: +2 points. The title passes to the opponent as soon as they have more harbor points, at least 3. The points needed to win rise by 1.');
  return o.join('');
}
