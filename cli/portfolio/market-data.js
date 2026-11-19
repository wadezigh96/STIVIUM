const https = require('node:https');

const COINGECKO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  USDT: 'tether',
  USDC: 'usd-coin',
};

function getJson(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'stivium-portfolio-cli/1.0' } }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(`HTTP ${response.statusCode}`));
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Price response is not valid JSON')); }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('Timed out fetching prices')));
    request.on('error', reject);
  });
}

async function fetchCryptoPrices(symbols) {
  const ids = symbols.map((symbol) => COINGECKO_IDS[symbol]).filter(Boolean);
  if (!ids.length) return { prices: {}, source: 'CoinGecko public API', skipped: symbols };
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(','))}&vs_currencies=usd`;
  const payload = await getJson(url);
  const prices = {};
  for (const symbol of symbols) {
    const id = COINGECKO_IDS[symbol];
    if (id && Number.isFinite(payload[id]?.usd)) prices[symbol] = payload[id].usd;
  }
  return { prices, source: 'CoinGecko public API', skipped: symbols.filter((symbol) => !COINGECKO_IDS[symbol]) };
}

module.exports = { fetchCryptoPrices, COINGECKO_IDS };
