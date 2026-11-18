# Stivium Marketplace Requirements

## Goal

Make it possible for a user to discover, compare, activate, and revoke a BNB Chain AI agent through a bounded browser workflow.

## User stories and acceptance criteria

### 1. Discover agents

As a user, I want to browse agents by category so that I can find an agent for a concrete task.

- The catalog exposes four equal-depth categories.
- Category filters show the matching count.
- Search matches agent name, category, and metric text.
- An empty result has an actionable empty state.

### 2. Compare risk and track record

As a user, I want decision-grade signals before hiring so that I do not choose based only on popularity.

- Each card shows rarity and trending signals.
- Each card shows one category-specific metric.
- The detail view explains the rarity breakdown in plain language.
- Seeded demo agents remain available when live integrations are unavailable.

### 3. Activate with bounded policy

As a user, I want to activate an agent with explicit limits so that I never grant a blank check.

- Activation requires a spend cap, scoped call allowlist, and expiry.
- Shadow mode is available before live execution.
- The UI shows estimated blast radius before confirmation.
- A user can revoke an active session from the same flow.

### 4. Keep live integrations explicit

As a judge, I want to distinguish local prototype behavior from live blockchain behavior so that the demo is honest and reproducible.

- The UI labels local policy activation, testnet Altana sessions, and mocked x402 payment separately.
- Mainnet execution is not enabled by default.
- External integration failures are surfaced as readable errors.

### 5. Submission readiness

As a hackathon judge, I want enough repository context to run and evaluate the project.

- The root README links to the live demo and judge path.
- The repository includes an MIT license.
- Kiro specs, steering, and hooks are committed under `.kiro/`.
- The submission write-up identifies the category, setup path, known limitations, and Kiro workflow evidence.
