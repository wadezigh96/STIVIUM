const { money, pct, riskFlags } = require('./analytics');

const ansi = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
};
const color = process.env.NO_COLOR ? Object.fromEntries(Object.keys(ansi).map((key) => [key, ''])) : ansi;
const paint = (tone, value) => `${color[tone]}${value}${color.reset}`;
const line = (char = '─', width = 74) => char.repeat(width);
const bar = (weight, width = 22) => {
  const filled = Math.max(0, Math.min(width, Math.round(weight * width)));
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
};

function header(file) {
  console.log(`\n${paint('cyan', '╭' + line('─', 72) + '╮')}`);
  console.log(`${paint('cyan', '│')} ${paint('bold', 'STIVIUM / PORTFOLIO COMMAND CENTER')} ${paint('dim', 'read-only • local-first')}        ${paint('cyan', '│')}`);
  console.log(`${paint('cyan', '│')} ${paint('dim', `ledger: ${file}`.slice(0, 70).padEnd(70))} ${paint('cyan', '│')}`);
  console.log(`${paint('cyan', '╰' + line('─', 72) + '╯')}`);
}

function overview(state, view, file) {
  header(file);
  console.log(`\n${paint('bold', 'SNAPSHOT')}  ${paint('dim', new Date().toLocaleString())}`);
  console.log(`  ${paint('cyan', 'Total valued')}  ${paint('bold', money(view.totalValue))}    ${paint('cyan', 'Cost basis')}  ${money(view.totalCost)}    ${paint('cyan', 'Cash')}  ${money(view.cash)}`);
  const pnlTone = view.knownPnl >= 0 ? 'green' : 'red';
  console.log(`  ${paint('cyan', 'Unrealized P/L')} ${paint(pnlTone, `${money(view.knownPnl)} (${pct(view.pnlPct)})`)}`);
  console.log(`\n${paint('bold', 'HOLDINGS')}`);
  if (!view.positions.length) console.log(`  ${paint('dim', 'No holdings yet. Start with: npm run portfolio -- add --symbol BTC --type crypto --quantity 0.1 --cost 60000 --price 65000')}`);
  for (const position of view.positions) {
    const value = position.marketValue === null ? paint('yellow', 'price unknown') : money(position.marketValue);
    const pnl = position.pnl === null ? '—' : paint(position.pnl >= 0 ? 'green' : 'red', money(position.pnl));
    console.log(`  ${paint('bold', position.symbol.padEnd(8))} ${paint('dim', position.assetType.padEnd(7))} ${String(position.quantity).padStart(12)}  value ${value.padStart(15)}  P/L ${pnl}`);
  }
  console.log(`\n${paint('bold', 'ALLOCATION')}`);
  if (!view.allocation.length) console.log(`  ${paint('dim', 'No positions with a known price yet.')}`);
  for (const position of view.allocation) {
    const tone = position.weight >= 0.5 ? 'red' : position.weight >= 0.25 ? 'yellow' : 'green';
    console.log(`  ${position.symbol.padEnd(8)} ${paint(tone, bar(position.weight))} ${pct(position.weight).padStart(7)}`);
  }
  console.log(`\n${paint('bold', 'RISK FLAGS')}`);
  for (const flag of riskFlags(view)) console.log(`  ${paint(flag.includes('high') || flag.includes('exceeds') ? 'red' : 'yellow', '◆')} ${flag}`);
}

function reminders(items) {
  console.log(`\n${paint('bold', 'REMINDERS')}`);
  if (!items.length) return console.log(`  ${paint('dim', 'No active reminders.')}`);
  for (const item of items) {
    const tone = item.status === 'due' ? 'red' : 'cyan';
    console.log(`  ${paint(tone, item.status.toUpperCase().padEnd(9))} ${item.dueAt}  ${item.title} ${paint('dim', item.id.slice(0, 8))}`);
    if (item.notes) console.log(`             ${paint('dim', item.notes)}`);
  }
}

module.exports = { overview, reminders, paint };
