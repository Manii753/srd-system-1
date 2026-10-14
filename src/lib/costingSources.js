// Costing ➜ SRD field mapping.
//
// Everything here is pure (no DB) so the settings page, the raise-SR endpoint
// and the auto-detect heuristics all share exactly one definition of
// "what on the costing sheet can go where on an SR".
//
// The user can configure the connection explicitly (Costing → Field Mapping);
// this file defines both sides of that connection:
//
//   sources  — every value on a costing sheet that can be pushed into an SRD
//   fields   — the active SRD `Field` definitions (loaded from Mongo)
//   mapping  — { [sourceKey]: fieldId }  ← what the user has saved

// ─── The costing side ────────────────────────────────────────────────────────

export const COSTING_SOURCES = [
  // Header
  { key: 'date',               group: 'Header', label: 'Date',                kind: 'scalar' },
  { key: 'brand',              group: 'Header', label: 'Brand',               kind: 'scalar' },
  { key: 'fitSpecsCode',       group: 'Header', label: 'Fit Specs Code',      kind: 'scalar' },
  { key: 'fit',                group: 'Header', label: 'Fit',                 kind: 'scalar' },
  { key: 'description',        group: 'Header', label: 'Description',         kind: 'scalar' },
  { key: 'fabricType',         group: 'Header', label: 'Fabric Type',         kind: 'scalar' },
  { key: 'embellishmentYesNo', group: 'Header', label: 'Embellishment (Y/N)', kind: 'scalar' },
  { key: 'costingBase',        group: 'Header', label: 'Costing Base',        kind: 'scalar' },
  { key: 'sampleSize',         group: 'Header', label: 'Sample Size',         kind: 'scalar' },
  { key: 'notes',              group: 'Header', label: 'Notes',               kind: 'scalar' },

  // Item sections (become SRD table fields)
  { key: 'fabrics',         group: 'Item sections', label: 'Fabrics',            kind: 'table' },
  { key: 'beforeWashTrims', group: 'Item sections', label: 'Before Wash Trims', kind: 'table' },
  { key: 'afterWashTrims',  group: 'Item sections', label: 'After Wash Trims',  kind: 'table' },
  { key: 'embellishment',   group: 'Item sections', label: 'Embellishment',     kind: 'table' },

  // Production cost & margin
  { key: 'cmtLevel',      group: 'Cost', label: 'CMT',             kind: 'scalar' },
  { key: 'washingLevel',  group: 'Cost', label: 'Washing',         kind: 'scalar' },
  { key: 'fob',           group: 'Cost', label: 'FOB',             kind: 'scalar' },
  { key: 'extraCut',      group: 'Cost', label: 'Extra Cut',       kind: 'scalar' },
  { key: 'ldMargin',      group: 'Cost', label: 'Ld Margin',       kind: 'scalar' },
  { key: 'testingCharges',group: 'Cost', label: 'Testing Charges', kind: 'scalar' },
  { key: 'commission',    group: 'Cost', label: 'Commission %',    kind: 'scalar' },
  { key: 'totalPricePkr', group: 'Cost', label: 'Total Price PKR', kind: 'scalar' },
  { key: 'finalFobUs',    group: 'Cost', label: 'Final FOB US$',   kind: 'scalar' },
  { key: 'currencyRate',  group: 'Cost', label: 'Currency Rate',   kind: 'scalar' },

  // Quote tracking
  { key: 'firstQuoted',    group: 'Quote tracking', label: 'First Quoted', kind: 'scalar' },
  { key: 'targetPrice',    group: 'Quote tracking', label: 'Target $',     kind: 'scalar' },
  { key: 'secondQuote',    group: 'Quote tracking', label: '2nd Quote $',  kind: 'scalar' },
  { key: 'confirmedPrice', group: 'Quote tracking', label: 'Confirmed',    kind: 'scalar' },
];

export const SOURCE_BY_KEY = Object.fromEntries(COSTING_SOURCES.map(s => [s.key, s]));
export const SOURCE_GROUPS = [...new Set(COSTING_SOURCES.map(s => s.group))];

