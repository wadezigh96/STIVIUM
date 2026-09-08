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

const CATEGORY_TARGETS = {
  "Rebalancing": [
    "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  ],
  "Grid Trading": [
    "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  ],
  "Yield Optimisation": [
    "0xfd36e2c2a6789db23113685031d7f16329158384",
    "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  ],
  "Health Factor Monitoring": [
    "0xfd36e2c2a6789db23113685031d7f16329158384",
  ],
};

const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

let client = null;
let wallet = null;
let chainId = 97;

async function loadSdk() {
  const mod = await import("https://esm.sh/@altananetwork/sdk@0.9.0");
  return mod;
}

async function ensureClient() {
  if (client && wallet) return { client, wallet };
  const sdk = await loadSdk();
  const chain = sdk.BNB_TESTNET || sdk.BNB;
  chainId = chain?.id === 56 ? 56 : 97;
  client = sdk.createClient({ chains: [chain] });

  if (typeof client.createPasskeyWallet === "function") {
    try {
      const rpId = location.hostname === "localhost" ? "localhost" : location.hostname;
      wallet = await client.createPasskeyWallet({ name: "Stivium", rpId });
      return { client, wallet };
    } catch (e) {
      console.warn("Passkey wallet failed, falling back", e);
    }
  }

  let signer;
  try {
    const accounts = await import("https://esm.sh/viem/accounts");
    if (sdk.signerFromPrivateKey) {
      signer = sdk.signerFromPrivateKey(accounts.generatePrivateKey());
    }
  } catch (_) {}

  wallet = await client.createWallet(signer ? { signer } : {});
  return { client, wallet };
}

function usdToWeiApprox(usd) {
  const bnb = Math.max(0.0001, Number(usd) * 0.001);
  return BigInt(Math.floor(bnb * 1e18));
}

export async function grantAgentSession({ agentName, category, capUsd, expiryDays }) {
  try {
    const { client: c, wallet: w } = await ensureClient();
    const targets = CATEGORY_TARGETS[category] || CATEGORY_TARGETS["Rebalancing"];
    const expiry = Math.floor(Date.now() / 1000) + Number(expiryDays || 7) * 86400;
    const limit = usdToWeiApprox(capUsd || 50);

    const session = await c.grantSession({
      wallet: w,
      signer: w.signer,
      permissions: {
        calls: targets.map((to) => ({ to })),
        spend: [{ limit, period: "day", token: NATIVE }],
      },
      expiry,
      register: true,
      chainId,
    });

    const txHash = session.transactionHash || session.txHash || null;
    window.__stiviumSessions = window.__stiviumSessions || {};
    window.__stiviumSessions[agentName] = {
      agentName,
      walletAddress: session.walletAddress || w.address,
      publicKey: session.publicKey,
      expiry: session.expiry || expiry,
      txHash,
      _session: session,
    };

    return {
      ok: true,
      mock: false,
      txHash,
      explorer: txHash ? EXPLORER_TX[chainId] + txHash : null,
      wallet: session.walletAddress || w.address,
      chainId,
    };
  } catch (err) {
    console.error("Altana grantSession failed", err);
    return { ok: false, mock: true, error: err?.message || String(err) };
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
