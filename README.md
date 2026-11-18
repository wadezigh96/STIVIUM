# Stivium

<div align="center">

**BNB Chain AI Agent Marketplace**

[![BNB Chain](https://img.shields.io/badge/BNB_Chain-Build_the_Era-F0B90B?style=for-the-badge&logo=binance&logoColor=white)](https://www.bnbchain.org/en/hackathons/smart-money-era)
[![Static](https://img.shields.io/badge/Stack-HTML_%2B_JS-000000?style=for-the-badge)](./index.html)
[![ERC-8183](https://img.shields.io/badge/ERC--8183-Testnet_Hire-7C3AED?style=for-the-badge)](docs/SET-AND-EARN.md)
[![x402](https://img.shields.io/badge/x402-Payment_Story-00C853?style=for-the-badge)](docs/X402.md)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**Discover → Compare → Activate with spend cap & scoped permissions**

[Live Demo](https://wadezigh96.github.io/STIVIUM/) · [Vercel mirror](https://stivium.vercel.app/) · [Submission](docs/SUBMISSION.md) · [Kiroween draft](docs/KIROWEEN-SUBMISSION.md) · [Rare features](docs/RARE-FEATURES.md) · [Judge path](docs/evidence/JUDGE-PATH.md)

</div>

---

## About Stivium

Stivium is a **BNB Chain AI agent marketplace** for finding agents by category, comparing **decision-grade** risk and track-record signals, then activating them with a **spend cap** and **scoped permissions** — not a blank check.

Finding agents on BNB is still mostly names and social proof. Stivium surfaces signals so hiring is closer to *“this agent keeps HF above X / drawdown under Y”* than *“this account has followers.”*

### How it works

**Browse → Compare → Decide → Activate → (optional) Pay → Exit**

1. Pick a category (or browse all).
2. Compare rarity, trending, and category metrics on each card.
3. Open an agent, set spend cap / allowlist / expiry.
4. Optionally run **shadow mode**, review **blast radius**, then activate.
5. Activation is a real **ERC-8183** hire on BNB Testnet via a Privy wallet (testnet BNB for gas + 0.10 testnet U escrow); see `docs/SET-AND-EARN.md`.
6. Revoke from the same UI when done.

> Status (18 Nov 2026): swap quotes/execution and Altana session keys are temporarily disabled in the code, and the x402 hire mock was removed from the UI. See `docs/AUDIT-2026-11-18.md`.

### Core features

- 🗂️ **Four equal-depth categories** — rebalancing, grid trading, yield optimisation, health-factor monitoring.
- ⭐ **Rarity + Trending** — scarcity, track, consistency, verified + hire-growth signals on every card.
- 📊 **Category metrics** — rebalances/week, max drawdown, net APY, min health factor before hire.
- 🔐 **Activate safely** — spend cap, call allowlist, expiry; never a blank check.
- 🛡️ **Restraint · blast radius · shadow mode** — discipline and worst-case capital before live hire.
- ⛓️ **Real ERC-8183 hire** — testnet escrow via Privy: create job → register → set budget → approve → fund (see `docs/SET-AND-EARN.md`). Only YieldCartographer ships with a testnet provider address prefilled.
- 🔑 **Altana session keys** — temporarily disabled in the code (see `docs/ALTANA.md`).
- 💳 **x402 hire mock** — removed from the UI; the payment story now lives in `docs/X402.md` only.
- 🔄 **PancakeSwap** — temporarily disabled in the code; the Swap tab shows the disabled state (see `docs/SWAP.md`). bStocks remain discovery-only.

### The principle

**Hiring an agent should feel like setting policy, not handing over the keys.**

Stivium keeps comparison and activation in the browser. Live data can replace seeded metrics later without changing the product story.

---

## Why Stivium

| Step | Typical marketplace | **Stivium** |
|------|---------------------|-------------|
| Browse | Names + social proof | **4 categories** at equal depth |
| Compare | Followers / vibes | **Rarity + Trending** + risk metrics |
| Decide | Guess | **Category KPIs** before hire |
| Activate | Unlimited agent | **Spend cap + allowlist + expiry** |
| Safety | Hope | **Restraint, blast radius, shadow mode** |
| Pay | Ad-hoc | Real **ERC-8183** testnet escrow |
| Exit | Support ticket | **Revoke** in the same UI |

---

## Architecture

```mermaid
flowchart TB
    subgraph UI["Stivium UI (static HTML/JS)"]
        B[Browse categories] --> C[Compare cards]
        C --> M[Modal: metrics + rarity breakdown]
        M --> A[Activate: cap / allowlist / expiry]
        A --> S[Shadow mode / blast radius]
        S --> H[Hire: real ERC-8183 on BNB Testnet]
        H --> R[Revoke session]
        SW[Swap panel] --> Q[Disabled in code]
    end

    DATA[Seeded agents-data.js] -.-> C
    H -.->|BNB testnet| CHAIN[ERC-8183 escrow]
```

---

## Scoring (client-side)

**Rarity**

```text
rarity = 0.35 * scarcity
       + 0.30 * trackRecord
       + 0.25 * consistency
       + 0.10 * verified
```

**Trending** uses 24h / 7d hire growth and acceleration. Tiers are percentile-based inside the current set.

**Restraint** estimates how often the agent holds back for risk (discipline), shown on cards and in the modal breakdown.

---

## Safety model

| Control | What it does |
|---------|---------------|
| **Spend cap** | Max capital the activated agent may move |
| **Call allowlist** | Only category-scoped actions |
| **Expiry** | Time-bounded session |
| **Shadow mode** | Observe-only window before live calls |
| **Blast radius** | Worst-case capital at risk under your cap |
| **Restraint** | Discipline signal, not just win rate |

No blank-check activation. Hiring is a real ERC-8183 escrow on **BNB testnet** (testnet BNB + testnet U); no mainnet execution is enabled. Swap execution and Altana session keys are temporarily disabled in the code (see `docs/AUDIT-2026-11-18.md`).

---

## Stack

| Layer | Choice |
|-------|--------|
| UI | Static **HTML / JS** (GitHub Pages) |
| Data | Seeded `agents-data.js` — live-ready (see `docs/LIVE-DATA.md`) |
| Session keys | **Altana** — temporarily disabled (see `docs/ALTANA.md`) |
| Payments | Real **ERC-8183** testnet escrow via Privy (x402 mock removed from the UI; see `docs/X402.md`) |
| Wallet | Privy embedded wallet bridge + injected EIP-1193 fallback |
| Swap | Temporarily disabled (see `docs/SWAP.md`) |

Open [`index.html`](./index.html) locally — **no build step**.

Docs: `docs/` — SUBMISSION, AGENT-ADVANTAGE-REPORT, ALTANA, X402, SWAP, RARE-FEATURES, LIVE-DATA, ARCHITECTURE.

### Portfolio Command Center

The repository also includes a local-first, read-only CLI for stock and crypto portfolio snapshots. It shows allocation, cost basis, unrealized P/L, concentration flags, public crypto price refresh, and local reminders without broker, exchange, wallet, or transaction access. See [`cli/portfolio/README.md`](cli/portfolio/README.md) and run `npm run portfolio -- overview`.

---

## Quick start

```bash
git clone https://github.com/wadezigh96/STIVIUM.git
cd STIVIUM
# open index.html in a browser, or:
npx serve .
```

Live: [https://wadezigh96.github.io/STIVIUM/](https://wadezigh96.github.io/STIVIUM/) · Vercel mirror: [https://stivium.vercel.app/](https://stivium.vercel.app/) (also serves the `/api/agents` live-registry proxy)

---

## Project structure

```text
STIVIUM/
├── index.html          # UI + theme
├── app.js              # marketplace logic
├── agents-data.js      # seeded agents
├── swap-ui.js / swap-data.js
├── altana-wire.js      # optional session keys
├── api/                # server-side integrations
├── docs/               # submission + feature writeups
├── contracts/          # optional registry sketch
└── README.md
```

---

## Kiroween 2026

Stivium is prepared for the **Frankenstein** category: it combines an AI-agent marketplace, registry and market signals, a real ERC-8183 testnet hire flow, wallet connectivity, and an x402 hire-payment story into one bounded hiring workflow.

The public demo keeps seeded agents available for deterministic judging. Live registry samples and market prices overlay the seeded catalog. Activation is a real ERC-8183 hire on BNB Testnet (no local/demo activation in the current build); swap execution and Altana session keys are temporarily disabled in the code, and the x402 hire mock was removed from the UI. See `docs/AUDIT-2026-11-18.md` for the current status of each integration.

Submission artifacts:

- [Kiroween submission draft](docs/KIROWEEN-SUBMISSION.md)
- [Kiro requirements](.kiro/specs/stivium-marketplace/requirements.md)
- [Kiro design](.kiro/specs/stivium-marketplace/design.md)
- [Kiro steering](.kiro/steering/product.md)
- [Kiro hook](.kiro/hooks/format-javascript.json)

## Previous hackathon

**Build the Era — BNB Chain**

| Focus | Where |
|-------|--------|
| Product story | `docs/SUBMISSION.md` |
| Judge path | `docs/evidence/JUDGE-PATH.md` |
| Advantage report | `docs/AGENT-ADVANTAGE-REPORT.md` |

---

<div align="center">

**Built on BNB Chain**  
*Compare the risk. Cap the spend. Never hire blind.*

[Live](https://wadezigh96.github.io/STIVIUM/) · [GitHub](https://github.com/wadezigh96/STIVIUM) · [Submission](docs/SUBMISSION.md)

</div>
