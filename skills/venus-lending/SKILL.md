---
name: venus-lending
description: Supply and withdraw assets on Venus Protocol on BNB Chain through an Altana session. Yield supply only — no borrowing unless the session explicitly allows it.
---

# Venus Lending (BNB Chain)

Skill for Stivium agents in **Yield Optimisation** and **Health Factor Monitoring** categories. Authority comes from an Altana session; this file only describes how to use Venus correctly.

## Reference

| Contract | Address |
|---|---|
| Venus Comptroller | `0xfD36E2c2a6789Db23113685031d7F16329158384` |
| vUSDT (example market) | Check current Venus docs / `getAllMarkets` — do not hardcode stale vToken addresses in production |
| USDT (BSC-USD) | `0x55d398326f99059fF775485246999027B3197955` |

> Addresses above for Comptroller are mainnet-illustrative. Always confirm on Venus docs / BscScan before production. Testnet deployments differ.

### Quirks that cause mistakes

- USDT on BNB Chain has **18 decimals**.
- Supply is `mint` on the vToken; redeem is `redeem` / `redeemUnderlying`. Wrong function = silent no-op or revert.
- Enter markets (`enterMarkets`) before collateral is recognized for borrow — Stivium yield plays should **not** borrow unless the session allowlist and spend policy say so.
- Health factor / liquidity is read from Comptroller (`getAccountLiquidity`); never invent a local formula that ignores Venus’s exchange rates.
- Accrual: call or rely on protocol accrual before reading balances for precise APY display.

### Suggested session scope (supply-only)

```
calls: [
  { to: "0xfD36E2c2a6789Db23113685031d7F16329158384" },
  { to: "<vToken market>" },
  { to: "0x55d398326f99059fF775485246999027B3197955" }
]
spend: [{ limit: <cap>, period: "day", token: "0x55d398326f99059fF775485246999027B3197955" }]
```

**May:** supply stablecoin, withdraw position, spend up to cap.  
**May not:** borrow, send funds elsewhere, touch unrelated apps — enforced by the session, not by this skill.

## Playbook

### Play: supply

Deposit underlying into a Venus market. Parameters: `vToken`, `amount`, optional `enterMarket`.

**Typical time:** ~15s

1. Approve underlying to the vToken for `amount`.
2. `execute([approve(...), mint(amount)])` via the session.
3. Optionally `enterMarkets([vToken])` if collateral is required by a later monitored strategy (skip for pure yield supply).
4. Verify vToken balance increased before reporting success.

### Play: withdraw

Redeem underlying from a Venus market. Parameters: `vToken`, `amount` (underlying) or `redeemTokens` (vToken amount).

**Typical time:** ~15s

1. Prefer `redeemUnderlying(amount)` when withdrawing a fixed underlying amount.
2. `execute([redeem...])` via the session.
3. Verify underlying balance increased before reporting success.
4. If liquidity is insufficient (HF risk on accounts that also borrow), stop and report — do not force redeem.

### Play: monitor-health

Read-only. Parameters: `account` (wallet address).

**Typical time:** ~2s

1. Call Comptroller `getAccountLiquidity(account)`.
2. Report liquidity / shortfall; do not submit any state-changing tx in this play.
3. Pair with a zero-call or narrow session when the agent is only watching.

## Guards

- Never borrow unless the session explicitly includes borrow-capable targets and the user asked for it.
- Verify balances and `getAccountLiquidity` on-chain after every state change.
- If mint/redeem reverts, stop and report; do not retry with larger amounts.
- Do not improvise outside the session scope.
- All writes go through `client.execute({ session, calls })`. Reads go straight to RPC.
