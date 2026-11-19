const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULT_STATE = {
  version: 1,
  baseCurrency: 'USD',
  cash: { USD: 0 },
  holdings: [],
  reminders: [],
  updatedAt: null,
};

function dataFile() {
  return process.env.STIVIUM_PORTFOLIO_FILE || path.join(os.homedir(), '.stivium', 'portfolio.json');
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
}

function readState() {
  const file = dataFile();
  if (!fs.existsSync(file)) return structuredClone(DEFAULT_STATE);
  if (fs.readFileSync(file, 'utf8').trim() === '') return structuredClone(DEFAULT_STATE);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid portfolio file: ${file} (${error.message})`);
  }
  return {
    ...structuredClone(DEFAULT_STATE),
    ...parsed,
    holdings: Array.isArray(parsed.holdings) ? parsed.holdings : [],
    reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
    cash: parsed.cash && typeof parsed.cash === 'object' ? parsed.cash : { USD: 0 },
  };
}

function writeState(state) {
  const file = dataFile();
  ensureDir(file);
  const temp = `${file}.${process.pid}.tmp`;
  const next = { ...state, updatedAt: new Date().toISOString() };
  fs.writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
  return next;
}

function number(value, name, { min = 0, allowZero = true } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (allowZero ? parsed < min : parsed <= min)) {
    throw new Error(`${name} must be a number ${allowZero ? `>= ${min}` : `> ${min}`}.`);
  }
  return parsed;
}

function normalizeSymbol(value) {
  const symbol = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9._-]{1,20}$/.test(symbol)) throw new Error('Invalid symbol. Example: BTC, ETH, AAPL.');
  return symbol;
}

function normalizeType(value) {
  const type = String(value || 'crypto').trim().toLowerCase();
  if (!['crypto', 'stock', 'etf', 'cash'].includes(type)) throw new Error('Type must be crypto, stock, etf, or cash.');
  return type;
}

function upsertHolding(input) {
  const symbol = normalizeSymbol(input.symbol);
  const assetType = normalizeType(input.type);
  const quantity = number(input.quantity, 'Quantity', { allowZero: false });
  const avgCost = number(input.cost, 'Average cost', { allowZero: false });
  const currency = String(input.currency || 'USD').toUpperCase();
  const price = input.price === undefined ? null : number(input.price, 'Price', { allowZero: false });
  const state = readState();
  const existing = state.holdings.find((holding) => holding.symbol === symbol && holding.assetType === assetType);
  const record = {
    symbol,
    assetType,
    quantity,
    avgCost,
    currency,
    price: price ?? existing?.price ?? null,
    priceSource: price ? 'manual' : existing?.priceSource ?? null,
    priceFetchedAt: price ? new Date().toISOString() : existing?.priceFetchedAt ?? null,
  };
  if (existing) Object.assign(existing, record);
  else state.holdings.push(record);
  return writeState(state);
}

function removeHolding(symbol, type) {
  const state = readState();
  const normalized = normalizeSymbol(symbol);
  const assetType = type ? normalizeType(type) : null;
  const before = state.holdings.length;
  state.holdings = state.holdings.filter((holding) => !(holding.symbol === normalized && (!assetType || holding.assetType === assetType)));
  if (state.holdings.length === before) throw new Error(`Holding ${normalized}${assetType ? ` (${assetType})` : ''} not found.`);
  return writeState(state);
}

function replacePrices(prices, source) {
  const state = readState();
  const fetchedAt = new Date().toISOString();
  for (const holding of state.holdings) {
    const nextPrice = prices[holding.symbol];
    if (Number.isFinite(nextPrice)) {
      holding.price = nextPrice;
      holding.priceSource = source;
      holding.priceFetchedAt = fetchedAt;
    }
  }
  return writeState(state);
}

module.exports = {
  dataFile,
  readState,
  writeState,
  upsertHolding,
  removeHolding,
  replacePrices,
  normalizeSymbol,
  normalizeType,
  number,
};
