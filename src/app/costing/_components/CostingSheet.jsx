'use client';

import { useState, useCallback, useMemo, Fragment } from 'react';
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, Send, Printer, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/use-toast';
import { useSession } from 'next-auth/react';
import FabricCodeSelect from './FabricCodeSelect';
import ImageUpload from './ImageUpload';
import { resolveCosting, isFormula } from '@/lib/costingGrid';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n = (v) => Number(v) || 0;
const fmt2 = (v) =>
  n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function calcAll(d) {
  const sumRows = (rows) => (rows || []).reduce((s, r) => s + n(r.amount ?? r.consumption * r.price), 0);
  const totalFabrics = sumRows(d.fabrics);
  const totalBeforeWash = sumRows(d.beforeWashTrims);
  const totalAfterWash = sumRows(d.afterWashTrims);
  const totalEmbellishment = sumRows(d.embellishment);

  const subtotal = totalFabrics + totalBeforeWash + totalAfterWash + totalEmbellishment;
  const totalWithProduction = subtotal + n(d.cmtLevel) + n(d.washingLevel) + n(d.fob);
  const totalWithFreight = totalWithProduction + n(d.freight);
  const marginAmount = totalWithFreight * (n(d.marginPct) / 100);
  const totalWithMargin = totalWithFreight + marginAmount;
  const totalWithExtra = totalWithMargin + n(d.extraCut) + n(d.ldMargin) + n(d.testingCharges) + n(d.commission);

  const totalPricePkr = totalWithExtra;
  const currencyRate = n(d.currencyRate) || 265;
  const finalFobUs = totalPricePkr / currencyRate;

  // Quote tracking
  const difference = n(d.firstQuoted) - n(d.targetPrice);

  return {
    totalFabrics,
    totalBeforeWash,
    totalAfterWash,
    totalEmbellishment,
    subtotal,
    totalWithProduction,
    totalWithFreight,
    marginAmount,
    totalWithMargin,
    totalPricePkr,
    finalFobUs,
    difference,
  };
}

const STATUS_META = {
  draft:     { label: 'Draft',     bg: 'bg-gray-100 text-gray-500',   Icon: Clock },
  submitted: { label: 'Submitted', bg: 'bg-blue-50 text-blue-600',    Icon: Send },
  approved:  { label: 'Approved',  bg: 'bg-green-50 text-green-600',  Icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  bg: 'bg-red-50 text-red-500',      Icon: AlertCircle },
};

// ─── Shared row-number gutter ─────────────────────────────────────────────────

function GutterCell({ row, className = '', active = false }) {
  return (
    <td className={`gutter-cell ${active ? 'gutter-cell-active' : ''} ${className}`}>
      <span>{row?.row ?? ''}</span>
    </td>
  );
}

// ─── Editable grid cell (number OR Excel-style formula) ───────────────────────

function GridNum({ coord, raw, resolved, err, active, disabled, onChange, onFocus, onEnter, placeholder = '0', className = '' }) {
  const isF = isFormula(raw);
  let display;
  if (active) display = raw == null ? '' : String(raw);
  else if (isF) display = err ? '#ERR!' : fmt2(resolved);
  else display = raw == null || raw === '' || raw === 0 || raw === '0' ? '' : String(raw);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {active && (
        <span className="absolute -top-2 right-1 z-10 px-1.5 py-px rounded font-mono text-[9px] font-bold text-white bg-blue-500 shadow pointer-events-none select-none">
          {coord}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={e => onChange(e.target.value)}
        onFocus={() => onFocus(coord)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter(coord); } }}
        disabled={disabled}
        data-cell={coord}
        title={`Cell ${coord}`}
        placeholder={placeholder}
        className={`w-full h-full text-right text-xs bg-transparent outline-none transition-colors px-2 py-1.5 disabled:cursor-default ${active ? 'bg-blue-50 ring-2 ring-blue-500' : 'focus:bg-blue-50'}`}
      />
    </div>
  );
}

// ─── Header field component ───────────────────────────────────────────────────

