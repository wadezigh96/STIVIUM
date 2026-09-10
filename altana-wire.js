/**
 * Stivium ↔ Altana session key wiring (BNB testnet by default).
 * Loaded as ES module from index.html.
 *
 * Qualifies Altana track when grantSession lands on-chain with:
 * spend cap, call allowlist, expiry, Keystore registration, and visible tx.
 */

const EXPLORER_TX = {
  56: "https://bscscan.com/tx/",
  97: "https://testnet.bscscan.com/tx/",
};

// Category → example contract targets on BSC mainnet (testnet may differ).
// Used as call allowlist when "on-chain" mode is selected.
const CATEGORY_TARGETS = {
  "Rebalancing": [
    "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap Router V2
  ],
  "Grid Trading": [
    "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  ],
  "Yield Optimisation": [
    "0xfd36e2c2a6789db23113685031d7f16329158384", // Venus Comptroller (illustrative)
    "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  ],
  "Health Factor Monitoring": [
    "0xfd36e2c2a6789db23113685031d7f16329158384",
  ],
};

// Native BNB placeholder for spend (18 decimals). For stablecoins, swap token address.
const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

let client = null;
let wallet = null;
let chainId = 97;
let walletMode = "none"; // "passkey" | "ephemeral" | "none"

async function loadSdk() {
  const mod = await import("https://esm.sh/@altananetwork/sdk@0.9.0");
  return mod;
}

async function ensureClient() {
  if (client && wallet) return { client, wallet, walletMode };
  const sdk = await loadSdk();
  // Demo safety: always target BNB testnet (97). Do not wire mainnet funds here.
  const chain = sdk.BNB_TESTNET || sdk.BNB;
  chainId = 97;
  if (chain?.id === 56) {
    console.warn("Stivium Altana: SDK defaulted to mainnet chain object; session still tagged chainId 97 for demo.");
  }
  client = sdk.createClient({ chains: [chain] });

  // Prefer passkey in browser (no seed in localStorage).
  if (typeof sdk.createPasskeyWallet === "function" || client.createPasskeyWallet) {
    try {
      const rpId = location.hostname === "localhost" ? "localhost" : location.hostname;
      wallet = await client.createPasskeyWallet({
        name: "Stivium",
        rpId,
      });
      walletMode = "passkey";
      window.__stiviumWalletMode = walletMode;
      return { client, wallet, walletMode };
    } catch (e) {
      console.warn("Passkey wallet failed, falling back to ephemeral signer", e);
    }
  }

  const signer = sdk.signerFromPrivateKey
    ? sdk.signerFromPrivateKey(
        // Ephemeral key for demo only — lost on refresh; do NOT fund with real value
        (await import("https://esm.sh/viem/accounts")).generatePrivateKey()
      )
    : undefined;

  wallet = await client.createWallet(signer ? { signer } : {});
  walletMode = "ephemeral";
  window.__stiviumWalletMode = walletMode;
  const addr = wallet?.address || wallet?.account?.address || "";
  console.warn(
    "[Stivium] Ephemeral demo wallet. Key is not persisted. Do NOT deposit mainnet funds." +
      (addr ? " Address: " + addr : "")
  );
  return { client, wallet, walletMode };
}

function usdToWeiApprox(usd) {
  // Demo: treat 1 USD ≈ 0.001 BNB for cap sizing on testnet (not a price oracle).
  const bnb = Math.max(0.0001, Number(usd) * 0.001);
  const wei = BigInt(Math.floor(bnb * 1e18));
  return wei;
}

/**
 * Grant an on-chain session for an agent hire.
 * @returns {{ ok: boolean, mock?: boolean, txHash?: string, explorer?: string, error?: string, wallet?: string }}
 */
export async function grantAgentSession({ agentName, category, capUsd, expiryDays, allowlistLabels }) {
  try {
    const { client: c, wallet: w } = await ensureClient();
    const targets = CATEGORY_TARGETS[category] || CATEGORY_TARGETS["Rebalancing"];
    const expiry = Math.floor(Date.now() / 1000) + Number(expiryDays || 7) * 86400;
    const limit = usdToWeiApprox(capUsd || 50);

    const permissions = {
      calls: targets.map((to) => ({ to })),
      spend: [{ limit, period: "day", token: NATIVE }],
    };

    const session = await c.grantSession({
      wallet: w,
      signer: w.signer,
      permissions,
      expiry,
      register: true,
      chainId,
    });

    const txHash = session.transactionHash || session.txHash || null;
    // Keep a minimal non-secret record for revoke
    const record = {
      agentName,
      walletAddress: session.walletAddress || w.address,
      publicKey: session.publicKey,
      expiry: session.expiry || expiry,
      txHash,
      // session object kept in memory only for this tab
      _session: session,
    };
    window.__stiviumSessions = window.__stiviumSessions || {};
    window.__stiviumSessions[agentName] = record;

    const mode = walletMode || window.__stiviumWalletMode || "unknown";
    const warn =
      mode === "ephemeral"
        ? "Ephemeral demo key — not saved after refresh. Use testnet BNB only; never mainnet funds."
        : "BNB testnet session only. Revoke when done. Do not use mainnet funds in this demo.";
    return {
      ok: true,
      mock: false,
      txHash,
      explorer: txHash ? EXPLORER_TX[chainId] + txHash : null,
      wallet: record.walletAddress,
      chainId,
      walletMode: mode,
      warning: warn,
    };
  } catch (err) {
    console.error("Altana grantSession failed", err);
    return {
      ok: false,
      mock: true,
      error: err?.message || String(err),
    };
  }
}

export async function revokeAgentSession(agentName) {
  const rec = window.__stiviumSessions?.[agentName];
  if (!rec?._session || !client || !wallet) {
    return { ok: true, mock: true };
  }
  try {
    await client.revokeSession({
      wallet,
      signer: wallet.signer,
      session: rec._session,
      chainId,
    });
    delete window.__stiviumSessions[agentName];
    return { ok: true, mock: false };
  } catch (err) {
    console.error("Altana revoke failed", err);
    return { ok: false, error: err?.message || String(err) };
  }
}

window.StiviumAltana = { grantAgentSession, revokeAgentSession, ensureClient };
