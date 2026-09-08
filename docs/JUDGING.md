# Judging criteria mapping

Main track judges score three things. Here's where each one shows up in Stivium.

## Functionality

Land → find by category → understand the agent → activate, without needing prior Agent Studio knowledge.

- Onboarding strip on first load
- Sidebar filters + counts per category
- Sort by rarity / trending / TVL / success rate
- Detail modal with plain-language description
- Activation: spend cap, category allowlist, expiry, confirm, then visible activated state + revoke
- Glossary + empty states so filters don't leave a blank dead end

## Data quality

More than hire counts:

- Rarity broken into scarcity, track record, consistency, verified
- Trending broken into 24h growth, 7d growth, acceleration
- 7-day sparkline on every card
- One category-specific metric per agent
- "Synced … ago" marker on detail views (placeholder for live feeds)

Formulas are in the README.

## Agent diversity

Four categories, same depth:

| Category | Agents | Key metric |
|----------|--------|------------|
| Rebalancing | 4 | Rebalances / week |
| Grid Trading | 4 | Max drawdown |
| Yield Optimisation | 4 | Net APY |
| Health Factor Monitoring | 4 | Min health factor |

Same card structure and activation quality across all four.

## Honesty about the prototype

Metrics are seeded. Activation updates local state only. Scoring, filtering, and the full journey are real and run in the browser. Path to live data is in `LIVE-DATA.md`.
