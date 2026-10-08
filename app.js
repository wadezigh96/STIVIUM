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
function sourceLabel(a){
  return a.dataSource === "8004scan-index" ? "8004SCAN INDEX" : "CURATED DEMO";
}
function sourceNote(a){
  return a.dataSource === "8004scan-index"
    ? "Live registry signal; not a performance or TVL claim."
    : "Curated demo/catalog metrics; not live performance.";
}
function getErc8183Provider(agent, activation){
  const p = String(agent?.erc8183Provider || activation?.erc8183Provider || "").trim();
  return /^0x[a-fA-F0-9]{40}$/.test(p) ? p : "";
}

function buildOrchestrationPlan(agent, activation){
  const category = String(agent?.category || agent?.cat || "").trim();
  const allowlist = Array.isArray(activation?.allowlist) ? activation.allowlist.slice() : [];
  const providers = {
    "Rebalancing": "erc8183",
    "Grid Trading": "erc8183",
    "Yield Optimisation": "pancakeswap",
    "Health Factor Monitoring": "binance-agent-os"
  };

  // A real ERC-8183 hire is the source of truth for execution mode.
  // Do not let the separate Altana on-chain toggle make a real ERC-8183
  // hire appear as "local mock".
  const isRealErc8183 = activation?.erc8183 === true && !!activation?.erc8183FundTxHash;
  const isRealAltana = activation?.onchain === true && activation?.authorityVerified === true;
  const provider = isRealErc8183 ? (activation.erc8183Provider || "erc8183") : (providers[category] || "erc8183");

  return {
    marketplace: "stivium",
    agent: agent?.name || "",
    category,
    provider,
    capability: category,
    allowedActions: allowlist,
    spendCap: activation?.cap || "",
    expiryDays: activation?.expiry || "30",
    executionMode: isRealErc8183
      ? "erc8183-bsc-testnet"
      : (isRealAltana ? "altana-bsc-mainnet" : "local"),
    shadowMode: activation?.shadow !== false
  };
}

