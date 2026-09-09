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

// ---------- state ----------
let activeCat = "All";
let activeSort = "rarity";
let activations = {}; // name -> {stage, cap, allowlist, expiry, onchain, x402, ...}

// ---------- helpers ----------
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

function fakeSyncTime(){
  const secs = Math.floor(Math.random()*40)+5;
  return secs < 60 ? `synced ${secs}s ago` : `synced ${Math.floor(secs/60)}m ago`;
}

function renderDiversity(){
  const scored = computeScores(AGENTS);
  const root = document.getElementById("diversity");
  const cats = ["Rebalancing","Grid Trading","Yield Optimisation","Health Factor Monitoring"];
  root.innerHTML = cats.map(cat => {
    const items = scored.filter(a => a.cat === cat);
    const avgSuccess = Math.round(items.reduce((s,a)=>s+a.successRate,0)/items.length);
    return `<div class="div-card"><div class="cat-name">${cat}</div><div class="cat-metrics"><span>${items.length} agents</span><span>${avgSuccess}% avg success</span></div><div class="div-bar"><i style="width:${avgSuccess}%"></i></div></div>`;
  }).join("");
}

function render(){
  const scored = computeScores(AGENTS);
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
        <button class="hire-btn" data-open="${a.name}">${act?.stage==='done'?'View activation':'Hire agent'}</button></div>
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
  const scored = computeScores(AGENTS);
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
  const scored = computeScores(AGENTS);
  const items = [...scored].sort((a,b)=>b.trending-a.trending).slice(0,8);
  const html = items.map(a => `<span class="item"><b>${a.name}</b> ${a.g24>=0?'<span class="up">▲</span>':'<span class="down">▼</span>'} ${(a.g24*100).toFixed(0)}%</span>`).join("");
  document.getElementById("ticker").innerHTML = html + html;
}

document.getElementById("dismissOnboard").addEventListener("click", () => {
  document.getElementById("onboard").style.display = "none";
});

// ---------- modal / activation flow ----------
const overlay = document.getElementById("overlay");
const modalBody = document.getElementById("modalBody");

function openModal(name, jumpToSetup){
  if(!activations[name]) activations[name] = {stage:"overview", cap:"", allowlist:[], expiry:"30", onchain:false, x402:false, x402Paid:false, x402Ref:null};
  if(jumpToSetup && activations[name].stage === "overview") activations[name].stage = "setup";
  overlay.classList.add("open");
  renderModal(name);
}

function closeModal(){
  overlay.classList.remove("open");
  modalBody.innerHTML = "";
}

overlay.addEventListener("click", (e) => { if(e.target === overlay) closeModal(); });

