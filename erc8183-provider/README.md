# STIVIUM ERC-8183 Provider

Standalone Python provider for the STIVIUM marketplace.

Targets BNB Agent SDK 0.5.0 with ERC-8183 commerce, ERC-8004-compatible identity metadata, A2A, and the STIVIUM deterministic task engine.

The provider is intentionally separated from the STIVIUM Vercel frontend because the ERC-8183 provider is a long-lived Python web process.

## ERC-8183

GET /erc8183/health
GET /erc8183/status
POST /erc8183/negotiate
GET /erc8183/job/{job_id}
GET /erc8183/job/{job_id}/response
GET /erc8183/job/{job_id}/verify

## A2A

GET /.well-known/agent-card.json
POST /a2a

## ERC-8004

The BNB Agent SDK includes ERC-8004 registration primitives. On-chain registration is intentionally a separate operator-controlled step.

## Task engine

The deterministic task engine supports four Build Era task categories: grid trading calculations, health-factor calculations, yield/risk ranking, and portfolio rebalancing analysis.

## Configuration

NETWORK=bsc-testnet
PRIVATE_KEY=<local secret>
WALLET_PASSWORD=<local secret>
ERC8183_AGENT_URL=https://YOUR_PROVIDER_HOST/erc8183
ERC8183_SERVICE_PRICE=1000000000000000000

Never commit private keys, wallet files, passwords, or .env files.

## Local development

pip install -r requirements.txt
uvicorn agent:app --host 0.0.0.0 --port 8003
python -m unittest test_task_engine.py

## Deployment

The provider is deployment-platform agnostic. Run it as a Python web service with:

uvicorn agent:app --host 0.0.0.0 --port $PORT

The deployment environment must provide the required wallet and ERC-8183 configuration as secrets.

After deployment, verify /erc8183/health, /erc8183/status, and /.well-known/agent-card.json.

## Safety

Real blockchain transactions require deliberate operator action. No private key is stored in this repository.
