# User Journey

## Happy path (first-time visitor)

```mermaid
flowchart TD
  A[Land on Stivium] --> B[Read 3-step onboarding strip]
  B --> C[Scan sidebar: 4 categories + glossary]
  C --> D[Optionally filter by category or sort]
  D --> E[Browse agent cards: rarity tier, trending badge, sparkline, key metric]
  E --> F[Click an agent]
  F --> G[Detail modal: plain-language desc + score breakdowns]
  G --> H[Click Activate / Hire]
  H --> I[Set spend cap]
  I --> J[Tick category-specific allowlist]
  J --> K[Choose expiry]
  K --> L[Confirm]
  L --> M[See Activated state]
  M --> N[Later: Inspect or Revoke]
```

## Filter & compare path

1. User selects **Yield Optimisation**.
2. Sidebar shows count and average success for that category.
3. User sorts by **Rarity** → Legendary / Epic agents float to the top.
4. User opens two agents side-by-side (sequential modals) and compares:
   - Net APY (category metric)
   - Track-record component of rarity
   - 7-day hire momentum
5. Chooses the one whose risk/return profile matches their needs → activates.

## Empty / edge states

- Filter yields zero agents → clear empty-state message (“try a different category or sort”).
- Unknown term → glossary in sidebar (Rarity, Trending, Spend Cap, etc.).
- Already activated agent → badge visible; modal offers Revoke.

## Design principles behind the journey

- **Zero prior knowledge required** — onboarding + glossary + plain-language descriptions.
- **No dead ends** — every path either succeeds or explains why it is empty.
- **Decision support over decoration** — every number shown has a reason to exist (scarcity, momentum, category-specific outcome).
