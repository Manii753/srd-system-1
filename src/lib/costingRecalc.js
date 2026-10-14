// Shared recalculation for a costing side (preCost / postCost).
//
// Pure module (no DB access) so it can be used by the save route, the
// duplicate route and anything else that needs to refresh derived totals.

import { resolveCosting } from './costingGrid.js';

const SECTIONS = ['fabrics', 'beforeWashTrims', 'afterWashTrims', 'embellishment'];

/**
 * Resolves every formula in `side`, writes back per-row amounts and refreshes
 * the derived summary fields (totalPricePkr, finalFobUs, difference).
 * Mutates and returns `side`.
 */
export function recalcCosting(side) {
  if (!side || typeof side !== 'object') return side;

  const { resolvedData } = resolveCosting(side);

  const sumRows = (rows) =>
    (rows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const subtotal =
    sumRows(resolvedData.fabrics) +
    sumRows(resolvedData.beforeWashTrims) +
    sumRows(resolvedData.afterWashTrims) +
    sumRows(resolvedData.embellishment);

  const totalWithProduction =
    subtotal +
    Number(resolvedData.cmtLevel || 0) +
    Number(resolvedData.washingLevel || 0) +
    Number(resolvedData.fob || 0);

  // Commission is a % of everything above the margin block
  // (sections + production + Extra Cut + Ld Margin + Testing Charges).
  const marginBase =
    totalWithProduction +
    Number(resolvedData.extraCut || 0) +
    Number(resolvedData.ldMargin || 0) +
    Number(resolvedData.testingCharges || 0);

  const commissionAmount = marginBase * (Number(resolvedData.commission || 0) / 100);
  const totalWithMargin = marginBase + commissionAmount;

  side.totalPricePkr = totalWithMargin;
  const currencyRate = Number(resolvedData.currencyRate) || 265;
  side.finalFobUs = totalWithMargin / currencyRate;
  side.difference = Number(resolvedData.firstQuoted || 0) - Number(resolvedData.targetPrice || 0);

  // Persist per-row amounts as resolved numbers too (respects any manual
  // Amount override typed by the user; consumption/price may be formulas).
  SECTIONS.forEach((sec) => {
    const list = side[sec] || [];
    resolvedData[sec]?.forEach((r, i) => {
      if (list[i]) list[i].amount = Number(r.amount) || 0;
    });
  });

  return side;
}