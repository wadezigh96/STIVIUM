/**
 * Stivium ↔ Altana session-key wiring.
 * REAL BNB Smart Chain Mainnet flow only (chain 56).
 *
 * A successful grant returns a real on-chain transaction hash. There is no
 * mock fallback in this module: if the wallet cannot sign/fund the grant,
 * the activation flow must stop and show the error.
 */

const SDK_URL = "https://esm.sh/@altananetwork/sdk@0.9.0";
const MAINNET_RPC = "https://bsc-dataseed.binance.org";
const EXPLORER_TX = "https://bscscan.com/tx/";

const CHAIN_ID = 56;
const EXECUTION_RECIPIENT = "0x000000000000000000000000000000000000dEaD";

const KEYSTORE_ABI = [{
  name: "isValidKey",
  type: "function",
  stateMutability: "view",
  inputs: [
    { name: "user", type: "address" },
    { name: "keyId", type: "bytes32" },
  ],
  outputs: [{ type: "bool" }],
}];



// Category → allowed contract targets. These are permission boundaries only;
// the grant itself is executed on Altana's BNB mainnet stack.
// Only use contracts that are actually deployed for the selected Altana network.
// BNB mainnet PancakeSwap V2 router: 0x10ED43C718714eb63d5aA57B78B54704E256024E.
// The previous mainnet addresses are deliberately not reused on BNB mainnet.
// Aave-like targets are not enabled until a verified BNB mainnet deployment is
// identified; this prevents granting authority to an unverified address.
const PANCAKE_V2_MAINNET = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const CATEGORY_TARGETS = {
  "Rebalancing": [PANCAKE_V2_MAINNET],
  "Grid Trading": [PANCAKE_V2_MAINNET],
  "Yield Optimisation": [PANCAKE_V2_TESTNET],
  "Health Factor Monitoring": [],
};

let client = null;
let wallet = null;

async function loadSdk() {
  return import(SDK_URL);
}

function rpId() {
  const host = location.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return "localhost";
  // Passkeys are origin-bound. Use the exact production Vercel origin when
  // running there; GitHub Pages keeps its own exact host. Preview Vercel
  // deployments intentionally use their own host and therefore create a
  // separate WebAuthn credential.
  if (host === "stivium.vercel.app") return "stivium.vercel.app";
  return host;
}

function assertWebAuthnReady() {
  if (!window.isSecureContext) {
    throw new Error("Altana Passkey requires HTTPS. Open https://stivium.vercel.app in Chrome.");
  }
  if (!window.PublicKeyCredential || !navigator.credentials?.create) {
    throw new Error("This browser does not expose WebAuthn/passkeys. Use current Chrome on Android with a screen lock/passkey provider enabled.");
  }
}

async function ensureClient() {
  if (client && wallet) return { client, wallet };

  assertWebAuthnReady();
  const sdk = await loadSdk();
  if (!sdk.BNB) {
    throw new Error("Altana SDK did not expose BNB mainnet.");
  }

  client = sdk.createClient({ chains: [sdk.BNB] });

  // Do not auto-recover before first creation: recovery itself opens the
  // discoverable-passkey picker. On a first visit that can consume the
  // biometric prompt and then fall through into a second create prompt.
  const createdMarker = "1" === localStorage.getItem("stivium_altana_wallet_created");
  if (createdMarker && typeof client.recoverFromPasskey === "function") {
    try {
      wallet = await client.recoverFromPasskey({ rpId: rpId(), chainId: CHAIN_ID });
    } catch (recoverError) {
      console.info("[Stivium] Existing Altana passkey could not be recovered; creating a fresh wallet.", recoverError);
      wallet = null;
      localStorage.removeItem("stivium_altana_wallet_created");
    }
  }

  if (!wallet) {
    if (typeof client.createPasskeyWallet !== "function") {
      throw new Error("This browser/SDK cannot create an Altana passkey wallet.");
    }
    window.__stiviumAltanaStatus = "Creating Altana wallet…";
    window.dispatchEvent(new CustomEvent("stivium-altana-status", { detail: { status: "Creating Altana wallet…" } }));
    try {
      wallet = await client.createPasskeyWallet({
        name: "Stivium Altana Wallet",
        rpId: rpId(),
      });
      localStorage.setItem("stivium_altana_wallet_created", "1");
    } catch (createError) {
      localStorage.removeItem("stivium_altana_wallet_created");
      throw createError;
    }
  }

  if (!wallet?.address || !wallet?.signer) {
    throw new Error("Altana passkey wallet was created without a usable signer.");
  }

  window.__stiviumWalletMode = "passkey";
  window.__stiviumWalletAddress = wallet.address;
  window.dispatchEvent(new CustomEvent("stivium-altana-status", {
    detail: { status: "Altana connected · " + String(wallet.address).slice(0, 6) + "…" + String(wallet.address).slice(-4), walletAddress: wallet.address, walletMode: "passkey", chainId: CHAIN_ID }
  }));
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
    const response = await fetch(MAINNET_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
    });
    if (!response.ok) throw new Error("BNB mainnet RPC returned HTTP " + response.status);
    const json = await response.json();
    const receipt = json.result;
    if (receipt) {
      if (receipt.status === "0x0") {
        throw new Error("Altana grant transaction reverted on BNB mainnet.");
      }
      return receipt;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return null;
}

