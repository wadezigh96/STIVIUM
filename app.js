function getAgentCatalog(){
  if (typeof AGENTS !== "undefined" && Array.isArray(AGENTS)) return AGENTS;
  if (Array.isArray(window.AGENTS)) return window.AGENTS;
  return [];
}

function normalize(list, get){
  list = Array.isArray(list) ? list : [];
  const vals = list.map(get);
  const min = Math.min(...vals), max = Math.max(...vals);
  return v => max === min ? 0.5 : (v - min) / (max - min);
}

function growth(now, prior){
  if(prior <= 0) return now > 0 ? 1 : 0;
  return (now - prior) / prior;
}

function computeScores(list){
  list = Array.isArray(list) ? list : [];
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
    const restraint = Math.max(5, Math.min(99, Math.round(
      0.55 * a.successRate +
      0.25 * (100 - Math.min(100, a.peerCount * 6)) +
      (a.verified ? 12 : 0) -
      Math.min(20, Math.max(0, growth(a.h24n, a.h24p) * 40))
    )));
    return {...a, rarity, trending, g24, g7, accel, restraint, sub:{scarcity, track, consistency, verified}};
  });
  const byRarity = [...scored].sort((a,b) => b.rarity - a.rarity);
  byRarity.forEach((a, i) => {
    const pct = i / byRarity.length;
    if (pct < 0.05) a.tier = "legendary";
    else if (pct < 0.15) a.tier = "epic";
    else if (pct < 0.40) a.tier = "rare";
    else if (pct < 0.70) a.tier = "uncommon";
    else a.tier = "common";
  });
  const byTrend = [...scored].sort((a,b) => b.trending - a.trending);
  byTrend.forEach((a, i) => {
    const pct = i / byTrend.length;
    if (a.trending < 0) a.trendBadge = "cooling";
    else if (pct < 0.20) a.trendBadge = "hot";
    else if (pct < 0.50) a.trendBadge = "rising";
    else a.trendBadge = "flat";
  });
  return scored;
}

let activeCat = "All";
let activeSort = "rarity";
let activations = {};
const ACTIVATION_KEY = "stivium-activations-v1";
try {
  const saved = JSON.parse(localStorage.getItem(ACTIVATION_KEY) || "{}");
  if (saved && typeof saved === "object") activations = saved;
} catch (_) {}
function persistActivations(){
  try { localStorage.setItem(ACTIVATION_KEY, JSON.stringify(activations)); } catch (_) {}
}

const TIER_LABEL = {legendary:"Legendary", epic:"Epic", rare:"Rare", uncommon:"Uncommon", common:"Common"};
const TREND_LABEL = {hot:"🔥 Hot", rising:"▲ Rising", flat:"— Flat", cooling:"▼ Cooling"};

