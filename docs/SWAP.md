# Swap panel (mock)

Stivium includes a **browser-only swap mock** so judges can see how agents (grid / rebalance) relate to tradeable pairs on BNB Chain — including **crypto** and **bStocks** (tokenized U.S. equity RWA).

## What it is

| Item | Detail |
|------|--------|
| Scope | UI + mock quote + curated token list |
| Not included | Wallet connect, real calldata, Binance CEX API keys |
| Venue story | PancakeSwap-style DEX on BNB (chainId 56 / testnet 97) |
| RWA | bStocks as BEP-20 equity exposure (e.g. NVDAB, TSLAB) |

## Why not “Binance API for every coin”

- **Binance Spot API** executes on the centralized exchange (API keys, KYC, account).
- **PancakeSwap** executes on-chain from a wallet against pool liquidity.
- Stivium is a self-custody agent marketplace → the natural next step is **Pancake Unified Swap API**, not full CEX trading.

Curated list = tokens with a clear BNB-chain path, not 7,000 CEX symbols.

## Live path (later)

1. Quote: `GET https://swap.pancakeswap.com/v1/quote` (`chainId`, `tokenIn`, `tokenOut`, `amount`, `slippageTolerance`).
2. If aggregator route: `POST /v1/calldata` → send tx from wallet.
3. Optional: allowlist `swap` / `place_order` on Altana session when activating a grid agent.

## Mock quote formula

```
out ≈ amountIn * (priceIn / priceOut) * (1 - feeBps/10000) * (1 - slippageBps/10000)
```

Prices in `swap-data.js` are **seeded** for demo only.

## Files

- `swap-data.js` — token list + mock USDT prices
- `index.html` / `app.js` — Swap panel UI
- `skills/pancakeswap-trading/SKILL.md` — agent skill notes
