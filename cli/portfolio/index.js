#!/usr/bin/env node
const { dataFile, readState, upsertHolding, removeHolding, replacePrices } = require('./store');
const { snapshot } = require('./analytics');
const { fetchCryptoPrices } = require('./market-data');
const { addReminder, listReminders, completeReminder, deleteReminder } = require('./reminders');
const { overview, reminders: renderReminders, paint } = require('./render');

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) args._.push(token);
    else {
      const [key, inline] = token.slice(2).split('=');
      if (inline !== undefined) args[key] = inline;
      else if (!argv[index + 1] || argv[index + 1].startsWith('--')) args[key] = true;
      else args[key] = argv[++index];
    }
  }
  return args;
}

function usage() {
  console.log(`\n${paint('bold', 'STIVIUM PORTFOLIO CLI')}\n\n` +
`  ${paint('cyan', 'overview')}                         dashboard portfolio + reminders\n` +
`  ${paint('cyan', 'add')} --symbol BTC --type crypto --quantity 0.1 --cost 60000 [--price 65000]\n` +
`  ${paint('cyan', 'remove')} --symbol BTC [--type crypto]\n` +
`  ${paint('cyan', 'prices')}                         refresh crypto prices (read-only)\n` +
`  ${paint('cyan', 'reminder add')} --title "Review allocation" --due 2026-12-01T09:00:00+07:00 [--notes text]\n` +
`  ${paint('cyan', 'reminder list')} [--all]\n` +
`  ${paint('cyan', 'reminder done')} --id <id-prefix>\n` +
`  ${paint('cyan', 'reminder delete')} --id <id-prefix>\n\n` +
`  ${paint('dim', 'Data disimpan lokal. CLI tidak punya akses transaksi atau wallet.')}`);
}

async function refreshPrices() {
  const state = readState();
  const cryptoSymbols = state.holdings.filter((holding) => holding.assetType === 'crypto').map((holding) => holding.symbol);
  if (!cryptoSymbols.length) return console.log(paint('yellow', 'Tidak ada holding crypto yang bisa di-refresh. Stock/ETF gunakan --price manual.'));
  try {
    const result = await fetchCryptoPrices(cryptoSymbols);
    replacePrices(result.prices, result.source);
    console.log(paint('green', `Harga diperbarui: ${Object.keys(result.prices).join(', ') || 'tidak ada symbol yang dikenali'}.`));
    if (result.skipped.length) console.log(paint('yellow', `Dilewati: ${result.skipped.join(', ')}.`));
  } catch (error) {
    console.error(paint('red', `Gagal refresh harga: ${error.message}`));
    process.exitCode = 1;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'overview';
  if (command === 'help' || command === '--help') return usage();
  if (command === 'overview') {
    const state = readState();
    overview(state, snapshot(state), dataFile());
    renderReminders(listReminders());
    return;
  }
  if (command === 'add') {
    upsertHolding(args);
    console.log(paint('green', `${String(args.symbol).toUpperCase()} tersimpan secara lokal.`));
    return;
  }
  if (command === 'remove') {
    removeHolding(args.symbol, args.type);
    console.log(paint('green', `${String(args.symbol).toUpperCase()} dihapus dari ledger lokal.`));
    return;
  }
  if (command === 'prices') return refreshPrices();
  if (command === 'reminder') {
    const subcommand = args._[1] || 'list';
    if (subcommand === 'add') {
      addReminder(args.title, args.due, args.notes);
      console.log(paint('green', 'Reminder tersimpan secara lokal.'));
    } else if (subcommand === 'list' || subcommand === 'check') {
      renderReminders(listReminders(Boolean(args.all)));
    } else if (subcommand === 'done') {
      completeReminder(args.id);
      console.log(paint('green', 'Reminder ditandai selesai.'));
    } else if (subcommand === 'delete') {
      deleteReminder(args.id);
      console.log(paint('green', 'Reminder dihapus.'));
    } else usage();
    return;
  }
  usage();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(paint('red', `Error: ${error.message}`));
  process.exitCode = 1;
});