function fmtUsd(v){
  if(v >= 1_000_000) return "$" + (v/1_000_000).toFixed(2) + "M";
  if(v >= 1_000) return "$" + (v/1_000).toFixed(0) + "K";
  return "$" + v;
}
function sparklinePath(hist){
  const w = 100, h = 26, pad = 2;
  const min = Math.min(...hist), max = Math.max(...hist);
  const pts = hist.map((v,i) => {
    const x = pad + (i/(hist.length-1||1))*(w-2*pad);
    const y = h - pad - ((v-min)/(max-min||1))*(h-2*pad);
    return x.toFixed(1)+","+y.toFixed(1);
  });
  return pts.join(" ");
}
function syncTime(){
  if (window.StiviumLive && typeof window.StiviumLive.syncLabel === "function") {
    return window.StiviumLive.syncLabel();
  }
  return "seed catalog";
}
function renderDiversity(){
  const scored = computeScores(getAgentCatalog());
  const root = document.getElementById("diversity");
  const cats = ["Rebalancing","Grid Trading","Yield Optimisation","Health Factor Monitoring"];
  root.innerHTML = cats.map(cat => {
    const items = scored.filter(a => a.cat === cat);
    const avgSuccess = Math.round(items.reduce((s,a)=>s+a.successRate,0)/items.length);
    return `<div class="div-card"><div class="cat-name">${cat}</div><div class="cat-metrics"><span>${items.length} agents</span><span>${avgSuccess}% avg success</span></div><div class="div-bar"><i style="width:${avgSuccess}%"></i></div></div>`;
  }).join("");
}
function render(){
  const scored = computeScores(getAgentCatalog());
  let list = activeCat === "All" ? scored : scored.filter(a => a.cat === activeCat);
  if(activeSort === "rarity") list = [...list].sort((a,b)=>b.rarity-a.rarity);
  else if(activeSort === "trending") list = [...list].sort((a,b)=>b.trending-a.trending);
  else if(activeSort === "tvl") list = [...list].sort((a,b)=>b.tvl-a.tvl);
  else list = [...list].sort((a,b)=>b.successRate-a.successRate);
  document.getElementById("floorCount").textContent = list.length + " agents available";
  const grid = document.getElementById("grid");
  if(!list.length){ grid.innerHTML = '<div class="empty">No agents in this view.</div>'; return; }
  grid.innerHTML = list.map(a => {
    const badge = TREND_LABEL[a.trendBadge] || "—";
    const act = activations[a.name];
    return `<div class="card tier-${a.tier}" data-name="${a.name}">
      <div class="card-top"><div><h3>${a.name}</h3><div class="cat-tag">${a.cat}</div></div><span class="tier-tag">${TIER_LABEL[a.tier]}</span></div>
      <div class="stats">
        <div class="stat"><b>${fmtUsd(a.tvl)}</b><span>TVL managed</span></div>
        <div class="stat"><b>${a.uptimeDays}d</b><span>Track record</span></div>
        <div class="stat"><b>${a.successRate}%</b><span>Success rate</span></div>
        <div class="stat"><b>${a.keyValue}</b><span>${a.keyLabel}</span></div>
      </div>
      <svg class="spark" width="100" height="26" viewBox="0 0 100 26"><polyline fill="none" stroke="#f0b90b" stroke-width="1.5" points="${sparklinePath(a.hist7)}"/></svg>
      <div class="card-bottom"><span class="trend ${a.trendBadge}">${badge}</span>
        <span class="restraint-pill" title="Share of signals the agent declined for risk">${a.restraint}% restraint</span>
        <button class="hire-btn" data-open="${a.name}">${(act && act.stage==='done')?'View activation':'Hire agent'}</button></div>
    </div>`;
  }).join("");
  grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", e => {
      if(e.target.closest(".hire-btn")) return;
      openModal(card.dataset.name);
    });
  });
  grid.querySelectorAll(".hire-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      openModal(btn.dataset.open, true);
    });
  });
}
function renderCats(){
  const root = document.getElementById("catList");
  const scored = computeScores(getAgentCatalog());
  root.innerHTML = CATEGORIES.map(c => {
    const n = c === "All" ? scored.length : scored.filter(a => a.cat === c).length;
    return `<button class="cat-btn ${activeCat===c?'active':''}" data-cat="${c}">${c}<span class="n">${n}</span></button>`;
  }).join("");
  root.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => { activeCat = btn.dataset.cat; renderCats(); render(); });
  });
}
document.getElementById("sortList").querySelectorAll(".sort-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    activeSort = btn.dataset.sort;
    document.querySelectorAll(".sort-btn").forEach(b => b.classList.toggle("active", b === btn));
    render();
  });
});
function renderTicker(){
  const scored = computeScores(getAgentCatalog());
  const items = [...scored].sort((a,b)=>b.trending-a.trending).slice(0,8);
  const html = items.map(a => `<span class="item"><b>${a.name}</b> ${a.g24>=0?'<span class="up">▲</span>':'<span class="down">▼</span>'} ${(a.g24*100).toFixed(0)}%</span>`).join("");
  document.getElementById("ticker").innerHTML = html + html;
}
document.getElementById("dismissOnboard").addEventListener("click", () => {
  document.getElementById("onboard").style.display = "none";
});
const overlay = document.getElementById("overlay");
const modalBody = document.getElementById("modalBody");
function openModal(name, jumpToSetup){
  if(!activations[name]) activations[name] = {stage:"overview", cap:"", allowlist:[], expiry:"30", onchain:true, x402:false, x402Paid:false, x402Ref:null, shadow:true, shadowDays:"3", authorityVerified:false, authority:null};
  if(jumpToSetup && activations[name].stage === "overview") activations[name].stage = "setup";
  overlay.classList.add("open");
  renderModal(name);
  requestAnimationFrame(() => {
    const setupBtn = modalBody.querySelector("#goSetup");
    if(setupBtn){
      setupBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        stateSafeOpenSetup(name);
      };
    }
  });
}
function stateSafeOpenSetup(name){
  if(!activations[name]) return;
  activations[name].stage = "setup";
  renderModal(name);
}
function closeModal(){
  overlay.classList.remove("open");
  modalBody.innerHTML = "";
}
overlay.addEventListener("click", (e) => { if(e.target === overlay) closeModal(); });
function renderModal(name){
  const scored = computeScores(getAgentCatalog());
  const a = scored.find(x => x.name === name);
  const state = activations[name];
  const allow = ALLOWLIST_OPTIONS[a.cat];
  const breakdown = `
    <div class="breakdown">
      <h4>Why this rarity tier</h4>
      ${barRow("Scarcity", a.sub.scarcity, a.peerCount+" peers")}
      ${barRow("Track record", a.sub.track, a.uptimeDays+"d live")}
      ${barRow("Consistency", a.sub.consistency, a.successRate+"% success")}
      ${barRow("Verified", a.sub.verified, a.verified ? "yes" : "no")}
      ${barRow("Restraint", a.restraint/100, a.restraint+"% hold-back")}
    </div>
    <div class="breakdown">
      <h4>Why this trending badge</h4>
      ${barRow("24h growth", clamp01(a.g24), (a.g24>=0?'+':'')+(a.g24*100).toFixed(0)+"%")}
      ${barRow("7d growth", clamp01(a.g7), (a.g7>=0?'+':'')+(a.g7*100).toFixed(0)+"%")}
      ${barRow("Acceleration", clamp01(a.accel+0.5), a.accel>=0 ? "speeding up" : "slowing down")}
    </div>`;
  let activateSection = "";
  if(state.stage === "overview"){
    activateSection = `<div class="modal-actions"><button type="button" class="hire-btn" id="goSetup" data-agent="${a.name}" onpointerup="window.__stiviumActivate&&window.__stiviumActivate(this.dataset.agent);return false;" ontouchend="window.__stiviumActivate&&window.__stiviumActivate(this.dataset.agent);return false;" onclick="window.__stiviumActivate&&window.__stiviumActivate(this.dataset.agent);return false;">Activate agent</button><button class="hire-btn ghost" id="closeBtn">Close</button></div>`;
  } else if(state.stage === "setup"){
    activateSection = `<div class="activate-box">
        <h4 style="font-size:11px;color:var(--text-dim);letter-spacing:.3px;margin:0 0 12px;">Set the boundaries before this agent can act</h4>
        <label class="chk" style="margin-bottom:12px;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" id="altanaOnchain" ${state.onchain !== false ? "checked" : ""}><span style="font-size:12px;color:var(--text-dim);line-height:1.4;">On-chain Altana session — <strong style="color:var(--coral)">BNB testnet only</strong>. Live mode is the default.</span></label>
        <label class="chk" style="margin-bottom:12px;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" id="x402Pay" ${state.x402?"checked":""}><span style="font-size:12px;color:var(--text-dim);line-height:1.4;"><strong style="color:var(--text)">Pay hire with x402</strong> — demo mock 0.10 USDT.</span></label>
        <div class="field" id="x402PriceRow" style="${state.x402?'':'display:none'}"><label>Hire fee (x402)</label><div style="font-size:13px;color:var(--gold);font-family:'IBM Plex Mono',monospace;">0.10 USDT · eip155:97</div></div>
        <label class="chk" style="margin-bottom:12px;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" id="shadowMode" ${state.shadow!==false?"checked":""}><span style="font-size:12px;color:var(--text-dim);line-height:1.4;"><strong style="color:var(--text)">Shadow mode first</strong></span></label>
        <div class="field" id="shadowDaysRow" style="${state.shadow===false?'display:none':''}"><label>Shadow window</label><select class="expiry" id="shadowDays"><option value="1" ${state.shadowDays==="1"?"selected":""}>1 day observe</option><option value="3" ${!state.shadowDays||state.shadowDays==="3"?"selected":""}>3 days observe</option><option value="7" ${state.shadowDays==="7"?"selected":""}>7 days observe</option></select></div>
        <div class="field"><label>Spend cap (USD)</label><input type="number" id="capInput" placeholder="e.g. 500" value="${state.cap}"></div>
        <div class="blast-box"><div class="blast-title">Blast radius</div><div class="blast-line">Max capital at risk: <b id="blastCap">$${state.cap||0}</b></div><div class="blast-line">Restraint: <b>${a.restraint}%</b></div><div class="blast-line" id="blastShadow">${state.shadow!==false?"Shadow ON":"Shadow OFF"}</div></div>
        <div class="field"><label>Allowed actions</label><div class="checks">${allow.map(opt => `<label class="chk"><input type="checkbox" data-opt="${opt}" ${state.allowlist.includes(opt)?"checked":""}> ${opt}</label>`).join("")}</div></div>
        <div class="field"><label>Expiry</label><select class="expiry" id="expirySelect"><option value="1" ${state.expiry==="1"?"selected":""}>1 day</option><option value="7" ${state.expiry==="7"?"selected":""}>7 days</option><option value="30" ${state.expiry==="30"?"selected":""}>30 days</option></select></div>
      </div>
      <div class="modal-actions"><button type="button" class="hire-btn" id="confirmActivate" onpointerdown="this.dataset.stiviumPressed=\"1\";this.textContent=\"Click received…\";">Confirm & activate</button><button type="button" class="hire-btn ghost" id="closeBtn">Cancel</button></div>`;
  } else {
    activateSection = `<div class="success-box"><p>Agent activated${state.onchain && state.txHash ? " on-chain" : ""}</p><div class="detail">Spend cap: $${state.cap || 0}<br>Allowed: ${state.allowlist.length ? state.allowlist.join(", ") : "none"}<br>Shadow: ${state.shadow!==false ? ("ON · "+(state.shadowDays||"3")+"d") : "OFF"}<br>Expires in ${state.expiry} days<br>${state.onchain ? (state.txHash ? `Tx: <a href="${state.explorer||('https://testnet.bscscan.com/tx/'+state.txHash)}" target="_blank" rel="noopener" style="color:var(--gold)">${String(state.txHash).slice(0,10)}…</a>` : (state.altanaError || "Waiting…")) : "Mode: local mock"}${state.onchain && state.txHash ? `<br><button class="hire-btn" id="executeAltanaBtn" style="margin-top:10px;">Execute 1 wei test</button>${state.executeTxHash ? `<br>Execute tx: <a href="${state.executeExplorer||('https://testnet.bscscan.com/tx/'+state.executeTxHash)}" target="_blank" rel="noopener" style="color:var(--gold)">${String(state.executeTxHash).slice(0,10)}…</a>` : ""}${state.executeError ? `<br><span style="color:var(--coral)">${state.executeError}</span>` : ""}` : ""}${state.x402 ? `<div>x402: ${state.x402Paid ? ("paid mock · "+(state.x402Ref||"")) : "selected"}</div>` : ""}</div></div><div class="modal-actions"><button class="hire-btn ghost" id="revokeBtn">Revoke access</button><button class="hire-btn ghost" id="closeBtn">Close</button></div>`;
  }
  modalBody.innerHTML = `<div class="modal-head"><div><h2>${a.name}</h2><div class="cat-tag">${a.cat} · ${TIER_LABEL[a.tier]}</div><div class="synced">${syncTime()}</div></div><button class="modal-close" id="xClose">×</button></div><p class="modal-desc">${a.desc}</p><div class="modal-stats"><div class="stat"><b>${fmtUsd(a.tvl)}</b><span>TVL managed</span></div><div class="stat"><b>${a.uptimeDays}d</b><span>Track record</span></div><div class="stat"><b>${a.successRate}%</b><span>Success rate</span></div><div class="stat"><b>${a.keyValue}</b><span>${a.keyLabel}</span></div></div>${breakdown}${activateSection}`;
  modalBody.querySelector("#xClose").addEventListener("click", closeModal);
  const closeBtn = modalBody.querySelector("#closeBtn");
  if(closeBtn) closeBtn.addEventListener("click", closeModal);
  const goSetup = modalBody.querySelector("#goSetup");
  if(goSetup){
    goSetup.type = "button";
    goSetup.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.stage = "setup";
      renderModal(name);
    };
  }
  const x402Pay = modalBody.querySelector("#x402Pay");
  if(x402Pay){ x402Pay.addEventListener("change", () => { state.x402 = x402Pay.checked; const row = modalBody.querySelector("#x402PriceRow"); if(row) row.style.display = x402Pay.checked ? "" : "none"; }); }
  const shadowMode = modalBody.querySelector("#shadowMode");
  if(shadowMode){ shadowMode.addEventListener("change", () => { state.shadow = shadowMode.checked; const row = modalBody.querySelector("#shadowDaysRow"); if(row) row.style.display = shadowMode.checked ? "" : "none"; const bl = modalBody.querySelector("#blastShadow"); if(bl) bl.textContent = shadowMode.checked ? "Shadow ON" : "Shadow OFF"; }); }
  const capInputLive = modalBody.querySelector("#capInput");
  if(capInputLive){ capInputLive.addEventListener("input", () => { const el = modalBody.querySelector("#blastCap"); if(el) el.textContent = "$" + (capInputLive.value || "0"); }); }
  const confirm = modalBody.querySelector("#confirmActivate");
  if(confirm) confirm.onclick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const originalConfirmText = confirm.textContent;
    const capInput = modalBody.querySelector("#capInput");
    const expirySelect = modalBody.querySelector("#expirySelect");
    const onchainEl = modalBody.querySelector("#altanaOnchain");
    state.cap = capInput.value || "0";
    state.expiry = expirySelect.value;
    state.allowlist = [...modalBody.querySelectorAll(".chk input[data-opt]:checked")].map(c => c.dataset.opt);
    state.onchain = onchainEl ? onchainEl.checked : true;
    const shadowEl = modalBody.querySelector("#shadowMode");
    const shadowDaysEl = modalBody.querySelector("#shadowDays");
    state.shadow = shadowEl ? shadowEl.checked : true;
    state.shadowDays = shadowDaysEl ? shadowDaysEl.value : "3";
    const x402El = modalBody.querySelector("#x402Pay");
    state.x402 = !!(x402El && x402El.checked);
    state.x402Paid = false;
    state.x402Ref = null;
    state.txHash = null;
    state.explorer = null;
    state.altanaError = null;
    if(state.onchain){
      confirm.disabled = true;
      confirm.textContent = "Loading Altana…";
      try {
        if (!window.StiviumAltana && window.__stiviumLoad) {
          const loadPromise = window.__stiviumLoad("./altana-wire.js","module");
          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Altana module took too long to load. Check your internet connection and try again.")), 15000));
          await Promise.race([loadPromise, timeout]);
        }
        confirm.textContent = "Signing session…";
        if (!window.StiviumAltana || typeof window.StiviumAltana.grantAgentSession !== "function") throw new Error("Altana module failed to load. Please refresh and try again.");
        const res = await window.StiviumAltana.grantAgentSession({ agentName: name, category: a.cat, capUsd: state.cap, expiryDays: state.expiry, allowlistLabels: state.allowlist });
        if(res.ok && !res.mock){ state.txHash = res.txHash || null; state.explorer = res.explorer || null; state.walletAddress = res.wallet || null; state.walletMode = res.walletMode || null; state.altanaWarning = res.warning || null; if(window.StiviumAltana && typeof window.StiviumAltana.verifyAgentAuthority === "function"){ const auth = await window.StiviumAltana.verifyAgentAuthority(name); state.authorityVerified = !!(auth.ok && auth.authorized); state.authority = auth; if(!state.authorityVerified) state.altanaError = auth.error || "Altana authority was not verified on-chain."; } }
        else { state.altanaError = res.error || "REAL Altana grant failed"; state.onchain = true; }
      } catch(e){ state.altanaError = e.message || String(e); state.onchain = true; }
      confirm.disabled = false;
      confirm.textContent = originalConfirmText || "Confirm & activate";
    }
    if(state.x402){ state.x402Paid = true; state.x402Ref = "x402-mock-" + Date.now().toString(36); }
    const activationFailed = (!!state.altanaError && state.onchain) || (state.onchain && state.authorityVerified === false);
    state.stage = activationFailed ? "setup" : "done";
    if (!activationFailed) persistActivations();
    renderModal(name);
    render();
  };  const executeAltanaBtn = modalBody.querySelector("#executeAltanaBtn");
  if(executeAltanaBtn) executeAltanaBtn.addEventListener("click", async () => {
    if(!window.StiviumAltana || typeof window.StiviumAltana.executeAgentSession !== "function") return;
    executeAltanaBtn.disabled = true; executeAltanaBtn.textContent = "Executing 1 wei…";
    try {
      const res = await window.StiviumAltana.executeAgentSession(name);
      if(res.ok && !res.mock){ state.executeTxHash=res.txHash; state.executeExplorer=res.explorer; state.executeError=null; }
      else { state.executeError=res.error || "Altana execute failed"; }
    } catch(e){ state.executeError=e.message || String(e); }
    renderModal(name);
  });
  const revoke = modalBody.querySelector("#revokeBtn");
  if(revoke) revoke.addEventListener("click", async () => {
    if(state.onchain && window.StiviumAltana && typeof window.StiviumAltana.revokeAgentSession === "function"){
      try { await window.StiviumAltana.revokeAgentSession(name); } catch(e){ console.warn(e); }
    }
    activations[name] = {stage:"overview", cap:"", allowlist:[], expiry:"30", onchain:false, x402:false, x402Paid:false, x402Ref:null, shadow:true, shadowDays:"3"};
    persistActivations();
    renderModal(name);
    render();
  });
}
function barRow(label, frac, valText){
  const pct = Math.max(0, Math.min(1, frac)) * 100;
  return `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="val">${valText}</span></div>`;
}
function clamp01(v){ return Math.max(0, Math.min(1, v)); }
function refreshAll(){ renderDiversity(); renderCats(); renderTicker(); render(); }

