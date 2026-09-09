---
name: pancakeswap-trading
description: Buy and sell tokens on PancakeSwap on BNB Chain through an Altana session. In and out of positions fast, with quotes, slippage protection, and full-balance exits.
---

# PancakeSwap Trading (BNB Chain)

Skill for Stivium agents in **Grid Trading** and **Rebalancing** categories. Authority comes from an Altana session; this file only describes how to use PancakeSwap correctly.

## Reference

| Contract | Address |
|---|---|
| PancakeSwap V2 Router | `0x10ED43C718714eb63d5aA57B78B54704E256024E` |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| USDT (BSC-USD) | `0x55d398326f99059fF775485246999027B3197955` |

### Quirks that cause mistakes

- USDT on BNB Chain has **18 decimals**, not 6 like Ethereum. $20 is `20n * 10n**18n`.
- Route selection: quote the direct pair **and** the WBNB hop with `getAmountsOut`, then use whichever quotes better.
- Approve the router before each swap direction; do not assume residual allowance is enough.
- Fee-on-transfer tokens need the supporting-fee variant of swap; default path assumes standard ERC-20.

### Suggested session scope

```
calls: [
  { to: "0x10ED43C718714eb63d5aA57B78B54704E256024E" },
  { to: "0x55d398326f99059fF775485246999027B3197955" }
]
spend: [{ limit: <cap>, period: "day", token: "0x55d398326f99059fF775485246999027B3197955" }]
```

## Playbook

### Play: enter-position

Buy a token with USDT. Parameters: `token` address, `usdtAmount`, `slippage` (default 1%).

**Typical time:** ~15s

1. Read the token's `decimals()`. Quote both routes with `getAmountsOut`; pick the better.
2. `execute([approve(USDT, router, amount), swap(amount, quote minus slippage, path, wallet, now+600)])`
3. Verify the token balance increased before reporting success.

### Play: exit-position

Sell a token back to USDT. Parameters: `token` address, `tokenAmount` (or full balance), `slippage` (default 1%).

**Typical time:** ~15s

1. Read balances and decimals. Quote both routes; pick the better.
2. `execute([approve(token, router, amount), swap(...)] )`
3. Verify USDT balance increased before reporting success.

### Play: rebalance-weights

Move portfolio toward target weights via router swaps. Parameters: list of `{token, targetWeightBps}`, `slippage`.

**Typical time:** ~30–60s depending on legs

1. Read current balances and prices (via router quotes).
2. Compute deltas vs target weights; skip dust moves.
3. For each leg that needs a trade, run enter-position or exit-position within the session spend cap.
4. Stop if any leg would exceed remaining spend or session expiry.

## Guards

- `amountOutMin` is always a fresh quote minus slippage. Never 0.
- Verify balances on-chain after each leg; report only what the chain confirms.
- If a swap reverts, requote once with +1% slippage and retry a single time; otherwise stop and report.
- Do not improvise outside the session scope. Never send funds to an address not in the allowlist.
- All writes go through `client.execute({ session, calls })`. Reads go straight to RPC.
