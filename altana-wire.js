/**
 * Stivium ↔ Altana session-key wiring.
 * REAL BNB Smart Chain Testnet flow only (chain 97).
 *
 * A successful grant returns a real on-chain transaction hash. There is no
 * mock fallback in this module: if the wallet cannot sign/fund the grant,
 * the activation flow must stop and show the error.
 */

const SDK_URL = "https://esm.sh/@altananetwork/sdk@0.9.0";
const TESTNET_RPC = "https://bsc-testnet-rpc.publicnode.com";
const EXPLORER_TX = "https://testnet.bscscan.com/tx/";
const FAUCET_URL = "https://testnet.bnbchain.org/faucet-smart";
const CHAIN_ID = 97;
const EXECUTION_RECIPIENT = "0x000000000000000000000000000000000000dEaD";

// Category → allowed contract targets. These are permission boundaries only;
// the grant itself is executed on Altana's BNB testnet stack.
const CATEGORY_TARGETS = {
  "Rebalancing": ["0x10ED43C718714eb63d5aA57B78B54704E256024E"],
  "Grid Trading": ["0x10ED43C718714eb63d5aA57B78B54704E256024E"],
  "Yield Optimisation": [
    "0xfd36e2c2a6789db23113685031d7f16329158384",
    "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  ],
  "Health Factor Monitoring": ["0xfd36e2c2a6789db23113685031d7f16329158384"],
};

let client = null;
let wallet = null;

async function loadSdk() {
  return import(SDK_URL);
}

function rpId() {
  return location.hostname === "localhost" ? "localhost" : location.hostname;
}

async function ensureClient() {
  if (client && wallet) return { client, wallet };

  const sdk = await loadSdk();
  if (!sdk.BNB_TESTNET) {
    throw new Error("Altana SDK did not expose BNB_TESTNET.");
  }

  client = sdk.createClient({ chains: [sdk.BNB_TESTNET] });

  // Recover an existing passkey wallet when possible; otherwise create one.
  // This avoids generating a new wallet on every visit.
  try {
    if (typeof client.recoverFromPasskey === "function") {
      wallet = await client.recoverFromPasskey({ rpId: rpId() });
    }
  } catch (recoverError) {
    console.info("[Stivium] No recoverable Altana passkey yet; creating one.", recoverError);
  }

  if (!wallet) {
    if (typeof client.createPasskeyWallet !== "function") {
      throw new Error("This browser/SDK cannot create an Altana passkey wallet.");
    }
    wallet = await client.createPasskeyWallet({
      name: "Stivium",
      rpId: rpId(),
    });
  }

  if (!wallet?.address || !wallet?.signer) {
    throw new Error("Altana passkey wallet was created without a usable signer.");
  }

  window.__stiviumWalletMode = "passkey";
  window.__stiviumWalletAddress = wallet.address;
  return { client, wallet };
}

function usdToNativeWei(usd) {
  const value = Number(usd);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Spend cap must be greater than 0.");
  }
  // Demo sizing only: $1 ≈ 0.001 tBNB. This is NOT a price oracle.
  return BigInt(Math.floor(value * 0.001 * 1e18));
}

async function waitForReceipt(txHash, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const response = await fetch(TESTNET_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });
    if (!response.ok) throw new Error("BNB testnet RPC returned HTTP " + response.status);
    const json = await response.json();
    const receipt = json.result;
    if (receipt) {
      if (receipt.status === "0x0") {
        throw new Error("Altana grant transaction reverted on BNB testnet.");
      }
      return receipt;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return null;
}

/**
 * Grant a real Altana session on BNB testnet.
 */
