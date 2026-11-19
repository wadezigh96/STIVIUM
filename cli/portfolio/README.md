# Stivium Portfolio CLI

This CLI is a read-only command center for snapshots of stock, ETF, and crypto portfolios. It stores a local ledger, computes position values, cost basis, unrealized P/L, allocation, concentration, and review reminders. The CLI does not connect to any broker, exchange account, wallet signer, or transaction endpoint.

## Quick start

```bash
npm run portfolio -- overview
npm run portfolio -- add --symbol BTC --type crypto --quantity 0.1 --cost 60000 --price 65000
npm run portfolio -- add --symbol AAPL --type stock --quantity 5 --cost 180 --price 195
npm run portfolio -- prices
npm run portfolio -- reminder add --title "Review allocation" --due 2026-12-01T09:00:00+07:00 --notes "Check concentration and cash buffer"
npm run portfolio -- overview
```

The default ledger is stored at `~/.stivium/portfolio.json` with strict local permissions. For a separate workspace or test, use `STIVIUM_PORTFOLIO_FILE=/path/to/portfolio.json`.

## Commands

`overview` shows the terminal dashboard, holdings, P/L, allocation bars, risk flags, and active reminders. `add` creates or updates a position based on `symbol`, `type`, `quantity`, `cost`, and optional `price`. `remove` deletes a position from the local ledger. `prices` fetches prices for recognized crypto from the CoinGecko public API; only public symbols are sent, not quantity, cost basis, or personal data. Stocks/ETFs use a manual `--price` until a suitable market data adapter is added.

The `reminder add`, `reminder list`, `reminder check`, `reminder done`, and `reminder delete` subcommands manage local reminders. `reminder check` is meant to be run from cron or Task Scheduler. The CLI itself does not claim to be a daemon and does not guarantee delivery unless run by a scheduler.

## Scheduling reminder

Linux/macOS — example: run the check every hour and write output to a local log:

```cron
0 * * * * cd /path/to/STIVIUM && STIVIUM_PORTFOLIO_FILE=$HOME/.stivium/portfolio.json npm run portfolio -- reminder check >> $HOME/.stivium/reminders.log 2>&1
```

Windows can use Task Scheduler with the same action. For Manus-based reminders, use ScheduleTask with instructions to run `npm run portfolio -- reminder check` in an environment that has the ledger file; schedule configuration is a separate step from this CLI.

## Data and safety notes

Prices are non-executable snapshots and may be stale or fail. Output will flag positions without a price instead of treating their value as zero. P/L and allocation figures use the currency stored on the holding; the first version assumes `USD` as the presentation currency and does no automatic FX conversion. Do not put bank account numbers, private keys, seed phrases, API keys, or credentials on the command line, in the ledger, or in logs.