function displayStats(a){
  if(a.dataSource === "8004scan-index"){
    return [
      ["Index " + (Number.isFinite(Number(a.indexScore)) ? Number(a.indexScore).toFixed(1) : "—"), "Registry score"],
      [a.uptimeDays + "d", "Indexed age"],
      [a.verified ? "Yes" : "No", "Verified"],
      [a.keyValue, a.keyLabel + " · index-derived"]
    ];
  }
  return [
    [fmtUsd(a.tvl), "Catalog TVL"],
    [a.uptimeDays + "d", "Catalog track record"],
    [a.successRate + "%", "Catalog success rate"],
    [a.keyValue, a.keyLabel + " · catalog"]
  ];
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
    const liveCount = items.filter(a => a.dataSource === "8004scan-index").length;
    const curatedCount = items.length - liveCount;
    return `<div class="div-card"><div class="cat-name">${cat}</div><div class="cat-metrics"><span>${items.length} agents</span><span>${curatedCount} curated · ${liveCount} live</span></div><div class="div-bar"><i style="width:${Math.min(100, items.length * 25)}%"></i></div></div>`;
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
    const stats = displayStats(a);
    return `<div class="card tier-${a.tier}" data-name="${a.name}">
      <div class="card-top"><div><h3>${a.name}</h3><div class="cat-tag">${a.cat}</div><div class="cat-tag" title="${sourceNote(a)}">${sourceLabel(a)}</div></div><span class="tier-tag">${TIER_LABEL[a.tier]}</span></div>
      <div class="stats">${stats.map(([value,label]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`).join("")}</div>
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
  if(!activations[name]) activations[name] = {stage:"overview", cap:"", allowlist:[], expiry:"30", onchain:false, x402:false, x402Paid:false, x402Ref:null, erc8183:true, erc8183Provider:"", erc8183JobId:null, erc8183FundTxHash:null, erc8183Error:null, erc8183Step:null, shadow:true, shadowDays:"3", authorityVerified:false, authority:null};
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
  if(!state.erc8183Provider && a?.erc8183Provider) state.erc8183Provider = a.erc8183Provider;
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
    activateSection = `<div class="modal-actions"><button type="button" class="hire-btn" id="goSetup" data-agent="${a.name}">Activate agent</button><button class="hire-btn ghost" id="closeBtn">Close</button></div>`;
  } else if(state.stage === "setup"){
    const ercStepLabels = {register:"Continue · Register job", budget:"Continue · Set budget", approve:"Continue · Approve U", fund:"Continue · Fund job"};
    const ercActionLabel = state.erc8183Step ? (ercStepLabels[state.erc8183Step] || "Continue ERC-8183") : "Create ERC-8183 job";

    activateSection = `<div class="activate-box">
        <h4 style="font-size:11px;color:var(--text-dim);letter-spacing:.3px;margin:0 0 12px;">Set the boundaries before this agent can act</h4>
        <label class="chk" style="margin-bottom:10px;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" id="erc8183Pay" ${state.erc8183?"checked":""}><span style="font-size:12px;color:var(--text-dim);line-height:1.4;"><strong style="color:var(--text)">Real ERC-8183 hire</strong> — BSC Testnet via Privy, 0.10 U escrow.</span></label><div id="erc8183TestnetWalletBox" style="display:${state.erc8183?"":"none"};margin:-2px 0 12px;padding:10px 12px;border:1px solid var(--accent-border);border-radius:11px;background:rgba(240,185,11,.04);"><div style="font:500 10px 'IBM Plex Mono',monospace;color:var(--text-dim);">Uses the connected wallet above · switches to BSC Testnet (chain 97) when you confirm.</div><div id="erc8183ChainStatus" style="font:500 10px 'IBM Plex Mono',monospace;color:var(--text-dim);margin-top:6px;">BSC Testnet · chain 97</div><div style="font-size:10px;color:var(--text-muted);margin-top:7px;">One wallet connection for the whole app. Swap switches to BNB Mainnet only when needed.</div></div></div><div id="erc8183StepStatus" style="font:500 10px 'IBM Plex Mono',monospace;color:var(--text-dim);margin:-4px 0 12px;">${state.erc8183Step ? ("Next on-chain step: "+(ercStepLabels[state.erc8183Step] || state.erc8183Step)) : "No automatic follow-up transaction will be sent."}</div><div class="field" id="erc8183ProviderRow" style="${state.erc8183?"":"display:none"}"><label>Provider address</label><input type="text" id="erc8183Provider" placeholder="0x… provider wallet" value="${state.erc8183Provider || a.erc8183Provider || ""}" autocomplete="off"><div style="font-size:11px;color:var(--text-dim);margin-top:6px;">${a.erc8183Provider ? (a.erc8183ProviderLabel || "Verified testnet provider") : "No real provider is mapped to this catalog row."} Provider wallet only. Never paste a private key.</div></div>
        <div class="field" id="x402PriceRow" style="${state.x402?'':'display:none'}"><label>Hire fee (x402)</label><div style="font-size:13px;color:var(--gold);font-family:'IBM Plex Mono',monospace;">x402 integration unavailable · no payment sent</div></div>
        <label class="chk" style="margin-bottom:12px;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" id="shadowMode" ${state.shadow!==false?"checked":""}><span style="font-size:12px;color:var(--text-dim);line-height:1.4;"><strong style="color:var(--text)">Shadow mode first</strong></span></label>
        <div class="field" id="shadowDaysRow" style="${state.shadow===false?'display:none':''}"><label>Shadow window</label><select class="expiry" id="shadowDays"><option value="1" ${state.shadowDays==="1"?"selected":""}>1 day observe</option><option value="3" ${!state.shadowDays||state.shadowDays==="3"?"selected":""}>3 days observe</option><option value="7" ${state.shadowDays==="7"?"selected":""}>7 days observe</option></select></div>
        <div class="field"><label>Spend cap (USD)</label><input type="number" id="capInput" placeholder="e.g. 500" value="${state.cap}"></div>
        <div class="blast-box"><div class="blast-title">Blast radius</div><div class="blast-line">Max capital at risk: <b id="blastCap">$${state.cap||0}</b></div><div class="blast-line">Restraint: <b>${a.restraint}%</b></div><div class="blast-line" id="blastShadow">${state.shadow!==false?"Shadow ON":"Shadow OFF"}</div></div>
        <div class="field"><label>Allowed actions</label><div class="checks">${allow.map(opt => `<label class="chk"><input type="checkbox" data-opt="${opt}" ${state.allowlist.includes(opt)?"checked":""}> ${opt}</label>`).join("")}</div></div>
        <div class="field"><label>Expiry</label><select class="expiry" id="expirySelect"><option value="1" ${state.expiry==="1"?"selected":""}>1 day</option><option value="7" ${state.expiry==="7"?"selected":""}>7 days</option><option value="30" ${state.expiry==="30"?"selected":""}>30 days</option></select></div>
      </div>
      <div class="modal-actions"><button type="button" class="hire-btn" id="confirmActivate">${ercActionLabel}</button><button type="button" class="hire-btn ghost" id="closeBtn">Cancel</button></div>`;
  } else {
    const txLink = state.txHash
      ? `Tx: <a href="${state.explorer || ('https://testnet.bscscan.com/tx/' + state.txHash)}" target="_blank" rel="noopener" style="color:var(--gold)">${String(state.txHash).slice(0,10)}…</a>`
      : "";
    const fundLink = state.erc8183FundTxHash
      ? `<br>Fund tx: <a href="https://testnet.bscscan.com/tx/${state.erc8183FundTxHash}" target="_blank" rel="noopener" style="color:var(--gold)">${String(state.erc8183FundTxHash).slice(0,10)}…</a>`
      : "";
    const ercError = state.erc8183Error
      ? `<br><span style="color:var(--coral)">${state.erc8183Error}</span>`
      : "";
    const mode = state.erc8183FundTxHash ? "Mode: ERC-8183 BSC Testnet" : "Mode: waiting for ERC-8183";
    activateSection = `<div class="success-box"><p>Agent hired</p><div class="detail">Spend cap: $${state.cap || 0}<br>Allowed: ${state.allowlist.length ? state.allowlist.join(", ") : "none"}<br>Shadow: ${state.shadow!==false ? ("ON · "+(state.shadowDays||"3")+"d") : "OFF"}<br>Expires in ${state.expiry} days<br>${mode}${state.erc8183JobId ? `<br>ERC-8183 job: ${state.erc8183JobId}` : ""}${fundLink}${ercError}${txLink}</div></div><div class="modal-actions"><button class="hire-btn ghost" id="revokeBtn">Revoke access</button><button class="hire-btn ghost" id="closeBtn">Close</button></div>`;
  }
  const modalStats = displayStats(a);
  modalBody.innerHTML = `<div class="modal-head"><div><h2>${a.name}</h2><div class="cat-tag">${a.cat} · ${TIER_LABEL[a.tier]}</div><div class="cat-tag" title="${sourceNote(a)}">${sourceLabel(a)}</div><div class="synced">${syncTime()}</div></div><button class="modal-close" id="xClose">×</button></div><p class="modal-desc">${a.desc}</p><div class="source-note">${sourceNote(a)}</div><div class="modal-stats">${modalStats.map(([value,label]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`).join("")}</div>${breakdown}${activateSection}`;
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
  const erc8183Pay = null;
  const erc8183TestnetWalletBox = modalBody.querySelector("#erc8183TestnetWalletBox");
  const erc8183ChainStatus = modalBody.querySelector("#erc8183ChainStatus");
  if(erc8183TestnetWalletBox) erc8183TestnetWalletBox.style.display = "";
  const shadowMode = modalBody.querySelector("#shadowMode");
  if(shadowMode){ shadowMode.addEventListener("change", () => { state.shadow = shadowMode.checked; const row = modalBody.querySelector("#shadowDaysRow"); if(row) row.style.display = shadowMode.checked ? "" : "none"; const bl = modalBody.querySelector("#blastShadow"); if(bl) bl.textContent = shadowMode.checked ? "Shadow ON" : "Shadow OFF"; }); }
  const capInputLive = modalBody.querySelector("#capInput");
  if(capInputLive){ capInputLive.addEventListener("input", () => { const el = modalBody.querySelector("#blastCap"); if(el) el.textContent = "$" + (capInputLive.value || "0"); }); }
  const confirm = modalBody.querySelector("#confirmActivate");
  if(confirm) confirm.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if(confirm.disabled || window.__stiviumUiHireInFlight) return;
    window.__stiviumUiHireInFlight = true;
    confirm.disabled = true;

    const originalConfirmText = confirm.textContent;
    const capInput = modalBody.querySelector("#capInput");
    const expirySelect = modalBody.querySelector("#expirySelect");
    const shadowEl = modalBody.querySelector("#shadowMode");
    const shadowDaysEl = modalBody.querySelector("#shadowDays");
    const x402El = modalBody.querySelector("#x402Pay");
    const erc8183ProviderEl = modalBody.querySelector("#erc8183Provider");

    const continuing = !!state.erc8183JobId && !state.erc8183FundTxHash;
    state.cap = capInput ? (capInput.value || state.cap || "0") : (state.cap || "0");
    state.expiry = expirySelect ? expirySelect.value : (state.expiry || "30");
    state.allowlist = [...modalBody.querySelectorAll(".chk input[data-opt]:checked")].map(c => c.dataset.opt);
    state.onchain = false;
    state.shadow = shadowEl ? shadowEl.checked : true;
    state.shadowDays = shadowDaysEl ? shadowDaysEl.value : "3";
    state.x402 = !!(x402El && x402El.checked);
    state.erc8183 = true;
    state.erc8183Provider = erc8183ProviderEl ? erc8183ProviderEl.value.trim() : (state.erc8183Provider || "");
    if(state.erc8183 && !state.erc8183Provider) state.erc8183Provider = getErc8183Provider(a, state);

    if(!continuing){
      state.erc8183JobId = null;
      state.erc8183FundTxHash = null;
      state.erc8183CreateTxHash = null;
      state.erc8183RegisterTxHash = null;
      state.erc8183BudgetTxHash = null;
      state.erc8183ApproveTxHash = null;
      state.erc8183Step = null;
      state.erc8183Error = null;
      state.x402Paid = false;
      state.x402Ref = null;
      state.txHash = null;
      state.explorer = null;
      state.altanaError = null;
    }

    try {
      if(!window.__stiviumPrivy || typeof window.__stiviumPrivy.hireErc8183Testnet !== "function") throw new Error("Privy is still loading. Please wait a moment and try again.");
      if(!state.erc8183Provider) throw new Error("Enter the provider address for this ERC-8183 agent.");
      confirm.textContent = continuing ? "Executing one transaction…" : "Creating one ERC-8183 transaction…";

      const hire = await window.__stiviumPrivy.hireErc8183Testnet({
        provider:state.erc8183Provider,
        description:"STIVIUM hire: "+name+" · "+a.cat,
        budgetTokens:"0.1",
        expirySeconds:Math.max(3600,Number(state.expiry||30)*86400)
      });

      state.erc8183JobId = hire.jobId || state.erc8183JobId;
      state.erc8183Step = hire.complete ? null : (hire.nextStep || hire.step || state.erc8183Step);
      state.erc8183CreateTxHash = hire.createJobTxHash || state.erc8183CreateTxHash;
      state.erc8183RegisterTxHash = hire.registerJobTxHash || state.erc8183RegisterTxHash;
      state.erc8183BudgetTxHash = hire.setBudgetTxHash || state.erc8183BudgetTxHash;
      state.erc8183ApproveTxHash = hire.approveTxHash || state.erc8183ApproveTxHash;
      state.erc8183FundTxHash = hire.fundTxHash || state.erc8183FundTxHash;
      state.erc8183Error = null;

      const complete = !!hire.complete && !!state.erc8183FundTxHash;
      state.stage = complete ? "done" : "setup";
      if (complete) {
        state.orchestrationPlan = buildOrchestrationPlan(a, state);
        persistActivations();
      }
    } catch(e) {
      state.erc8183Error = e.message || String(e);
      state.stage = "setup";
    } finally {
      window.__stiviumUiHireInFlight = false;
      confirm.disabled = false;
      confirm.textContent = originalConfirmText || "Continue ERC-8183";
      renderModal(name);
      render();
    }
  });
  const executeAltanaBtn = modalBody.querySelector("#executeAltanaBtn");
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
    activations[name] = {stage:"overview", cap:"", allowlist:[], expiry:"30", onchain:false, x402:false, x402Paid:false, x402Ref:null, erc8183:true, erc8183Provider:"", erc8183JobId:null, erc8183FundTxHash:null, erc8183Error:null, erc8183Step:null, shadow:true, shadowDays:"3"};
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
