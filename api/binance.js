// Binance Web3 API serverless proxy for STIVIUM.
// Secrets are server-side only. Never expose them to the browser.

const crypto = require("crypto");

const BASE = "https://web3.binance.com/build";
const API_KEY = (process.env.BINANCE_WEB3_API_KEY || "").trim();
const API_SECRET = (process.env.BINANCE_WEB3_API_SECRET || "").trim();
const SIGN_ALGO = (process.env.BINANCE_WEB3_SIGN_ALGO || "hmac-sha256")
  .trim()
  .toLowerCase()
  .replace(/_/g, "-");

const ACTIONS = {
  chains: {
    method: "GET",
    path: "/api/v1/dex/balance/supported/chain",
    query: () => "",
  },
  balances: {
    method: "GET",
    path: "/api/v1/dex/balance/all-token-balances-by-address",
    query: q => new URLSearchParams({
      address: q.address,
      chains: q.chains || "56",
      excludeRiskToken: q.excludeRiskToken ?? "true",
      page: q.page || "1",
      pageSize: q.pageSize || "20",
    }).toString(),
  },
  transactions: {
    method: "GET",
    path: "/api/v1/dex/post-transaction/transactions-by-address",
    query: q => new URLSearchParams({
      address: q.address,
      chains: q.chains || "56",
      ...(q.limit ? { limit: q.limit } : {}),
      ...(q.begin ? { begin: q.begin } : {}),
      ...(q.end ? { end: q.end } : {}),
      ...(q.cursor ? { cursor: q.cursor } : {}),
    }).toString(),
  },
  gasLimit: {
    method: "POST",
    path: "/api/v1/dex/pre-transaction/gas-limit",
    query: () => "",
  },
  simulate: {
    method: "POST",
    path: "/api/v1/dex/pre-transaction/simulate",
    query: () => "",
  },
  broadcast: {
    method: "POST",
    path: "/api/v1/dex/pre-transaction/broadcast-transaction",
    query: () => "",
  },
  txDetail: {
    method: "GET",
    path: "/api/v1/dex/post-transaction/transaction-detail-by-txhash",
    query: q => new URLSearchParams({
      binanceChainId: q.binanceChainId || "56",
      txHash: q.txHash,
    }).toString(),
  },
  rwaSearch: {
    method: "GET",
    path: "/api/v1/dex/market/rwa/search",
    query: q => new URLSearchParams({
      keyword: q.keyword,
      ...(q.platformId ? { platformId: q.platformId } : {}),
    }).toString(),
  },
  rwaPrice: {
    method: "GET",
    path: "/api/v1/dex/market/rwa/price",
    query: q => new URLSearchParams({
      binanceChainId: q.binanceChainId || "56",
      tokenContractAddresses: q.tokenContractAddresses,
    }).toString(),
  },
  txSupported: {
    method: "GET",
    path: "/api/v1/dex/pre-transaction/supported/chain",
    query: () => "",
  },
  gasPrice: {
    method: "GET",
    path: "/api/v1/dex/pre-transaction/gas-price",
    query: q => new URLSearchParams({
      binanceChainId: q.binanceChainId || "56",
    }).toString(),
  },
  broadcastOrders: {
    method: "GET",
    path: "/api/v1/dex/post-transaction/orders",
    query: q => new URLSearchParams({
      address: q.address,
      binanceChainId: q.binanceChainId || "56",
      ...(q.txStatus ? { txStatus: q.txStatus } : {}),
      ...(q.orderId ? { orderId: q.orderId } : {}),
      ...(q.cursor ? { cursor: q.cursor } : {}),
      ...(q.limit ? { limit: q.limit } : {}),
    }).toString(),
  },
  rwaTokens: {
    method: "GET",
    path: "/api/v1/dex/market/rwa/tokens",
    query: q => new URLSearchParams({
      ...(q.platformId ? { platformId: q.platformId } : {}),
      ...(q.tabId ? { tabId: q.tabId } : {}),
    }).toString(),
  },
};

function signHmac(prehash) {
  return crypto
    .createHmac("sha256", API_SECRET)
    .update(Buffer.from(prehash, "utf8"))
    .digest("base64");
}

