# Roadmap — from prototype to official marketplace

## Phase 0 — Hackathon prototype (current)

- [x] Full UI journey (land → find → understand → activate)
- [x] All four required categories at equal depth
- [x] Transparent Rarity + Trending scoring
- [x] Breakdown charts, sparklines, category metrics
- [x] Session-key style activation UX (mocked)
- [x] MIT license, clean public repo structure, judging docs

## Phase 1 — Live data

- [x] Keep the 16-agent judging catalog (equal category depth)
- [x] Overlay live 8004scan samples + registry size (`live-snapshot.json`, refreshable)
- [x] Live crypto mid prices for Swap (Binance Vision public ticker)
- [x] Real last-synced timestamps (no random fake clock)
- [x] Vercel proxy `api/agents.js` for live 8004scan when not on GitHub Pages
- [ ] Replace seed metrics (TVL / hire events) with subgraph / BscScan reads
- [x] Client search box over catalog + live overlay cards

## Phase 2 — Real activation (Altana track)

- [x] Wire activation panel to Altana session keys on BNB testnet (`altana-wire.js`)
- [x] Spend cap, call allowlist, expiry, Keystore register
- [x] Revoke from the same UI when the session is still in memory
- [ ] Live on-chain txs attached in submission notes (needs funded testnet passkey at demo time)
- [ ] Optional: ERC-8183 hire flow + live B402 settle (still mock receipt in UI)

## Phase 3 — TermiX Agent Advantage Report

- [x] Three tasks, with vs without agent, time / cost / quality
- [x] Trading + security coverage
- [x] Report checked into `docs/AGENT-ADVANTAGE-REPORT.md`
- [ ] Attach raw stopwatch artifacts / screenshots if judges ask for a pack

## Phase 4 — Production hardening

- [x] Persist activations in the browser (localStorage)
- [x] Wallet connect via Privy (`privy-bridge.js`) for Swap / send
- [ ] Agent listing & claim flow for builders
- [ ] Reputation & dispute surface
- [ ] Multi-chain readiness (opBNB, Greenfield storage for agent artifacts)
- [ ] Accessibility audit + performance budget
- [ ] Monitoring & incident response for the official marketplace role

## Success definition

The winning marketplace becomes the **canonical front door** for every agent on BSC.
Stivium’s path is: transparent ranking → equal category depth → zero-friction activation → live on-chain sessions → measurable agent advantage.
