import React, { useEffect } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { PrivyProvider, usePrivy, useWallets } from "https://esm.sh/@privy-io/react-auth@1.98.4?deps=react@18.3.1,react-dom@18.3.1";

const PRIVY_APP_ID = "cmucttpbs02380djmk1jxh9j0";
const BSC_CHAIN_ID = "0x38";

function StiviumPrivyBridge(){
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();

  const wallet = wallets?.find(w => w.walletClientType === "privy") || wallets?.[0] || null;

  useEffect(() => {
    window.__stiviumPrivy = {
      ready,
      authenticated,
      walletAddress: wallet?.address || null,
      login: async () => {
        if (!ready) throw new Error("Privy is still loading. Please try again.");
        await login();
      },
      sendTransaction: async ({to, data="0x", value=0n, chainId=56}) => {
        if (!wallet) throw new Error("No Privy wallet is available. Finish wallet setup first.");
        const provider = await wallet.getEthereumProvider();
        const chainHex = "0x" + Number(chainId).toString(16);
        const current = await provider.request({method:"eth_chainId"});
        if (current !== chainHex) {
          await provider.request({method:"wallet_switchEthereumChain", params:[{chainId:chainHex}]});
        }
        const from = wallet.address;
        const tx = {from, to, data, value:"0x"+BigInt(value).toString(16)};
        return { hash: await provider.request({method:"eth_sendTransaction", params:[tx]}) };
      }
    };
    if (window.__swapState) {
      window.__swapState.wallet = wallet?.address || null;
    }
    if (typeof window.__stiviumPrivy.onStateChange === "function") {
      window.__stiviumPrivy.onStateChange({walletAddress: wallet?.address || null, authenticated, ready});
    }
  }, [ready, authenticated, wallet, login]);

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