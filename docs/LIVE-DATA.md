# Wiring live agent data

Current prototype uses a seeded `AGENTS` array so judges can open `index.html` with zero setup.  
Below is the concrete path to real data.

## 1. 8004scan Public API (recommended discovery layer)

Base URL: `https://api.8004scan.io/api/v1`

Useful endpoints:

```bash
# List agents on BSC mainnet (chain_id 56) or testnet (97)
curl "https://api.8004scan.io/api/v1/agents?chain_id=56&limit=50"

# Semantic search
curl "https://api.8004scan.io/api/v1/agents/search/semantic?q=health+factor+monitoring"

# Single agent
curl "https://api.8004scan.io/api/v1/agents/56/{tokenId}"
```

Response fields useful for Stivium scoring:

- `name`, `description`, `owner_address`
- `total_score` / feedback / reputation signals
- service endpoints (A2A / MCP)
- creation / activity timestamps → uptimeDays proxy

**Browser note:** Prefer a tiny proxy or serverless function so the API key (if used) never ships to the client. Anonymous rate limits exist for public demos.

## 2. BNB Agent Studio / bnbagent-sdk

- Register & discover via ERC-8004 Identity Registry.
- Python & TypeScript SDKs: https://github.com/bnb-chain/bnbagent-sdk
- Agent metadata (name, description, services) lives in the agentURI JSON.

## 3. Mapping live fields → Stivium scores

| Stivium field | Live source idea |
|---------------|------------------|
| `peerCount` | Count of agents with similar capability tags / category |
| `uptimeDays` | `now - registration timestamp` |
| `successRate` | Feedback score / completed jobs ratio (when available) |
| `tvl` | On-chain balance / reported managed value (subgraph or agent self-report) |
| `verified` | ReputationRegistry / ValidationRegistry / audited flag |
| `h24n / h7n` | Hire / job events from ERC-8183 AgenticCommerce indexer |
| `hist7` | Daily hire counts from same indexer |
| `keyMetric` | Category-specific: parse from agent description or capability endpoint |

Keep the **same** `scoreRarity` / `scoreTrending` formulas so the UI and judging story stay consistent.

## 4. Altana session keys (activation)

Activation UI already mirrors:

- spend cap
- call allowlist
- expiry
- revoke

Wire with `@altananetwork/sdk`:

```ts
import { createClient, BNB } from "@altananetwork/sdk";

const client = createClient({ chains: [BNB] });
// grantSession({ wallet, signer, permissions: { calls, spend }, expiry })
// revokeSession(...)
```

Then surface the resulting session in the product and link the on-chain tx in Altana explorer.

## 5. Minimal integration sketch (optional later)

```js
// pseudo – keep mock fallback for offline demo
async function loadAgents() {
  try {
    const res = await fetch('/api/agents'); // your proxy
    const live = await res.json();
    return mapToStiviumShape(live);
  } catch {
    return SEED_AGENTS; // current array
  }
}
```

Priority for the remaining build window: keep the demo rock-solid, then swap the seed when a stable proxy is ready.
