# Deploy AgentRegistry (BNB testnet)

Optional on-chain registry for Stivium. **Not required for the Altana track** — Altana session keys already work via the SDK without this contract.

Use this when you want agent listings stored on-chain.

## Prerequisites

1. Node.js 18+
2. A wallet with **testnet BNB**  
   Faucet: https://testnet.bnbchain.org/faucet-smart
3. Private key of that wallet (for deploy only)

## Steps

```bash
# 1. Install
npm install

# 2. Config
cp .env.example .env
# Edit .env → set PRIVATE_KEY=0x...

# 3. Compile
npm run compile

# 4. Deploy to BNB testnet
npm run deploy:testnet
```

You should see something like:

```
Network : bscTestnet
Deployer: 0xYourAddress
Balance : 0.05 BNB

✅ AgentRegistry deployed at: 0x...
   Explorer: https://testnet.bscscan.com/address/0x...
```

Save the address. You can later wire the frontend to call `listAgent` / `getAgent`.

## Verify on BscScan (optional)

```bash
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS>
```

Needs `BSCSCAN_API_KEY` in `.env`.

## What this contract does

| Function | Who | Purpose |
|----------|-----|---------|
| `listAgent(name, category, description)` | Anyone | Create listing, owner = msg.sender |
| `updateAgent(id, name, description, active)` | Owner | Edit or pause |
| `setVerified(id, bool)` | Admin | Trust badge |
| `getAgent(id)` / `listingsOf(owner)` | Anyone | Reads |

Rarity / Trending scores stay in the frontend (or a future updater). This registry is metadata only.

## Altana vs this registry

- **Altana** = session keys (spend cap, allowlist, expiry) when a user *activates* an agent.
- **AgentRegistry** = on-chain *catalog* of agents.

They are independent. You can ship Altana now and add the registry later.
