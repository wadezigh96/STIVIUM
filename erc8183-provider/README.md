# STIVIUM ERC-8183 Provider

This is a minimal real provider service for the STIVIUM marketplace. It is separated from the Vercel frontend because the BNB Agent SDK provider server needs a long-running process and a wallet/keystore. The official Python SDK exposes the ERC-8183 HTTP server and funded-job watcher. citeturn0search0

## What it does

- Runs on BSC Testnet (chain ID 97).
- Exposes /erc8183/negotiate, /erc8183/status, /erc8183/health, and job endpoints.
- Watches for funded jobs assigned to this provider.
- Produces a deterministic demo deliverable.
- Submits the deliverable through the SDK.

## Run

Python 3.10+ is required. Install dependencies, create a local .env, then run:

uvicorn agent:app --host 0.0.0.0 --port 8003

The public URL should use the /erc8183 base path. The SDK uses this public base URL for deliverable URLs. citeturn0search3

## Wallet safety

Use a dedicated testnet wallet. Keep PRIVATE_KEY and WALLET_PASSWORD only in the provider environment; never put them in frontend code, GitHub, or chat. The SDK can encrypt an imported key into its local keystore. citeturn0search0

## Next integration

1. Deploy this provider on a long-running Python host.
2. Fund its BSC Testnet wallet if required.
3. Set ERC8183_AGENT_URL in the STIVIUM Vercel environment to the provider public /erc8183 URL.
4. Open STIVIUM and click Check provider.
5. Only after the provider reports READY should we implement client create/fund/settle.

No mainnet flow is included.
