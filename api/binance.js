// Binance Web3 API serverless proxy for STIVIUM.
// Secrets are read ONLY from server-side environment variables.
// Supported credentials:
//   BINANCE_WEB3_API_KEY
//   BINANCE_WEB3_API_SECRET
//
// Never put the secret in app.js, index.html, or client-side localStorage.
//
// Binance signs: timestamp + METHOD + requestPath + body.
// HMAC-SHA256 credentials use a Base64 signature.
// Ed25519 credentials are also supported when the secret is a PEM private key.

const crypto = require("crypto");

const BASE = "https://web3.binance.com/build";
const API_KEY = process.env.BINANCE_WEB3_API_KEY;
const API_SECRET = process.env.BINANCE_WEB3_API_SECRET;

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
      ...(q.sector ? { sector: q.sector } : {}),
    }).toString(),
  },
};

function sign(prehash) {
  // Binance Web3 API accepts HMAC-SHA256 or Ed25519 signatures.
  if (API_SECRET.includes("BEGIN")) {
    return crypto.sign(null, Buffer.from(prehash), API_SECRET).toString("base64");
  }
  return crypto.createHmac("sha256", API_SECRET)
    .update(prehash)
    .digest("base64");
}

function json(res, status, body) {
  res.status(status).setHeader("Cache-Control", "no-store").json(body);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  const action = String(req.query.action || "chains");\n  const spec = ACTIONS[action];\n  if (!spec) return json(res, 400, { ok: false, error: "Unsupported Binance API action." });\n\n  const isPost = ["gasLimit", "simulate", "broadcast"].includes(action);\n  if (req.method !== "GET" && !isPost) return json(res, 405, { error: "Method not allowed for this action" });

  if (!API_KEY || !API_SECRET) {
    return json(res, 500, {
      ok: false,
      error: "Binance Web3 credentials are not configured on the server.",
      required: ["BINANCE_WEB3_API_KEY", "BINANCE_WEB3_API_SECRET"],
    });
  }

  const action = String(req.query.action || "chains");
  const spec = ACTIONS[action];
  if (!spec) return json(res, 400, { ok: false, error: "Unsupported Binance API action." });

  const q = req.query || {};
  const query = spec.query(q);
  const requestPath = spec.path + (query ? "?" + query : "");
  const timestamp = new Date().toISOString();
  const prehash = timestamp + spec.method + requestPath + "";

  const headers = {
    "X-OC-APIKEY": API_KEY,
    "X-OC-TIMESTAMP": timestamp,
    "X-OC-SIGN": sign(prehash),
    "X-OC-RECV-WINDOW": "5000",
  };

  try {
    const upstream = await fetch(BASE + requestPath, {
      method: spec.method,
      headers,
    });
    const data = await upstream.json();
    return json(res, upstream.ok ? 200 : upstream.status, data);
  } catch (error) {
    return json(res, 502, {
      ok: false,
      error: "Binance Web3 API request failed.",
      detail: error.message,
    });
  }
};