function renderModal(name){
  const scored = computeScores(AGENTS);
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
    </div>
    <div class="breakdown">
      <h4>Why this trending badge</h4>
      ${barRow("24h growth", clamp01(a.g24), (a.g24>=0?'+':'')+(a.g24*100).toFixed(0)+"%")}
      ${barRow("7d growth", clamp01(a.g7), (a.g7>=0?'+':'')+(a.g7*100).toFixed(0)+"%")}
      ${barRow("Acceleration", clamp01(a.accel+0.5), a.accel>=0 ? "speeding up" : "slowing down")}
    </div>`;

  let activateSection = "";
  if(state.stage === "overview"){
    activateSection = `<div class="modal-actions"><button class="hire-btn" id="goSetup">Activate agent</button><button class="hire-btn ghost" id="closeBtn">Close</button></div>`;
  } else if(state.stage === "setup"){
    activateSection = `
      <div class="activate-box">
        <h4 style="font-size:11px;color:var(--text-dim);letter-spacing:.3px;margin:0 0 12px;">Set the boundaries before this agent can act</h4>
        <label class="chk" style="margin-bottom:12px;display:flex;gap:8px;align-items:flex-start;">
          <input type="checkbox" id="altanaOnchain" ${state.onchain?"checked":""}>
          <span style="font-size:12px;color:var(--text-dim);line-height:1.4;">On-chain Altana session (BNB testnet). Needs passkey + test BNB. Unchecked = local mock.</span>
        </label>
        <label class="chk" style="margin-bottom:12px;display:flex;gap:8px;align-items:flex-start;">
          <input type="checkbox" id="x402Pay" ${state.x402?"checked":""}>
          <span style="font-size:12px;color:var(--text-dim);line-height:1.4;"><strong style="color:var(--text)">Pay hire with x402</strong> — HTTP 402 micropayment (B402 on BSC). Demo settles a mock 0.10 USDT authorization; live B402 needs a merchant backend.</span>
        </label>
        <div class="field" id="x402PriceRow" style="${state.x402?'':'display:none'}">
          <label>Hire fee (x402)</label>
          <div style="font-size:13px;color:var(--gold);font-family:'IBM Plex Mono',monospace;">0.10 USDT · scheme exact · network eip155:97 (testnet)</div>
        </div>
        <div class="field"><label>Spend cap (USD) — the most this agent can ever move</label>
          <input type="number" id="capInput" placeholder="e.g. 500" value="${state.cap}"></div>
        <div class="field"><label>Allowed actions</label>
          <div class="checks">${allow.map(opt => `
            <label class="chk"><input type="checkbox" data-opt="${opt}" ${state.allowlist.includes(opt)?"checked":""}> ${opt}</label>`).join("")}</div></div>
        <div class="field"><label>Expiry</label>
          <select class="expiry" id="expirySelect">
            <option value="1" ${state.expiry==="1"?"selected":""}>1 day</option>
            <option value="7" ${state.expiry==="7"?"selected":""}>7 days</option>
            <option value="30" ${state.expiry==="30"?"selected":""}>30 days</option>
          </select></div>
      </div>
      <div class="modal-actions">
        <button class="hire-btn" id="confirmActivate">Confirm & activate</button>
        <button class="hire-btn ghost" id="closeBtn">Cancel</button>
      </div>`;
  } else {
    activateSection = `
      <div class="success-box">
        <p>Agent activated${state.onchain && state.txHash ? " on-chain" : state.onchain ? " (Altana attempted)" : ""}</p>
        <div class="detail">
          Spend cap: $${state.cap || 0}<br>
          Allowed: ${state.allowlist.length ? state.allowlist.join(", ") : "none selected"}<br>
          Expires: in ${state.expiry} days — revoke anytime.<br>
          ${state.onchain ? (state.txHash ? `Tx: <a href="${state.explorer||('https://testnet.bscscan.com/tx/'+state.txHash)}" target="_blank" rel="noopener" style="color:var(--gold)">${String(state.txHash).slice(0,10)}…</a>` : (state.altanaError ? `On-chain error: ${state.altanaError}` : "Waiting for tx…")) : "Mode: local mock"}
          ${state.x402 ? `<div style="margin-top:6px">x402: ${state.x402Paid ? ("paid mock · "+(state.x402Ref||"")) : "selected (not settled)"}</div>` : ""}
        </div>
      </div>
      <div class="modal-actions">
        <button class="hire-btn ghost" id="revokeBtn">Revoke access</button>
        <button class="hire-btn ghost" id="closeBtn">Close</button>
      </div>`;
  }

  modalBody.innerHTML = `
    <div class="modal-head">
      <div>
        <h2>${a.name}</h2>
        <div class="cat-tag">${a.cat} · <span class="tier-tag" style="border:none;padding:0;">${TIER_LABEL[a.tier]}</span></div>
        <div class="synced">${fakeSyncTime()}</div>
      </div>
      <button class="modal-close" id="xClose">×</button>
    </div>
    <p class="modal-desc">${a.desc}</p>
    <div class="modal-stats">
      <div class="stat"><b>${fmtUsd(a.tvl)}</b><span>TVL managed</span></div>
      <div class="stat"><b>${a.uptimeDays}d</b><span>Track record</span></div>
      <div class="stat"><b>${a.successRate}%</b><span>Success rate</span></div>
      <div class="stat"><b>${a.keyValue}</b><span>${a.keyLabel}</span></div>
    </div>
    ${breakdown}
    ${activateSection}`;

  modalBody.querySelector("#xClose").addEventListener("click", closeModal);
  const closeBtn = modalBody.querySelector("#closeBtn");
  if(closeBtn) closeBtn.addEventListener("click", closeModal);

  const goSetup = modalBody.querySelector("#goSetup");
  if(goSetup) goSetup.addEventListener("click", () => { state.stage = "setup"; renderModal(name); });

  const x402Pay = modalBody.querySelector("#x402Pay");
  if(x402Pay){
    x402Pay.addEventListener("change", () => {
      state.x402 = x402Pay.checked;
      const row = modalBody.querySelector("#x402PriceRow");
      if(row) row.style.display = x402Pay.checked ? "" : "none";
    });
  }

  const confirm = modalBody.querySelector("#confirmActivate");
  if(confirm) confirm.addEventListener("click", async () => {
    const capInput = modalBody.querySelector("#capInput");
    const expirySelect = modalBody.querySelector("#expirySelect");
    const onchainEl = modalBody.querySelector("#altanaOnchain");
    state.cap = capInput.value || "0";
    state.expiry = expirySelect.value;
    state.allowlist = [...modalBody.querySelectorAll(".chk input:checked")].map(c => c.dataset.opt).filter(Boolean);
    state.onchain = !!(onchainEl && onchainEl.checked);
    const x402El = modalBody.querySelector("#x402Pay");
    state.x402 = !!(x402El && x402El.checked);
    state.x402Paid = false;
    state.x402Ref = null;
    state.txHash = null;
    state.explorer = null;
    state.altanaError = null;

    if(state.onchain && window.StiviumAltana){
      confirm.disabled = true;
      confirm.textContent = "Signing session…";
      try {
        const res = await window.StiviumAltana.grantAgentSession({
          agentName: name,
          category: a.cat,
          capUsd: state.cap,
          expiryDays: state.expiry,
          allowlistLabels: state.allowlist,
        });
        if(res.ok && !res.mock){
          state.txHash = res.txHash || null;
          state.explorer = res.explorer || null;
        } else {
          state.altanaError = res.error || "grant failed — kept as mock boundaries";
          state.onchain = false;
        }
      } catch(e){
        state.altanaError = e.message || String(e);
        state.onchain = false;
      }
      confirm.disabled = false;
    }

    if(state.x402){
      confirm.disabled = true;
      confirm.textContent = "x402: authorizing…";
      await new Promise(r => setTimeout(r, 600));
      state.x402Paid = true;
      state.x402Ref = "x402-mock-" + Date.now().toString(36);
      confirm.disabled = false;
    }

    state.stage = "done";
    renderModal(name);
    render();
  });

  const revoke = modalBody.querySelector("#revokeBtn");
  if(revoke) revoke.addEventListener("click", async () => {
    if(state.onchain && window.StiviumAltana){
      revoke.disabled = true;
      try { await window.StiviumAltana.revokeAgentSession(name); } catch(e){ console.warn(e); }
    }
    activations[name] = {stage:"overview", cap:"", allowlist:[], expiry:"30", onchain:false, x402:false, x402Paid:false, x402Ref:null};
    renderModal(name);
    render();
  });
}

function barRow(label, frac, valText){
  const pct = Math.max(0, Math.min(1, frac)) * 100;
  return `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="val">${valText}</span></div>`;
}
function clamp01(v){ return Math.max(0, Math.min(1, v)); }

// ---------- init ----------
renderDiversity();
renderCats();
renderTicker();
render();
