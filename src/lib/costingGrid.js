// Shared Excel-style grid model + formula resolver for the Pre/Post costing sheet.
//
// The sheet is treated like a spreadsheet:
//   - every data column has a letter (A=Description, B=Code, C=Cons,
//     D=Rate, E=Amount, F+ = user-added dropdown columns) and every
//     visible row has a number.
//   - cells may hold either a number or an Excel-style formula string
//     ("=D7*2", "=SUM(D7:D12)", "=B6/2", "=D{row}*E{row}").
//
// This module is pure JS so it is safe to import on both the client
// (CostingSheet.jsx) and the server (PATCH route) side.

import { evaluateFormula } from './costSheetFormula.js';

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export const isFormula = (v) =>
  typeof v === 'string' && String(v).trim().startsWith('=');

export const SECTIONS = [
  ['fabrics', 'Fabrics', true],
  ['beforeWashTrims', 'Before Wash Trims', true],
  ['afterWashTrims', 'After Wash Trims', true],
  ['embellishment', 'Embellishment', true],
];

const mkField = (col, key, isSelect = false) => ({ col, kind: 'field', key, select: isSelect });
const mkItem = (col, section, idx, field) => ({ col, kind: 'item', section, idx, field });
const mkNum = (col, key) => ({ col, kind: 'num', key });
// "Codes Req Level" dropdown — only used by the Production Cost block.
const mkLevel = (col, key) => ({ col, kind: 'level', key });
const mkExtra = (col, section, idx, extraId) => ({ col, kind: 'extra', section, idx, extraId });

