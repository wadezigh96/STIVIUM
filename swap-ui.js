// ---------- swap mock (Pancake-style + bStocks) ----------
function mockQuote(amountIn, fromId, toId){
  const pin = MOCK_PRICE_USDT[fromId] || 1;
  const pout = MOCK_PRICE_USDT[toId] || 1;
  const feeBps = 25;      // 0.25%
  const slipBps = 30;     // mock impact
  const gross = amountIn * (pin / pout);
  const out = gross * (1 - feeBps/10000) * (1 - slipBps/10000);
  return { out, feeBps, slipBps, pin, pout };
}

function tokenOptions(selected){
  return SWAP_TOKENS.map(tok => {
    const label = tok.kind === 'bstock' ? `${tok.symbol} · RWA` : tok.symbol;
    return `<option value="${tok.id}" ${tok.id===selected?'selected':''}>${label}</option>`;
  }).join('');
}

function renderSwapPanel(){
  const root = document.getElementById('swapPanel');
  if(!root || typeof SWAP_TOKENS === 'undefined') return;
  if(!window.__swapState){
    window.__swapState = { from: 'BNB', to: 'USDT', amount: '1' };
  }
  const s = window.__swapState;
  const amt = parseFloat(s.amount) || 0;
  const q = amt > 0 ? mockQuote(amt, s.from, s.to) : null;
  const chips = SWAP_TOKENS.map(tok =>
    `<span class="token-chip ${tok.kind}">${tok.symbol}${tok.kind==='bstock'?' · bStock':''}</span>`
  ).join('');

  root.innerHTML = `
    <div class="swap-card">
      <h3>Swap</h3>
      <p class="sub">Mock quote against a curated BNB-chain set (crypto + <b>bStocks</b> RWA). Live execution would use PancakeSwap Unified Swap API — see <span class="mono">docs/SWAP.md</span>.</p>
      <div class="swap-leg">
        <div class="row"><label>From</label>
          <select id="swapFrom">${tokenOptions(s.from)}</select></div>
        <input type="number" id="swapAmount" min="0" step="any" value="${s.amount}" placeholder="0.0">
      </div>
      <button type="button" class="swap-flip" id="swapFlip" title="Flip">⇅</button>
      <div class="swap-leg">
        <div class="row"><label>To (estimated)</label>
          <select id="swapTo">${tokenOptions(s.to)}</select></div>
        <input type="number" id="swapOut" readonly value="${q ? q.out.toFixed(6) : ''}" placeholder="0.0">
      </div>
      <div class="swap-meta">
        ${q ? `Rate <b>1 ${s.from}</b> ≈ <b>${(q.pin/q.pout).toFixed(6)} ${s.to}</b><br>
        Fee mock ${q.feeBps/100}% · Slippage buffer ${q.slipBps/100}% · Network eip155:56 (story)` : 'Enter an amount to see a mock quote.'}
      </div>
      <button type="button" class="swap-btn" id="swapSubmit" ${!q || amt<=0?'disabled':''}>Simulate swap (mock)</button>
      <p class="swap-note" id="swapResult"></p>
      <p class="swap-note">Not connected to a wallet. Production path: Pancake <code> /v1/quote </code> → calldata → wallet. bStocks are tokenized equity (BEP-20); availability varies by region.</p>
      <div class="token-chips">${chips}</div>
    </div>`;

  const sync = () => {
    s.from = document.getElementById('swapFrom').value;
    s.to = document.getElementById('swapTo').value;
    s.amount = document.getElementById('swapAmount').value;
    if(s.from === s.to){
      const other = SWAP_TOKENS.find(x => x.id !== s.from);
      if(other) s.to = other.id;
    }
    renderSwapPanel();
  };
  document.getElementById('swapFrom').addEventListener('change', sync);
  document.getElementById('swapTo').addEventListener('change', sync);
  document.getElementById('swapAmount').addEventListener('input', () => {
    s.amount = document.getElementById('swapAmount').value;
    const amt2 = parseFloat(s.amount) || 0;
    const q2 = amt2 > 0 ? mockQuote(amt2, s.from, s.to) : null;
    const outEl = document.getElementById('swapOut');
    const meta = root.querySelector('.swap-meta');
    const btn = document.getElementById('swapSubmit');
    if(outEl) outEl.value = q2 ? q2.out.toFixed(6) : '';
    if(meta && q2) meta.innerHTML = `Rate <b>1 ${s.from}</b> ≈ <b>${(q2.pin/q2.pout).toFixed(6)} ${s.to}</b><br>Fee mock ${q2.feeBps/100}% · Slippage buffer ${q2.slipBps/100}% · Network eip155:56 (story)`;
    if(btn) btn.disabled = !q2 || amt2<=0;
  });
  document.getElementById('swapFlip').addEventListener('click', () => {
    const tmp = s.from; s.from = s.to; s.to = tmp; renderSwapPanel();
  });
  document.getElementById('swapSubmit').addEventListener('click', () => {
    const amt3 = parseFloat(s.amount) || 0;
    const q3 = mockQuote(amt3, s.from, s.to);
    const ref = 'swap-mock-' + Date.now().toString(36);
    document.getElementById('swapResult').innerHTML =
      `<b style="color:var(--teal)">Mock filled</b> · ${amt3} ${s.from} → ${q3.out.toFixed(6)} ${s.to}<br>
      Ref <span class="mono">${ref}</span> · no on-chain tx (demo)`;
  });
}

function wireViewTabs(){
  const tabA = document.getElementById('tabAgents');
  const tabS = document.getElementById('tabSwap');
  const gridWrap = document.getElementById('gridWrap');
  const swapPanel = document.getElementById('swapPanel');
  if(!tabA || !tabS) return;
  const show = (view) => {
    const agents = view === 'agents';
    tabA.classList.toggle('active', agents);
    tabS.classList.toggle('active', !agents);
    if(gridWrap) gridWrap.classList.toggle('hidden', !agents);
    if(swapPanel){
      swapPanel.classList.toggle('open', !agents);
      if(!agents) renderSwapPanel();
    }
  };
  tabA.addEventListener('click', () => show('agents'));
  tabS.addEventListener('click', () => show('swap'));
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', wireViewTabs);
} else {
  wireViewTabs();
}
