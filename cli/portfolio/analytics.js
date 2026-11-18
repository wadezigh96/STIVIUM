function money(value, currency = 'USD') {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
}

function pct(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
}

function snapshot(state) {
  const positions = state.holdings.map((holding) => {
    const costBasis = holding.quantity * holding.avgCost;
    const marketValue = Number.isFinite(holding.price) ? holding.quantity * holding.price : null;
    const pnl = marketValue === null ? null : marketValue - costBasis;
    return { ...holding, costBasis, marketValue, pnl };
  });
  const valued = positions.filter((position) => position.marketValue !== null);
  const totalValue = valued.reduce((sum, position) => sum + position.marketValue, 0);
  const totalCost = positions.reduce((sum, position) => sum + position.costBasis, 0);
  const knownPnl = positions.filter((position) => position.pnl !== null).reduce((sum, position) => sum + position.pnl, 0);
  const allocation = valued
    .map((position) => ({ ...position, weight: totalValue ? position.marketValue / totalValue : 0 }))
    .sort((a, b) => b.weight - a.weight);
  const largest = allocation[0] || null;
  return {
    positions,
    allocation,
    totalValue,
    totalCost,
    knownPnl,
    pnlPct: totalCost ? knownPnl / totalCost : null,
    unknownCount: positions.length - valued.length,
    largest,
    cash: Number(state.cash?.USD || 0),
  };
}

function riskFlags(view) {
  const flags = [];
  if (view.unknownCount) flags.push(`${view.unknownCount} posisi belum punya harga`);
  if (view.largest && view.largest.weight >= 0.5) flags.push(`konsentrasi tinggi: ${view.largest.symbol} ${pct(view.largest.weight)}`);
  if (view.pnlPct !== null && view.pnlPct < -0.2) flags.push('unrealized loss melewati -20%');
  if (!flags.length) flags.push('tidak ada flag berbasis aturan sederhana');
  return flags;
}

module.exports = { snapshot, riskFlags, money, pct };
