/**
 * GNUS investor scenario formulas.
 *
 * Pure JavaScript: no DOM, networking, or external libraries.
 * Browser: import { simulateScenario, calculateEquity, formatUsd } from './model.js'
 * Node:    npm-free tests can import the same module.
 *
 * These are illustrative economics, not a market price forecast.
 */
export const POS_MONTHLY_BILLING = 20;
export const POS_MONTHLY_GNUS = 5;
export const POS_MONTHLY_CASH = POS_MONTHLY_BILLING - POS_MONTHLY_GNUS;
export const MIN_SUPPLY_FRACTION = 0.01; // Model guardrail, NOT a GNUS protocol rule.

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
});
const countFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** UI dollar labels: $123.45, $1.23K, $4.56M, $7.89B, $1.23T. */
export function formatUsd(value) {
  if (!Number.isFinite(value) || Math.abs(value) >= 1e15) return 'Model limit';
  const abs = Math.abs(value);
  for (const [limit, suffix] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']]) {
    if (abs >= limit) return '$' + (value / limit).toFixed(2) + suffix;
  }
  return usdFormatter.format(value);
}

/** Token counts, intentionally distinct from currency formatting. */
export function formatCount(value) {
  if (!Number.isFinite(value) || Math.abs(value) >= 1e15) return 'Model limit';
  const abs = Math.abs(value);
  for (const [limit, suffix] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']]) {
    if (abs >= limit) return (value / limit).toFixed(2) + suffix;
  }
  return abs > 0 && abs < 1 ? value.toFixed(3) : countFormatter.format(value);
}

export function calculateEquity(a, investment = a.investment) {
  const existing = a.premoney / a.prefPrice;
  const newShares = investment / a.prefPrice;
  const total = existing + newShares;
  const owned = total > 0 ? newShares / total : 0;
  return {
    existing, newShares, total, owned,
    common: newShares * a.conversion,
    warrantTokens: newShares * a.warrants,
    exerciseCost: newShares * a.warrants * a.strike
  };
}

/**
 * Investor warrant-sale lockup: for lockoutMonths N, token sales are zero in
 * months 1..N. The first permitted sale is month N+1. Token balance is held
 * constant during lockup; targets are NOT paid retroactively when it ends.
 *
 * Token price is assumed market cap / outstanding supply, NOT a forecast.
 * We stop token calculations if cumulative held GV commissions exceed all
 * GNUS still outstanding, or outstanding supply falls below 1% of the start.
 * POS cash continues even if token calculations become invalid.
 */
export function simulateScenario(a, extra) {
  const eq = calculateEquity(a);
  const lockoutMonths = Math.max(0, Math.min(120, Math.floor(a.lockout || 0)));
  const baseCap = a.startPrice * a.startSupply;
  const capMultiplier = Math.pow(1 + a.capGrowth, 1 / 12);
  const supplyFloor = a.startSupply * MIN_SUPPLY_FRACTION;
  let cap = baseCap;
  let supply = a.startSupply;
  let companyTokens = 0;
  let investorTokens = eq.warrantTokens;
  let cumCash = 0;
  let cumIncome = 0;
  let cumShortfall = 0;
  let firstShort = null;
  let limited = null;
  let limitedReason = null;

  const rows = [{
    m: 0, price: a.startPrice, needed: a.income / a.startPrice,
    investorLeft: investorTokens, lockedTokens: lockoutMonths > 0 ? investorTokens : 0,
    investorSold: 0, cashReceived: 0, incomeShortfall: 0, cumShortfall: 0,
    companyCashMo: 0, companyCommissionMo: 0, companyWalletTokens: 0,
    companyWalletValue: 0, cumCash: 0, companyTotalMo: 0,
    supply, cumIncome: 0, devices: a.devices, spend: 0, burnTokens: 0
  }];

  for (let m = 1; m <= a.months; m++) {
    const monthDevices = a.devices * Math.pow(1 + a.deviceGrowth, m - 1);
    const posCash = monthDevices * POS_MONTHLY_CASH;
    const posSpend = monthDevices * POS_MONTHLY_GNUS;
    const extraSpend = extra * Math.pow(1 + a.aiGrowth, m - 1);
    const spend = posSpend + extraSpend;
    cumCash += posCash;

    if (limited !== null) {
      rows.push({
        m, price: NaN, needed: NaN, investorLeft: NaN, lockedTokens: NaN,
        investorSold: NaN, cashReceived: NaN, incomeShortfall: NaN, cumShortfall: NaN,
        companyCashMo: posCash, companyCommissionMo: NaN, companyWalletTokens: NaN,
        companyWalletValue: NaN, cumCash, companyTotalMo: NaN, supply: NaN,
        cumIncome: NaN, devices: monthDevices, spend, burnTokens: NaN
      });
      continue;
    }

    const startPrice = cap / supply;
    const tokensPaid = spend / startPrice;
    const burnTokens = tokensPaid * a.burn;
    const commissionTokens = tokensPaid * a.commission;
    const nextSupply = supply - burnTokens;
    const nextCap = cap * capMultiplier;

    if (![monthDevices, spend, tokensPaid, burnTokens, commissionTokens, nextSupply, nextCap].every(Number.isFinite) || !(nextCap > 0)) {
      limitedReason = 'Growth inputs exceed numerical model limits';
    } else if (!(nextSupply > 0)) {
      limitedReason = 'Processing would exhaust the remaining token supply';
    } else if (nextSupply < supplyFloor) {
      limitedReason = 'Less than 1% of starting token supply would remain (scenario guardrail)';
    } else if (companyTokens + commissionTokens > nextSupply + 1e-9) {
      limitedReason = 'Assumed Genius Ventures wallet holdings exceed remaining token supply';
    }

    if (limitedReason !== null) {
      limited = m;
      rows.push({
        m, price: NaN, needed: NaN, investorLeft: NaN, lockedTokens: NaN,
        investorSold: NaN, cashReceived: NaN, incomeShortfall: NaN, cumShortfall: NaN,
        companyCashMo: posCash, companyCommissionMo: NaN, companyWalletTokens: NaN,
        companyWalletValue: NaN, cumCash, companyTotalMo: NaN, supply: NaN,
        cumIncome: NaN, devices: monthDevices, spend, burnTokens: NaN
      });
      continue;
    }

    companyTokens += commissionTokens;
    supply = nextSupply;
    cap = nextCap;
    const price = cap / supply;
    const needed = a.income / price;
    const locked = m <= lockoutMonths;
    const sold = locked ? 0 : Math.min(needed, investorTokens);
    investorTokens = Math.max(0, investorTokens - sold);
    const cashReceived = sold * price;
    const incomeShortfall = Math.max(0, a.income - cashReceived);
    cumIncome += cashReceived;
    cumShortfall += incomeShortfall;
    if (!locked && firstShort === null && sold + 1e-9 < needed) firstShort = m;

    const companyCommissionMo = spend * a.commission;
    rows.push({
      m, price, needed, investorLeft: investorTokens,
      lockedTokens: locked ? investorTokens : 0,
      investorSold: sold, cashReceived, incomeShortfall, cumShortfall,
      companyCashMo: posCash, companyCommissionMo, companyWalletTokens: companyTokens,
      companyWalletValue: companyTokens * price, cumCash,
      companyTotalMo: posCash + companyCommissionMo,
      supply, cumIncome, devices: monthDevices, spend, burnTokens
    });
  }
  return { rows, limited, limitedReason, firstShort, initialTokens: eq.warrantTokens, lockoutMonths };
}
