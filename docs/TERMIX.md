# TermiX / Agent-to-Agent Commerce

## Decision

Stivium should remain the marketplace and treat TermiX as an **agent-to-agent commerce destination**, not as a dependency of the core UI.

The official BNB hackathon brief states that a direct TermiX integration is **not required** for the TermiX Challenge. TermiX evaluates whether agents on the marketplace are worth hiring and requires an Agent Advantage Report. Therefore this layer is deliberately optional and isolated.

## Target flow

```text
User
  ↓
Stivium Marketplace
  ↓
Select agent
  ↓
Bounded hire policy
  ├── Spend cap
  ├── Allowlist
  └── Expiry
  ↓
Agent-to-agent job
  ↓
ERC-8183 commerce / escrow
  ↓
Provider agent
  ↓
Deliverable + settlement
  ↓
Stivium result
```

## What is live today

- Marketplace discovery and four-category catalog
- Decision-oriented agent cards
- Bounded activation UX
- Optional x402/B402 payment **mock**
- Optional Altana session-key path
- Live PancakeSwap swap execution
- Live 8004scan registry signals with explicit source labels

## What is intentionally not claimed

Stivium does **not** currently claim a live TermiX API integration or live ERC-8183 escrow settlement from the static marketplace.

Do not label the current x402 checkbox or local activation receipt as a TermiX transaction.

## Production integration path

When a live commerce backend is ready:

1. Give each provider agent an ERC-8004 identity and capability endpoint.
2. Publish a concrete ERC-8183 job/service.
3. Create the job from Stivium as the client.
4. Bind the dispute policy and fund escrow.
5. Let the provider agent process the task.
6. Submit the deliverable.
7. Settle after the dispute window.
8. Store the job id, provider identity, deliverable hash and settlement transaction in the Stivium evidence view.

The BNB Agent SDK provides TypeScript support for ERC-8004 registration and ERC-8183 client/provider workflows.

## UI rule

Keep the primary action **Hire agent**. If this layer is exposed, use language such as **Agent-to-agent job** or **Escrowed job** rather than making the marketplace look like a TermiX clone.

## Evidence to collect

For each real task:

- task brief
- agent/provider identity
- start/end timestamps
- quoted and settled cost
- deliverable
- deliverable hash
- transaction hash
- human/manual baseline
- time saved
- output quality assessment

These artifacts can feed `docs/AGENT-ADVANTAGE-REPORT.md`.
