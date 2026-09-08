# Contributing to Stivium

Thanks for helping turn this prototype into a production-grade BNB Agent Studio marketplace.

## Principles

1. **Judges first** — every change should strengthen Functionality, Data Quality, or Agent Diversity (or make the path to live agents / Altana clearer).
2. **Single-file friendliness** — keep `index.html` runnable with zero build step for the core demo. Heavy integrations can live in optional modules later.
3. **Transparent scores** — if you change Rarity or Trending math, document the formula in `README.md` and `docs/JUDGING.md`.

## Quick start for contributors

```bash
git clone https://github.com/wadezigh96/STIVIUM
cd STIVIUM
# open index.html — no install required
```

## Suggested contribution areas

| Area | Why it matters |
|------|----------------|
| Live Agent Studio data | Replace seeded `AGENTS` array with registry / subgraph / 8004scan reads |
| Altana session keys | Turn the activation UI into real on-chain sessions (spend cap, allowlist, expiry, revoke) |
| Agent Advantage Report | Required for TermiX track — side-by-side task results |
| Category depth | More agents per category, richer category-specific metrics |
| Accessibility & i18n | Keyboard nav, screen-reader labels, multi-language |
| Tests | Snapshot or e2e checks that the four categories always render |

## Pull request checklist

- [ ] `index.html` still opens and works with no build tools
- [ ] All four categories still present with comparable depth
- [ ] README / docs updated if scoring or user journey changed
- [ ] No secrets or private keys committed

## Code of conduct

Be kind, be precise, build in public. This is a hackathon submission that aims to become the official marketplace — quality and clarity win.
