(function (root) {
  'use strict';
  function number(value, label, min = 0, max = 100000000) {
    if (value === '' || value === null || value === undefined || typeof value === 'boolean') throw new Error('Enter ' + label.toLowerCase() + '.');
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(label + ' must be between ' + min + ' and ' + max + '.');
    return n;
  }
  function cents(n) { return Math.round((n + Number.EPSILON) * 100); }
  function pricing(input) {
    const cost = number(input.cost, 'Bulk purchase cost');
    const extras = number(input.extras, 'Other costs');
    const bulk = number(input.bulk, 'Bulk quantity', 0.001, 1000000);
    const pack = number(input.pack, 'Pack size', 0.001, 1000000);
    const waste = number(input.waste, 'Wastage', 0, 99.9);
    if (!['margin', 'markup'].includes(input.basis)) throw new Error('Choose margin or markup.');
    const target = number(input.target, 'Profit target', 0, input.basis === 'margin' ? 99.9 : 1000);
    const round = number(input.round, 'Rounding', 0.01, 1);
    if (![0.01, 0.5, 1].includes(round)) throw new Error('Choose a supported price rounding.');
    const totalCents = cents(cost) + cents(extras);
    if (totalCents <= 0) throw new Error('Enter a purchase cost or other cost above zero.');
    const units = Math.floor((bulk * (1 - waste / 100)) / pack + 1e-9);
    if (units < 1) throw new Error('There is not enough stock for one full pack after wastage. Reduce pack size or wastage.');
    const unitCostCents = totalCents / units;
    const basePriceCents = input.basis === 'margin' ? unitCostCents / (1 - target / 100) : unitCostCents * (1 + target / 100);
    const stepCents = cents(round);
    const sellCents = Math.ceil(basePriceCents / stepCents - 1e-9) * stepCents;
    if (sellCents > 10000000000) throw new Error('This price is too large. Check your costs and profit target.');
    const revenueCents = sellCents * units;
    return { units, totalCost: totalCents / 100, unitCost: unitCostCents / 100, price: sellCents / 100, unitProfit: (sellCents - unitCostCents) / 100, revenue: revenueCents / 100, batchProfit: (revenueCents - totalCents) / 100, margin: (sellCents - unitCostCents) / sellCents * 100, markup: (sellCents - unitCostCents) / unitCostCents * 100, pack, bulk, waste, target, basis: input.basis, round };
  }
  function cash(input) {
    const labels = {opening:'Opening float',sales:'Cash sales',added:'Other cash added',expenses:'Expenses',refunds:'Cash refunds',withdrawn:'Cash taken out',counted:'Cash counted'};
    const values = {};
    for (const key of Object.keys(labels)) values[key] = cents(number(input[key], labels[key]));
    const expected = values.opening + values.sales + values.added - values.expenses - values.refunds - values.withdrawn;
    if (expected < 0) throw new Error('Cash taken out is more than cash available. Check your amounts and make sure nothing was counted twice.');
    const difference = values.counted - expected;
    return { expected: expected / 100, counted: values.counted / 100, difference: difference / 100, status: difference === 0 ? 'balanced' : difference < 0 ? 'short' : 'over', amounts: Object.fromEntries(Object.entries(values).map(([k,v]) => [k,v/100])) };
  }
  const logic = { pricing, cash, number };
  if (typeof module !== 'undefined' && module.exports) module.exports = logic;
  else root.ShopDeskLogic = logic;
})(typeof window !== 'undefined' ? window : globalThis);
