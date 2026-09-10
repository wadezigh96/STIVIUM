/**
 * Curated tradeable set for Stivium Swap mock (Pancake-style).
 * Not an exhaustive Binance CEX list — only assets with a clear BNB-chain story.
 * Live quotes / calldata: see docs/SWAP.md (Pancake Unified Swap API).
 */
const SWAP_TOKENS = [
  { id: "BNB", symbol: "BNB", name: "BNB", kind: "crypto", decimals: 18, note: "Native" },
  { id: "WBNB", symbol: "WBNB", name: "Wrapped BNB", kind: "crypto", decimals: 18, note: "0xbb4C…" },
  { id: "USDT", symbol: "USDT", name: "Tether USD", kind: "crypto", decimals: 18, note: "Stable" },
  { id: "USDC", symbol: "USDC", name: "USD Coin", kind: "crypto", decimals: 18, note: "Stable" },
  { id: "CAKE", symbol: "CAKE", name: "PancakeSwap", kind: "crypto", decimals: 18, note: "DEX" },
  { id: "ETH", symbol: "ETH", name: "Ethereum (BEP-20)", kind: "crypto", decimals: 18, note: "Bridged" },
  { id: "BTCB", symbol: "BTCB", name: "Bitcoin BEP2", kind: "crypto", decimals: 18, note: "Bridged" },
  // bStocks / tokenized equity (RWA) — illustrative symbols; verify live listings
  { id: "NVDAB", symbol: "NVDAB", name: "NVIDIA bStock", kind: "bstock", decimals: 18, note: "RWA · equity" },
  { id: "TSLAB", symbol: "TSLAB", name: "Tesla bStock", kind: "bstock", decimals: 18, note: "RWA · equity" },
  { id: "CRCLB", symbol: "CRCLB", name: "Circle bStock", kind: "bstock", decimals: 18, note: "RWA · equity" },
  { id: "MUB", symbol: "MUB", name: "Micron bStock", kind: "bstock", decimals: 18, note: "RWA · equity" },
  { id: "SPCXB", symbol: "SPCXB", name: "SpaceX bStock", kind: "bstock", decimals: 18, note: "RWA · equity" },
  { id: "AMDB", symbol: "AMDB", name: "AMD bStock", kind: "bstock", decimals: 18, note: "RWA · equity" },
  { id: "MSTRB", symbol: "MSTRB", name: "Strategy bStock", kind: "bstock", decimals: 18, note: "RWA · equity" },
];

/** Mock mid prices in USDT for demo quotes (not live). */
const MOCK_PRICE_USDT = {
  BNB: 620, WBNB: 620, USDT: 1, USDC: 1, CAKE: 2.4, ETH: 3400, BTCB: 95000,
  NVDAB: 145, TSLAB: 250, CRCLB: 110, MUB: 95, SPCXB: 180, AMDB: 130, MSTRB: 380,
};
