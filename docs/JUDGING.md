# How Stivium maps to the official judging criteria

Source: [Smart Money Era — Tracks](https://www.bnbchain.org/en/hackathons/smart-money-era?tab=tracks)

Three criteria, scored independently by three judges.

---

## 1. Functionality

> The full journey works end to end: land, find an agent by category, understand what it does, activate it, with minimal friction.  
> Someone with zero Agent Studio knowledge should be able to get through it without hitting a dead end.

| Required step | Stivium implementation |
|---------------|------------------------|
| **Land** | Top onboarding strip with 3 numbered steps that explain the product before any agent is shown |
| **Find by category** | Sidebar category filters + live counts; sort by Rarity / Trending / TVL / Success rate; search box |
| **Understand** | Click any card → modal with plain-language description, score breakdown charts, category-specific metric, 7-day sparkline |
| **Activate** | Multi-step flow: spend cap → category-specific action allowlist → expiry → confirm → visible “Activated” badge + revoke |
| **No dead ends** | Glossary in sidebar, empty-state message when a filter returns zero agents, responsive layout |

A first-time user never sees a blank grid or an unexplained term.

---

## 2. Data Quality

> Real-time, accurate data that goes beyond basic counts.  
> A user should be able to look at what you're showing and make a genuinely informed call on which agent to hire.

| What judges want | What Stivium shows |
|------------------|--------------------|
| Beyond basic counts | Rarity tier + full component breakdown (scarcity, track record, consistency, verified) |
| Momentum signal | Trending badge + growth components (24h, 7d, acceleration) |
| Historical signal | 7-day hire sparkline on every card |
| Decision-relevant metric | One category-specific number per agent (rebalances/wk, max drawdown, net APY, min health factor) |
| Freshness cue | “Synced Ns ago” timestamp on detail view (ready for live data) |

All scoring formulas are documented in the main README so a judge can verify the math.

---

## 3. Agent Diversity

> All four categories (rebalancing, grid trading, yield, health factor) surfaced with equal depth.  
> A submission that treats one category as the main event and the rest as an afterthought won't score well here.

| Category | # Agents | Category-specific metric | Activation allowlist tailored |
|----------|----------|--------------------------|-------------------------------|
| Rebalancing | 4 | Rebalances / week | Yes |
| Grid Trading | 4 | Max drawdown | Yes |
| Yield Optimisation | 4 | Net APY | Yes |
| Health Factor Monitoring | 4 | Min health factor maintained | Yes |

Equal card layout, equal detail depth, equal activation flow quality across all four.

---

## Prototype honesty

- Agent metrics are **seeded mocks** standing in for live BNB Agent Studio / on-chain reads.
- Activation updates **local state only** (designed so the same UI can later call Altana session keys / ERC-8183).
- Scoring, filtering, tiering, charts, and the full user journey are **real and client-side**.

This keeps the demo instantly runnable while making the path to a production marketplace obvious (see `ROADMAP.md`).