/** SRD field types that can receive a value (headings / uploads are not mappable). */
export const MAPPABLE_FIELD_TYPES = new Set([
  'text', 'number', 'date', 'boolean', 'textarea', 'select-dynamic', 'table',
  'createdAt', 'refNo', 'old-refNo',
]);

// Which costing column does an SRD table header correspond to?
//
// `aliases` are matched against the WHOLE normalised header name — never as a
// substring. Substring matching used to mis-assign columns: "Fabric Type"
// contains "fabric" (a description alias) and "Required Qty" contains "qty"
// (a consumption alias), so the item name landed in Fabric Type and Required
// Qty just duplicated Consumption. A header that isn't listed here is left
// alone rather than filled with a plausible-looking wrong value.
const ROW_COLUMNS = [
  { field: 'description', label: 'Item Name',   aliases: ['itemname', 'item', 'items', 'itemdescription', 'description', 'fabric', 'fabrics', 'fabricname', 'trim', 'trims', 'material', 'materialname', 'name', 'product', 'productname', 'garment', 'garmentname'] },
  { field: 'code',        label: 'Code',        aliases: ['code', 'codes', 'fabriccode', 'itemcode', 'trimcode', 'stylecode', 'style'] },
  { field: 'levels',      label: 'Levels',      aliases: ['level', 'levels'] },
  { field: 'consumption', label: 'Consumption', aliases: ['consumption', 'consumptionqty', 'consump', 'cons', 'qty', 'quantity', 'requirement', 'requirementqty', 'requiredqty', 'reqqty', 'requiredquantity'] },
  { field: 'price',       label: 'Rate',        aliases: ['rate', 'rates', 'price', 'unitrate', 'unitprice', 'unitcost', 'cost', 'rateperunit'] },
  { field: 'amount',      label: 'Amount',      aliases: ['amount', 'amt', 'total', 'totalamount', 'totalcost', 'value'] },
];

// ─── Scalar helpers ──────────────────────────────────────────────────────────

const norm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Flatten any costing cell value into text an SRD input can hold. */
export function cellText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 10000) / 10000) : '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return '';           // skip image/file payloads
  return String(v).trim();
}

/** True when a cell carries real information (blank and numeric zero don't count). */
const hasValue = (v) => {
  const t = cellText(v);
  return t !== '' && t !== '0';
};

