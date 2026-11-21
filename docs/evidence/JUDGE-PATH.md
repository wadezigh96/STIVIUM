# Judge path — full setup guide

> **Status (19 Nov 2026):** there is no local/demo activation in the current build. Browsing and comparing need no wallet and take about 2 minutes (Part 1). Confirming a hire is a real ERC-8183 hire on BNB Testnet via a Privy wallet and needs setup first (Part 2, about 10 minutes): testnet BNB for gas, 0.10 testnet $U for escrow, and a provider address. Only YieldCartographer ships with a provider address prefilled. This walkthrough was written for the Build the Era submission; the TermiX section below still applies. See `docs/AUDIT-2026-11-18.md` (F1).

**Live demo:** https://wadezigh96.github.io/STIVIUM/  
**Repo:** https://github.com/wadezigh96/STIVIUM  
**Advantage report:** [AGENT-ADVANTAGE-REPORT.md](../AGENT-ADVANTAGE-REPORT.md)

## Part 1 — Browse and compare (no wallet, ~2 minutes)

| Step | Action | What you should see |
|------|--------|---------------------|
| 1 | Land | Onboarding strip (3 steps) + 4 category diversity cards. LIVE cards are 8004scan overlay — ignore them for the judging 16. |
| 2 | Filter **Health Factor Monitoring** | HealthSentinel, MarginMinder, LiquidationLookout, CushionBot |
| 3 | Open **HealthSentinel** | Detail + rarity/trending breakdown + Min HF metric; activation policy (cap, allowlist, expiry) |
| 4 | Filter **Grid Trading** → **LatticeBot** | Max drawdown −2.8% on card; order allowlist in the policy form |
| 5 | Filter **Yield Optimisation** → **CompoundKeeper** | Net APY 22.7%; Legendary tier (the only one) |
| 6 | Hire + revoke | Needs the testnet wallet setup in Part 2 — skip unless judging the hire flow |

## Part 2 — Set up a testnet wallet for the hire (~10 minutes)

### 1. Connect a Privy wallet

- Open the live demo and click **Connect wallet** in the header.
- Log in with email or an existing wallet. Logging in with email creates an embedded Privy wallet automatically; no wallet app is required.
- The header shows the connected wallet address (shortened). One wallet connection serves the whole app.
- Never paste a private key anywhere in the UI; the app never asks for one.

### 2. Get testnet BNB for gas

- Copy your wallet address from the header.
- Open the BNB testnet faucet: https://testnet.bnbchain.org/faucet-smart
- Paste the address, request testnet BNB, and wait for it to arrive. A small amount covers the whole hire (several transactions on chain 97).

### 3. Get 10 testnet $U for the escrow

- The hire escrows 0.10 $U. The $U token is `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` on BNB Testnet (chain 97).
- Claim 10 $U from the public faucet contract `0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3` by calling `requestTokens()` — for example through the Write Contract tab for that address on BscScan Testnet (https://testnet.bscscan.com/address/0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3#writeContract), connected with the same wallet. The faucet pays 10 $U per address every 30 minutes.
- Source: Altana SDK testnet docs (https://github.com/altananetwork/altana-sdk/blob/HEAD/docs/pages/concepts/networks/testnet.mdx). The hire reads the payment token from the commerce contract at runtime (`AgenticCommerce.paymentToken()`).

### 4. Hire YieldCartographer

- Filter **Yield Optimisation** and open **YieldCartographer** (Net APY 18.4%). It is the only agent with a testnet provider address prefilled: `0xFCeAfEc082f9e8B17CDB51f33C3D5c9759a25E03` (STIVIUM Yield Guardian · ERC-8004 #2577). Other agents show "No real provider is mapped to this catalog row" and cannot be hired without entering a provider address.
- Check **Real ERC-8183 hire — BSC Testnet via Privy, 0.10 U escrow** (checked by default). Set a spend cap, allowlist, expiry, and shadow mode as you like.
- Click **Create ERC-8183 job** and approve the wallet transaction. The app switches the wallet to BSC Testnet (chain 97) automatically.
- The hire takes 4–5 separate wallet transactions, one per click; nothing is auto-chained. After each transaction the modal shows the next step — click through in order:
  1. **Create ERC-8183 job** (creates the on-chain job)
  2. **Continue · Register job**
  3. **Continue · Set budget** (0.10 U)
  4. **Continue · Approve U** (only if the token allowance is insufficient)
  5. **Continue · Fund job** (escrows 0.10 U)
- When the fund transaction confirms, the activation shows as done, with the job ID and a link to the fund transaction on testnet.bscscan.com. Keep the job ID + fund transaction hash as evidence.

### 5. Revoke

- Click **Revoke** in the same modal. Revoke clears the activation record in this browser; it does not send an on-chain transaction and does not release the escrowed 0.10 U from the job contract (testnet funds only).

## Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| "Connect Privy before hiring." | No wallet connected. | Click **Connect wallet** in the header first. |
| "Enter the provider address for this ERC-8183 agent." | The agent has no provider mapped. | Hire YieldCartographer, or paste a provider address. |
| "Insufficient U balance. Fund this Privy wallet with BSC Testnet U first." | The wallet has less than 0.10 $U. | Claim $U from the faucet (Part 2, step 3) and try again. |
| "Privy is still loading. Please wait a moment and try again." | Privy has not finished loading. | Wait a few seconds and retry. |
| "Wallet connection timed out." | The wallet prompt was not approved in time. | Approve the connection prompt and click **Connect wallet** again. |

## What is not live in this build (honest boundaries)

- Swap: the swap panel is disabled (quotes and execution throw by design); do not judge it as a live feature. See `docs/SWAP.md`.
- Altana session keys: the Altana client is disabled in this build. See `docs/ALTANA.md`.
- x402 hire fee: the x402 path is removed from the UI; the modal shows "x402 integration unavailable · no payment sent". See `docs/X402.md`.
- The seeded 16-agent catalog is demo data; only the ERC-8183 hire, the job, and the escrow are on-chain.

## TermiX requirement — important

TermiX does **not** require a direct TermiX API/MCP integration. BNB's Build the Era brief says TermiX will hire from the submitted marketplace itself. Eligibility for the TermiX bounty depends on the Agent Advantage Report: at least 3 real tasks, each run with an agent hired through the marketplace and without an agent, with time, cost, output quality, and actual outputs attached.

The current catalog contains a curated/demo layer plus live 8004scan samples. Do not present seeded metrics as production agent track records.

## Why this matches TermiX

- ≥3 tasks covered in the Advantage Report (security + trading + yield)
- Decision metrics on cards **before** hire (not name-only)
- Activation with spend limits (session-key shaped; optional Altana on-chain)
- Four categories at equal depth

No wallet required for the browse/compare walkthrough. Activating an agent now requires a Privy wallet with testnet funds (see the status note above).
