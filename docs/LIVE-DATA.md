# Wiring live agent data

The judging catalog stays the seeded 16 agents in `agents-data.js` so the TermiX / judge path never disappears. Live signals are an overlay.

## What ships now

| Signal | Source | Where |
|--------|--------|--------|
| 16 curated agents | `agents-data.js` | Cards / scoring |
| 1 live sample per category | `live-snapshot.json` from 8004scan semantic search | Extra cards |
| Registry size | 8004scan `GET /agents?chain_id=56` | Data chip |
| Last synced | Snapshot time + live price fetch | Modal + chip |
| Crypto mids for Swap | Binance Vision `ticker/price` (CORS `*`) | `MOCK_PRICE_USDT` |
| 8004scan from the browser | `api/agents.js` on Vercel | Optional index refresh |

GitHub Pages cannot call `api.8004scan.io` directly (no `Access-Control-Allow-Origin`). The committed snapshot keeps Pages honest without a proxy.

## Refresh the snapshot

```bash
python3 scripts/refresh-live.py
# then commit live-snapshot.json
```

## 8004scan Public API

Base URL: `https://api.8004scan.io/api/v1`

```bash
curl "https://api.8004scan.io/api/v1/agents?chain_id=56&limit=50"
curl "https://api.8004scan.io/api/v1/agents/search/semantic?q=health+factor+monitoring"
```

Useful fields: `name`, `description`, `owner_address`, `total_score`, `is_verified`, `x402_supported`, `created_at`, `agent_id`.

## Mapping live fields → Stivium scores

| Stivium field | Live source idea |
|---------------|------------------|
| `peerCount` | Inverse of score / similar-capability count |
| `uptimeDays` | `now - created_at` |
| `successRate` | `total_score` scaled into 55–97 until job stats exist |
| `tvl` | Still estimated — needs subgraph / self-report |
| `verified` | `is_verified` |
| `h24n / h7n` | Hire events when an ERC-8183 indexer exists |
| `keyMetric` | Category skill text until capability endpoints are stable |

Keep the same `scoreRarity` / `scoreTrending` formulas.

## Altana session keys

Activation UI already mirrors spend cap, allowlist, expiry, revoke. On-chain path: `altana-wire.js` on BNB testnet.

## Fallback order

1. Seed catalog (always)
2. `live-snapshot.json` (Pages + offline)
3. Live prices from Binance Vision
4. `/api/agents` when hosted on Vercel
