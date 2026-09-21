// Shared Excel-style grid model + formula resolver for the Pre/Post costing sheet.
//
// The sheet is treated like a spreadsheet:
//   - every data column has a letter (A=Description, B=Code, C=Cons, D=Rate,
//     E=Amount, F=remove) and every visible row has a number.
//   - cells may hold either a number or an Excel-style formula string
//     ("=C7*2", "=SUM(C7:C12)", "=B6/2", "=C{row}*D{row}").
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
  ['beforeWashTrims', 'Before Wash Trims', false],
  ['afterWashTrims', 'After Wash Trims', false],
  ['embellishment', 'Embellishment', false],
];

const mkField = (col, key, isSelect = false) => ({ col, kind: 'field', key, select: isSelect });
const mkItem = (col, section, idx, field) => ({ col, kind: 'item', section, idx, field });
const mkNum = (col, key) => ({ col, kind: 'num', key });
const mkExtra = (col, section, idx, extraId) => ({ col, kind: 'extra', section, idx, extraId });

// Excel-style column letters: 0->A … 25->Z, 26->AA … (extras start at 'G').
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
      const cells = [mkItem('A', key, idx, 'description')];
      if (showCode) cells.push(mkItem('B', key, idx, 'code'));
      cells.push(mkItem('C', key, idx, 'consumption'));
      cells.push(mkItem('D', key, idx, 'price'));
      cells.push(mkItem('E', key, idx, 'amount'));
      extraCols.forEach((ec, i) => cells.push(mkExtra(colLetter(6 + i), key, idx, ec.id)));
      add('item', cells, { section: key, idx, showCode });
    });
    add('addRow', [], { section: key });
  }

  // Production cost
  add('sectionTitle', [], { title: 'Production Cost', section: 'production' });
  add('single', [mkNum('D', 'cmtLevel')], { label: 'CMT (Codes Req Level 1 2 3)' });
  add('single', [mkNum('D', 'washingLevel')], { label: 'Washing (Codes Req Level 1 2 3)' });
  add('single', [mkNum('D', 'fob')], { label: 'FOB' });

  // Freight
  add('sectionTitle', [], { title: 'Freight', section: 'freight' });
  add('single', [mkNum('D', 'freight')], { label: 'Freight' });

  // Margin & commission
  add('sectionTitle', [], { title: 'Margin & Commission', section: 'margin' });
  add('single', [mkNum('D', 'marginPct')], { label: 'Percentage %' });
  add('single', [mkNum('D', 'extraCut')], { label: 'Extra Cut' });
  add('single', [mkNum('D', 'ldMargin')], { label: 'Ld Margin' });
  add('single', [mkNum('D', 'testingCharges')], { label: 'Testing Charges' });
  add('single', [mkNum('D', 'commission')], { label: 'Commission' });

  // Divider + totals
  add('divider');
  add('total');
  add('currencyRate', [mkNum('A', 'currencyRate')]);

  // Quote tracking
  add('sectionTitle', [], { title: 'Quote Tracking', section: 'quote' });
  add('single', [mkNum('D', 'firstQuoted')], { label: 'First Quoted', prefix: '$' });
  add('single', [mkNum('D', 'targetPrice')], { label: 'Target $', prefix: '$' });
  add('single', [], { label: 'Difference', prefix: '$', computed: 'difference' });
  add('single', [mkNum('D', 'secondQuote')], { label: '2nd Quote $', prefix: '$' });
  add('single', [mkNum('D', 'confirmedPrice')], { label: 'Confirmed', prefix: '$' });

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
  const extraCols = rows[0].extraCols || [];

  const byCoord = new Map();       // "C7" -> cell descriptor
  const fieldCoord = new Map();    // `${section}:${idx}:${field}` -> "C7"
  const keyCoord = new Map();      // "cmtLevel" -> "D17"
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
      if (r.cells[0] && r.cells[0].kind === 'num') singleRowsByKey.set(r.cells[0].key, r.row);
    }

    r.cells.forEach((c) => {
      byCoord.set(c.coord, c);
      if (c.kind === 'item') fieldCoord.set(`${c.section}:${c.idx}:${c.field}`, c.coord);
      if (c.kind === 'num') keyCoord.set(c.key, c.coord);
    });
  });

  // Immediate row below in the same column — the "press Enter" target.
  const nextEditableBelow = (coord) => {
    const m = /^([A-Z]+)(\d+)$/.exec(coord || '');
    if (!m) return null;
    const below = m[1] + (Number(m[2]) + 1);
    const c = byCoord.get(below);
    if (!c) return null;
    const editable = c.kind === 'item' || c.kind === 'num' || c.kind === 'extra' || (c.kind === 'field' && !c.select);
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
        return `=C${c.row}*D${c.row}`;
      }
      return row[c.field] ?? 0;
    }
    if (c.kind === 'extra') return d[c.section]?.[c.idx]?.extra?.[c.extraId] ?? '';
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
    fob: scalar('fob'),
    freight: scalar('freight'),
    marginPct: scalar('marginPct'),
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