// Mobile-safe activation delegation: bind at document level so dynamically rendered modal buttons
// still work even if a browser delays/replaces the button node.
document.addEventListener("click", (e) => {
  const btn = e.target && e.target.closest ? e.target.closest("#goSetup") : null;
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const nameEl = modalBody && modalBody.querySelector(".modal-head h2");
  const name = nameEl ? nameEl.textContent : "";
  if (name && activations[name]) {
    activations[name].stage = "setup";
    renderModal(name);
  }
}, true);
document.addEventListener("pointerdown", (e) => {
  const btn = e.target && e.target.closest ? e.target.closest("#confirmActivate") : null;
  if (!btn) return;
  btn.dataset.stiviumPressed = "1";
  btn.textContent = "Click received…";
}, true);
document.addEventListener("click", (e) => {
  const btn = e.target && e.target.closest ? e.target.closest("#confirmActivate") : null;
  if (!btn) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (typeof btn.onclick === "function") {
    try { btn.onclick(e); } catch (err) { console.error("[Stivium] confirm activation dispatch failed", err); }
  }
}, true);

document.addEventListener("touchend", (e) => {
  const btn = e.target && e.target.closest ? e.target.closest("#goSetup") : null;
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const nameEl = modalBody && modalBody.querySelector(".modal-head h2");
  const name = nameEl ? nameEl.textContent : "";
  if (name && activations[name]) {
    activations[name].stage = "setup";
    renderModal(name);
  }
}, {passive:false, capture:true});

window.__stiviumActivate = function(agentName){
  try {
    if(!agentName || !activations[agentName]) return false;
    activations[agentName].stage = "setup";
    renderModal(agentName);
    return false;
  } catch(err) {
    console.error("[Stivium] activation click failed", err);
    return false;
  }
};

window.StiviumApp = { refresh: refreshAll, persistActivations };
refreshAll();
