import React, { useEffect } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { PrivyProvider, usePrivy, useWallets } from "https://esm.sh/@privy-io/react-auth@3.45.0?deps=react@18.3.1,react-dom@18.3.1";
import { encodeFunctionData, decodeEventLog, hexToString } from "https://esm.sh/viem@2.45.0";

const PRIVY_APP_ID = "cmucttpbs02380djmk1jxh9j0";
const BSC_CHAIN_ID = "0x61";
const BSC_TESTNET = 97;
const BSC_TESTNET_CHAIN = {
  id: BSC_TESTNET,
  name: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://data-seed-prebsc-1-s1.bnbchain.org"] },
    public: { http: ["https://data-seed-prebsc-1-s1.bnbchain.org"] }
  },
  blockExplorers: {
    default: { name: "BscScan", url: "https://testnet.bscscan.com" }
  },
  testnet: true
};
const ERC8183_COMMERCE = "0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE";
const ERC8183_ROUTER = "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25";
const ERC8183_POLICY = "0xd6a4217588f6b1f5657a92a3e94e6422ad771cea";
const ERC8183_EVENT_ABI = [{type:"event",name:"JobCreated",inputs:[{indexed:true,name:"jobId",type:"uint256"},{indexed:true,name:"client",type:"address"},{indexed:true,name:"provider",type:"address"},{indexed:false,name:"evaluator",type:"address"},{indexed:false,name:"expiredAt",type:"uint256"},{indexed:false,name:"hook",type:"address"}]}];
const ERC8183_COMMERCE_ABI = [
  {type:"function",name:"paymentToken",stateMutability:"view",inputs:[],outputs:[{type:"address"}]},
  {type:"function",name:"createJob",stateMutability:"nonpayable",inputs:[{name:"provider",type:"address"},{name:"evaluator",type:"address"},{name:"expiredAt",type:"uint256"},{name:"description",type:"string"},{name:"hook",type:"address"}],outputs:[{type:"uint256"}]},
  {type:"function",name:"setBudget",stateMutability:"nonpayable",inputs:[{name:"jobId",type:"uint256"},{name:"amount",type:"uint256"},{name:"optParams",type:"bytes"}],outputs:[]},
  {type:"function",name:"fund",stateMutability:"nonpayable",inputs:[{name:"jobId",type:"uint256"},{name:"expectedBudget",type:"uint256"},{name:"optParams",type:"bytes"}],outputs:[]}
];
const ERC8183_ROUTER_ABI = [{type:"function",name:"registerJob",stateMutability:"nonpayable",inputs:[{name:"jobId",type:"uint256"},{name:"policy",type:"address"}],outputs:[]}];
const ERC20_ABI = [
  {type:"function",name:"decimals",stateMutability:"view",inputs:[],outputs:[{type:"uint8"}]},
  {type:"function",name:"symbol",stateMutability:"view",inputs:[],outputs:[{type:"string"}]},
  {type:"function",name:"balanceOf",stateMutability:"view",inputs:[{name:"account",type:"address"}],outputs:[{type:"uint256"}]},
  {type:"function",name:"allowance",stateMutability:"view",inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}],outputs:[{type:"uint256"}]},
  {type:"function",name:"approve",stateMutability:"nonpayable",inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}],outputs:[{type:"bool"}]}
];

