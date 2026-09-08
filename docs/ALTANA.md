# Altana session keys

Stivium can grant **on-chain** Altana sessions when you tick **On-chain Altana session** in the activate panel.

## What happens

1. Load `@altananetwork/sdk` from esm.sh
2. Create a passkey (or ephemeral) wallet on **BNB testnet** (chain 97)
3. `grantSession` with:
   - spend cap (mapped from USD field)
   - call allowlist (Pancake / Venus-style targets by category)
   - expiry
   - Keystore `register: true`
4. Show tx hash → testnet BscScan
5. **Revoke** calls `revokeSession` when the session is still in memory

## For the Altana track

Judges look for live on-chain txs in the Altana explorer (testnet counts).

Checklist:

1. Open https://wadezigh96.github.io/STIVIUM/
2. Hire any agent → Activate → enable **On-chain Altana session**
3. Set cap + allowlist + expiry → Confirm
4. Complete passkey / fund testnet wallet if prompted
5. Copy the tx link into your submission notes / form

Faucet: https://testnet.bnbchain.org/faucet-smart

If the SDK or network fails, the UI falls back to local mock boundaries so the main-track demo still works.

## Files

- `altana-wire.js` — grant / revoke helpers
- `index.html` — checkbox + async activate / revoke handlers
