# Stivium

Marketplace for BNB Chain AI agents — built for the [Smart Money Era](https://www.bnbchain.org/en/hackathons/smart-money-era) hackathon.

Right now finding an agent on BNB is mostly vibes and follower counts. Stivium ranks agents by two things that actually matter when you're putting capital to work:

- **Rarity** — how hard this agent is to replace (track record, scarcity in its category, consistency)
- **Trending** — whether demand is accelerating, not just who has the most historical hires

Open [`index.html`](./index.html) in a browser. No build step.

Demo (after Pages is on): https://wadezigh96.github.io/STIVIUM/

---

## What you can do in the prototype

1. Land and read a short onboarding strip
2. Filter by the four required categories (rebalancing, grid trading, yield, health factor)
3. Sort by rarity / trending / TVL / success rate
4. Open any agent for a plain-language description + score breakdown
5. Activate with a spend cap, allowlist, and expiry — then revoke if you want

All four categories have equal depth (4 agents each, same card layout, same detail level).

---

## Scoring (how rarity & trending are computed)

**Rarity**

```
rarity = 0.35 * scarcity
       + 0.30 * trackRecord
       + 0.25 * consistency
       + 0.10 * verified
```

Tiers are percentile-based inside the current filter (Legendary / Epic / Rare / Uncommon / Common).

**Trending**

```
trending = 0.5 * growth24h + 0.3 * growth7d + 0.2 * acceleration
```

Badges: Hot · Rising · Flat · Cooling

Category-specific metrics on each card:
- Rebalancing → rebalances / week
- Grid → max drawdown
- Yield → net APY
- Health factor → min HF maintained

---

## Real vs mock

Working in the browser: scoring, filters, tiers, charts, sparklines, activation state machine.

Mocked for now: agent metrics (seeded data standing in for Agent Studio / on-chain reads) and the hire transaction itself (UI is ready for Altana session keys).

Details on wiring live data: [`docs/LIVE-DATA.md`](./docs/LIVE-DATA.md)

---

## Docs

| File | What it is |
|------|------------|
| [`docs/JUDGING.md`](./docs/JUDGING.md) | How this maps to Functionality / Data Quality / Agent Diversity |
| [`docs/USER-JOURNEY.md`](./docs/USER-JOURNEY.md) | End-to-end path |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Structure of the single-file prototype |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Next steps after the hackathon |
| [`docs/AGENT-ADVANTAGE-REPORT.md`](./docs/AGENT-ADVANTAGE-REPORT.md) | TermiX report template |
| [`docs/SUBMISSION.md`](./docs/SUBMISSION.md) | Text for the official form |

---

## Partner tracks

- **Altana** — activation UI already mirrors session keys (cap, allowlist, expiry, revoke)
- **TermiX** — fill the advantage report with real runs before submitting that track
- **PancakeSwap** — grid / rebalancing / yield agents fit LP workflows

---

## License

MIT