// Excel-style column letters: 0->A … 25->Z, 26->AA … (extras start at 'F').
const colLetter = (n) => {
  let s = '';
  n += 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// Build the ordered list of visible grid rows (single source of truth for the
// row numbers shown in the gutter and used by cell references).
export function buildCostingRows(d = {}) {
  const rows = [];
  const add = (type, cells = [], extra = {}) => {
    const row = rows.length + 1;
    rows.push({ type, row, cells, ...extra });
    return row;
  };

  // Header block (gutter rows 1–4)
  add('headTitle');
  add('head', [
    mkField('A', 'date'),
    mkField('B', 'brand'),
    mkField('C', 'fitSpecsCode'),
  ]);
  add('head', [
    mkField('A', 'fit'),
    mkField('B', 'description'),
    mkField('C', 'fabricType'),
  ]);
  add('head', [
    mkField('A', 'embellishmentYesNo', true),
    mkField('B', 'costingBase', true),
    mkField('C', 'sampleSize'),
  ]);

  // Costing sections
  const extraCols = d.extraCols || [];
  for (const [key, title, showCode] of SECTIONS) {
    add('sectionTitle', [], { section: key, title });
    add('sectionHeader', [], { section: key, showCode });
    (d[key] || []).forEach((item, idx) => {
      // Fixed column layout (matches the sheet headers):
      //   A Description | B Code | C Cons | D Rate | E Amount | F… extras
      // Column B is always reserved so every section keeps the same alignment,
      // even when it doesn't render a Code cell.
      const cells = [mkItem('A', key, idx, 'description')];
      cells.push(mkItem('B', key, idx, 'code'));
      cells.push(mkItem('C', key, idx, 'consumption'));
      cells.push(mkItem('D', key, idx, 'price'));
      const amtCell = mkItem('E', key, idx, 'amount');
      cells.push(amtCell);
      extraCols.forEach((ec, i) => cells.push(mkExtra(colLetter(5 + i), key, idx, ec.id)));
      const row = add('item', cells, { section: key, idx, showCode });
      // Default Amount formula for this row (Cons × Rate).
      amtCell.defaultFormula = `=C${row}*D${row}`;
    });
    add('addRow', [], { section: key });
  }

  // Production cost
  // The "Codes Req Level" dropdown lives in column B and the amount in the Cons
  // column (C), so the block stays aligned with the item sections above.
  add('sectionTitle', [], { title: 'Production Cost', section: 'production' });
  add('single', [mkLevel('B', 'cmtLevelCode'), mkNum('C', 'cmtLevel')], { label: 'CMT' });
  add('single', [mkLevel('B', 'washingLevelCode'), mkNum('C', 'washingLevel')], { label: 'Washing' });
  add('single', [mkNum('C', 'fob')], { label: 'FOB' });

  // Margin & commission
  add('sectionTitle', [], { title: 'Margin & Commission', section: 'margin' });
  add('single', [mkNum('C', 'extraCut')], { label: 'Extra Cut' });
  add('single', [mkNum('C', 'ldMargin')], { label: 'Ld Margin' });
  add('single', [mkNum('C', 'testingCharges')], { label: 'Testing Charges' });
  add('single', [mkNum('C', 'commission')], { label: 'Commission' });

  // Divider + totals
  add('divider');
  add('total');
  add('currencyRate', [mkNum('A', 'currencyRate')]);

  // Quote tracking
  add('sectionTitle', [], { title: 'Quote Tracking', section: 'quote' });
  add('single', [mkNum('C', 'firstQuoted')], { label: 'First Quoted', prefix: '$' });
  add('single', [mkNum('C', 'targetPrice')], { label: 'Target $', prefix: '$' });
  add('single', [], { label: 'Difference', prefix: '$', computed: 'difference' });
  add('single', [mkNum('C', 'secondQuote')], { label: '2nd Quote $', prefix: '$' });
  add('single', [mkNum('C', 'confirmedPrice')], { label: 'Confirmed', prefix: '$' });

  rows.forEach((r) => {
    r.cells.forEach((c) => {
      c.coord = c.col + r.row;
      c.row = r.row;
    });
  });

  return rows;
}

/**
 * Resolve the whole costing sheet:
 *  - assigns Excel coordinates to every cell
 *  - evaluates every formula (following dependencies, with cycle protection)
 *  - exposes a numeric "resolvedData" snapshot usable by calcAll() / printing
 *  - provides helpers for Enter-key navigation ("next editable cell below")
 */
export function resolveCosting(d = {}) {
  const rows = buildCostingRows(d);
  const extraCols = d.extraCols || [];

  const byCoord = new Map();       // "C7" -> cell descriptor
  const fieldCoord = new Map();    // `${section}:${idx}:${field}` -> "C7"
  const keyCoord = new Map();      // "cmtLevel" -> "C17"
  const singleRowsByKey = new Map(); // "fob" -> row object
  const secRows = {};              // section -> { title, header, add, items[] , showCode }

  rows.forEach((r) => {
    if (r.type === 'sectionTitle') {
      secRows[r.section] = secRows[r.section] || {};
      secRows[r.section].title = r.row;
    } else if (r.type === 'sectionHeader') {
      secRows[r.section] = secRows[r.section] || {};
      secRows[r.section].header = r.row;
      secRows[r.section].showCode = r.showCode;
    } else if (r.type === 'addRow') {
      secRows[r.section] = secRows[r.section] || {};
      secRows[r.section].add = r.row;
    } else if (r.type === 'item') {
      secRows[r.section] = secRows[r.section] || {};
      secRows[r.section].items = secRows[r.section].items || [];
      secRows[r.section].items.push({ row: r.row, idx: r.idx });
    } else if (r.type === 'single') {
      const num = r.cells.find(c => c.kind === 'num');
      if (num) singleRowsByKey.set(num.key, r.row);
    }

    r.cells.forEach((c) => {
      byCoord.set(c.coord, c);
      if (c.kind === 'item') fieldCoord.set(`${c.section}:${c.idx}:${c.field}`, c.coord);
      if (c.kind === 'num' || c.kind === 'level') keyCoord.set(c.key, c.coord);
    });
  });

  // Immediate row below in the same column — the "press Enter" target.
  const nextEditableBelow = (coord) => {
    const m = /^([A-Z]+)(\d+)$/.exec(coord || '');
    if (!m) return null;
    const below = m[1] + (Number(m[2]) + 1);
    const c = byCoord.get(below);
    if (!c) return null;
    const editable = c.kind === 'item' || c.kind === 'num' || c.kind === 'level' || c.kind === 'extra' || (c.kind === 'field' && !c.select);
    return editable ? below : null;
  };

  const rawAt = (coord) => {
    const c = byCoord.get(coord);
    if (!c) return '';
    if (c.kind === 'item') {
      const row = d[c.section]?.[c.idx];
      if (!row) return 0;
      if (c.field === 'amount') {
        // Editable Amount: a manual value (number or formula) overrides the
        // default Cons×Rate; an empty manual value falls back to the formula.
        const manual = row.amountManual;
        if (manual !== undefined && manual !== null && String(manual).trim() !== '') return manual;
        return c.defaultFormula || `=C${c.row}*D${c.row}`;
      }
      return row[c.field] ?? 0;
    }
    if (c.kind === 'extra') return d[c.section]?.[c.idx]?.extra?.[c.extraId] ?? '';
    if (c.kind === 'level') return d[c.key] ?? '';
    if (c.kind === 'num') return d[c.key] ?? 0;
    if (c.kind === 'field') return d[c.key] ?? '';
    return 0;
  };

  const valueByCoord = new Map();
  const errByCoord = new Set();

  const compute = (coord, stack) => {
    if (valueByCoord.has(coord)) return valueByCoord.get(coord);
    const c = byCoord.get(coord);
    if (!c) return 0;
    if (stack && stack.has(coord)) {
      errByCoord.add(coord);
      return 0;
    }
    const raw = rawAt(coord);
    if (raw == null || raw === '') return 0;
    if (!isFormula(raw)) {
      const x = Number(raw);
      return Number.isFinite(x) ? x : 0;
    }
    const ns = stack ? new Set(stack) : new Set();
    ns.add(coord);
    const result = evaluateFormula(raw, {
      rowIndex: c.row,
      getCell: (colKey, rowNumber) => compute(String(colKey).toUpperCase() + rowNumber, ns),
    });
    if (!Number.isFinite(result)) {
      errByCoord.add(coord);
      valueByCoord.set(coord, 0);
      return 0;
    }
    valueByCoord.set(coord, result);
    return result;
  };

  byCoord.forEach((_c, coord) => compute(coord, null));

  const valueAt = (coord) =>
    valueByCoord.has(coord) ? valueByCoord.get(coord) : n(rawAt(coord));

  const isErr = (coord) => errByCoord.has(coord);

  const sectionResolved = (section) =>
    (d[section] || []).map((row, idx) => ({
      ...row,
      amount: valueAt(fieldCoord.get(`${section}:${idx}:amount`)),
      consumption: valueAt(fieldCoord.get(`${section}:${idx}:consumption`)),
      price: valueAt(fieldCoord.get(`${section}:${idx}:price`)),
    }));

  const scalar = (key) => valueAt(keyCoord.get(key));

  const sectionTotal = (section) =>
    sectionResolved(section).reduce((s, r) => s + n(r.amount ?? 0), 0);

  const itemCount = {};
  for (const sec of SECTIONS) {
    const key = sec[0];
    itemCount[key] = (secRows[key]?.items || []).length;
  }
  const isLastItem = (section, idx) =>
    itemCount[section] != null && (itemCount[section] - 1) === idx;

  const resolvedData = {
    fabrics: sectionResolved('fabrics'),
    beforeWashTrims: sectionResolved('beforeWashTrims'),
    afterWashTrims: sectionResolved('afterWashTrims'),
    embellishment: sectionResolved('embellishment'),
    cmtLevel: scalar('cmtLevel'),
    washingLevel: scalar('washingLevel'),
    cmtLevelCode: d.cmtLevelCode ?? '',
    washingLevelCode: d.washingLevelCode ?? '',
    fob: scalar('fob'),
    extraCut: scalar('extraCut'),
    ldMargin: scalar('ldMargin'),
    testingCharges: scalar('testingCharges'),
    commission: scalar('commission'),
    currencyRate: scalar('currencyRate') || 265,
    firstQuoted: scalar('firstQuoted'),
    targetPrice: scalar('targetPrice'),
  };

  return {
    rows,
    byCoord,
    fieldCoord,
    keyCoord,
    secRows,
    singleRowsByKey,
    extraCols,
    nextEditableBelow,
    rawAt,
    valueAt,
    isErr,
    isLastItem,
    sectionTotal,
    resolvedData,
    coord: (section, idx, field) => fieldCoord.get(`${section}:${idx}:${field}`),
    itemCount,
  };
}