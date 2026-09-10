# Stivium

**What it does:** find a BNB Chain AI agent by category, compare risk and track-record signals, then activate it with a spend cap and scoped permissions — not a blank check.

Live demo: https://wadezigh96.github.io/STIVIUM/  
Hackathon: [Smart Money Era — Build the Era](https://www.bnbchain.org/en/hackathons/smart-money-era)

---

## Utility (what you get)

| Step | Utility |
|------|---------|
| Browse | 4 categories at equal depth: rebalancing, grid trading, yield optimisation, health-factor monitoring |
| Compare | Rarity (scarcity + track + consistency + verified) and Trending (hire growth) on every card |
| Decide | Category metrics before hire: rebalances/week, max drawdown, net APY, min health factor |
| Activate | Spend cap + call allowlist + expiry; optional on-chain Altana session keys |
| Pay | Optional **x402** hire fee (HTTP 402 / B402 on BSC) — UI mock, see `docs/X402.md` |
| Safety | **Restraint**, **blast radius**, **shadow mode** before live hire — see `docs/RARE-FEATURES.md` |
| Swap | Mock Pancake-style swap: crypto + **bStocks** RWA — see `docs/SWAP.md` |
| Exit | Revoke session from the same UI |

Open [`index.html`](./index.html) locally if you prefer — no build step.

---

## Why this exists

Finding agents on BNB is still mostly names and social proof. Stivium surfaces **decision-grade signals** so hiring is closer to “this agent keeps HF above X / drawdown under Y” than “this account has followers.”

---

## Scoring (client-side)

**Rarity**

```
rarity = 0.35 * scarcity
       + 0.30 * trackRecord
       + 0.25 * consistency
       + 0.10 * verified
```

**Trending** uses 24h / 7d hire growth and acceleration. Tiers are percentile-based inside the current set.

**Restraint** estimates how often the agent holds back for risk (discipline), shown on cards and in the modal breakdown.

---

## Stack

Static HTML/JS on GitHub Pages. Optional Altana session keys (BNB testnet). Optional x402 hire mock. Optional swap mock (Pancake story + bStocks list). Shadow mode + blast radius on activate.

Docs: `docs/` — SUBMISSION, AGENT-ADVANTAGE-REPORT, ALTANA, X402, SWAP, RARE-FEATURES, LIVE-DATA.
