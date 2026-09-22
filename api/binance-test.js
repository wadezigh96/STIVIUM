const crypto = require("crypto");

const BASE_URL = "https://web3.binance.com/build";
const REQUEST_PATH = "/api/v1/dex/balance/supported/chain";

module.exports = async function handler(req, res) {
  try {
    const apiKey = process.env.BINANCE_WEB3_API_KEY;
    const apiSecret = process.env.BINANCE_WEB3_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({
        ok: false,
        error: "Missing Binance Web3 environment variables"
      });
    }

    const timestamp = new Date().toISOString();
    const method = "GET";
    const body = "";
    const prehash = timestamp + method + REQUEST_PATH + body;

    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(Buffer.from(prehash, "utf8"))
      .digest("base64");

    const response = await fetch(BASE_URL + REQUEST_PATH, {
      method,
      headers: {
        "X-OC-APIKEY": apiKey,
        "X-OC-TIMESTAMP": timestamp,
        "X-OC-SIGN": signature,
        "X-OC-RECV-WINDOW": "60000"
      }
    });

    const data = await response.json();

    return res.status(200).json({
      ok: data?.code === 0,
      binanceHttpStatus: response.status,
      binanceCode: data?.code,
      binanceMessage: data?.msg,
      timestamp,
      signedPath: REQUEST_PATH,
      algorithm: "HMAC-SHA256"
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Unknown error"
    });
  }
};
