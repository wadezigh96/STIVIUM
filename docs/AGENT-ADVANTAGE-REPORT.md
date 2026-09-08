# Agent Advantage Report — TermiX Challenge

**Required for TermiX eligibility.**  
TermiX scores on whether hiring an agent through the marketplace *actually beats* doing the job yourself, with numbers.

Official requirements:
1. ≥ **3 real tasks** run both ways (with agent hired via marketplace vs without).
2. Report **time, cost, output quality** + attach actual outputs.
3. ≥ 1 task from **trading, stock, or security**.

---

## How to complete this report

1. Run each task **manually** first. Record wall-clock time, gas/fees, and quality (1–5 + notes).
2. Hire the matching agent through Stivium (or the live Agent Studio agent once wired) and repeat.
3. Attach screenshots / agent replies / CSVs under `/reports/` or link them here.
4. Link this file from the main README and the submission form.

Below are **filled example runs** using the current prototype agents as stand-ins.  
**Replace the numbers and attach real outputs before final submission.**

---

## Task 1 — Health Factor Monitoring (Security / Risk)

**Agent used:** HealthSentinel (Health Factor Monitoring)

| Dimension | Without agent | With agent (via Stivium) |
|-----------|---------------|---------------------------|
| **Task** | Review a Venus lending position, compute health factor, decide whether to add collateral or repay debt before liquidation risk rises | Same |
| **Time** | 18 min (open Venus UI + spreadsheet + check oracle prices) | 2.5 min (open agent → activate with spend cap → receive structured recommendation) |
| **Cost** | ~$0.40 gas for two exploratory txs + opportunity cost of delayed action | Agent hire fee (mock $0) + ~$0.15 gas for the protective action |
| **Output quality** | 3/5 — correct direction but no exact repay amount; required a second pass | 5/5 — exact health-factor target, suggested repay amount, and call-data style checklist |
| **Actual output** | [attach: screenshot of manual calc] | [attach: agent response + Stivium activation receipt] |

**Advantage:** ~7× faster, clearer action parameters, lower chance of under-reacting to a dropping health factor.

---

## Task 2 — Grid Trading setup (Trading) ★ high-stakes category

**Agent used:** LatticeBot / GridForge (Grid Trading)

| Dimension | Without agent | With agent (via Stivium) |
|-----------|---------------|---------------------------|
| **Task** | Design a grid for a volatile BNB pair on PancakeSwap (range, step size, capital allocation) | Same |
| **Time** | 35 min (back-of-envelope + historical volatility check) | 4 min (agent returns grid parameters + risk notes) |
| **Cost** | Time only for planning; later gas for placement | Planning via agent + gas for placement |
| **Output quality** | 3/5 — workable but step size too tight for current vol | 5/5 — step size and range matched recent ATR; max-drawdown note included |
| **Actual output** | [attach: manual grid sheet] | [attach: agent grid plan + Stivium card metrics] |

**Advantage:** Faster setup with volatility-aware parameters; category metric (max drawdown) visible before hiring.

---

## Task 3 — Yield routing (Yield Optimisation)

**Agent used:** CompoundKeeper / YieldCartographer

| Dimension | Without agent | With agent (via Stivium) |
|-----------|---------------|---------------------------|
| **Task** | Find the highest *safe* yield path for stablecoins across Venus / Lista / Pancake LPs and decide where to move funds | Same |
| **Time** | 22 min (check 4–5 protocols + APY vs risk notes) | 3 min |
| **Cost** | Research time + later gas | Agent + gas for the move |
| **Output quality** | 4/5 — found a good pool but missed a compounding nuance | 5/5 — ranked options with net APY after fees and a short risk tag |
| **Actual output** | [attach: notes] | [attach: agent ranking + Stivium net-APY metric] |

**Advantage:** Comparable or better quality in a fraction of the time; decision metric (net APY) already on the card.

---

## Summary table (for judges)

| Task | Category | Time saved | Quality delta | High-stakes? |
|------|----------|------------|---------------|--------------|
| Health factor check | Security | ~15 min | +2 pts | Yes |
| Grid design | Trading | ~31 min | +2 pts | Yes |
| Yield route | Yield | ~19 min | +1 pt | No |

**Overall claim:** For these three tasks, hiring through Stivium produced equal or better output in significantly less time, with category-specific metrics visible before the hire.

---

## Attachments checklist

- [ ] Screenshots / logs of the three “without agent” runs  
- [ ] Screenshots / agent replies of the three “with agent” runs  
- [ ] Stivium activation receipts (or on-chain tx links once Altana is wired)  
- [ ] This file linked from README and submission form  

Replace example numbers with your real runs. TermiX weights **Proven agent advantage** at 30% of their score — this document is the evidence.
