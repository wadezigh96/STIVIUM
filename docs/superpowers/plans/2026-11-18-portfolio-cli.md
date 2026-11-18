# Portfolio CLI Implementation Plan

> **For agentic workers:** This plan is implemented natively in the current session.

**Goal:** Add a polished, read-only portfolio CLI for stocks and crypto with local snapshots, allocation analytics, optional public price refresh, and reminders.

**Architecture:** Keep the existing static Stivium app unchanged and add a dependency-free Node.js CLI under `cli/portfolio/`. Store user data only in a local JSON file selected by `STIVIUM_PORTFOLIO_FILE`, defaulting to a file in the user's home directory. Separate ledger, pricing, analytics, rendering, and reminder operations so the CLI can work offline and never needs transaction authority.

**Tech Stack:** Node.js 24, CommonJS, built-in `fs`, `path`, `os`, `https`, and `readline` only.

**Spec:** This file and the product constraints below.

## Global Constraints

- Read-only: no broker, exchange, wallet, or transaction execution.
- User-private holdings stay local; only public symbols are sent to an optional price endpoint.
- Missing, stale, or failed prices are labeled rather than fabricated.
- Portfolio value is explicitly a snapshot, not an executable quote.
- Reminder commands manage local reminders; unattended execution requires the user’s own cron/Task Scheduler or Manus ScheduleTask setup.

## Review Focus

- Empty or missing portfolio file should produce a useful onboarding state.
- Invalid quantities, prices, currencies, and reminder dates should fail with actionable errors.
- Crypto symbols must be normalized without leaking quantities or cost basis to public APIs.
- Price API failure must preserve the local ledger and render unknown valuation instead of zero.
- Reminder due dates must respect ISO timestamps and distinguish due, upcoming, and completed states.

## File map

- Create `cli/portfolio/index.js`: command parser and entry point.
- Create `cli/portfolio/store.js`: local JSON state, validation, and atomic writes.
- Create `cli/portfolio/market-data.js`: optional read-only public price refresh with timeout and source metadata.
- Create `cli/portfolio/analytics.js`: deterministic valuation, allocation, P/L, and concentration calculations.
- Create `cli/portfolio/render.js`: terminal dashboard and tables with ANSI-safe formatting.
- Create `cli/portfolio/reminders.js`: local reminder CRUD and due-state calculations.
- Create `cli/portfolio/README.md`: commands, safety boundaries, data model, and scheduling examples.
- Modify `package.json`: expose `npm run portfolio -- ...`.
- Modify root `README.md`: link the CLI and its use case.

## Tasks

### Task 1: Local ledger and analytics

- [ ] Implement portfolio state schema with holdings, cash, settings, and reminders.
- [ ] Validate add/remove inputs and write atomically.
- [ ] Calculate market value, cost basis, unrealized P/L, allocation, and concentration.
- [ ] Add deterministic fixtures through CLI commands for manual smoke checks.

### Task 2: Price refresh and rendering

- [ ] Add optional public price refresh for crypto symbols only, keeping quantities and cost basis local.
- [ ] Preserve source, retrieval timestamp, currency, and stale/error status.
- [ ] Render a dark terminal dashboard with KPI cards, allocation bars, risk flags, and source freshness.

### Task 3: Reminder workflow

- [ ] Add reminder creation, listing, completion, and deletion.
- [ ] Render due reminders prominently in `overview`.
- [ ] Document cron/Task Scheduler and Manus ScheduleTask as external unattended runners without embedding credentials.

### Task 4: Documentation and verification

- [ ] Add package script and CLI README.
- [ ] Run syntax checks and deterministic smoke tests.
- [ ] Review diff for secrets and commit as one feature change.
