# Architecture

Stivium is intentionally a **single-file, zero-dependency** prototype so judges can open it in one click.

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   CSS (dark  │  │  HTML shell  │  │   JS runtime     │  │
│  │   BNB gold)  │  │  layout +    │  │                  │  │
│  │              │  │  modal       │  │  AGENTS[] mock   │  │
│  └──────────────┘  └──────────────┘  │  scoreRarity()   │  │
│                                      │  scoreTrending() │  │
│                                      │  renderGrid()    │  │
│                                      │  activation FSM  │  │
│                                      └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Data flow (current)

1. Hard-coded `AGENTS` array (16 agents, 4 categories).
2. On load / filter / sort change:
   - Compute rarity & trending scores
   - Assign percentile tiers within the **current filtered set**
   - Render cards + sparklines
3. Card click → modal with breakdown bars + activation panel.
4. Activation → local `activated` map (inspectable / revocable).

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

## Key modules inside `index.html`

| Function / block | Responsibility |
|------------------|----------------|
| `AGENTS` | Seeded dataset (replace with fetch) |
| `scoreRarity` / `scoreTrending` | Transparent formulas |
| `assignTiers` | Percentile buckets inside current filter |
| `renderSidebar` | Category counts + glossary |
| `renderGrid` | Cards, sparklines, empty state |
| `openModal` / activation handlers | Detail + session-key style flow |
| State maps | `activated`, current filters/sort |

## Why single-file for the hackathon

- Zero friction for judges (open → use).
- No dependency resolution or build failures during judging.
- Clear ownership of every pixel and every calculation.
- Easy to host on GitHub Pages / static hosts / Greenfield.

Later stages can extract components into a proper app while keeping the same scoring and UX contracts.