/** Best-effort conversion of a free-text date into the YYYY-MM-DD an SRD date input wants. */
export function toDateInput(value) {
  const text = cellText(value);

  // A date-only string is parsed by `new Date()` as UTC midnight, so reading it
  // back with getDate() slips a day in every UTC-negative timezone. Match it as
  // plain calendar digits first and only fall back to Date for anything richer.
  const ymd = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return value;
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${mm}-${dd}`;
}

function matchColumn(headerName) {
  const n = norm(headerName);
  if (!n) return null;
  return ROW_COLUMNS.find(c => c.aliases.includes(n))?.field ?? null;
}

const columnHasData = (rows, col) =>
  rows.some(r => hasValue(col.startsWith('extra:') ? r?.extra?.[col.slice(6)] : r?.[col]));

const rowHasData = (r, extraCols) =>
  ROW_COLUMNS.some(c => hasValue(r?.[c.field])) ||
  extraCols.some(ec => hasValue(r?.extra?.[ec.id]));

// ─── Reading a costing source ────────────────────────────────────────────────

/**
 * Read one source off the costing sheet.
 * `resolved` is `resolveCosting(side).resolvedData` (formula cells → numbers).
 */
export function readSource(side, resolved, key) {
  const def = SOURCE_BY_KEY[key];
  if (!def) return null;

  if (def.kind === 'table') {
    const extraCols = Array.isArray(side?.extraCols) ? side.extraCols : [];
    const rows = (resolved?.[key] || []).filter(r => rowHasData(r, extraCols));
    return { kind: 'table', rows, extraCols, text: '' };
  }

  return { kind: 'scalar', rows: [], extraCols: [], text: cellText(side?.[key]) };
}

/**
 * Turn costing item rows into an SRD table value
 * ({ headers, rows, predefinedData }).
 *
 * The target field's configured column order wins. Two rules keep the result
 * honest:
 *  - a costing column feeds at most one SR header (so "Consumption" claims the
 *    quantity and "Required Qty" is left blank instead of mirroring it);
 *  - costing columns the SR table has no header for are dropped, not appended —
 *    Rate/Amount are costing concepts and must not leak into an SR form.
 */
export function buildTableValue(read, fieldDef) {
  const meaningful = read?.rows || [];
  if (!meaningful.length) return null;

  const headers = [];
  const columns = [];
  const taken = new Set();
  const push = (header, col) => {
    headers.push(typeof header === 'string' ? { name: header, owner: 'global' } : { owner: 'global', ...header });
    columns.push(col);
    if (col) taken.add(col);
  };

  const configured = Array.isArray(fieldDef?.tableHeaders) ? fieldDef.tableHeaders : [];

  if (configured.length) {
    configured.forEach(h => {
      const name = typeof h === 'string' ? h : (h?.name || '');
      if (!name) return;
      let col = matchColumn(name);
      if (col && taken.has(col)) col = null;  // already fed by an earlier header
      push(h, col);                           // keep the SR column, just leave it empty
    });
  } else {
    // No configured layout on the SR field — fall back to the costing columns.
    ROW_COLUMNS.forEach(c => {
      if (!columnHasData(meaningful, c.field)) return;
      push(c.label, c.field);
    });
    (read.extraCols || []).forEach(ec => {
      if (!ec?.id) return;
      const col = `extra:${ec.id}`;
      if (!columnHasData(meaningful, col)) return;
      push(ec.name || 'Column', col);
    });
  }

  if (!headers.length) return null;

  const outRows = meaningful.map(r =>
    columns.map(col => cellText(col?.startsWith('extra:') ? r?.extra?.[col.slice(6)] : r?.[col]))
  );

  // Mirror the SRD editor default: wash/trim tables default to "instock".
  const inStockByDefault = /(?:before|after)?\s*wash|trim/i.test(fieldDef?.name || fieldDef?.slug || '');
  const purchaseType = inStockByDefault ? 'instock' : 'purchase';

  return {
    headers,
    rows: outRows,
    predefinedData: outRows.map(() => ({ purchaseType, opd: '', etd: '' })),
  };
}

// ─── Applying a mapping ──────────────────────────────────────────────────────

/** Shape a `Field` definition into the `dynamicFields` entry the SRD expects. */
export function buildDynamicField(fieldDef, value) {
  const parentHeading = fieldDef.parentHeading
    ? (typeof fieldDef.parentHeading === 'object' ? fieldDef.parentHeading.name : fieldDef.parentHeading)
    : undefined;

  return {
    field: String(fieldDef._id),
    originalFieldId: String(fieldDef._id),
    name: fieldDef.name,
    slug: fieldDef.slug,
    type: fieldDef.type,
    department: fieldDef.department || 'global',
    value,
    isRequired: !!fieldDef.isRequired,
    requirementLevel: fieldDef.requirementLevel || (fieldDef.isRequired ? 'required' : 'none'),
    isOptional: !!fieldDef.isOptional,
    isOptionalEnabled: true,
    placeholder: fieldDef.placeholder || '',
    order: fieldDef.order || 0,
    parentHeading,
    fieldVersion: new Date(),
  };
}

/**
 * Turn a saved `{ [sourceKey]: fieldId }` mapping into concrete SRD field
 * entries. Each SRD field receives at most one value; a source is dropped when
 * the target field is missing, incompatible or ends up empty.
 */
export function applyMapping({ side, resolved, fields, mapping }) {
  const byId = new Map((fields || []).map(f => [String(f._id), f]));
  const seenFields = new Set();
  const items = [];

  COSTING_SOURCES.forEach(source => {
    const fieldId = mapping?.[source.key];
    if (!fieldId) return;

    const fieldDef = byId.get(String(fieldId));
    if (!fieldDef) return;                                   // field was deleted
    if (seenFields.has(String(fieldDef._id))) return;         // one value per SR field
    if (!MAPPABLE_FIELD_TYPES.has(fieldDef.type)) return;
    if (source.kind === 'table' && fieldDef.type !== 'table') return;
    if (source.kind === 'scalar' && fieldDef.type === 'table') return;

    const read = readSource(side, resolved, source.key);
    if (!read) return;

    let value;
    if (source.kind === 'table') {
      value = buildTableValue(read, fieldDef);
    } else {
      if (!read.text) return;                                // nothing to push
      value = fieldDef.type === 'date' ? toDateInput(read.text) : read.text;
    }
    if (value === null || value === undefined) return;

    seenFields.add(String(fieldDef._id));
    items.push({
      key: source.key,
      group: source.group,
      label: source.label,
      target: `${fieldDef.name} · ${fieldDef.department || 'global'}`,
      type: fieldDef.type,
      rows: read.rows.length,
      preview: source.kind === 'table'
        ? (read.rows[0] ? `${cellText(read.rows[0].description) || '—'}${read.rows.length > 1 ? ` +${read.rows.length - 1} more` : ''}` : '')
        : read.text,
      field: buildDynamicField(fieldDef, value),
    });
  });

  return items;
}

// ─── Auto-detect (used to seed the editor) ───────────────────────────────────

// Name/slug patterns used to guess a sensible default connection.
const AUTO_PATTERNS = {
  date:               [/^sample\s*(r(aise|equest)|request(ed)?)\s*date$/i, /^(request|raise)\s*date$/i, /^date$/i],
  brand:              [/^brand$/i, /^buyer$/i],
  fitSpecsCode:       [/^fit\s*specs?\s*(code|no\.?|ref(erence)?)?$/i, /^buyer\s*style\s*ref(erence)?\.?$/i, /^style\s*(no\.?|code|ref(erence)?)$/i],
  fit:                [/^fit$/i],
  description:        [/^garment\s*description$/i, /^product\s*description$/i, /^description$/i],
  fabricType:         [/^fabric\s*type$/i],
  embellishmentYesNo: [/^embellish(ment)?$/i],
  costingBase:        [/^costing\s*base$/i],
  sampleSize:         [/^sample\s*request\s*size$/i, /^sample\s*size$/i, /^size$/i],
  notes:              [/^(notes?|remarks?|comments?)$/i],
  fabrics:            [/^fabric$/i, /^fabrics$/i],
  beforeWashTrims:    [/^before\s*wash\s*trim$/i, /^before\s*wash\s*trims$/i, /before.wash.trim/i],
  afterWashTrims:     [/^after\s*wash\s*trim$/i, /^after\s*wash\s*trims$/i, /after.wash.trim/i],
  embellishment:      [/^embellish/i],
  commission:         [/^commission$/i],
  testingCharges:     [/^testing\s*charges?$/i],
  currencyRate:       [/^(currency\s*)?rate$/i, /^currency\s*rate$/i],
  totalPricePkr:      [/^total\s*(price|cost)$/i],
  finalFobUs:         [/^final\s*fob/i, /^fob\s*us\$?$/i],
  firstQuoted:        [/^first\s*quoted$/i],
  targetPrice:        [/^target/i],
  secondQuote:        [/^(2nd|second)\s*quote/i],
  confirmedPrice:     [/^confirmed/i],
};

/**
 * Guess a `{ [sourceKey]: fieldId }` mapping from field names — only used to
 * pre-fill the editor the first time, or when the user hits "Auto-detect".
 */
export function autoDetectMapping(fields) {
  const mapping = {};
  const used = new Set();
  const pool = (fields || []).filter(f => f.active !== false && MAPPABLE_FIELD_TYPES.has(f.type));

  COSTING_SOURCES.forEach(source => {
    const patterns = AUTO_PATTERNS[source.key];
    if (!patterns) return;

    const hit = pool.find(f => {
      const name = String(f.name || '').trim();
      return !used.has(String(f._id)) &&
        (source.kind === 'table' ? f.type === 'table' : f.type !== 'table') &&
        patterns.some(p => p.test(name) || p.test(String(f.slug || '').trim()))
    });

    if (hit) {
      used.add(String(hit._id));
      mapping[source.key] = String(hit._id);
    }
  });

  return mapping;
}