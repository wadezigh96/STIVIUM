/**
 * Tradeable set for Stivium Swap.
 * Live swaps use PancakeSwap V2 Router on BNB Smart Chain (chainId 56).
 * RWA/bStock symbols remain discovery-only until their exact live contracts are verified.
 */
const SWAP_TOKENS = [
  { id: "BNB", symbol: "BNB", name: "BNB", kind: "crypto", decimals: 18, native: true, note: "Native" },
  { id: "WBNB", symbol: "WBNB", name: "Wrapped BNB", kind: "crypto", decimals: 18, address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", note: "Live" },
  { id: "USDT", symbol: "USDT", name: "Binance-Peg USD Tether", kind: "crypto", decimals: 18, address: "0x55d398326f99059fF775485246999027B3197955", note: "Live" },
  { id: "USDC", symbol: "USDC", name: "USD Coin", kind: "crypto", decimals: 18, address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", note: "Live" },
  { id: "CAKE", symbol: "CAKE", name: "PancakeSwap", kind: "crypto", decimals: 18, address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", note: "Live" },
  { id: "ETH", symbol: "ETH", name: "Binance-Peg Ethereum", kind: "crypto", decimals: 18, address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", note: "Live" },
  { id: "BTCB", symbol: "BTCB", name: "Binance-Peg Bitcoin", kind: "crypto", decimals: 18, address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", note: "Live" },
  // bStocks / tokenized equity (RWA) — illustrative symbols; no live swap execution.
  { id: "NVDAB", symbol: "NVDAB", name: "NVIDIA bStock", kind: "bstock", decimals: 18, note: "RWA · discovery only" },
  { id: "TSLAB", symbol: "TSLAB", name: "Tesla bStock", kind: "bstock", decimals: 18, note: "RWA · discovery only" },
  { id: "CRCLB", symbol: "CRCLB", name: "Circle bStock", kind: "bstock", decimals: 18, note: "RWA · discovery only" },
  { id: "MUB", symbol: "MUB", name: "Micron bStock", kind: "bstock", decimals: 18, note: "RWA · discovery only" },
  { id: "SPCXB", symbol: "SPCXB", name: "SpaceX bStock", kind: "bstock", decimals: 18, note: "RWA · discovery only" },
  { id: "AMDB", symbol: "AMDB", name: "AMD bStock", kind: "bstock", decimals: 18, note: "RWA · discovery only" },
  { id: "MSTRB", symbol: "MSTRB", name: "Strategy bStock", kind: "bstock", decimals: 18, note: "RWA · discovery only" },
];
