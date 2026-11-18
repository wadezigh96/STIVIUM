# Stivium × Altana Network

> **Status (18 Nov 2026): temporarily disabled.** `altana-wire.js`
> `ensureClient()` throws before any wallet or grant call, so the
> "Connect Altana" button and every grant/execute/revoke call fail in
> the current build. The flow below describes the intended design and
> the historical integration — do not present it as working until the
> gate is removed after a testnet-verified plan. See
> `docs/AUDIT-2026-11-18.md` (F3).
>
> **Testnet/mainnet note:** this document describes a testnet
> (chain 97) integration, but `altana-wire.js` itself is
> mainnet-oriented (chain 56, BSC mainnet RPC, bscscan.com). That
> contradiction must be resolved before re-enabling. The 6 October
> 2026 on-chain proof (`docs/evidence/ALTANA-ONCHAIN-PROOF-2026-10-06.json`)
> is historical evidence from before the disable.

Stivium has an Altana Network session-grant integration (currently gated off, see above). The intended demo path uses **BNB Smart Chain Testnet (chain 97)** for safe verification; it is not a mainnet spending path.

## What happens

1. Load `@altananetwork/sdk@0.9.0` from esm.sh
2. Create/recover a passkey wallet on **BNB testnet** (chain 97)
3. `grantSession` with:
   - spend cap (mapped from USD field)
   - call allowlist (Pancake / Venus-style targets by category)
   - expiry
   - Keystore `register: true`
4. Show tx hash → testnet BscScan
5. **Revoke** calls `revokeSession` when the session is still in memory

## For the Altana track

The Altana SDK is live on BNB Chain mainnet and testnet. For Stivium's current public demo, the integration stays on testnet so activation cannot move real funds.

Checklist (when re-enabled):

1. Open https://wadezigh96.github.io/STIVIUM/
2. Hire any agent → Activate → enable **On-chain Altana session** (this toggle does not exist in the current modal; it must be restored as part of re-enabling)
3. Set cap + allowlist + expiry → Confirm
4. Complete passkey / fund testnet wallet if prompted
5. Copy the tx link into your submission notes / form

Faucet: https://testnet.bnbchain.org/faucet-smart

If the Altana SDK/network fails, the on-chain activation is rejected and no fake transaction hash is returned.

## Production path

For a real-money deployment, change the client chain from `BNB_TESTNET` to `BNB` and re-audit the permission targets, spend token, relay costs, and UI warnings before enabling it. Do **not** switch this public demo to mainnet without an explicit product decision.

The official SDK currently documents `BNB` for BNB Smart Chain mainnet and `BNB_TESTNET` for chain 97.

## Files

- `altana-wire.js` — grant / revoke helpers (currently gated off)
- `index.html` — Connect Altana button (currently shows the disabled error)

## Skills (competence)

Session keys bound **authority**. [Altana Skills](https://docs.altana.network/skills) teach **how** to use a protocol.

Stivium ships two example skills under `skills/`:

- `skills/pancakeswap-trading/SKILL.md` — Grid Trading / Rebalancing
- `skills/venus-lending/SKILL.md` — Yield Optimisation / Health Factor Monitoring

An agent with a Stivium-granted session should load the matching skill and only `execute` through that session.

Public skills catalog: https://skills.altana.network/
