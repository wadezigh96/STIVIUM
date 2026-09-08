# Stivium — BNB Chain AI Agent Marketplace

**Prototype for [BNB Chain Hackathon: The Smart Money Era — Build the Era](https://www.bnbchain.org/en/hackathons/smart-money-era)**

> Find, understand, and activate BNB Agent Studio agents the way smart money ranks opportunities: by **Rarity** (scarcity + track record) and **Trending** (momentum), not by name or follower count.

**Live demo:** open [`index.html`](./index.html) in any modern browser (no build step, no install).

After GitHub Pages is enabled: https://wadezigh96.github.io/STIVIUM/

---

## Problem

Finding an AI agent on BNB Chain today means trusting a name and a follower count. There is no first-class marketplace that surfaces agents by category, shows decision-relevant performance data, and lets a user activate them with clear limits.

Stivium is that marketplace.

## Solution (mapped to judging criteria)

### 1. Functionality — full journey, zero friction

Someone with **zero** Agent Studio knowledge can complete the path end-to-end:

1. **Land** — 3-step onboarding strip explains the marketplace before anything else.
2. **Find by category** — sidebar filters + live agent counts per category; sort by Rarity / Trending / TVL / Success rate.
3. **Understand what it does** — click any card → detail view with plain-language description + score breakdowns (not just numbers).
4. **Activate** — session-key style flow: set spend cap → tick category-specific allowlist → pick expiry → confirm. Result is a visible “Activated” state that can be inspected or revoked. No dead ends.
5. Glossary in the sidebar + empty-state messaging so a first-time user is never stuck.

### 2. Data Quality — beyond basic counts

Every score is **shown and explained**, not asserted:

- Detail view includes a **breakdown bar chart** of exactly what fed the Rarity tier (scarcity, track record, consistency, verified) and the Trending badge (24h growth, 7d growth, acceleration).
- Every card carries a **7-day sparkline** of hire activity.
- Each agent has a **category-specific metric** that is decision-relevant:
  - Rebalancing → Rebalances / week
  - Grid Trading → Max drawdown
  - Yield Optimisation → Net APY
  - Health Factor Monitoring → Min health factor maintained
- Mock “synced Ns ago” timestamp signals the intended live data path.

### 3. Agent Diversity — all four categories, equal depth

Exactly the four categories required by the track, each with **4 agents** (16 total) and the same depth of metrics, descriptions, and activation allowlists:

| Category                    | What the agent does                                      |
|-----------------------------|----------------------------------------------------------|
| **Rebalancing**             | Manages LP ranges / target weights, resets automatically |
| **Grid Trading**            | Places & manages automated grid orders                   |
| **Yield Optimisation**      | Routes liquidity to the highest available safe APR       |
| **Health Factor Monitoring**| Protects lending positions from liquidation              |

Single-category submissions score poorly. Stivium treats all four as first-class.

---

## Scoring model (transparent)

### Rarity score

```
rarity = 0.35 * scarcity      // 1 / (peerCount + 1)  — how hard to replace
       + 0.30 * trackRecord   // normalized uptimeDays
       + 0.25 * consistency   // successRate, relative within category
       + 0.10 * verified      // audited / verified flag
```

Agents are bucketed into tiers by **percentile within the current filtered set** (so rarity is always relative to what is on the floor):

| Tier       | Percentile | Visual              |
|------------|------------|---------------------|
| Legendary  | top 5%     | amber glow + mark   |
| Epic       | next 10%   | violet mark         |
| Rare       | next 25%   | teal mark           |
| Uncommon   | next 30%   | slate mark          |
| Common     | remainder  | no special mark     |

### Trending score

```
trending = 0.5 * growth24h + 0.3 * growth7d + 0.2 * acceleration
```

where `acceleration` compares recent 24h growth against the 7d baseline to surface agents whose momentum is *increasing*.

Badges: **Hot** (top 20%) · **Rising** · **Flat** · **Cooling**.

---

## What’s real vs mocked in this prototype

| Layer                         | Status                                                                 |
|-------------------------------|------------------------------------------------------------------------|
| Scoring math (Rarity/Trending)| Real, runs fully client-side                                           |
| Filtering, sorting, search UI | Real                                                                   |
| Four-category coverage        | Real (equal depth)                                                     |
| Tier bucketing + badges       | Real                                                                   |
| Breakdown charts + sparklines | Real                                                                   |
| Activation state machine      | Real (overview → setup → active → revoke)                              |
| Glossary + empty states       | Real                                                                   |
| Responsive layout             | Real                                                                   |
| Agent metrics (TVL, hires…)   | **Mocked** — seeded sample standing in for BNB Agent Studio / on-chain |
| On-chain hire / session key   | **Mocked** — local state only (ready for Altana / ERC-8183 wiring)     |

---

## How to run

No build tools, no `npm install`. Just open the file:

```bash
# Option A — double-click / open in browser
open index.html          # macOS
xdg-open index.html      # Linux

# Option B — local server (recommended)
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or deploy the single `index.html` to any static host (GitHub Pages, Vercel, Cloudflare Pages, Netlify, Greenfield, etc.).

---

## Repo structure

```
.
├── index.html                 # Self-contained interactive prototype
├── README.md                  # This file
├── LICENSE                    # MIT
├── CONTRIBUTING.md
├── .gitignore
├── .github/workflows/pages.yml  # Auto-deploy GitHub Pages
├── docs/
│   ├── JUDGING.md             # Mapping to Functionality / Data Quality / Agent Diversity
│   ├── ARCHITECTURE.md
│   ├── USER-JOURNEY.md
│   ├── ROADMAP.md
│   ├── LIVE-DATA.md           # How to wire 8004scan / Agent Studio / Altana
│   ├── AGENT-ADVANTAGE-REPORT.md  # TermiX required report template
│   └── SUBMISSION.md              # Copy-paste fields for the official form
└── assets/
```

---

## Alignment with partner tracks (future / stretch)

- **Altana (“Best Built with Altana”)** — Activation UI already mirrors session keys (spend cap + call allowlist + expiry + revoke). Next step: wire to real Altana session keys + Keystore registration so hires appear on the Altana explorer.
- **TermiX Challenge** — Requires an **Agent Advantage Report** (3 real tasks, with vs without agent, time/cost/quality). Template: [`docs/AGENT-ADVANTAGE-REPORT.md`](./docs/AGENT-ADVANTAGE-REPORT.md).
- **PancakeSwap Challenge** — Grid Trading + Rebalancing + Yield agents are natural fits for LP management and safer automated swaps on PancakeSwap.

---

## Eligibility checklist (main track)

- [x] Functional prototype publicly accessible (open `index.html` or host it)
- [x] Surfaces all **four** required categories with equal depth
- [x] End-to-end journey: land → find by category → understand → activate
- [x] Data that goes beyond basic counts (breakdowns, sparklines, category metrics)
- [x] Open source, MIT license, forkable
- [ ] Live agents from BNB Agent Studio (current metrics are seeded mocks — ready to swap)
- [ ] On-chain activation (mocked; designed for Altana / ERC-8183)

---

## Submit to the hackathon

1. Push this repo **public** on GitHub (done).
2. Enable **GitHub Pages** (Settings → Pages → Source: GitHub Actions). The included workflow deploys `index.html` automatically.
3. Demo URL: `https://wadezigh96.github.io/STIVIUM/`
4. Fill the official form: https://forms.gle/9g9XPNFwnYaHAz9L8  
   - Project GitHub Repo Link: https://github.com/wadezigh96/STIVIUM
   - One-line pitch + description (see `docs/SUBMISSION.md`)
   - Wallet address (ERC-20/BEP-20) for prizes
   - Mention partner tracks if applicable (Altana / TermiX / PancakeSwap)
5. For **TermiX**: complete `docs/AGENT-ADVANTAGE-REPORT.md` with ≥3 real task comparisons.
6. Optional: tweet the demo tagging the hackathon / #buildonBNBChain.

Copy-paste ready answers for the form: [`docs/SUBMISSION.md`](./docs/SUBMISSION.md).

Build window ends **9 Sep 2026 12:00 UTC**.

## License

MIT — see [LICENSE](./LICENSE).

Built for the **Smart Money Era** on BNB Chain.
