# Kiroween 2026 submission draft

> Replace the bracketed facts before submitting. This document is a public draft; do not put passwords, private keys, or private judge credentials here.

## Recommended category

**Frankenstein** is the strongest fit. Stivium combines technologies that are usually presented separately: a browser marketplace for AI agents, registry and market data, BNB testnet session-key controls, wallet and swap connectivity, and an x402 hire-payment story. They meet in one user workflow: discover an agent, compare evidence, set a bounded policy, activate, and revoke.

## Project description

Stivium is a BNB Chain AI agent marketplace for users who want to compare agents by decision-grade signals instead of names or follower counts. Each category exposes a concrete metric, while the activation flow requires a spend cap, scoped call allowlist, expiry, and optional shadow mode. The user can revoke from the same interface.

The public demo is deterministic for judging. Seeded agents keep the core journey available, while live registry samples, wallet connectivity, BNB testnet session-key wiring, and market data are additive. The UI labels local activation, testnet execution, and mocked x402 payment separately so the judge can tell what is real in the current prototype.

## Judge path

1. Open the [live demo](https://wadezigh96.github.io/STIVIUM/).
2. Browse or filter the four categories.
3. Open an agent and inspect the rarity, trending, and category-specific metric.
4. Choose an activation policy with a spend cap, allowlist, expiry, and shadow mode.
5. Confirm local activation or, when available, follow the labeled BNB testnet path.
6. Revoke the session from the active state.

The repository's [judge path](evidence/JUDGE-PATH.md) contains the shorter walkthrough and the [architecture notes](ARCHITECTURE.md) explain the boundaries between seeded data and live integrations.

## How Kiro was used

Fill this section with the entrant's actual workflow before submission. The repository now preserves the project context as a Kiro spec under `.kiro/specs/stivium-marketplace/`, workspace steering under `.kiro/steering/`, and a project hook under `.kiro/hooks/`.

- **Kiro surface used:** [IDE / CLI / Web / Crew — specify which]
- **Spec-driven development:** [describe which requirement, design, and task documents guided implementation]
- **Steering:** [describe how product, technology, or submission steering changed Kiro's output]
- **Hooks:** [describe the hook workflow, trigger, and measurable benefit; if the checked-in hook was not executed, say so]
- **MCP or integrations:** [describe any MCP server or Kiro integration actually used]
- **Testing or correctness:** [describe any property-based, unit, integration, or manual test Kiro helped create]

Do not present the checked-in artifacts as proof that Kiro was used unless the entrant actually used Kiro with this repository during the submission period. The official rules require a project built using Kiro, and insufficient Kiro use can disqualify a submission.

## Repository and demo

- Public GitHub: https://github.com/wadezigh96/STIVIUM
- Live app: https://wadezigh96.github.io/STIVIUM/
- License: MIT (`LICENSE`)
- Demo video: [add a public YouTube URL under three minutes]
- Submission period: October 30 to December 4, 2026

## Known limitations

The x402 hire payment is currently a UI mock. The seeded catalog is intentionally retained as a stable fallback. Testnet and optional integrations depend on browser wallet state and external services. These boundaries should be explained in the Devpost form rather than hidden.

## Final Devpost checklist

- [ ] Choose the Frankenstein category.
- [ ] Add the public GitHub URL and live app URL.
- [ ] Add a public YouTube demo shorter than three minutes.
- [ ] Replace every bracketed Kiro-usage field with truthful details.
- [ ] Add private judge credentials only in the Devpost form, if required.
- [ ] Confirm the repository is public and `.kiro/` is visible at its root.
- [ ] Confirm the submission describes seeded, testnet, and mocked behavior accurately.
