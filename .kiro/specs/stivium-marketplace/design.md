# Stivium Marketplace Design

## Architecture

Stivium is a static HTML and JavaScript application deployed to GitHub Pages. The browser owns catalog filtering, scoring, activation policy state, and the presentation of seeded demo agents. Optional integrations provide live registry data, wallet connectivity, testnet session-key wiring, swap quotes, and a mocked x402 hire path.

The design keeps the core judge path deterministic: seeded agents are always available, while live integrations are additive and visibly labeled. No private key is shipped to the browser. Deployment is a static artifact and the optional server-side API code remains separated under `api/`.

## Data flow

1. `index.html` loads the UI shell and module scripts.
2. Catalog modules provide seeded and optional live agent records.
3. `app.js` applies category, search, sort, scoring, and activation policy rules.
4. Optional integrations are invoked only after the user chooses the relevant action.
5. Activation state is rendered with its cap, allowlist, expiry, mode, and revoke action.

## Safety boundaries

The public demo defaults to local policy-scoped activation. Altana wiring is testnet-only in the demo path. Mainnet actions are not part of the judge flow. Secrets belong only in local environment files and must never be committed.

## Verification strategy

The primary regression surface is the no-build browser path: opening `index.html`, filtering the catalog, opening a detail view, activating with bounded parameters, and revoking. Repository checks should also cover Hardhat compilation and the existing Python task-engine test. Any CI additions must remain safe for a public repository and must not require production credentials.

## Submission mapping

The strongest Kiroween fit is **Frankenstein** because the app combines a static marketplace UX, AI-agent registry data, BNB testnet session-key controls, wallet and swap integrations, and an x402 payment narrative into one bounded hiring workflow. The product is not presented as a generic crypto dashboard; each integration supports the same user decision: compare an agent, constrain the blast radius, and revoke access.
