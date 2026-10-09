import React, { useEffect } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { PrivyProvider, usePrivy, useWallets, useSendTransaction } from "https://esm.sh/@privy-io/react-auth@3.45.0?deps=react@18.3.1,react-dom@18.3.1";
import { encodeFunctionData, decodeEventLog, hexToString } from "https://esm.sh/viem@2.45.0";

const PRIVY_APP_ID = "cmucttpbs02380djmk1jxh9j0";
const BSC_CHAIN_ID = "0x61";
const BSC_TESTNET = 97;
const BSC_TESTNET_CHAIN = {
  id: BSC_TESTNET,
  name: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"] },
    public: { http: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"] }
  },
  blockExplorers: {
    default: { name: "BscScan", url: "https://testnet.bscscan.com" }
  },
  testnet: true
};
const ERC8183_COMMERCE = "0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE";
const ERC8004_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
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
const ERC8004_REGISTRY_ABI = [
  {type:"function",name:"register",stateMutability:"nonpayable",inputs:[{name:"agentURI",type:"string"}],outputs:[{name:"agentId",type:"uint256"}]}
];
const ERC20_ABI = [
  {type:"function",name:"decimals",stateMutability:"view",inputs:[],outputs:[{type:"uint8"}]},
  {type:"function",name:"symbol",stateMutability:"view",inputs:[],outputs:[{type:"string"}]},
  {type:"function",name:"balanceOf",stateMutability:"view",inputs:[{name:"account",type:"address"}],outputs:[{type:"uint256"}]},
  {type:"function",name:"allowance",stateMutability:"view",inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}],outputs:[{type:"uint256"}]},
  {type:"function",name:"approve",stateMutability:"nonpayable",inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}],outputs:[{type:"bool"}]}
];

let stiviumHireInFlight = null;

