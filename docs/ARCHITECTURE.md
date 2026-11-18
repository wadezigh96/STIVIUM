# Architecture

Stivium is a **static HTML/JS prototype** (no build step for the core demo) so judges can open it in one click. The code is split into modules loaded by `index.html`:

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  CSS (dark BNB gold) · HTML shell · layout + modal          │
├─────────────────────────────────────────────────────────────┤
│  agents-data.js   seeded 16-agent catalog (4 categories)    │
│  app.js           scoring, rendering, activation modal      │
│  live-data.js     snapshot + live prices + 8004scan overlay │
│  catalog-extras.js search + List & Register (lazy-loaded)   │
│  swap-ui.js / swap-data.js  swap panel (disabled, see below)│
│  privy-bridge.js  Privy wallet + real ERC-8183 testnet hire │
│  altana-wire.js   Altana session keys (disabled, see below) │
└─────────────────────────────────────────────────────────────┘
```

Wallet features load React, Privy, and viem from the esm.sh CDN at runtime; the core browse/compare journey works without them.

## Data flow (current)

1. Hard-coded `AGENTS` array (16 agents, 4 categories) in `agents-data.js`.
2. On load / filter / sort change:
   - Compute rarity & trending scores (`computeScores` in `app.js`)
   - Assign percentile tiers within the **current set**
   - Render cards + sparklines (`render`)
3. Card click → modal with breakdown bars + activation panel (`renderModal`).
4. Activation → real ERC-8183 hire on BNB Testnet via Privy
   (`hireErc8183Testnet` in `privy-bridge.js`): create job → register →
   set budget → approve → fund. There is no local/demo activation in
   the current build. Completed hires are persisted in `localStorage`
   and revocable from the same modal.
5. `live-data.js` overlays `live-snapshot.json` samples and live Binance
   Vision prices; on Vercel it also refreshes from `/api/agents`.

Swap quotes/execution (`swap-ui.js`) and Altana session keys
(`altana-wire.js`) are temporarily disabled in the code — see
`docs/AUDIT-2026-11-18.md` (F2/F3).

## Intended production data flow

```
BNB Agent Studio registry / 8004scan API
        │
        ▼
   Agent metadata + capability tags
        │
        ▼
On-chain / subgraph (TVL, hire events, success rates)
        │
        ▼
   Stivium scoring layer (same formulas)
        │
        ▼
   UI (same components)
        │
        ▼
Altana session key / ERC-8183 hire  ──► on-chain tx visible in explorer
```

## Key modules

| File / function | Responsibility |
|-----------------|----------------|
| `agents-data.js` `AGENTS` | Seeded dataset (replace with fetch) |
| `app.js` `computeScores` | Rarity / trending / restraint formulas |
| `app.js` tier assignment | Percentile buckets inside current set |
| `app.js` `renderCats` / `render` | Sidebar counts, cards, sparklines, empty state |
| `app.js` `openModal` / `renderModal` | Detail + activation flow |
| `privy-bridge.js` `hireErc8183Testnet` | Real ERC-8183 testnet hire |
| `live-data.js` `StiviumLive.boot` | Snapshot, prices, live overlay, lazy extras |
| State maps | `activations` (localStorage), current filters/sort |

## Why static for the hackathon

- Zero friction for judges (open → use).
- No dependency resolution or build failures during judging.
- Clear ownership of every pixel and every calculation.
- Easy to host on GitHub Pages / static hosts / Greenfield.

Later stages can extract components into a proper app while keeping the same scoring and UX contracts.