function HeaderField({ label, value, onChange, disabled, type = 'text', coord, focused, onFocus, onEnter, children }) {
  return (
    <div className="relative flex items-center gap-1.5 px-3 py-2">
      {focused && coord && (
        <span className="absolute -top-2 left-2 z-10 px-1.5 py-px rounded font-mono text-[9px] font-bold text-white bg-blue-500 shadow pointer-events-none select-none">
          {coord}
        </span>
      )}
      <span className="text-[10px] font-semibold text-gray-400 uppercase shrink-0">{label}</span>
      {children || (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          data-cell={coord}
          title={coord ? `Cell ${coord}` : undefined}
          onFocus={coord ? () => onFocus(coord) : undefined}
          onKeyDown={coord && onEnter ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(coord); } } : undefined}
          className={`flex-1 text-xs bg-transparent outline-none text-gray-800 rounded px-1.5 py-1 min-w-0 ${focused ? 'bg-blue-50 ring-2 ring-blue-500' : 'focus:bg-gray-50'}`}
        />
      )}
    </div>
  );
}

// ─── Select field ─────────────────────────────────────────────────────────────

function SelectField({ value, onChange, disabled, options }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="flex-1 text-xs bg-transparent outline-none text-gray-800 focus:bg-gray-50 rounded px-0.5 min-w-0 border border-gray-200 py-0.5"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ─── User-added dropdown column header (with rename / options / delete) ──────

function ExtraColHeader({ col, canEdit, isCtrl, active, onRename, onSetOptions, onRemove }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(col?.name || '');
  const [opts, setOpts] = useState((col?.options || []).join('\n'));

  const apply = () => {
    onRename(col.id, name.trim() || 'Column');
    onSetOptions(col.id, opts.split('\n').map(s => s.trim()).filter(Boolean));
    setOpen(false);
  };

  return (
    <th className={`border-l border-gray-200 ${active ? 'bg-blue-50' : ''}`}>
      <div className="relative flex items-center justify-between gap-1 px-2 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 truncate" title={col?.name}>
          {col?.name || 'Column'}
        </span>
        {isCtrl && canEdit && (
          <button
            onClick={() => { setOpen(o => !o); setName(col?.name || ''); setOpts((col?.options || []).join('\n')); }}
            className={`shrink-0 ${open ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
            title="Column settings (name, options, delete)"
          >
            <Settings2 size={10} />
          </button>
        )}
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 w-60 rounded-lg border border-gray-200 bg-white shadow-lg p-3 space-y-2 print:hidden">
            <div>
              <div className="text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Column name</div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <div className="text-[9px] font-semibold text-gray-400 uppercase mb-0.5">Dropdown options (one per line)</div>
              <textarea
                value={opts}
                onChange={e => setOpts(e.target.value)}
                rows={4}
                placeholder={'ECRU\nBLUE RIGID\nRED'}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-400 resize-none"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => { onRemove(col.id); setOpen(false); }}
                className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700"
              >
                <Trash2 size={10} /> Delete column
              </button>
              <button
                onClick={apply}
                className="text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded px-2.5 py-1"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </th>
  );
}

const HEADER_LABELS = {
  date: 'Date', brand: 'Brand', fitSpecsCode: 'Fit Code',
  fit: 'Fit', description: 'Description', fabricType: 'Fabric Type',
  embellishmentYesNo: 'Embellishment', costingBase: 'Costing Base', sampleSize: 'Sample Size',
};

// Column letter for a user-added dropdown column (same scheme as costingGrid).
const extraColLetter = (i) => {
  let n = 6 + i + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function CostingSheet({ type, costData, srd, srdId, pocNumber, onSave, saving }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const isAdmin = ['admin', 'vmd'].includes(session?.user?.role);
  const label = type === 'pre' ? 'Pre-Costing' : 'Post-Costing';
  const fromSrd = type === 'post';

  // ── Local state ──────────────────────────────────────────────────────────────

  const [d, setD] = useState(() => ({
    currency: 'USD',
    // Header fields
    date: '', brand: '', fitSpecsCode: '', fit: '', description: '',
    fabricType: '', embellishmentYesNo: 'No', costingBase: 'Image', sampleSize: '',
    // Legacy fields
    buyer: '', style: '', fabric: '', wash: '',
    // Sections
    fabrics: [], beforeWashTrims: [], afterWashTrims: [], embellishment: [],
    // Production cost
    cmtLevel: 0, washingLevel: 0, fob: 0,
    // Freight
    freight: 0,
    // Margin & Commission
    marginPct: 0, extraCut: 0, ldMargin: 0, testingCharges: 0, commission: 0,
    // Summary
    totalPricePkr: 0, finalFobUs: 0, currencyRate: 265,
    // Quote tracking
    firstQuoted: 0, targetPrice: 0, difference: 0, secondQuote: 0, confirmedPrice: 0,
    // Images
    images: [],
    // User-added dropdown columns (see extraCols schema)
    extraCols: [],
    // Workflow
    notes: '', status: 'draft',
    ...costData,
  }));
  const [isDirty, setIsDirty] = useState(false);

  const [focusedCell, setFocusedCell] = useState(null); // cell whose input is focused
  const [selectedCell, setSelectedCell] = useState(null); // cell shown in the formula bar

  // Sync when costData prop changes
  const [lastCostData, setLastCostData] = useState(costData);
  if (costData !== lastCostData) {
    setLastCostData(costData);
    setD(prev => ({ ...prev, ...costData }));
    setIsDirty(false);
  }

  const status   = d.status || 'draft';
  const canEdit  = isAdmin && ['draft', 'rejected'].includes(status);
  const sm       = STATUS_META[status] || STATUS_META.draft;
  const StatusIcon = sm.Icon;

  // Active cell (input focus or formula-bar target) — drives row/column highlight.
  const focusCoord = focusedCell || selectedCell;
  const activeRow  = focusCoord ? focusCoord.replace(/[A-Z]/g, '') : null;
  const activeCol  = focusCoord ? focusCoord[0] : null;
  const isActiveRow = (row) => String(row?.row) === activeRow;

  // ── Grid model + formula evaluation ──────────────────────────────────────────
  const machine  = useMemo(() => resolveCosting(d), [d]);
  const totals   = useMemo(() => calcAll(machine.resolvedData), [machine]);

  // User-added dropdown columns
  const extraCols = machine.extraCols || [];
  const nExtra    = extraCols.length;
  const SPAN      = 6 + nExtra; // base columns A..F plus the extra columns

  // ── Updaters ─────────────────────────────────────────────────────────────────

  const set = useCallback((key, val) => {
    setD(prev => ({ ...prev, [key]: val }));
    setIsDirty(true);
  }, []);

  const updateRow = useCallback((section, idx, updated) => {
    setD(prev => {
      const rows = [...(prev[section] || [])];
      rows[idx] = updated;
      return { ...prev, [section]: rows };
    });
    setIsDirty(true);
  }, []);

  const removeRow = useCallback((section, idx) => {
    setD(prev => ({ ...prev, [section]: (prev[section] || []).filter((_, i) => i !== idx) }));
    setIsDirty(true);
  }, []);

  const addRow = useCallback((section) => {
    setD(prev => ({
      ...prev,
      [section]: [...(prev[section] || []),
        { description: '', code: '', consumption: 0, price: 0, amount: 0, amountManual: '', extra: {} }],
    }));
    setIsDirty(true);
  }, []);

  const focusCell = useCallback((coord) => {
    setFocusedCell(coord);
    setSelectedCell(coord);
  }, []);

  const onChangeRowField = useCallback((section, idx, field, value) => {
    const row = d[section]?.[idx];
    if (!row) return;
    updateRow(section, idx, { ...row, [field]: value });
  }, [d, updateRow]);

  // ── User-added dropdown columns ─────────────────────────────────────────────

  const handleAddExtraCol = useCallback(() => {
    set('extraCols', [...(d.extraCols || []), {
      id: `dc_${Date.now().toString(36)}_${(d.extraCols || []).length}`,
      name: `Column ${(d.extraCols || []).length + 1}`,
      options: [],
    }]);
  }, [d.extraCols, set]);

  const mutateExtraCol = useCallback((id, patch) => {
    setD(prev => ({
      ...prev,
      extraCols: (prev.extraCols || []).map(c => c.id === id ? { ...c, ...patch } : c),
    }));
    setIsDirty(true);
  }, []);

  const handleRemoveExtraCol = useCallback((id) => {
    setD(prev => ({
      ...prev,
      extraCols: (prev.extraCols || []).filter(c => c.id !== id),
    }));
    setIsDirty(true);
  }, []);

  const setRowExtra = useCallback((section, idx, extraId, value) => {
    const row = d[section]?.[idx];
    if (!row) return;
    const nextExtra = { ...(row.extra || {}), [extraId]: value };
    updateRow(section, idx, { ...row, extra: nextExtra });
  }, [d, updateRow]);

  // Update any cell from its Excel coordinate (used by the formula bar).
  const updateCellByCoord = useCallback((coord, value) => {
    if (!coord || !canEdit) return;
    const def = machine.byCoord.get(coord);
    if (!def) return;
    if (def.kind === 'item') {
      const row = d[def.section]?.[def.idx];
      if (!row) return;
      if (def.field === 'amount') {
        updateRow(def.section, def.idx, { ...row, amountManual: value });
        return;
      }
      updateRow(def.section, def.idx, { ...row, [def.field]: value });
    } else if (def.kind === 'extra') {
      setRowExtra(def.section, def.idx, def.extraId, value);
    } else if (def.kind === 'num' || def.kind === 'field') {
      set(def.key, value);
    }
  }, [machine, canEdit, d, updateRow, set, setRowExtra]);

  // Enter key: move to the field directly below; if we are on the last field of a
  // costed section, add a new row there and jump into it (spreadsheet-style).
  const handleCellEnter = useCallback((coord) => {
    if (!coord) return;
    const next = machine.nextEditableBelow(coord);
    if (next) {
      requestAnimationFrame(() => document.querySelector(`[data-cell="${next}"]`)?.focus());
      return;
    }
    const def = machine.byCoord.get(coord);
    if (def && def.kind === 'item' && def.section && canEdit && machine.isLastItem(def.section, def.idx)) {
      const items = machine.secRows[def.section]?.items || [];
      const newRow = (items.length ? items[items.length - 1].row : 0) + 1;
      setD(prev => ({
        ...prev,
        [def.section]: [...(prev[def.section] || []), { description: '', code: '', consumption: 0, price: 0, amount: 0 }],
      }));
      setIsDirty(true);
      setTimeout(() => document.querySelector(`[data-cell="${def.col + newRow}"]`)?.focus(), 0);
    }
  }, [machine, canEdit]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const result = await onSave(type, 'save', d, session?.user?.name || session?.user?.email);
    if (result?.success) { toast({ title: `${label} saved` }); setIsDirty(false); }
    else toast({ title: 'Save failed', description: result?.error, variant: 'destructive' });
    return result;
  };

  const handleSubmit = async () => {
    const r = await handleSave();
    if (!r?.success) return;
    const result = await onSave(type, 'submit', {}, session?.user?.name || session?.user?.email);
    if (result?.success) toast({ title: `${label} submitted for approval` });
  };

  const handleApprove = async () => {
    const result = await onSave(type, 'approve', {}, session?.user?.name || session?.user?.email);
    if (result?.success) toast({ title: `${label} approved` });
  };

  const handleReject = async () => {
    const result = await onSave(type, 'reject', {}, session?.user?.name || session?.user?.email);
    if (result?.success) toast({ title: `${label} rejected`, variant: 'destructive' });
  };

  const handlePrint = () => {
    const id = srdId || srd?._id;
    if (!id) return;
    const url = `/costing/print?srdId=${id}&type=${type}`;
    window.open(url, '_blank');
  };

  // ── Row renderers (driven by the shared grid model, so row numbers in the
  //    gutter always match the cell references used in formulas) ────────────────

  const cell = (row) => (col) => row.cells.find(c => c.col === col);

  const renderHeadTitle = (r) => (
    <tr className="border-b border-gray-200 bg-gray-50">
      <GutterCell row={r} active={isActiveRow(r)} />
      <th colSpan={SPAN} className="py-2 px-4 text-left text-xs font-semibold text-gray-700 tracking-wide">
        <div className="flex items-center justify-between">
          <span>
            {pocNumber
              ? <span className="font-mono font-bold text-blue-700 mr-2">POC-{pocNumber}</span>
              : srd?.refNo
                ? <span className="font-mono text-gray-500 mr-2">{srd.refNo}</span>
                : null}
            <span className="text-gray-700">Costing Form</span>
          </span>
          <select
            value={d.currency}
            onChange={e => set('currency', e.target.value)}
            disabled={!canEdit}
            className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 bg-white"
          >
            {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'PKR'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </th>
    </tr>
  );

  const renderHeadField = (c) => {
    if (c.select) {
      const opts = c.key === 'embellishmentYesNo'
        ? [{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]
        : [{ value: 'Image', label: 'Image' }, { value: 'CAD', label: 'CAD' }];
      return (
        <HeaderField key={c.coord} label={HEADER_LABELS[c.key]} disabled={!canEdit}>
          <SelectField value={d[c.key]} onChange={v => set(c.key, v)} disabled={!canEdit} options={opts} />
        </HeaderField>
      );
    }
    return (
      <HeaderField
        key={c.coord}
        label={HEADER_LABELS[c.key]}
        value={d[c.key]}
        onChange={v => set(c.key, v)}
        disabled={!canEdit}
        coord={c.coord}
        focused={focusedCell === c.coord}
        onFocus={focusCell}
        onEnter={handleCellEnter}
      />
    );
  };

  const renderHeadRow = (r) => (
    <tr className="border-b border-gray-200 bg-white">
      <GutterCell row={r} active={isActiveRow(r)} />
      <td colSpan={SPAN} className="p-0">
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          {r.cells.map(renderHeadField)}
        </div>
      </td>
    </tr>
  );

  const renderSectionTitle = (r) => {
    const total = machine.sectionTotal(r.section);
    return (
      <tr className="bg-gray-50 border-y border-gray-200">
        <GutterCell row={r} active={isActiveRow(r)} />
        <td colSpan={SPAN} className="py-1.5 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{r.title}</span>
              {fromSrd && (
                <span className="text-[10px] text-blue-400 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                  from SRD
                </span>
              )}
            </div>
            {total > 0 && (
              <span className="text-[11px] font-semibold text-gray-600">{fmt2(total)}</span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderSectionHeader = (r) => (
    <tr className="bg-gray-100/50 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
      <GutterCell row={r} active={isActiveRow(r)} />
      <th className={`py-1.5 px-3 text-left ${activeCol === 'A' ? 'bg-blue-50 text-blue-700' : ''}`}>Description</th>
      <th className={`py-1.5 px-2 text-left border-l border-gray-200 ${r.showCode && activeCol === 'B' ? 'bg-blue-50 text-blue-700' : ''}`}>{r.showCode ? 'Code' : ''}</th>
      <th className={`py-1.5 px-2 text-right border-l border-gray-200 ${activeCol === 'C' ? 'bg-blue-50 text-blue-700' : ''}`}>Cons</th>
      <th className={`py-1.5 px-2 text-right border-l border-gray-200 ${activeCol === 'D' ? 'bg-blue-50 text-blue-700' : ''}`}>Rate</th>
      <th className={`py-1.5 px-2 text-right border-l border-gray-200 ${activeCol === 'E' ? 'bg-blue-50 text-blue-700' : ''}`}>Amount</th>
      {extraCols.map((ec, i) => (
        <ExtraColHeader
          key={ec.id}
          col={ec}
          canEdit={canEdit}
          isCtrl={r.section === 'fabrics'}
          active={activeCol === extraColLetter(i)}
          onRename={(id, name) => mutateExtraCol(id, { name })}
          onSetOptions={(id, options) => mutateExtraCol(id, { options })}
          onRemove={handleRemoveExtraCol}
        />
      ))}
      {r.section === 'fabrics' && canEdit && (
        <th className="w-14 border-l border-gray-200 print:hidden">
          <button
            onClick={handleAddExtraCol}
            className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-blue-500 transition-colors px-1 py-1.5"
            title="Add a dropdown column"
          >
            <Plus size={10} /> Col
          </button>
        </th>
      )}
      <th className="w-6" />
    </tr>
  );

  const renderItem = (r) => {
    const row = d[r.section]?.[r.idx] || {};
    const cDesc = cell(r)('A');
    const cCons = cell(r)('C');
    const cRate = cell(r)('D');
    const cAmt  = cell(r)('E');
    const descLocked = fromSrd;
    const amt = machine.valueAt(cAmt.coord);
    const amtErr = machine.isErr(cAmt.coord);
    const amtRaw = (row.amountManual !== undefined && String(row.amountManual ?? '').trim() !== '')
      ? row.amountManual
      : `=C${r.row}*D${r.row}`;

    return (
      <tr className="border-b border-gray-100 group hover:bg-gray-50/60">
        <GutterCell row={r} active={isActiveRow(r)} />
        {/* Description */}
        <td className="py-0.5 pl-6 pr-1 border-r border-gray-100">
          {canEdit && !descLocked ? (
            <input
              value={row.description || ''}
              onChange={e => onChangeRowField(r.section, r.idx, 'description', e.target.value)}
              onFocus={() => focusCell(cDesc.coord)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCellEnter(cDesc.coord); } }}
              disabled={!canEdit}
              data-cell={cDesc.coord}
              title={`Cell ${cDesc.coord}`}
              placeholder="Item name"
              className="w-full text-xs bg-transparent outline-none transition-colors px-1.5 py-1.5 focus:bg-blue-50"
            />
          ) : (
            <span className="text-xs text-gray-700 px-1.5 py-1.5 block">{row.description}</span>
          )}
        </td>
        {/* Code (fabrics only; other sections keep the column for alignment) */}
        <td className="border-r border-gray-100">
          {r.showCode ? (
            <FabricCodeSelect
              value={row.code || ''}
              onChange={code => onChangeRowField(r.section, r.idx, 'code', code)}
              disabled={!canEdit}
              placeholder="Code"
            />
          ) : null}
        </td>
        {/* Cons */}
        <td className="border-r border-gray-100">
          <GridNum
            coord={cCons.coord}
            raw={row.consumption}
            resolved={machine.valueAt(cCons.coord)}
            err={machine.isErr(cCons.coord)}
            active={focusedCell === cCons.coord}
            disabled={!canEdit || descLocked}
            onChange={v => onChangeRowField(r.section, r.idx, 'consumption', v)}
            onFocus={focusCell}
            onEnter={handleCellEnter}
          />
        </td>
        {/* Rate */}
        <td className="border-r border-gray-100">
          <GridNum
            coord={cRate.coord}
            raw={row.price}
            resolved={machine.valueAt(cRate.coord)}
            err={machine.isErr(cRate.coord)}
            active={focusedCell === cRate.coord}
            disabled={!canEdit}
            onChange={v => onChangeRowField(r.section, r.idx, 'price', v)}
            onFocus={focusCell}
            onEnter={handleCellEnter}
          />
        </td>
        {/* Amount (auto Cons×Rate, or editable manual value / formula) */}
        <td className="border-r border-gray-100">
          <GridNum
            coord={cAmt.coord}
            raw={amtRaw}
            resolved={amt}
            err={amtErr}
            active={focusedCell === cAmt.coord}
            disabled={!canEdit}
            onChange={v => onChangeRowField(r.section, r.idx, 'amountManual', v)}
            onFocus={focusCell}
            onEnter={handleCellEnter}
          />
        </td>
        {/* User-added dropdown columns */}
        {extraCols.map((ec, i) => (
          <td key={ec.id} className="border-r border-gray-100">
            <select
              value={row.extra?.[ec.id] ?? ''}
              onChange={e => setRowExtra(r.section, r.idx, ec.id, e.target.value)}
              onFocus={() => focusCell(extraColLetter(i) + r.row)}
              data-cell={`${extraColLetter(i)}${r.row}`}
              disabled={!canEdit}
              title={`Cell ${extraColLetter(i)}${r.row}`}
              className={`w-full text-xs bg-transparent outline-none px-1 py-1.5 ${row.extra?.[ec.id] ? 'text-gray-800' : 'text-gray-400'} focus:bg-blue-50`}
            >
              <option value="">—</option>
              {(ec.options || []).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </td>
        ))}
        {/* Remove */}
        <td className="w-6 pr-1">
          {canEdit && !descLocked && (
            <button
              onClick={() => removeRow(r.section, r.idx)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex items-center justify-center w-full py-1"
            >
              <Trash2 size={10} />
            </button>
          )}
        </td>
      </tr>
    );
  };

  const renderAddRow = (r) => (
    <tr className="border-b border-gray-100">
      <GutterCell row={r} active={isActiveRow(r)} />
      <td colSpan={SPAN} className="py-1 pl-6">
        {canEdit && (
          <button
            onClick={() => addRow(r.section)}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors py-0.5"
          >
            <Plus size={10} /> {fromSrd ? 'add extra row' : 'add row'}
          </button>
        )}
      </td>
    </tr>
  );

  const renderSingle = (r) => {
    const numCell = r.cells[0];
    const coord = numCell ? numCell.coord : null;
    return (
      <tr className="border-b border-gray-100 hover:bg-gray-50/60">
        <GutterCell row={r} active={isActiveRow(r)} />
        <td className="py-1 px-3">
          <span className="text-xs text-gray-700 py-1 block">{r.label}</span>
        </td>
        <td colSpan={2} className="border-l border-gray-100" />
        <td className="border-l border-gray-100">
          {r.computed ? (
            <span className="text-xs px-2 py-1 block text-right font-semibold text-gray-900">
              {r.prefix}{fmt2(totals.difference)}
            </span>
          ) : (
            <GridNum
              coord={coord}
              raw={d[r.key]}
              resolved={machine.valueAt(coord)}
              err={machine.isErr(coord)}
              active={focusedCell === coord}
              disabled={!canEdit}
              onChange={v => set(r.key, v)}
              onFocus={focusCell}
              onEnter={handleCellEnter}
            />
          )}
        </td>
        <td className="border-l border-gray-100" />
        {extraCols.map(ec => <td key={ec.id} className="border-l border-gray-100" />)}
        <td className="w-6" />
      </tr>
    );
  };

  const renderBodyRow = (r) => {
    switch (r.type) {
      case 'sectionTitle': return renderSectionTitle(r);
      case 'sectionHeader': return renderSectionHeader(r);
      case 'item': return renderItem(r);
      case 'addRow': return renderAddRow(r);
      case 'single': return renderSingle(r);
      case 'divider':
        return <tr key={r.row}><GutterCell row={r} active={isActiveRow(r)} /><td colSpan={SPAN} className="py-0 border-t-2 border-gray-200" /></tr>;
      case 'total':
        return (
          <tr key={r.row} className="bg-gray-900 text-white border-b border-gray-200">
            <GutterCell row={r} className="!bg-gray-900 !border-gray-800 text-gray-500" />
            <td colSpan={3} className="py-2.5 px-3 text-xs font-bold uppercase tracking-wide">Total Price PKR</td>
            <td className="text-right font-bold text-xs px-2 py-2.5">{fmt2(totals.totalPricePkr)}</td>
            <td colSpan={1 + nExtra} />
            <td className="w-6" />
          </tr>
        );
      case 'currencyRate': {
        const coord = cell(r)('A').coord;
        return (
          <tr key={r.row} className="border-b border-gray-200 bg-gray-50">
            <GutterCell row={r} active={isActiveRow(r)} />
            <td className="py-1.5 px-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase">Currency Rate (PKR/USD)</span>
                <GridNum
                  coord={coord}
                  raw={d.currencyRate}
                  resolved={machine.valueAt(coord)}
                  err={machine.isErr(coord)}
                  active={focusedCell === coord}
                  disabled={!canEdit}
                  onChange={v => set('currencyRate', v)}
                  onFocus={focusCell}
                  onEnter={handleCellEnter}
                  className="!w-16"
                />
              </div>
            </td>
            <td colSpan={2} className="border-l border-gray-200" />
            <td className="border-l border-gray-200 text-right text-xs px-2 py-1">
              <span className="font-semibold text-gray-900">Final FOB US$</span>
            </td>
            <td className="text-right text-xs font-bold text-gray-900 px-2 py-1">
              ${fmt2(totals.finalFobUs)}
            </td>
            {extraCols.map(ec => <td key={ec.id} className="border-l border-gray-200" />)}
            <td className="w-6" />
          </tr>
        );
      }
      default: return null;
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const headTitleRow = machine.rows[0];
  const headRows = machine.rows.filter(r => r.type === 'head');
  const bodyRows = machine.rows.filter(r => r.type !== 'head' && r.type !== 'headTitle');

  return (
    <div className="space-y-3">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">Costing Form</h2>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${sm.bg}`}>
            <StatusIcon size={10} />{sm.label}
          </span>
          {isDirty && <span className="text-[11px] text-amber-500 font-medium">● unsaved</span>}
        </div>
      </div>

      {/* Submission metadata */}
      {d.submittedBy && (
        <p className="text-[11px] text-gray-400">
          Submitted by <strong className="text-gray-600">{d.submittedBy}</strong>
          {d.submittedAt && ` · ${new Date(d.submittedAt).toLocaleDateString()}`}
          {d.approvedBy && (
            <> · Approved by <strong className="text-gray-600">{d.approvedBy}</strong>
              {d.approvedAt && ` · ${new Date(d.approvedAt).toLocaleDateString()}`}
            </>
          )}
        </p>
      )}

      {/* ── Formula bar (Excel-style) ── */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm print:hidden">
        <span className="font-mono font-bold text-blue-700 text-xs min-w-[3.5rem] text-center border-r border-gray-200 pr-2">
          {selectedCell || '—'}
        </span>
        <span className="text-[10px] font-semibold text-emerald-600 shrink-0" title="Formula">fx</span>
        <input
          value={selectedCell ? String(machine.rawAt(selectedCell) ?? '') : ''}
          onChange={e => updateCellByCoord(selectedCell, e.target.value)}
          onFocus={e => e.target.select()}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (selectedCell) handleCellEnter(selectedCell);
              e.target.blur();
            } else if (e.key === 'Escape') {
              e.target.blur();
            }
          }}
          disabled={!canEdit}
          placeholder="Type a value or formula — e.g. =SUM(C7:C12) or =C7*2"
          className="flex-1 text-xs bg-transparent outline-none rounded px-1.5 py-1 min-w-0 focus:bg-blue-50"
        />
      </div>

      {/* ── Main table ── */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>

          {/* ── Column widths ── */}
          <colgroup>
            <col style={{ width: 34 }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            {extraCols.map(ec => <col key={ec.id} style={{ width: 120 }} />)}
            <col style={{ width: '26px' }} />
          </colgroup>

          {/* ── Table header ── */}
          <thead>
            {renderHeadTitle(headTitleRow)}
            {headRows.map(r => <Fragment key={r.row}>{renderHeadRow(r)}</Fragment>)}
          </thead>

          <tbody>
            {bodyRows.map(r => <Fragment key={r.row}>{renderBodyRow(r)}</Fragment>)}
          </tbody>
        </table>
      </div>

      {/* ── Images Section ── */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
        <div className="bg-gray-50 border-b border-gray-200 py-1 px-3">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Product Photos</span>
        </div>
        <div className="p-3">
          <ImageUpload
            images={d.images || []}
            onChange={fn => {
              setD(prev => ({ ...prev, images: typeof fn === 'function' ? fn(prev.images || []) : fn }));
              setIsDirty(true);
            }}
            disabled={!canEdit}
          />
        </div>
      </div>

      {/* ── Notes ── */}
      <Textarea
        value={d.notes}
        onChange={e => set('notes', e.target.value)}
        disabled={!canEdit}
        placeholder="Notes or assumptions…"
        rows={2}
        className="text-xs resize-none border-gray-200 print:hidden"
      />

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {isAdmin && canEdit && (
          <Button onClick={handleSave} disabled={saving || !isDirty} size="sm" variant="outline"
            className="h-7 text-xs px-3">
            {saving ? 'Saving…' : 'Save Draft'}
          </Button>
        )}
        {isAdmin && canEdit && status === 'draft' && (
          <Button onClick={handleSubmit} disabled={saving} size="sm"
            className="h-7 text-xs px-3 bg-gray-900 hover:bg-gray-800 text-white">
            Submit for Approval
          </Button>
        )}
        {isAdmin && status === 'submitted' && (
          <>
            <Button onClick={handleApprove} disabled={saving} size="sm"
              className="h-7 text-xs px-3 bg-green-600 hover:bg-green-700 text-white">
              Approve
            </Button>
            <Button onClick={handleReject} disabled={saving} size="sm" variant="destructive"
              className="h-7 text-xs px-3">
              Reject
            </Button>
          </>
        )}
        <Button onClick={handlePrint} size="sm" variant="outline"
          className="h-7 text-xs px-3">
          <Printer size={12} className="mr-1" /> Print A4
        </Button>
      </div>
    </div>
  );
}