function loadEd25519Key(secret) {
  const value = String(secret || "").trim();

  // Preferred Vercel setting: full PEM private key.
  if (value.includes("BEGIN")) {
    return value;
  }

  // Also accept a raw 32-byte seed or 64-byte private key supplied as hex/base64.
  const raw = /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");

  if (raw.length === 32) {
    // PKCS#8 wrapper for an Ed25519 seed.
    return crypto.createPrivateKey({
      key: Buffer.concat([
        Buffer.from("302e020100300506032b657004220420", "hex"),
        raw,
      ]),
      format: "der",
      type: "pkcs8",
    });
  }

  if (raw.length === 64) {
    return crypto.createPrivateKey({
      key: Buffer.concat([
        Buffer.from("302e020100300506032b657004220420", "hex"),
        raw.subarray(0, 32),
      ]),
      format: "der",
      type: "pkcs8",
    });
  }

  throw new Error(
    "Ed25519 secret must be a PEM private key, 32-byte seed, or 64-byte private key."
  );
}

function signEd25519(prehash) {
  return crypto
    .sign(null, Buffer.from(prehash, "utf8"), loadEd25519Key(API_SECRET))
    .toString("base64");
}

function sign(prehash) {
  // Binance Web3 Wallet API supports HMAC-SHA256 and Ed25519.
  // Do not auto-detect the algorithm from the secret contents: the Vercel
  // environment variable explicitly controls which credential type is used.
  if (SIGN_ALGO === "ed25519") {
    return signEd25519(prehash);
  }

  if (SIGN_ALGO !== "hmac" && SIGN_ALGO !== "hmac-sha256") {
    throw new Error(
      "Unsupported BINANCE_WEB3_SIGN_ALGO. Use hmac-sha256 or ed25519."
    );
  }

  return signHmac(prehash);
}

function sendJson(res, status, body) {
  return res
    .status(status)
    .setHeader("Cache-Control", "no-store")
    .json(body);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const action = String(req.query.action || "chains");
  const spec = ACTIONS[action];

  if (!spec) {
    return sendJson(res, 400, {
      ok: false,
      error: "Unsupported Binance API action.",
    });
  }

  if (req.method !== spec.method) {
    return sendJson(res, 405, {
      ok: false,
      error: "Method not allowed for this action.",
    });
  }

  if (!API_KEY || !API_SECRET) {
    return sendJson(res, 500, {
      ok: false,
      error: "Binance Web3 credentials are not configured on the server.",
      required: [
        "BINANCE_WEB3_API_KEY",
        "BINANCE_WEB3_API_SECRET",
      ],
    });
  }

  const query = spec.query(req.query || {});

  // Binance signs the exact request path + raw query string that is sent.
  // Rebuilding a query can change URL encoding and cause 40102.
  // The proxy-only "action" parameter is removed before forwarding.
  function rawForwardedQuery(url) {
    const raw = String(url || "").split("?")[1] || "";
    return raw.split("&").filter(Boolean).filter(pair => {
      const key = pair.split("=")[0];
      try {
        return decodeURIComponent(key.replace(/\\+/g, " ")) !== "action";
      } catch {
        return key !== "action";
      }
    }).join("&");
  }

  const rawForwarded = rawForwardedQuery(req.url);
  const signedQuery = spec.method === "GET" && rawForwarded ? rawForwarded : query;
  const requestPath = spec.path + (signedQuery ? "?" + signedQuery : "");

  const body = spec.method === "POST"
    ? (typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body || {}))
    : "";

  // Binance Wallet API requires ISO-8601 UTC time with milliseconds.
  const timestamp = new Date().toISOString();

  // Official pre-hash format:
  // timestamp + HTTP_METHOD + requestPath + body
  const prehash = timestamp + spec.method + requestPath + body;

  let signature;
  try {
    signature = sign(prehash);
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: "Binance signature generation failed.",
      detail: error.message,
    });
  }

  const headers = {
    "X-OC-APIKEY": API_KEY,
    "X-OC-TIMESTAMP": timestamp,
    "X-OC-SIGN": signature,
    // X-OC-NONCE is optional. Omit it while validating the documented
    // HMAC request-signing path; Binance falls back to X-OC-SIGN.
    "X-OC-RECV-WINDOW": "60000",
  };

  if (spec.method === "POST") {
    headers["Content-Type"] = "application/json";
  }

  try {
    const upstream = await fetch(BASE + requestPath, {
      method: spec.method,
      headers,
      ...(spec.method === "POST" ? { body } : {}),
    });

    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return sendJson(res, upstream.ok ? 200 : upstream.status, data);
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      error: "Binance Web3 API request failed.",
      detail: error.message,
    });
  }
};