/**
 * Grant a real Altana session on BNB mainnet.
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

    window.__stiviumAltanaStatus = "Submitting session grant…";
    window.dispatchEvent(new CustomEvent("stivium-altana-status", { detail: { status: "Submitting session grant…" } }));
    const grantPromise = c.grantSession({
      wallet: w,
      signer: w.signer,
      permissions,
      expiry,
      register: true,
      chainIds: [CHAIN_ID],
      onStatus: (status, chain) => {
        const label = chain?.chainId ? `${status} (chain ${chain.chainId})` : String(status);
        window.__stiviumAltanaStatus = label;
        window.dispatchEvent(new CustomEvent("stivium-altana-status", { detail: { status: label } }));
      },
    });
    const grantTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Altana session grant is still pending after 90 seconds. The Passkey was accepted, but the Altana relay did not finish. Check the mainnet wallet balance/network and try again once.")), 90000)
    );
    const session = await Promise.race([grantPromise, grantTimeout]);

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
      warning: receipt
        ? "Real Altana session grant confirmed on BNB mainnet. Mainnet only."
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
    };
  }
}

/**
 * Verify the session key against Altana's public on-chain KeyStore.
 * This is read-only and free; no wallet signature is required.
 */
export async function verifyAgentAuthority(agentName) {
  try {
    const rec = window.__stiviumSessions?.[agentName];
    if (!rec) throw new Error("No Altana session is available in this browser tab.");
    const session = rec._session;
    const publicKey = rec.publicKey || session?.publicKey;
    const walletAddress = rec.walletAddress || session?.walletAddress || wallet?.address;
    if (!publicKey) throw new Error("Altana session public key is missing.");
    if (!walletAddress) throw new Error("Altana wallet address is missing.");

    const viem = await import("https://esm.sh/viem@2.37.3");
    const sdk = await loadSdk();
    const network = sdk.BNB;
    const keyStore = network?.keyStore;
    const rpcUrl = network?.publicRpcUrl || MAINNET_RPC;
    const keyId = viem.keccak256(publicKey);
    const publicClient = viem.createPublicClient({
      chain: network,
      transport: viem.http(rpcUrl),
    });
    if (!keyStore) throw new Error("Altana BNB mainnet KeyStore address is unavailable from the SDK.");
    const authorized = await publicClient.readContract({
      address: keyStore,
      abi: KEYSTORE_ABI,
      functionName: "isValidKey",
      args: [walletAddress, keyId],
    });
    const result = {
      ok: true,
      authorized: !!authorized,
      wallet: walletAddress,
      keyId,
      publicKey,
      keyStore: keyStore || null,
      chainId: CHAIN_ID,
      verifiedAt: new Date().toISOString(),
    };
    rec.authority = result;
    return result;
  } catch (err) {
    console.error("[Stivium] Altana authority verification failed", err);
    return { ok: false, authorized: false, error: err?.message || String(err) };
  }
}

/**
 * Execute a real, deliberately tiny Altana session-key transaction.
 * This is a BNB mainnet proof-of-execution: 1 wei is sent to a fixed
 * test-only recipient after the scoped session has been granted.
 */
export async function executeAgentSession(agentName) {
  const authority = await verifyAgentAuthority(agentName);
  if (!authority.ok || !authority.authorized) {
    return {
      ok: false,
      mock: false,
      error: authority.error || "Altana session authority is not valid on-chain.",
      authority,
    };
  }
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
      warning: "Real Altana session execution confirmed on BNB mainnet. 1 wei test transfer only.",
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

window.StiviumAltana = { grantAgentSession, executeAgentSession, revokeAgentSession, ensureClient, verifyAgentAuthority };
