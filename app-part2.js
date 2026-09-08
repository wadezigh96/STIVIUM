// ---------- modal / activation flow ----------
const overlay = document.getElementById("overlay");
const modalBody = document.getElementById("modalBody");

function openModal(name, jumpToSetup){
  if(!activations[name]) activations[name] = {stage:"overview", cap:"", allowlist:[], expiry:"30", onchain:false};
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
        <h4 style="font-size:11px;color:var(--text-dim);margin:0 0 12px;">Set boundaries before this agent can act</h4>
        <label class="chk" style="margin-bottom:12px;display:flex;gap:8px;align-items:flex-start;">
          <input type="checkbox" id="altanaOnchain" ${state.onchain?"checked":""}>
          <span style="font-size:12px;color:var(--text-dim);line-height:1.4;">On-chain Altana session (BNB testnet). Needs passkey + test BNB. Unchecked = local mock.</span>
        </label>
        <div class="field"><label>Spend cap (USD)</label><input type="number" id="capInput" placeholder="e.g. 500" value="${state.cap}"></div>
        <div class="field"><label>Allowed actions</label><div class="checks">${allow.map(opt => `<label class="chk"><input type="checkbox" data-opt="${opt}" ${state.allowlist.includes(opt)?"checked":""}> ${opt}</label>`).join("")}</div></div>
        <div class="field"><label>Expiry</label><select class="expiry" id="expirySelect"><option value="1" ${state.expiry==="1"?"selected":""}>1 day</option><option value="7" ${state.expiry==="7"?"selected":""}>7 days</option><option value="30" ${state.expiry==="30"?"selected":""}>30 days</option></select></div>
      </div>
      <div class="modal-actions"><button class="hire-btn" id="confirmActivate">Confirm &amp; activate</button><button class="hire-btn ghost" id="closeBtn">Cancel</button></div>`;
  } else {
    activateSection = `
      <div class="success-box">
        <p>Agent activated${state.onchain && state.txHash ? " on-chain" : state.onchain ? " (Altana attempted)" : ""}</p>
        <div class="detail">
          Spend cap: $${state.cap || 0}<br>
          Allowed: ${state.allowlist.length ? state.allowlist.join(", ") : "none"}<br>
          Expires: in ${state.expiry} days<br>
          ${state.onchain ? (state.txHash ? `Tx: <a href="${state.explorer||('https://testnet.bscscan.com/tx/'+state.txHash)}" target="_blank" rel="noopener" style="color:var(--gold)">${String(state.txHash).slice(0,10)}…</a>` : (state.altanaError ? `On-chain: ${state.altanaError}` : "—")) : "Mode: local mock"}
        </div>
      </div>
      <div class="modal-actions"><button class="hire-btn ghost" id="revokeBtn">Revoke access</button><button class="hire-btn ghost" id="closeBtn">Close</button></div>`;
  }

  modalBody.innerHTML = `
    <div class="modal-head"><div><h2>${a.name}</h2><div class="cat-tag">${a.cat} · ${TIER_LABEL[a.tier]}</div><div class="synced">${fakeSyncTime()}</div></div><button class="modal-close" id="xClose">×</button></div>
    <p class="modal-desc">${a.desc}</p>
    <div class="modal-stats">
      <div class="stat"><b>${fmtUsd(a.tvl)}</b><span>TVL</span></div>
      <div class="stat"><b>${a.uptimeDays}d</b><span>Track</span></div>
      <div class="stat"><b>${a.successRate}%</b><span>Success</span></div>
      <div class="stat"><b>${a.keyValue}</b><span>${a.keyLabel}</span></div>
    </div>
    ${breakdown}${activateSection}`;

  modalBody.querySelector("#xClose").addEventListener("click", closeModal);
  const closeBtn = modalBody.querySelector("#closeBtn");
  if(closeBtn) closeBtn.addEventListener("click", closeModal);
  const goSetup = modalBody.querySelector("#goSetup");
  if(goSetup) goSetup.addEventListener("click", () => { state.stage = "setup"; renderModal(name); });

  const confirm = modalBody.querySelector("#confirmActivate");
  if(confirm) confirm.addEventListener("click", async () => {
    const capInput = modalBody.querySelector("#capInput");
    const expirySelect = modalBody.querySelector("#expirySelect");
    const onchainEl = modalBody.querySelector("#altanaOnchain");
    state.cap = capInput.value || "0";
    state.expiry = expirySelect.value;
    state.allowlist = [...modalBody.querySelectorAll(".chk input[data-opt]:checked")].map(c => c.dataset.opt);
    state.onchain = !!(onchainEl && onchainEl.checked);
    state.txHash = null; state.explorer = null; state.altanaError = null;
    if(state.onchain && window.StiviumAltana){
      confirm.disabled = true; confirm.textContent = "Signing session…";
      try {
        const res = await window.StiviumAltana.grantAgentSession({ agentName: name, category: a.cat, capUsd: state.cap, expiryDays: state.expiry });
        if(res.ok && !res.mock){ state.txHash = res.txHash || null; state.explorer = res.explorer || null; }
        else { state.altanaError = res.error || "grant failed"; state.onchain = false; }
      } catch(e){ state.altanaError = e.message || String(e); state.onchain = false; }
      confirm.disabled = false;
    }
    state.stage = "done"; renderModal(name); render();
  });

  const revoke = modalBody.querySelector("#revokeBtn");
  if(revoke) revoke.addEventListener("click", async () => {
    if(state.onchain && window.StiviumAltana){
      try { await window.StiviumAltana.revokeAgentSession(name); } catch(e){ console.warn(e); }
    }
    activations[name] = {stage:"overview", cap:"", allowlist:[], expiry:"30", onchain:false};
    renderModal(name); render();
  });
}

function barRow(label, frac, valText){
  const pct = Math.max(0, Math.min(1, frac)) * 100;
  return `<div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="val">${valText}</span></div>`;
}
function clamp01(v){ return Math.max(0, Math.min(1, v)); }

renderDiversity();
renderCats();
renderTicker();
render();