function StiviumPrivyBridge(){
  const { ready, authenticated, connectOrCreateWallet } = usePrivy();
  const { sendTransaction: privySendTransaction } = useSendTransaction();
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
      if (wallet && wallet.address) return wallet.address;

      // connectOrCreateWallet() can resolve before Privy's wallet list has
      // propagated into React state. Wait for the bridge state event and only
      // report success once a real wallet address exists.
      let resolveState;
      let rejectState;
      let settled = false;
      const waitForState = new Promise((resolve, reject) => {
        resolveState = resolve;
        rejectState = reject;
      });
      const onState = (event) => {
        const address = event?.detail?.walletAddress;
        if (address) {
          settled = true;
          window.removeEventListener("stivium:privy-state", onState);
          resolveState(address);
        }
      };
      window.addEventListener("stivium:privy-state", onState);

      try {
        await connectOrCreateWallet();
        const immediate = window.__stiviumPrivy?.walletAddress;
        if (immediate) {
          settled = true;
          window.removeEventListener("stivium:privy-state", onState);
          return immediate;
        }

        const timeout = new Promise((_, reject) => {
          setTimeout(() => {
            if (settled) return;
            reject(new Error("Wallet connection timed out. Please approve the wallet connection and try again."));
          }, 20000);
        });
        return await Promise.race([waitForState, timeout]);
      } catch (e) {
        window.removeEventListener("stivium:privy-state", onState);
        throw e;
      }
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
      if (Number(chainId) !== BSC_TESTNET) throw new Error("STIVIUM is testnet-only: transaction chain must be BSC Testnet (97).");
      await bridge.ensureBsc();
      return await privySendTransaction({to, data, value:BigInt(value), chainId:BSC_TESTNET}, {address:wallet.address});
    };

    bridge.registerErc8004Agent = async ({name, description, endpoints=[]}) => {
      if (!(wallet && wallet.address)) throw new Error("Connect Privy before registering an agent.");
      if (!name || !String(name).trim()) throw new Error("Agent name is required.");
      if (!ready) throw new Error("Privy is still loading. Please try again.");

      // ERC-8004 registration is a single explicit wallet transaction.
      const provider = await wallet.getEthereumProvider();
      const current = await provider.request({method:"eth_chainId"});
      if (current !== BSC_CHAIN_ID) {
        await bridge.ensureBsc();
      }

      const cleanEndpoints = Array.isArray(endpoints) ? endpoints.filter(Boolean).slice(0,8) : [];
      const registration = {
        type:"https://eips.ethereum.org/EIPS/eip-8004",
        name:String(name).trim(),
        description:String(description || "").trim(),
        endpoints:cleanEndpoints,
        version:"1.0"
      };
      const agentURI = "data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(registration))));
      const data = encodeFunctionData({abi:ERC8004_REGISTRY_ABI,functionName:"register",args:[agentURI]});
      const hash = await provider.request({method:"eth_sendTransaction",params:[{
        from:wallet.address,
        to:ERC8004_REGISTRY,
        data,
        value:"0x0"
      }]});
      const receipt = await waitReceipt(provider, hash);
      let agentId = null;
      try {
        const logs = receipt.logs || [];
        for (const log of logs) {
          if (!log || String(log.address).toLowerCase() !== ERC8004_REGISTRY.toLowerCase()) continue;
          const topics = log.topics || [];
          if (topics.length >= 2) {
            agentId = BigInt(topics[1]).toString();
            break;
          }
        }
      } catch (_) {}
      return {
        ok:true,
        network:"bsc-testnet",
        chainId:BSC_TESTNET,
        agentId,
        transactionHash:hash,
        agentURI,
        wallet:wallet.address,
        explorer:"https://testnet.bscscan.com/tx/"+hash
      };
    };

    bridge.hireErc8183Testnet = async ({provider, description, budgetTokens="0.1", expirySeconds=3600, onProgress}) => {
      // One wallet action per button press. ERC-8183 needs multiple on-chain
      // calls, but never auto-chain them after a single approval.
      if (stiviumHireInFlight) return await stiviumHireInFlight;
      if (!(wallet && wallet.address)) throw new Error("Connect Privy before hiring.");

      stiviumHireInFlight = (async () => {
        const progress = (step) => { try { if (typeof onProgress === "function") onProgress(step); } catch (_) {} };
        const rpc = await wallet.getEthereumProvider();
        const sendAndWait = async (to, abi, functionName, args) => {
          const data = encodeFunctionData({abi, functionName, args});
          const sent = await bridge.sendTransaction({to, data, value:0n, chainId:BSC_TESTNET});
          return await waitReceipt(rpc, sent.hash);
        };
        const read = async (to, abi, functionName, args=[]) => {
          const data = encodeFunctionData({abi, functionName, args});
          const raw = await rpc.request({method:"eth_call", params:[{to,data},"latest"]});
          return raw;
        };

        // Resume the next step from the in-memory session, but do exactly one
        // transaction here and return control to the UI.
        if (bridge.__erc8183Session) {
          const s = bridge.__erc8183Session;
          if (provider && provider !== s.provider) throw new Error("ERC-8183 hire session is already bound to another provider.");
          await bridge.ensureBsc();

          if (s.step === "register") {
            progress("register");
            const receipt = await sendAndWait(ERC8183_ROUTER, ERC8183_ROUTER_ABI, "registerJob", [BigInt(s.jobId), ERC8183_POLICY]);
            s.step = "budget";
            return {
              ok:true, complete:false, step:"budget", nextStep:"budget",
              provider:s.provider, jobId:s.jobId, budget:budgetTokens, currency:"U", token:s.token,
              createJobTxHash:s.createJobTxHash, createTxHash:s.createJobTxHash,
              registerJobTxHash:receipt.hash, registerTxHash:receipt.hash
            };
          }

          if (s.step === "budget") {
            progress("budget");
            const receipt = await sendAndWait(ERC8183_COMMERCE, ERC8183_COMMERCE_ABI, "setBudget", [BigInt(s.jobId), BigInt(s.amount), "0x"]);
            const allowanceRaw = await read(s.token, ERC20_ABI, "allowance", [wallet.address, ERC8183_COMMERCE]);
            s.step = BigInt(allowanceRaw) < BigInt(s.amount) ? "approve" : "fund";
            return {
              ok:true, complete:false, step:s.step, nextStep:s.step,
              provider:s.provider, jobId:s.jobId, budget:budgetTokens, currency:"U", token:s.token,
              createJobTxHash:s.createJobTxHash, createTxHash:s.createJobTxHash,
              registerJobTxHash:s.registerJobTxHash, registerTxHash:s.registerJobTxHash,
              setBudgetTxHash:receipt.hash, budgetTxHash:receipt.hash
            };
          }

          if (s.step === "approve") {
            progress("approve");
            const receipt = await sendAndWait(s.token, ERC20_ABI, "approve", [ERC8183_COMMERCE, BigInt(s.amount)]);
            s.approveTxHash = receipt.hash;
            s.step = "fund";
            return {
              ok:true, complete:false, step:"fund", nextStep:"fund",
              provider:s.provider, jobId:s.jobId, budget:budgetTokens, currency:"U", token:s.token,
              createJobTxHash:s.createJobTxHash, createTxHash:s.createJobTxHash,
              registerJobTxHash:s.registerJobTxHash, registerTxHash:s.registerJobTxHash,
              setBudgetTxHash:s.setBudgetTxHash, budgetTxHash:s.setBudgetTxHash,
              approveTxHash:s.approveTxHash, approvalTxHash:s.approveTxHash
            };
          }

          if (s.step === "fund") {
            progress("fund");
            const receipt = await sendAndWait(ERC8183_COMMERCE, ERC8183_COMMERCE_ABI, "fund", [BigInt(s.jobId), BigInt(s.amount), "0x"]);
            const out = {
              ok:true, complete:true, step:"done", nextStep:null,
              network:"bsc-testnet", chainId:BSC_TESTNET, provider:s.provider, jobId:s.jobId,
              budget:budgetTokens, currency:"U", token:s.token,
              createJobTxHash:s.createJobTxHash, createTxHash:s.createJobTxHash,
              registerJobTxHash:s.registerJobTxHash, registerTxHash:s.registerJobTxHash,
              setBudgetTxHash:s.setBudgetTxHash, budgetTxHash:s.setBudgetTxHash,
              approveTxHash:s.approveTxHash || null, approvalTxHash:s.approveTxHash || null,
              fundTxHash:receipt.hash, explorer:"https://testnet.bscscan.com/tx/"+receipt.hash,
              wallet:wallet.address
            };
            bridge.__erc8183Session = null;
            return out;
          }

          throw new Error("Unknown ERC-8183 hire step: " + s.step);
        }

        if (!/^0x[a-fA-F0-9]{40}$/.test(provider || "")) throw new Error("No ERC-8183 provider is configured for this agent.");
        progress("switch");
        await bridge.ensureBsc();

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
        const amount = parseUnits(budgetTokens, decimals);
        if (amount <= 0n) throw new Error("Budget must be greater than zero.");
        const balRaw = await read(token, ERC20_ABI, "balanceOf", [wallet.address]);
        if (BigInt(balRaw) < amount) throw new Error("Insufficient U balance. Fund this Privy wallet with BSC Testnet U first.");

        const expires = BigInt(Math.floor(Date.now()/1000) + Number(expirySeconds));
        progress("create");
        const createData = encodeFunctionData({
          abi:ERC8183_COMMERCE_ABI,
          functionName:"createJob",
          args:[provider,ERC8183_ROUTER,expires,description,ERC8183_ROUTER]
        });
        const createSent = await bridge.sendTransaction({to:ERC8183_COMMERCE, data:createData, value:0n, chainId:BSC_TESTNET});
        const createHash = createSent.hash;
        const createReceipt = await waitReceipt(rpc, createHash);
        let jobId = null;
        for (const log of (createReceipt.logs || [])) {
          try {
            const decoded = decodeEventLog({abi:ERC8183_EVENT_ABI,data:log.data,topics:log.topics});
            if (decoded.eventName === "JobCreated") { jobId = decoded.args.jobId.toString(); break; }
          } catch (_) {}
        }
        if (!jobId) throw new Error("createJob succeeded but JobCreated event was not found in the receipt.");

        bridge.__erc8183Session = {
          provider,
          jobId,
          amount:amount.toString(),
          token,
          createJobTxHash:createHash,
          registerJobTxHash:null,
          setBudgetTxHash:null,
          approveTxHash:null,
          step:"register"
        };

        return {
          ok:true, complete:false, step:"register", nextStep:"register",
          network:"bsc-testnet", chainId:BSC_TESTNET, provider, jobId,
          budget:budgetTokens, currency:"U", token,
          createJobTxHash:createHash, createTxHash:createHash,
          explorer:"https://testnet.bscscan.com/tx/"+createHash, wallet:wallet.address
        };
      })();

      try { return await stiviumHireInFlight; }
      finally { stiviumHireInFlight = null; }
    };
    window.__stiviumPrivy = bridge;
    if (window.__swapState) window.__swapState.wallet = (wallet && wallet.address) || null;
    window.dispatchEvent(new CustomEvent("stivium:privy-state", {
      detail: { walletAddress: (wallet && wallet.address) || null, authenticated, ready }
    }));

    if (typeof bridge.onStateChange === "function") {
      bridge.onStateChange({walletAddress: (wallet && wallet.address) || null, authenticated, ready});
    }
  }, [ready, authenticated, wallet, connectOrCreateWallet, privySendTransaction]);

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
