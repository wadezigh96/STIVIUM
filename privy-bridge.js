import React, { useEffect } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { PrivyProvider, usePrivy, useWallets } from "https://esm.sh/@privy-io/react-auth@3.45.0?deps=react@18.3.1,react-dom@18.3.1";

const PRIVY_APP_ID = "cmucttpbs02380djmk1jxh9j0";
const BSC_CHAIN_ID = "0x38";

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
      return true;
    };

    bridge.ensureBsc = async () => {
      if (!(wallet && wallet.address)) throw new Error("No Privy wallet is available. Connect the wallet first.");
      const provider = await wallet.getEthereumProvider();
      const current = await provider.request({method:"eth_chainId"});
      if (current !== BSC_CHAIN_ID) {
        try {
          await provider.request({method:"wallet_switchEthereumChain", params:[{chainId:BSC_CHAIN_ID}]});
        } catch (e) {
          if ((e && e.code) === 4902) {
            await provider.request({method:"wallet_addEthereumChain", params:[{
              chainId:BSC_CHAIN_ID,
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

    bridge.sendTransaction = async ({to, data="0x", value=0n, chainId=56}) => {
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

const mount = document.getElementById("privy-root");
if (mount) {
  createRoot(mount).render(
    React.createElement(
      PrivyProvider,
      {appId: PRIVY_APP_ID},
      React.createElement(StiviumPrivyBridge)
    )
  );
}