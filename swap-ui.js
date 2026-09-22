// ---------- live PancakeSwap V2 + EIP-1193 wallet ----------
const PANCAKE_BSC = {
  chainId: "0x38",
  router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  explorer: "https://bscscan.com/tx/"
};

const ERC20 = {
  balanceOf: "0x70a08231",
  allowance: "0xdd62ed3e",
  approve: "0x095ea7b3"
};

const ROUTER = {
  getAmountsOut: "0xd06ca61f",
  swapExactETHForTokens: "0x7ff36ab5",
  swapExactTokensForETH: "0x18cbafe5",
  swapExactTokensForTokens: "0x38ed1739"
};

function pad64(hex){ return String(hex).replace(/^0x/,"").padStart(64,"0"); }
function addressWord(address){ return pad64(address.toLowerCase()); }
function uintWord(value){ return pad64(BigInt(value).toString(16)); }
function encodeAddressArray(addresses){
  return uintWord(0x40) + uintWord(addresses.length) + addresses.map(addressWord).join("");
}
function encodeGetAmountsOut(amountIn,path){ return ROUTER.getAmountsOut + uintWord(amountIn) + encodeAddressArray(path); }
function encodeBalanceOf(owner){ return ERC20.balanceOf + addressWord(owner); }
function encodeAllowance(owner,spender){ return ERC20.allowance + addressWord(owner) + addressWord(spender); }
function encodeApprove(spender,amount){ return ERC20.approve + addressWord(spender) + uintWord(amount); }
function encodeSwapExactETHForTokens(amountOutMin,path,to,deadline){
  return ROUTER.swapExactETHForTokens + uintWord(amountOutMin) + encodeAddressArray(path) + addressWord(to) + uintWord(deadline);
}
function encodeSwapExactTokensForETH(amountIn,amountOutMin,path,to,deadline){
  return ROUTER.swapExactTokensForETH + uintWord(amountIn) + uintWord(amountOutMin) + encodeAddressArray(path) + addressWord(to) + uintWord(deadline);
}
function encodeSwapExactTokensForTokens(amountIn,amountOutMin,path,to,deadline){
  return ROUTER.swapExactTokensForTokens + uintWord(amountIn) + uintWord(amountOutMin) + encodeAddressArray(path) + addressWord(to) + uintWord(deadline);
}
function parseUnits(value,decimals){
  const s=String(value||"").trim();
  if(!/^\d*(\.\d*)?$/.test(s)||!s||s===".") throw new Error("Invalid amount");
  const [whole,fraction=""]=s.split(".");
  if(fraction.length>decimals) throw new Error("Too many decimal places");
  return BigInt(whole||"0")*(10n**BigInt(decimals))+BigInt((fraction+"0".repeat(decimals)).slice(0,decimals)||"0");
}
function formatUnits(value,decimals,precision=6){
  const n=BigInt(value),base=10n**BigInt(decimals),whole=n/base;
  const frac=(n%base).toString().padStart(decimals,"0").slice(0,precision).replace(/0+$/,"");
  return frac?whole.toString()+"."+frac:whole.toString();
}
function tokenById(id){ return SWAP_TOKENS.find(t=>t.id===id); }
function isLiveToken(t){ return !!(t&&t.kind==="crypto"&&(t.native||t.address)); }
function getInjectedProvider(){
  if(window.ethereum) return window.ethereum;
  throw new Error("No injected wallet found. Open Stivium in MetaMask or another EIP-1193 wallet.");
}
async function rpc(method,params=[]){ return getInjectedProvider().request({method,params}); }
async function ensureBsc(){
  const provider=getInjectedProvider(),current=await provider.request({method:"eth_chainId"});
  if(current===PANCAKE_BSC.chainId)return;
  try{ await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:PANCAKE_BSC.chainId}]}); }
  catch(e){
    if(e&&e.code===4902) await provider.request({method:"wallet_addEthereumChain",params:[{
      chainId:PANCAKE_BSC.chainId,chainName:"BNB Smart Chain",
      nativeCurrency:{name:"BNB",symbol:"BNB",decimals:18},
      rpcUrls:["https://bsc-dataseed.binance.org"],blockExplorerUrls:["https://bscscan.com"]
    }]});
    else throw e;
  }
}
async function connectWallet(){
  const provider=getInjectedProvider();
  await ensureBsc();
  const accounts=await provider.request({method:"eth_requestAccounts"});
  if(!accounts?.[0])throw new Error("Wallet did not return an account.");
  window.__swapState.wallet=accounts[0];
  return accounts[0];
}
function shortAddress(a){ return a?a.slice(0,6)+"…"+a.slice(-4):""; }
function bscTx(h){ return PANCAKE_BSC.explorer+h; }
function minOutFromQuote(amountOut,slippageBps){ return amountOut*BigInt(10000-slippageBps)/10000n; }
function buildCandidatePaths(from,to){
  const w=tokenById("WBNB");
  if(from.native)return [[w.address,to.address]];
  if(to.native)return [[from.address,w.address]];
  const direct=[from.address,to.address];
  if(from.address.toLowerCase()===w.address.toLowerCase()||to.address.toLowerCase()===w.address.toLowerCase())return [direct];
  return [direct,[from.address,w.address,to.address]];
}
async function quoteLive(amountIn,from,to){
  if(!isLiveToken(from)||!isLiveToken(to)||from.id===to.id)throw new Error("Choose two supported live BNB Chain tokens.");
  const rawIn=parseUnits(amountIn,from.decimals);
  if(rawIn<=0n)throw new Error("Enter an amount greater than zero.");
  const candidates=buildCandidatePaths(from,to);
  const quotes=[];
  for(const path of candidates){
    try{
      const result=await rpc("eth_call",[{to:PANCAKE_BSC.router,data:encodeGetAmountsOut(rawIn,path)},"latest"]);
      if(!result||result==="0x")continue;
      const hex=result.replace(/^0x/,"");
      if(hex.length<64)continue;
      const amountOut=BigInt("0x"+hex.slice(-64));
      if(amountOut>0n)quotes.push({rawIn,amountOut,path});
    }catch(_e){}
  }
  if(!quotes.length)throw new Error("No PancakeSwap V2 route found for this pair.");
  quotes.sort((a,b)=>a.amountOut>b.amountOut?-1:a.amountOut<b.amountOut?1:0);
  return quotes[0];
}
function formatRate(rawIn,amountOut,fromDecimals,toDecimals){
  const scale=10n**BigInt(toDecimals);
  const normalizedOut=Number(amountOut)/Number(scale);
  const normalizedIn=Number(rawIn)/(10**fromDecimals);
  if(!Number.isFinite(normalizedOut)||!Number.isFinite(normalizedIn)||normalizedIn<=0)return "—";
  return (normalizedOut/normalizedIn).toLocaleString(undefined,{maximumFractionDigits:8});
}
async function tokenBalance(token,wallet){
  if(token.native)return BigInt(await rpc("eth_getBalance",[wallet,"latest"]));
  return BigInt(await rpc("eth_call",[{to:token.address,data:encodeBalanceOf(wallet)},"latest"]));
}
async function allowance(token,wallet){
  if(token.native)return null;
  return BigInt(await rpc("eth_call",[{to:token.address,data:encodeAllowance(wallet,PANCAKE_BSC.router)},"latest"]));
}
async function sendTx(tx){ return rpc("eth_sendTransaction",[tx]); }
async function waitForReceipt(hash,timeoutMs=180000){
  const started=Date.now();
  while(Date.now()-started<timeoutMs){
    const receipt=await rpc("eth_getTransactionReceipt",[hash]);
    if(receipt){ if(receipt.status==="0x1")return receipt; throw new Error("Transaction reverted on-chain."); }
    await new Promise(r=>setTimeout(r,2500));
  }
  throw new Error("Transaction is still pending. Check BscScan for the current status.");
}
function liveTokenOptions(selected){
  return SWAP_TOKENS.filter(isLiveToken).map(t=>'<option value="'+t.id+'" '+(t.id===selected?"selected":"")+'>'+t.symbol+(t.native?" · BNB":"")+'</option>').join("");
}
function allTokenChips(){
  return SWAP_TOKENS.map(t=>'<span class="token-chip '+t.kind+'">'+t.symbol+(t.kind==="bstock"?" · discovery":"")+'</span>').join("");
}
function renderSwapPanel(){
  const root=document.getElementById("swapPanel");
  if(!root||typeof SWAP_TOKENS==="undefined")return;
  if(!window.__swapState)window.__swapState={from:"BNB",to:"USDT",amount:"0.01",slippage:"50",wallet:null,quote:null};
  const s=window.__swapState,from=tokenById(s.from),to=tokenById(s.to);
  root.innerHTML='<div class="swap-card"><div class="swap-head"><div><h3>Live Swap</h3><p class="sub">Non-custodial wallet → PancakeSwap V2 Router → BNB Chain. Quotes and transactions are sent through your wallet provider.</p></div><button type="button" class="swap-connect" id="swapConnect">'+(s.wallet?shortAddress(s.wallet):"Connect Wallet")+'</button></div><div class="live-badge">LIVE · BNB Chain</div><div class="swap-leg"><div class="row"><label>From</label><select id="swapFrom">'+liveTokenOptions(s.from)+'</select></div><input type="number" id="swapAmount" min="0" step="any" value="'+s.amount+'" placeholder="0.0"></div><button type="button" class="swap-flip" id="swapFlip">⇅</button><div class="swap-leg"><div class="row"><label>To</label><select id="swapTo">'+liveTokenOptions(s.to)+'</select></div><input type="text" id="swapOut" readonly value="'+(s.quote?s.quote.displayOut:"")+'" placeholder="Live quote"></div><div class="swap-meta" id="swapMeta">'+(s.quote?("Live quote · 1 "+from.symbol+" ≈ "+s.quote.rate+" "+to.symbol+"<br>Minimum received "+s.quote.minOutDisplay+" "+to.symbol+" · Slippage "+(Number(s.slippage)/100)+"%"):"Connect your wallet, then request a live quote.")+'</div><div class="field"><label>Slippage tolerance</label><select id="swapSlippage" class="expiry"><option value="25" '+(s.slippage==="25"?"selected":"")+'>0.25%</option><option value="50" '+(s.slippage==="50"?"selected":"")+'>0.50%</option><option value="100" '+(s.slippage==="100"?"selected":"")+'>1.00%</option><option value="200" '+(s.slippage==="200"?"selected":"")+'>2.00%</option></select></div><button type="button" class="swap-btn" id="swapQuote" '+(!s.wallet?"disabled":"")+'>Get live quote</button><button type="button" class="swap-btn" id="swapExecute" style="margin-top:8px" '+(!s.wallet||!s.quote?"disabled":"")+'>Swap in wallet</button><p class="swap-note" id="swapResult"></p><p class="swap-note">Live execution is limited to verified crypto contracts. bStocks/RWA remain discovery-only until an exact contract and liquidity route are verified.</p><div class="token-chips">'+allTokenChips()+"</div></div>";
  root.querySelector("#swapConnect").addEventListener("click",async()=>{
    const btn=root.querySelector("#swapConnect");btn.disabled=true;
    try{s.wallet=await connectWallet();renderSwapPanel();}catch(e){btn.disabled=false;root.querySelector("#swapResult").textContent=e?.message||String(e);}
  });
  root.querySelector("#swapFrom").addEventListener("change",e=>{s.from=e.target.value;if(s.from===s.to)s.to=SWAP_TOKENS.find(t=>t.id!==s.from&&isLiveToken(t)).id;s.quote=null;renderSwapPanel();});
  root.querySelector("#swapTo").addEventListener("change",e=>{s.to=e.target.value;s.quote=null;renderSwapPanel();});
  root.querySelector("#swapAmount").addEventListener("input",e=>{s.amount=e.target.value;s.quote=null;root.querySelector("#swapExecute").disabled=true;});
  root.querySelector("#swapSlippage").addEventListener("change",e=>{s.slippage=e.target.value;s.quote=null;renderSwapPanel();});
  root.querySelector("#swapFlip").addEventListener("click",()=>{const x=s.from;s.from=s.to;s.to=x;s.quote=null;renderSwapPanel();});
  root.querySelector("#swapQuote").addEventListener("click",async()=>{
    const result=root.querySelector("#swapResult"),btn=root.querySelector("#swapQuote");btn.disabled=true;btn.textContent="Quoting…";
    try{await ensureBsc();const from=tokenById(s.from),to=tokenById(s.to),q=await quoteLive(s.amount,from,to),minOut=minOutFromQuote(q.amountOut,Number(s.slippage));s.quote={...q,minOutRaw:minOut,displayOut:formatUnits(q.amountOut,to.decimals),minOutDisplay:formatUnits(minOut,to.decimals),rate:formatRate(q.rawIn,q.amountOut,from.decimals,to.decimals)};result.textContent="Live quote received from PancakeSwap V2 Router.";}
    catch(e){s.quote=null;result.textContent=e?.message||String(e);} renderSwapPanel();
  });
  root.querySelector("#swapExecute").addEventListener("click",async()=>{
    const result=root.querySelector("#swapResult"),btn=root.querySelector("#swapExecute");btn.disabled=true;btn.textContent="Preparing…";
    try{
      await ensureBsc();const wallet=(await rpc("eth_accounts"))[0]||await connectWallet(),from=tokenById(s.from),to=tokenById(s.to),q=await quoteLive(s.amount,from,to),minOut=minOutFromQuote(q.amountOut,Number(s.slippage)),deadline=Math.floor(Date.now()/1000)+600;
      if(from.native){
        const hash=await sendTx({from:wallet,to:PANCAKE_BSC.router,value:"0x"+q.rawIn.toString(16),data:encodeSwapExactETHForTokens(minOut,q.path,wallet,deadline)});
        result.innerHTML='Swap submitted · <a href="'+bscTx(hash)+'" target="_blank" rel="noopener">View on BscScan</a>';btn.textContent="Confirming…";await waitForReceipt(hash);result.innerHTML='<b style="color:var(--teal)">Swap confirmed</b> · <a href="'+bscTx(hash)+'" target="_blank" rel="noopener">'+shortAddress(hash)+'</a>';
      }else{
        const bal=await tokenBalance(from,wallet);if(bal<q.rawIn)throw new Error("Insufficient "+from.symbol+" balance.");
        if((await allowance(from,wallet))<q.rawIn){result.textContent="Approval required. Confirm token approval in your wallet.";const ah=await sendTx({from:wallet,to:from.address,data:encodeApprove(PANCAKE_BSC.router,q.rawIn)});await waitForReceipt(ah);}
        const data=to.native?encodeSwapExactTokensForETH(q.rawIn,minOut,q.path,wallet,deadline):encodeSwapExactTokensForTokens(q.rawIn,minOut,q.path,wallet,deadline);
        const hash=await sendTx({from:wallet,to:PANCAKE_BSC.router,data});result.innerHTML='Swap submitted · <a href="'+bscTx(hash)+'" target="_blank" rel="noopener">View on BscScan</a>';btn.textContent="Confirming…";await waitForReceipt(hash);result.innerHTML='<b style="color:var(--teal)">Swap confirmed</b> · <a href="'+bscTx(hash)+'" target="_blank" rel="noopener">'+shortAddress(hash)+'</a>';
      }
    }catch(e){result.textContent=e?.message||String(e);}btn.disabled=false;btn.textContent="Swap in wallet";
  });
  const provider=window.ethereum;
  if(provider&&!provider.__stiviumSwapWired){provider.__stiviumSwapWired=true;provider.on?.("accountsChanged",a=>{s.wallet=a?.[0]||null;renderSwapPanel();});provider.on?.("chainChanged",()=>{s.quote=null;renderSwapPanel();});}
}
function wireViewTabs(){
  const tabA=document.getElementById("tabAgents"),tabS=document.getElementById("tabSwap"),gridWrap=document.getElementById("gridWrap"),swapPanel=document.getElementById("swapPanel");
  if(!tabA||!tabS)return;
  const show=view=>{const agents=view==="agents";tabA.classList.toggle("active",agents);tabS.classList.toggle("active",!agents);if(gridWrap)gridWrap.classList.toggle("hidden",!agents);if(swapPanel){swapPanel.classList.toggle("open",!agents);if(!agents)renderSwapPanel();}};
  tabA.addEventListener("click",()=>show("agents"));tabS.addEventListener("click",()=>show("swap"));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wireViewTabs);else wireViewTabs();