function StiviumPrivyBridge(){
  const { ready, authenticated, connectOrCreateWallet } = usePrivy();
  const { wallets } = useWallets();
  const wallet = (wallets && wallets.find(w => w.walletClientType === "privy")) || (wallets && wallets[0]) || null;

  useEffect(() => {
    const bridge = window.__stiviumPrivy || {};
    bridge.ready = ready;
    bridge.authenticated = authenticated;
    bridge.walletAddress = (wallet && wallet.address) || null;
    bridge.providerType = wallet ? (wallet.walletClientType || "privy") : null;

    // Keep the bridge object stable so swap-ui.js does not lose its onStateChange handler.
    bridge.login = async () => {
      if (!ready) throw new Error("Privy is still loading. Please try again.");
      // If an embedded wallet already exists, never reopen the Privy connect flow.
      if ((wallet && wallet.address)) return wallet.address;
      await connectOrCreateWallet();
      const started = Date.now();
      while (Date.now() - started < 15000) {
        if (window.__stiviumPrivy?.walletAddress) return window.__stiviumPrivy.walletAddress;
        await new Promise(r => setTimeout(r, 250));
      }
      return window.__stiviumPrivy?.walletAddress || true;
    };

    bridge.ensureBsc = async () => {
      if (!(wallet && wallet.address)) throw new Error("No Privy wallet is available. Connect the wallet first.");
      const provider = await wallet.getEthereumProvider();
      const current = await provider.request({method:"eth_chainId"});
      if (current === BSC_CHAIN_ID) return true;
      if (typeof wallet.switchChain === "function") {
        try {
          await wallet.switchChain(BSC_TESTNET);
          if (await provider.request({method:"eth_chainId"}) === BSC_CHAIN_ID) return true;
        } catch (e) {
          console.warn("[Stivium] Privy switchChain(97) failed; using EIP-1193 fallback.", e);
        }
      }
      try {
        await provider.request({method:"wallet_switchEthereumChain", params:[{chainId:BSC_CHAIN_ID}]});
      } catch (e) {
        if ((e && e.code) === 4902) {
          await provider.request({method:"wallet_addEthereumChain", params:[{
            chainId:BSC_CHAIN_ID,
            chainName:BSC_TESTNET_CHAIN.name,
            nativeCurrency:BSC_TESTNET_CHAIN.nativeCurrency,
            rpcUrls:BSC_TESTNET_CHAIN.rpcUrls.default.http,
            blockExplorerUrls:[BSC_TESTNET_CHAIN.blockExplorers.default.url]
          }]});
        } else throw e;
      }
      if (await provider.request({method:"eth_chainId"}) !== BSC_CHAIN_ID) {
        throw new Error("Wallet did not switch to BNB Smart Chain Testnet (chain 97).");
      }
      return true;
    };

    bridge.ensureBscMainnet = async () => {
      if (!(wallet && wallet.address)) throw new Error("No Privy wallet is available. Connect the wallet first.");
      const provider = await wallet.getEthereumProvider();
      const chainId = "0x38";
      const current = await provider.request({method:"eth_chainId"});
      if (current !== chainId) {
        try {
          await provider.request({method:"wallet_switchEthereumChain", params:[{chainId}]});
        } catch (e) {
          if ((e && e.code) === 4902) {
            await provider.request({method:"wallet_addEthereumChain", params:[{
              chainId,
              chainName:"BNB Smart Chain",
              nativeCurrency:{name:"BNB",symbol:"BNB",decimals:18},
              rpcUrls:["https://bsc-dataseed.binance.org"],
              blockExplorerUrls:["https://bscscan.com"]
            }]});
          } else throw e;
        }
      }
      return true;
    };

    bridge.sendTransaction = async ({to, data="0x", value=0n, chainId=BSC_TESTNET}) => {
      if (!(wallet && wallet.address)) throw new Error("No Privy wallet is available. Connect the wallet first.");
      const provider = await wallet.getEthereumProvider();
      const chainHex = "0x" + Number(chainId).toString(16);
      const current = await provider.request({method:"eth_chainId"});
      if (current !== chainHex) {
        await provider.request({method:"wallet_switchEthereumChain", params:[{chainId:chainHex}]});
      }
      const from = wallet.address;
      const tx = {from, to, data, value:"0x"+BigInt(value).toString(16)};
      return { hash: await provider.request({method:"eth_sendTransaction", params:[tx]}) };
    };

    bridge.hireErc8183Testnet = async ({provider, description, budgetTokens="0.1", expirySeconds=3600}) => {
      if (!(wallet && wallet.address)) throw new Error("Connect Privy before hiring.");
      if (!/^0x[a-fA-F0-9]{40}$/.test(provider || "")) throw new Error("A valid ERC-8183 provider address is required.");
      await bridge.ensureBsc();
      const rpc = await wallet.getEthereumProvider();
      const call = async (to, abi, functionName, args) => {
        const data = encodeFunctionData({abi, functionName, args});
        const hash = await rpc.request({method:"eth_sendTransaction", params:[{from:wallet.address,to,data,value:"0x0"}]});
        return await waitReceipt(rpc, hash);
      };
      const read = async (to, abi, functionName, args=[]) => {
        const data = encodeFunctionData({abi, functionName, args});
        const raw = await rpc.request({method:"eth_call", params:[{to,data},"latest"]});
        return raw;
      };
      const tokenRaw = await read(ERC8183_COMMERCE, ERC8183_COMMERCE_ABI, "paymentToken");
      const token = "0x" + tokenRaw.slice(-40);
      const decRaw = await read(token, ERC20_ABI, "decimals");
      const decimals = Number(BigInt(decRaw));
      const parseUnits = (value, digits) => {
        const s = String(value).trim();
        if(!/^\d+(\.\d+)?$/.test(s)) throw new Error("Invalid ERC-20 budget.");
        const parts = s.split(".");
        const fraction = parts[1] || "";
        if(fraction.length > digits) throw new Error("Budget has too many decimal places.");
        return BigInt(parts[0]) * (10n ** BigInt(digits)) + BigInt((fraction + "0".repeat(digits)).slice(0, digits));
      };
      const symbolRaw = await read(token, ERC20_ABI, "symbol");
      let symbol = "U";
      try { symbol = hexToString(symbolRaw, {size:32}).replace(/\0/g,"").trim() || "U"; } catch (_) {}
      const amount = parseUnits(budgetTokens, decimals);
      if (amount <= 0n) throw new Error("Budget must be greater than zero.");
      const balRaw = await read(token, ERC20_ABI, "balanceOf", [wallet.address]);
      const balance = BigInt(balRaw);
      if (balance < amount) throw new Error(`Insufficient ${symbol} balance for hire: need ${budgetTokens} ${symbol}; current balance is ${balance.toString()} base units. Fund this Privy wallet with BSC Testnet ${symbol} first.`);
      const expires = BigInt(Math.floor(Date.now()/1000) + Number(expirySeconds));
      const createData = encodeFunctionData({abi:ERC8183_COMMERCE_ABI,functionName:"createJob",args:[provider,ERC8183_ROUTER,expires,description,ERC8183_ROUTER]});
      const createHash = await rpc.request({method:"eth_sendTransaction",params:[{from:wallet.address,to:ERC8183_COMMERCE,data:createData,value:"0x0"}]});
      const createReceipt = await waitReceipt(rpc, createHash);
      let jobId = null;
      for (const log of (createReceipt.logs || [])) {
        try {
          const decoded = decodeEventLog({abi:ERC8183_EVENT_ABI,data:log.data,topics:log.topics});
          if (decoded.eventName === "JobCreated") { jobId = decoded.args.jobId.toString(); break; }
        } catch (_) {}
      }
      if (!jobId) throw new Error("JobCreated event not found in createJob receipt.");
      const registerReceipt = await call(ERC8183_ROUTER, ERC8183_ROUTER_ABI, "registerJob", [BigInt(jobId), ERC8183_POLICY]);
      const budgetReceipt = await call(ERC8183_COMMERCE, ERC8183_COMMERCE_ABI, "setBudget", [BigInt(jobId), amount, "0x"]);
      const allowanceRaw = await read(token, ERC20_ABI, "allowance", [wallet.address,ERC8183_COMMERCE]);
      let approvalReceipt = null;
      if (BigInt(allowanceRaw) < amount) {
        approvalReceipt = await call(token, ERC20_ABI, "approve", [ERC8183_COMMERCE, amount]);
      }
      const fundReceipt = await call(ERC8183_COMMERCE, ERC8183_COMMERCE_ABI, "fund", [BigInt(jobId), amount, "0x"]);
      return {ok:true,network:"bsc-testnet",chainId:BSC_TESTNET,provider,jobId,budget:budgetTokens,currency:"U",token,createTxHash:createHash,registerTxHash:registerReceipt.hash,budgetTxHash:budgetReceipt.hash,approvalTxHash:approvalReceipt && approvalReceipt.hash,fundTxHash:fundReceipt.hash,explorer:"https://testnet.bscscan.com/tx/"+fundReceipt.hash,wallet:wallet.address};
    };
    window.__stiviumPrivy = bridge;
    if (window.__swapState) window.__swapState.wallet = (wallet && wallet.address) || null;
    window.dispatchEvent(new CustomEvent("stivium:privy-state", {
      detail: { walletAddress: (wallet && wallet.address) || null, authenticated, ready }
    }));

    if (typeof bridge.onStateChange === "function") {
      bridge.onStateChange({walletAddress: (wallet && wallet.address) || null, authenticated, ready});
    }
  }, [ready, authenticated, wallet, connectOrCreateWallet]);

  return null;
}

async function waitReceipt(provider, hash){
  for(let i=0;i<90;i++){
    const receipt=await provider.request({method:"eth_getTransactionReceipt",params:[hash]});
    if(receipt){
      if(receipt.status && receipt.status !== "0x1") throw new Error("Transaction reverted: "+hash);
      return {...receipt,hash};
    }
    await new Promise(r=>setTimeout(r,2000));
  }
  throw new Error("Timed out waiting for transaction receipt: "+hash);
}

const mount = document.getElementById("privy-root");
if (mount) {
  createRoot(mount).render(
    React.createElement(
      PrivyProvider,
      {
        appId: PRIVY_APP_ID,
        config: {
          loginMethods: ["wallet", "email"],
          defaultChain: BSC_TESTNET_CHAIN,
          supportedChains: [BSC_TESTNET_CHAIN],
          embeddedWallets: { createOnLogin: "users-without-wallets" }
        }
      },
      React.createElement(StiviumPrivyBridge)
    )
  );
}