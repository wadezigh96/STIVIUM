# Stivium × Altana Skills

Skills give agents **competence**. Sessions give them **authority**.

These `SKILL.md` files follow the [Altana Skills Registry](https://docs.altana.network/skills) format so a Stivium-hired agent can learn protocol steps without widening its on-chain power.

| Skill | Path | Stivium categories |
|-------|------|--------------------|
| PancakeSwap Trading | `pancakeswap-trading/SKILL.md` | Grid Trading, Rebalancing |
| Venus Lending | `venus-lending/SKILL.md` | Yield Optimisation, Health Factor Monitoring |

## How it pairs with Stivium

1. User activates an agent in the marketplace UI → Altana `grantSession` (spend cap, allowlist, expiry).
2. Agent receives (or fetches) the matching skill file for its category.
3. Agent runs playbook steps only through `client.execute({ session, calls })`.
4. Anything outside the session allowlist or over the spend cap **reverts on-chain**.

The skill cannot grant permissions. The session cannot teach protocol quirks. Together they match Stivium’s “activate with clear limits” flow.

## Catalog

Public registry: https://skills.altana.network/  
Contributing upstream: https://github.com/altananetwork/skills

These two skills are **project-local examples** aligned to Stivium categories. They are not an official Altana catalog submission unless you open a PR upstream.
