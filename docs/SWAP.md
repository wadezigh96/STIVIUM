# Live Swap — PancakeSwap on BNB Chain

Stivium now includes a **live, non-custodial PancakeSwap V2 swap path** for verified BNB Chain crypto tokens.

## Live flow

1. Open the **Swap · Crypto & bStocks** tab.
2. Click **Connect Wallet**.
3. Stivium requests BNB Smart Chain (chainId 56) in the wallet.
4. Select a supported crypto token pair.
5. Click **Get live quote**. The quote is read directly from the PancakeSwap V2 Router with `getAmountsOut`.
6. Choose slippage tolerance.
7. Click **Swap in wallet**.
8. For ERC-20 input tokens, the wallet may first request an approval transaction.
9. The swap transaction is sent to the PancakeSwap V2 Router.
10. Stivium waits for the receipt and links the confirmed transaction to BscScan.

## Supported live contracts

| Token | Address |
|---|---|
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| USDT | `0x55d398326f99059fF775485246999027B3197955` |
| USDC | `0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d` |
| CAKE | `0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82` |
| ETH | `0x2170Ed0880ac9A755fd29B2688956BD959F933F8` |
| BTCB | `0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c` |

Native BNB is represented as the wallet's native asset and routed through WBNB.

## Router

PancakeSwap V2 Router on BNB Smart Chain:

`0x10ED43C718714eb63d5aA57B78B54704E256024E`

The browser calls the router through the connected EIP-1193 wallet provider. Stivium does **not** custody funds and does not require a private key.

## Safety boundaries

- Quotes are refreshed immediately before execution.
- `amountOutMin` is derived from the fresh quote and selected slippage tolerance; it is never zero.
- ERC-20 balance and router allowance are checked before a token swap.
- Approval is requested only when the current allowance is insufficient.
- Transactions have a ten-minute deadline.
- bStocks/RWA symbols remain **discovery-only** until an exact contract and live liquidity route are verified.
- The live path is BNB Smart Chain mainnet. A user must explicitly approve every wallet transaction.

## Important distinction

This is intentionally **not** the old browser mock. The swap module now performs real wallet RPC calls and can submit real BNB Chain transactions.

The repository still contains separate agent/x402 mock flows where those integrations are explicitly labeled as mock.

## Files

- `swap-data.js` — verified BNB Chain crypto token metadata + discovery-only RWA symbols
- `swap-ui.js` — EIP-1193 wallet connection, live router quotes, approvals and swaps
- `index.html` — Swap tab and UI