export async function grantAgentSession({ agentName, category, capUsd, expiryDays }) {
  let currentWallet = wallet;
  try {
    const { client: c, wallet: w } = await ensureClient();
    currentWallet = w;

    const targets = CATEGORY_TARGETS[category] || CATEGORY_TARGETS["Rebalancing"];
    const expiry = Math.floor(Date.now() / 1000) + Number(expiryDays || 7) * 86400;
    const nativeLimit = usdToNativeWei(capUsd || 50);

    // Native tBNB spend cap. The Altana relay also consumes fees from this cap,
    // so the user must fund the smart wallet with test BNB before confirming.
    const permissions = {
      calls: [...targets.map(to => ({ to })), { to: EXECUTION_RECIPIENT }],
      spend: [{ limit: nativeLimit, period: "day" }],
    };

    const session = await c.grantSession({
      wallet: w,
      signer: w.signer,
      permissions,
      expiry,
      register: true,
      chainId: CHAIN_ID,
    });

    // @altananetwork/sdk >= 0.9 returns grantSession metadata in `legs`;
    // transactionHash lives on the confirmed account/registry leg, not on the
    // top-level session object.
    const legs = Array.isArray(session?.legs) ? session.legs : [];
    const confirmedLeg = legs.find(leg => leg?.status === "CONFIRMED" && leg?.transactionHash);
    const txHash = confirmedLeg?.transactionHash || session?.transactionHash || session?.txHash || null;
    const grantStatus = session?.status || null;
    if (grantStatus !== "granted" || !txHash) {
      const reasons = legs.filter(leg => leg?.reason).map(leg => leg.reason);
      throw new Error(
        "Altana session grant did not produce a confirmed transaction." +
        (grantStatus ? ` status=${grantStatus}.` : "") +
        (reasons.length ? ` ${reasons.join(" | ")}` : "")
      );
    }

    const receipt = await waitForReceipt(txHash);

    const record = {
      agentName,
      walletAddress: session.walletAddress || w.address,
      publicKey: session.publicKey,
      expiry: session.expiry || expiry,
      txHash,
      receipt,
      _session: session,
    };
    window.__stiviumSessions = window.__stiviumSessions || {};
    window.__stiviumSessions[agentName] = record;

    return {
      ok: true,
      mock: false,
      txHash,
      explorer: EXPLORER_TX + txHash,
      wallet: record.walletAddress,
      walletMode: "passkey",
      chainId: CHAIN_ID,
      confirmed: !!receipt,
      faucet: FAUCET_URL,
      warning: receipt
        ? "Real Altana session grant confirmed on BNB testnet. Testnet only."
        : "Real Altana transaction was returned by the confirmed Altana grant. Testnet only.",
      grantStatus,
      legs: legs.map(leg => ({
        chainId: leg?.chainId,
        kind: leg?.kind,
        status: leg?.status,
        transactionHash: leg?.transactionHash || null,
        reason: leg?.reason || null,
      })),
    };
  } catch (err) {
    console.error("[Stivium] Real Altana grant failed", err);
    return {
      ok: false,
      mock: false,
      error: err?.message || String(err),
      wallet: currentWallet?.address || window.__stiviumWalletAddress || null,
      walletMode: wallet ? "passkey" : "none",
      chainId: CHAIN_ID,
      faucet: FAUCET_URL,
    };
  }
}

/**
 * Execute a real, deliberately tiny Altana session-key transaction.
 * This is a BNB testnet proof-of-execution: 1 wei is sent to a fixed
 * test-only recipient after the scoped session has been granted.
 */
export async function executeAgentSession(agentName) {
  const rec = window.__stiviumSessions?.[agentName];
  if (!rec?._session || !client) {
    return { ok: false, mock: false, error: "No live Altana session is available in this browser tab." };
  }
  try {
    const result = await client.execute({
      session: rec._session,
      calls: {
        to: EXECUTION_RECIPIENT,
        value: 1n,
        data: "0x",
      },
    });
    const txHash =
      result?.transactionHash ||
      result?.receipts?.find?.(receipt => receipt?.transactionHash)?.transactionHash ||
      null;
    if (!txHash) {
      return {
        ok: false,
        mock: false,
        status: result?.status || "PENDING",
        statusCode: result?.statusCode || null,
        callsId: result?.callsId || null,
        error:
          result?.status === "FAILED"
            ? `Altana execute failed (relay code ${result?.statusCode || "unknown"}).`
            : "Altana execute is pending but the relay has not returned a transaction receipt yet.",
      };
    }
    rec.executeTxHash = txHash;
    rec.executeResult = result;
    return {
      ok: true,
      mock: false,
      status: result.status,
      statusCode: result.statusCode || null,
      callsId: result.callsId,
      txHash,
      explorer: EXPLORER_TX + txHash,
      recipient: EXECUTION_RECIPIENT,
      valueWei: "1",
      warning: "Real Altana session execution confirmed on BNB testnet. 1 wei test transfer only.",
    };
  } catch (err) {
    console.error("[Stivium] Real Altana execute failed", err);
    return { ok: false, mock: false, error: err?.message || String(err) };
  }
}

export async function revokeAgentSession(agentName) {
  const rec = window.__stiviumSessions?.[agentName];
  if (!rec?._session || !client || !wallet) {
    return { ok: false, mock: false, error: "No live Altana session is available in this browser tab." };
  }
  try {
    const result = await client.revokeSession({
      wallet,
      signer: wallet.signer,
      session: rec._session,
      chainId: CHAIN_ID,
    });
    delete window.__stiviumSessions[agentName];
    return { ok: true, mock: false, result };
  } catch (err) {
    console.error("[Stivium] Altana revoke failed", err);
    return { ok: false, mock: false, error: err?.message || String(err) };
  }
}

window.StiviumAltana = { grantAgentSession, executeAgentSession, revokeAgentSession, ensureClient };
