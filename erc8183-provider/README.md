# STIVIUM ERC-8183 Provider

This is the standalone Python provider for the STIVIUM marketplace. It is separated from the Vercel frontend because the BNB Agent SDK provider server runs as a long-lived web process and can watch for funded ERC-8183 jobs. The official SDK provides `create_erc8183_app()` and routes such as `/erc8183/health`, `/erc8183/status`, `/erc8183/negotiate`, and job endpoints. citeturn0search2turn0search6

## Render-ready

The repository root contains `render.yaml`, so the provider can be deployed as a Render Blueprint.

Render supplies a public `RENDER_EXTERNAL_URL` for web services. The Blueprint maps that URL into `ERC8183_AGENT_URL`, which the SDK needs when using its local storage provider. citeturn1search0

### Deploy from Android

1. Open urlRenderhttps://render.com/ and sign in.
2. Choose **New → Blueprint**.
3. Connect GitHub and select **wadezigh96/STIVIUM**.
4. Render should detect `render.yaml`.
5. Keep the service name `stivium-erc8183-provider` and **Free** plan.
6. When Render asks for secrets, enter:
   - `PRIVATE_KEY` — a dedicated **BSC Testnet** wallet private key.
   - `WALLET_PASSWORD` — a new password used by the provider keystore.
7. Do **not** put either value in GitHub, Vercel frontend code, or chat.
8. Deploy.

The provider is configured for **BSC Testnet** only. The SDK documentation confirms that the standalone app creates the HTTP routes and automatically polls for FUNDED jobs. citeturn0search2

### After deployment

Copy the provider's Render URL, for example:

`https://stivium-erc8183-provider.onrender.com`

The Blueprint already exposes that URL to the provider as `ERC8183_AGENT_URL`. The URL used by STIVIUM itself must include the `/erc8183` suffix:

`https://stivium-erc8183-provider.onrender.com/erc8183`

Then set the STIVIUM Vercel environment variable:

`ERC8183_AGENT_URL=https://stivium-erc8183-provider.onrender.com/erc8183`

Redeploy STIVIUM and use **Agent Commerce · ERC-8183 → Check provider**.

### What to verify

- `GET /erc8183/health` → provider responds.
- `GET /erc8183/status` → provider status responds.
- STIVIUM's **Check provider** button shows **PROVIDER READY**.
- Only after that should we enable real create/fund/submit/settle flows.

No fake transaction or fake settlement is included.

## Local run

Python 3.11 is pinned for the Render service.

```bash
pip install -r requirements.txt
uvicorn agent:app --host 0.0.0.0 --port 8003
```

For local development, copy `.env.example` to `.env` and use a dedicated testnet wallet.

## Wallet safety

Use a dedicated testnet wallet. Keep `PRIVATE_KEY` and `WALLET_PASSWORD` only in the provider environment. The SDK can encrypt an imported key into its local keystore. Never commit wallet files or secrets. citeturn0search2turn0search4

## Render limitation

A free Render web service is suitable for a hackathon/testnet demo, but a sleeping/free instance can add wake-up latency. Do not treat it as a high-availability production provider. For the first STIVIUM integration, we will verify health/status and then test the ERC-8183 lifecycle deliberately.
