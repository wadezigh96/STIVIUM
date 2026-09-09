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

Tiers (percentile in current filter): Legendary · Epic · Rare · Uncommon · Common.

**Trending**

```
trending = 0.5 * growth24h + 0.3 * growth7d + 0.2 * acceleration
```

Badges: Hot · Rising · Flat · Cooling.

---

## Real vs mock

| Working now | Seeded / next |
|-------------|----------------|
| Filters, sort, tiers, sparklines, score breakdown | Agent metrics (swap-ready for Agent Studio / 8004scan) |
| Activate → revoke state machine | Live ERC-8004 identity + job ledger |
| Altana-shaped permissions UI | On-chain `grantSession` when Keystore is available |
| x402 hire checkbox + mock receipt | Live B402 merchant API + settle |

See [`docs/LIVE-DATA.md`](./docs/LIVE-DATA.md) and [`docs/X402.md`](./docs/X402.md).

---

## Docs for judges

| Doc | Purpose |
|-----|---------|
| [`docs/JUDGING.md`](./docs/JUDGING.md) | Main-track criteria map |
| [`docs/AGENT-ADVANTAGE-REPORT.md`](./docs/AGENT-ADVANTAGE-REPORT.md) | **TermiX** advantage report |
| [`docs/evidence/JUDGE-PATH.md`](./docs/evidence/JUDGE-PATH.md) | 2-minute click path |
| [`docs/ALTANA.md`](./docs/ALTANA.md) | Session-key activation |
| [`docs/X402.md`](./docs/X402.md) | x402 / B402 hire payment |
| [`docs/SUBMISSION.md`](./docs/SUBMISSION.md) | Form copy-paste |
| [`docs/USER-JOURNEY.md`](./docs/USER-JOURNEY.md) | End-to-end path |

---

## Partner tracks

- **Altana** — activation mirrors session keys (cap, allowlist, expiry, revoke)
- **x402 / B402** — optional hire micropayment (mock in UI; live path in `docs/X402.md`)
- **TermiX** — full Agent Advantage Report in `docs/`
- **PancakeSwap** — grid / rebalancing / yield agents align with LP workflows

---

## License

MIT
