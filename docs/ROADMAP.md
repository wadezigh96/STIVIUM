# Roadmap — from prototype to official marketplace

## Phase 0 — Hackathon prototype (current)

- [x] Full UI journey (land → find → understand → activate)
- [x] All four required categories at equal depth
- [x] Transparent Rarity + Trending scoring
- [x] Breakdown charts, sparklines, category metrics
- [x] Session-key style activation UX (mocked)
- [x] MIT license, clean public repo structure, judging docs

## Phase 1 — Live data

- [ ] Replace `AGENTS` seed with live reads from:
  - BNB Agent Studio registry / CLI metadata
  - 8004scan developer API (identity, capability, reputation)
  - Subgraph / BscScan for TVL, hire events, success signals
- [ ] Keep the same scoring formulas so the UI stays familiar
- [ ] Show real “last synced” timestamps

## Phase 2 — Real activation (Altana track)

- [ ] Wire activation panel to Altana session keys:
  - Spend cap
  - Call allowlist
  - Expiry
  - On-chain Keystore registration
- [ ] User can see and revoke sessions inside the product
- [ ] Live on-chain transactions visible in Altana explorer (testnet first)
- [ ] Optional: ERC-8183 hire flow + x402/B402 payments

## Phase 3 — TermiX Agent Advantage Report

Required for TermiX eligibility:

1. Run **≥ 3 real tasks** both ways (with agent hired via Stivium vs without).
2. For each task report **time, cost, output quality** + attach actual outputs.
3. At least one task from **trading / stock / security**.

Deliverable: fill `docs/AGENT-ADVANTAGE-REPORT.md` with real runs, attach outputs, and link it from the README + submission form.

## Phase 4 — Production hardening

- [ ] Auth / wallet connect (Trust Wallet / AgentKit compatible)
- [ ] Agent listing & claim flow for builders
- [ ] Reputation & dispute surface
- [ ] Multi-chain readiness (opBNB, Greenfield storage for agent artifacts)
- [ ] Accessibility audit + performance budget
- [ ] Monitoring & incident response for the official marketplace role

## Success definition

The winning marketplace becomes the **canonical front door** for every agent on BSC.  
Stivium’s path is: transparent ranking → equal category depth → zero-friction activation → live on-chain sessions → measurable agent advantage.
