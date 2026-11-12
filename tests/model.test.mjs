import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEquity, simulateScenario, formatUsd, POS_MONTHLY_CASH } from '../docs/model.js';

const base = {
  investment:500_000, premoney:50_000_000, prefPrice:100, conversion:100,
  income:5_000, warrants:10, strike:0, devices:1_000_000,
  deviceGrowth:0, aiGrowth:0, capGrowth:0, startPrice:3.4,
  startSupply:20_000_000, burn:0.10, commission:0.10, months:24, lockout:0
};

test('cash labels use two decimals and K/M/B/T', () => {
  assert.equal(formatUsd(3.4), '$3.40');
  assert.equal(formatUsd(1859.9), '$1.86K');
  assert.equal(formatUsd(1_250_000), '$1.25M');
  assert.equal(formatUsd(3_450_000_000), '$3.45B');
  assert.equal(formatUsd(7_890_000_000_000), '$7.89T');
  assert.equal(formatUsd(3.22e50), 'Model limit');
});

test('equity and warrant allocation remain separate', () => {
  const e = calculateEquity(base);
  assert.equal(e.newShares, 5000);
  assert.equal(e.warrantTokens, 50_000);
  assert.ok(Math.abs(e.owned - (500_000 / 50_500_000)) < 1e-12);
});

for (const monthsLocked of [0, 6, 12, 18]) {
  test(monthsLocked + '-month resale lockout, first sale month ' + (monthsLocked+1), () => {
    const sim = simulateScenario({...base, lockout:monthsLocked}, 0);
    for(let m=1;m<=monthsLocked;m++){
      assert.equal(sim.rows[m].investorSold, 0);
      assert.equal(sim.rows[m].cashReceived, 0);
      assert.equal(sim.rows[m].investorLeft, 50_000);
    }
    const unlock=sim.rows[monthsLocked+1];
    assert.ok(Math.abs(unlock.cashReceived-base.income)<1e-6);
    assert.ok(Math.abs(unlock.cumIncome-base.income)<1e-6);
    assert.equal(unlock.lockedTokens,0);
  });
}

test('lockout longer than horizon has zero cash but keeps warrant balance', () => {
  const sim=simulateScenario({...base, lockout:18, months:12}, 0);
  assert.equal(sim.rows[12].cumIncome,0);
  assert.equal(sim.rows[12].investorLeft,50_000);
});

test('high AI spending stops token pricing, not POS cash', () => {
  const sim=simulateScenario({...base, months:120}, 50_000_000);
  assert.ok(sim.limited!==null && sim.limited>0);
  assert.match(sim.limitedReason, /wallet holdings|supply/i);
  assert.ok(Number.isNaN(sim.rows[120].price));
  assert.equal(sim.rows[120].cumCash, 120*1_000_000*POS_MONTHLY_CASH);
  assert.equal(sim.rows[120].companyCashMo, 1_000_000*POS_MONTHLY_CASH);
});

test('token-price model never reports an impossible retained wallet balance', () => {
  const sim=simulateScenario({...base,months:120}, 5_000_000);
  for(const row of sim.rows){
    if(Number.isFinite(row.companyWalletTokens)){
      assert.ok(row.companyWalletTokens<=row.supply+1e-8);
    }
  }
});
