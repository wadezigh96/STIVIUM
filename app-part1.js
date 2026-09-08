function normalize(list, get){
  const vals = list.map(get);
  const min = Math.min(...vals), max = Math.max(...vals);
  return v => max === min ? 0.5 : (v - min) / (max - min);
}
function growth(now, prior){
  if(prior <= 0) return now > 0 ? 1 : 0;
  return (now - prior) / prior;
}
function computeScores(list){
  const scarcityNorm = normalize(list, a => 1 / a.peerCount);
  const trackNorm = normalize(list, a => a.uptimeDays);
  const successNorm = normalize(list, a => a.successRate);
  const scored = list.map(a => {
    const scarcity = scarcityNorm(1 / a.peerCount);
    const track = trackNorm(a.uptimeDays);
    const consistency = successNorm(a.successRate);
    const verified = a.verified ? 1 : 0;
    const rarity = 0.35*scarcity + 0.30*track + 0.25*consistency + 0.10*verified;
    const g24 = growth(a.h24n, a.h24p);
    const g7 = growth(a.h7n, a.h7p);
    const accel = g24 - g7;
    const trending = 0.5*g24 + 0.3*g7 + 0.2*accel;
    return {...a, rarity, trending, g24, g7, accel, sub:{scarcity, track, consistency, verified}};
  });
  const byRarity = [...scored].sort((a,b) => b.rarity - a.rarity);
  byRarity.forEach((a, i) => {
    const pct = i / byRarity.length;
    if(pct < 0.05) a.tier = 'legendary';
    else if(pct < 0.15) a.tier = 'epic';
    else if(pct < 0.40) a.tier = 'rare';
    else if(pct < 0.70) a.tier = 'uncommon';
    else a.tier = 'common';
  });
  return scored;
}
const TIER_LABEL = {legendary:'Legendary', epic:'Epic', rare:'Rare', uncommon:'Uncommon', common:'Common'};
const TREND_LABEL = (t, list) => {
  const sorted = [...list].sort((a,b)=>b.trending-a.trending);
  const rank = sorted.findIndex(x => x.name === t.name) / sorted.length;
  if(t.trending < 0) return {cls:'cooling', label:'▼ Cooling'};
  if(rank < 0.2) return {cls:'hot', label:'🔥 Hot'};
  if(rank < 0.5) return {cls:'rising', label:'▲ Rising'};
  return {cls:'flat', label:'— Flat'};
};
let currentCat = 'All';
let currentSort = 'rarity';
let activations = {};
function fmtUsd(v){
  if(v >= 1e6) return '$'+(v/1e6).toFixed(2)+'M';
  if(v >= 1e3) return '$'+(v/1e3).toFixed(0)+'K';
  return '$'+v;
}
function sparklinePath(hist){
  const w=120,h=28,pad=2;
  const max=Math.max(...hist,1), min=Math.min(...hist,0);
  const pts=hist.map((v,i)=>{
    const x=pad+i*((w-2*pad)/(hist.length-1));
    const y=h-pad-((v-min)/(max-min||1))*(h-2*pad);
    return x+','+y;
  });
  return pts.join(' ');
}
function fakeSyncTime(){
  const secs=Math.floor(Math.random()*40)+5;
  return secs<60?`synced ${secs}s ago`:`synced ${Math.floor(secs/60)}m ago`;
}
function renderDiversity(){
  const scored=computeScores(AGENTS);
  const root=document.getElementById('diversity');
  const cats=['Rebalancing','Grid Trading','Yield Optimisation','Health Factor Monitoring'];
  root.innerHTML=cats.map(cat=>{
    const items=scored.filter(a=>a.cat===cat);
    const avgSuccess=Math.round(items.reduce((s,a)=>s+a.successRate,0)/items.length);
    return `<div class="div-card"><div class="cat-name">${cat}</div><div class="cat-metrics"><span>${items.length} agents</span><span>${avgSuccess}% avg success</span></div><div class="div-bar"><i style="width:${avgSuccess}%"></i></div></div>`;
  }).join('');
}
function render(){
  const scored=computeScores(AGENTS);
  let list=currentCat==='All'?scored:scored.filter(a=>a.cat===currentCat);
  if(currentSort==='rarity') list=[...list].sort((a,b)=>b.rarity-a.rarity);
  else if(currentSort==='trending') list=[...list].sort((a,b)=>b.trending-a.trending);
  else if(currentSort==='tvl') list=[...list].sort((a,b)=>b.tvl-a.tvl);
  else list=[...list].sort((a,b)=>b.successRate-a.successRate);
  document.getElementById('floorCount').textContent=list.length+' agents available';
  const grid=document.getElementById('grid');
  if(!list.length){grid.innerHTML='<div class="empty">No agents in this view.</div>';return;}
  grid.innerHTML=list.map(a=>{
    const tr=TREND_LABEL(a,scored);
    return `<div class="card tier-${a.tier}" data-name="${a.name}">
      <div class="card-top"><div><h3>${a.name}</h3><div class="cat-tag">${a.cat}</div></div><span class="tier-tag">${TIER_LABEL[a.tier]}</span></div>
      <div class="stats"><div class="stat"><b>${fmtUsd(a.tvl)}</b><span>TVL</span></div><div class="stat"><b>${a.uptimeDays}d</b><span>Live</span></div><div class="stat"><b>${a.successRate}%</b><span>Success</span></div><div class="stat"><b>${a.keyValue}</b><span>${a.keyLabel}</span></div></div>
      <svg class="spark" width="120" height="28" viewBox="0 0 120 28"><polyline fill="none" stroke="#f0b90b" stroke-width="1.5" points="${sparklinePath(a.hist7)}"/></svg>
      <div class="card-bottom"><span class="trend ${tr.cls}">${tr.label}</span><button class="hire-btn" data-open="${a.name}">${activations[a.name]?.stage==='done'?'View activation':'Hire agent'}</button></div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.card').forEach(card=>{
    card.addEventListener('click',e=>{if(e.target.closest('.hire-btn'))return;openModal(card.dataset.name);});
  });
  grid.querySelectorAll('.hire-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{e.stopPropagation();openModal(btn.dataset.open,true);});
  });
}
function renderCats(){
  const root=document.getElementById('catList');
  const scored=computeScores(AGENTS);
  root.innerHTML=CATEGORIES.map(c=>{
    const n=c==='All'?scored.length:scored.filter(a=>a.cat===c).length;
    return `<button class="cat-btn ${currentCat===c?'active':''}" data-cat="${c}">${c}<span class="n">${n}</span></button>`;
  }).join('');
  root.querySelectorAll('.cat-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{currentCat=btn.dataset.cat;renderCats();render();});
  });
}
document.getElementById('sortList').querySelectorAll('.sort-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{currentSort=btn.dataset.sort;document.querySelectorAll('.sort-btn').forEach(b=>b.classList.toggle('active',b===btn));render();});
});
function renderTicker(){
  const scored=computeScores(AGENTS);
  const items=[...scored].sort((a,b)=>b.trending-a.trending).slice(0,8);
  const html=items.map(a=>`<span class="item"><b>${a.name}</b> ${a.g24>=0?'<span class="up">▲</span>':'<span class="down">▼</span>'} ${(a.g24*100).toFixed(0)}%</span>`).join('');
  document.getElementById('ticker').innerHTML=html+html;
}
document.getElementById('dismissOnboard').addEventListener('click',()=>{document.getElementById('onboard').style.display='none';});
