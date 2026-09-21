// Binance Web3 API serverless proxy for STIVIUM.
// Secrets are read ONLY from server-side environment variables.
// Never put the secret in client-side code or localStorage.

const crypto = require("crypto");

const BASE = "https://web3.binance.com/build";
const API_KEY = process.env.BINANCE_WEB3_API_KEY?.trim();
const API_SECRET = process.env.BINANCE_WEB3_API_SECRET?.trim();

const ACTIONS = {
  chains: { method: "GET", path: "/api/v1/dex/balance/supported/chain", query: () => "" },
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
  gasLimit: { method: "POST", path: "/api/v1/dex/pre-transaction/gas-limit", query: () => "" },
  simulate: { method: "POST", path: "/api/v1/dex/pre-transaction/simulate", query: () => "" },
  broadcast: { method: "POST", path: "/api/v1/dex/pre-transaction/broadcast-transaction", query: () => "" },
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
  txSupported: { method: "GET", path: "/api/v1/dex/pre-transaction/supported/chain", query: () => "" },
  gasPrice: {
    method: "GET",
    path: "/api/v1/dex/pre-transaction/gas-price",
    query: q => new URLSearchParams({ binanceChainId: q.binanceChainId || "56" }).toString(),
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
  // PEM-formatted private keys are treated as Ed25519/private-key material;
  // otherwise the configured API secret is used as the HMAC key.
  if (API_SECRET.includes("BEGIN")) {
    return crypto.sign(null, Buffer.from(prehash, "utf8"), API_SECRET).toString("base64");
  }

  return crypto
    .createHmac("sha256", API_SECRET)
    .update(prehash, "utf8")
    .digest("base64");
}

function json(res, status, body) {
  return res.status(status)
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
    return json(res, 400, { ok: false, error: "Unsupported Binance API action." });
  }

  if (req.method !== spec.method) {
    return json(res, 405, { ok: false, error: "Method not allowed for this action." });
  }

  if (!API_KEY || !API_SECRET) {
    return json(res, 500, {
      ok: false,
      error: "Binance Web3 credentials are not configured on the server.",
      required: ["BINANCE_WEB3_API_KEY", "BINANCE_WEB3_API_SECRET"],
    });
  }

  const q = req.query || {};
  const query = spec.query(q);
  const requestPath = spec.path + (query ? "?" + query : "");

  // Preserve exactly the body that is sent over the wire for POST signatures.
  const body = spec.method === "POST"
    ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}))
    : "";

  // Binance requires an ISO-8601 UTC timestamp with millisecond precision.
  const timestamp = new Date().toISOString();

  // Unique nonce prevents replay and is accepted by the Wallet API.
  const nonce = crypto.randomUUID();

  // Binance signature pre-hash:
  // timestamp + METHOD + requestPath + body
  const prehash = timestamp + spec.method + requestPath + body;

  let signature;
  try {
    signature = sign(prehash);
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: "Signing failed.",
      detail: error.message,
    });
  }

  const headers = {
    "X-OC-APIKEY": API_KEY,
    "X-OC-TIMESTAMP": timestamp,
    "X-OC-SIGN": signature,
    "X-OC-RECV-WINDOW": "5000",
    "X-OC-NONCE": nonce,
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

    // Binance Wallet API may return HTTP 200 with a non-zero business code.
    return json(res, upstream.ok ? 200 : upstream.status, data);
  } catch (error) {
    return json(res, 502, {
      ok: false,
      error: "Binance Web3 API request failed.",
      detail: error.message,
    });
  }
};
