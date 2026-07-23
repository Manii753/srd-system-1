'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, Send, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/use-toast';
import { useSession } from 'next-auth/react';
import FabricCodeSelect from './FabricCodeSelect';
import ImageUpload from './ImageUpload';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n = (v) => Number(v) || 0;
const fmt2 = (v) =>
  n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rowAmount(row) { return n(row.consumption) * n(row.price); }
function sectionSum(rows) { return (rows || []).reduce((s, r) => s + rowAmount(r), 0); }

function calcAll(d) {
  const totalFabrics = sectionSum(d.fabrics);
  const totalBeforeWash = sectionSum(d.beforeWashTrims);
  const totalAfterWash = sectionSum(d.afterWashTrims);
  const totalEmbellishment = sectionSum(d.embellishment);

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

// ─── Shared cell styles ───────────────────────────────────────────────────────

function NumCell({ value, onChange, disabled, placeholder = '0', className = '' }) {
  return (
    <input
      type="number"
      min="0"
      step="any"
      value={value === 0 || value === '0' ? '' : (value ?? '')}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full h-full text-right text-xs bg-transparent outline-none focus:bg-blue-50 transition-colors px-2 py-1 disabled:cursor-default ${className}`}
    />
  );
}

// ─── Header field component ───────────────────────────────────────────────────

function HeaderField({ label, value, onChange, disabled, type = 'text', children }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase shrink-0">{label}</span>
      {children || (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 text-xs bg-transparent outline-none text-gray-800 focus:bg-gray-50 rounded px-0.5 min-w-0"
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

// ─── Item row (section lines) ─────────────────────────────────────────────────

function ItemRow({ row, onChange, onRemove, canEdit, descriptionLocked, showCode }) {
  const amt = rowAmount(row);
  const canEditDesc   = canEdit && !descriptionLocked;
  const canEditConsump = canEdit && !descriptionLocked;
  const canEditPrice  = canEdit;

  return (
    <tr className="border-b border-gray-100 group hover:bg-gray-50/60">
      {/* Description */}
      <td className="py-0 pl-6 pr-1 border-r border-gray-100">
        {canEditDesc ? (
          <input
            value={row.description}
            onChange={e => onChange({ ...row, description: e.target.value })}
            placeholder="Item name"
            className="w-full text-xs bg-transparent outline-none focus:bg-blue-50 transition-colors px-1 py-1"
          />
        ) : (
          <span className="text-xs text-gray-700 px-1 py-1 block">{row.description}</span>
        )}
      </td>
      {/* Code (fabrics only) */}
      {showCode && (
        <td className="border-r border-gray-100">
          <FabricCodeSelect
            value={row.code || ''}
            onChange={code => onChange({ ...row, code })}
            disabled={!canEdit}
            placeholder="Code"
          />
        </td>
      )}
      {/* Consump */}
      <td className="border-r border-gray-100">
        <NumCell
          value={row.consumption}
          onChange={v => onChange({ ...row, consumption: v })}
          disabled={!canEditConsump}
        />
      </td>
      {/* Price */}
      <td className="border-r border-gray-100">
        <NumCell
          value={row.price}
          onChange={v => onChange({ ...row, price: v })}
          disabled={!canEditPrice}
        />
      </td>
      {/* Amount (read-only computed) */}
      <td className="text-right text-xs text-gray-800 px-2 py-1">
        {amt > 0 ? fmt2(amt) : <span className="text-gray-300">—</span>}
      </td>
      {/* Remove */}
      <td className="w-6 pr-1">
        {canEdit && !descriptionLocked && (
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex items-center justify-center w-full py-1"
          >
            <Trash2 size={10} />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────

function SectionBlock({ title, sectionKey, rows, onUpdateRow, onRemoveRow, onAddRow, canEdit, fromSrd, showCode }) {
  const total = sectionSum(rows);
  return (
    <>
      {/* Section title row */}
      <tr className="bg-gray-50 border-y border-gray-200">
        <td colSpan={showCode ? 6 : 5} className="py-1 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{title}</span>
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

      {/* Column headers for this section */}
      <tr className="bg-gray-100/50 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        <th className="py-1 px-3 text-left">Description</th>
        {showCode && <th className="py-1 px-2 text-left border-l border-gray-200">Code</th>}
        <th className="py-1 px-2 text-right border-l border-gray-200">Cons</th>
        <th className="py-1 px-2 text-right border-l border-gray-200">Rate</th>
        <th className="py-1 px-2 text-right border-l border-gray-200">Amount</th>
        <th className="w-6" />
      </tr>

      {/* Rows */}
      {rows.map((row, idx) => (
        <ItemRow
          key={idx}
          row={row}
          canEdit={canEdit}
          descriptionLocked={fromSrd}
          showCode={showCode}
          onChange={updated => onUpdateRow(sectionKey, idx, updated)}
          onRemove={() => onRemoveRow(sectionKey, idx)}
        />
      ))}

      {/* Add row */}
      {canEdit && (
        <tr className="border-b border-gray-100">
          <td colSpan={showCode ? 6 : 5} className="py-0.5 pl-6">
            <button
              onClick={() => onAddRow(sectionKey)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors py-0.5"
            >
              <Plus size={10} /> {fromSrd ? 'add extra row' : 'add row'}
            </button>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────

function SummaryRow({ label, value, onChange, canEdit, editable, bold, highlight, prefix }) {
  return (
    <tr className={`border-b border-gray-200 ${highlight ? 'bg-gray-50' : 'bg-white'}`}>
      <td colSpan={3} className={`py-1 px-3 text-xs uppercase tracking-wide ${bold ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
        {label}
      </td>
      <td className={`text-right text-xs px-2 py-1 ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
        {editable && canEdit ? (
          <NumCell value={value} onChange={onChange} disabled={false} />
        ) : (
          <span>{prefix}{fmt2(value)}</span>
        )}
      </td>
      <td className="w-6" />
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CostingSheet({ type, costData, srd, pocNumber, onSave, saving }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const isAdmin = ['admin', 'vmd'].includes(session?.user?.role);
  const label = type === 'pre' ? 'Pre-Costing' : 'Post-Costing';

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
    // Workflow
    notes: '', status: 'draft',
    ...costData,
  }));
  const [isDirty, setIsDirty] = useState(false);

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
  const totals   = useMemo(() => calcAll(d), [d]);

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
      [section]: [...(prev[section] || []), { description: '', code: '', consumption: 0, price: 0, amount: 0 }],
    }));
    setIsDirty(true);
  }, []);

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

  const handlePrint = () => window.print();

  // ── Render ───────────────────────────────────────────────────────────────────

  const colCount = 6; // Description, Code, Cons, Rate, Amount, Remove

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

      {/* ── Main table ── */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
        <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>

          {/* ── Column widths ── */}
          <colgroup>
            <col style={{ width: '35%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '24px' }} />
          </colgroup>

          {/* ── Table header ── */}
          <thead>
            {/* SRD ref + label row */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <th colSpan={4} className="py-2 px-3 text-left text-xs font-semibold text-gray-700 tracking-wide">
                {pocNumber
                  ? <span className="font-mono font-bold text-blue-700 mr-2">POC-{pocNumber}</span>
                  : srd?.refNo
                    ? <span className="font-mono text-gray-500 mr-2">{srd.refNo}</span>
                    : null}
                <span className="text-gray-700">Costing Form</span>
              </th>
              <th colSpan={2} className="py-2 px-3 text-right">
                <select
                  value={d.currency}
                  onChange={e => set('currency', e.target.value)}
                  disabled={!canEdit}
                  className="border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-600 bg-white"
                >
                  {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'PKR'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </th>
            </tr>

            {/* Row 1: Costing date | Brand | Fit Specs Code */}
            <tr className="border-b border-gray-200 bg-white">
              <td colSpan={colCount} className="p-0">
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <HeaderField label="Date" value={d.date} onChange={v => set('date', v)} disabled={!canEdit} />
                  <HeaderField label="Brand" value={d.brand} onChange={v => set('brand', v)} disabled={!canEdit} />
                  <HeaderField label="Fit Code" value={d.fitSpecsCode} onChange={v => set('fitSpecsCode', v)} disabled={!canEdit} />
                </div>
              </td>
            </tr>

            {/* Row 2: Fit | Description | Fabric Type */}
            <tr className="border-b border-gray-200 bg-white">
              <td colSpan={colCount} className="p-0">
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <HeaderField label="Fit" value={d.fit} onChange={v => set('fit', v)} disabled={!canEdit} />
                  <HeaderField label="Description" value={d.description} onChange={v => set('description', v)} disabled={!canEdit} />
                  <HeaderField label="Fabric Type" value={d.fabricType} onChange={v => set('fabricType', v)} disabled={!canEdit} />
                </div>
              </td>
            </tr>

            {/* Row 3: Embellishment | Costing Base | Sample Size */}
            <tr className="border-b border-gray-200 bg-white">
              <td colSpan={colCount} className="p-0">
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <HeaderField label="Embellishment" disabled={!canEdit}>
                    <SelectField
                      value={d.embellishmentYesNo}
                      onChange={v => set('embellishmentYesNo', v)}
                      disabled={!canEdit}
                      options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
                    />
                  </HeaderField>
                  <HeaderField label="Costing Base" disabled={!canEdit}>
                    <SelectField
                      value={d.costingBase}
                      onChange={v => set('costingBase', v)}
                      disabled={!canEdit}
                      options={[{ value: 'Image', label: 'Image' }, { value: 'CAD', label: 'CAD' }]}
                    />
                  </HeaderField>
                  <HeaderField label="Sample Size" value={d.sampleSize} onChange={v => set('sampleSize', v)} disabled={!canEdit} />
                </div>
              </td>
            </tr>
          </thead>

          <tbody>
            {/* ── FABRICS ── */}
            <SectionBlock
              title="Fabrics" sectionKey="fabrics"
              rows={d.fabrics} canEdit={canEdit}
              fromSrd={type === 'post'}
              showCode={true}
              onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow}
            />

            {/* ── BEFORE WASH TRIMS ── */}
            <SectionBlock
              title="Before Wash Trims" sectionKey="beforeWashTrims"
              rows={d.beforeWashTrims} canEdit={canEdit}
              fromSrd={type === 'post'}
              showCode={false}
              onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow}
            />

            {/* ── AFTER WASH TRIMS ── */}
            <SectionBlock
              title="After Wash Trims" sectionKey="afterWashTrims"
              rows={d.afterWashTrims} canEdit={canEdit}
              fromSrd={type === 'post'}
              showCode={false}
              onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow}
            />

            {/* ── EMBELLISHMENT ── */}
            <SectionBlock
              title="Embellishment" sectionKey="embellishment"
              rows={d.embellishment} canEdit={canEdit}
              fromSrd={type === 'post'}
              showCode={false}
              onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow}
            />

            {/* ── PRODUCTION COST ── */}
            <tr className="bg-gray-50 border-y border-gray-200">
              <td colSpan={colCount} className="py-1 px-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Production Cost</span>
              </td>
            </tr>
            {[
              { label: 'CMT (Codes Req Level 1 2 3)', key: 'cmtLevel' },
              { label: 'Washing (Codes Req Level 1 2 3)', key: 'washingLevel' },
              { label: 'FOB', key: 'fob' },
            ].map(({ label: lbl, key }) => (
              <tr key={key} className="border-b border-gray-100 hover:bg-gray-50/60">
                <td className="py-0 px-3">
                  <span className="text-xs text-gray-700 py-1 block">{lbl}</span>
                </td>
                <td colSpan={2} className="border-l border-gray-100" />
                <td className="border-l border-gray-100">
                  <NumCell value={d[key]} onChange={v => set(key, v)} disabled={!canEdit} />
                </td>
                <td className="border-l border-gray-100" />
                <td className="w-6" />
              </tr>
            ))}

            {/* ── FREIGHT ── */}
            <tr className="bg-gray-50 border-y border-gray-200">
              <td colSpan={colCount} className="py-1 px-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Freight</span>
              </td>
            </tr>
            <tr className="border-b border-gray-100 hover:bg-gray-50/60">
              <td className="py-0 px-3">
                <span className="text-xs text-gray-700 py-1 block">Freight</span>
              </td>
              <td colSpan={2} className="border-l border-gray-100" />
              <td className="border-l border-gray-100">
                <NumCell value={d.freight} onChange={v => set('freight', v)} disabled={!canEdit} />
              </td>
              <td className="border-l border-gray-100" />
              <td className="w-6" />
            </tr>

            {/* ── MARGIN & COMMISSION ── */}
            <tr className="bg-gray-50 border-y border-gray-200">
              <td colSpan={colCount} className="py-1 px-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Margin & Commission</span>
              </td>
            </tr>
            {[
              { label: 'Percentage %', key: 'marginPct' },
              { label: 'Extra Cut', key: 'extraCut' },
              { label: 'Ld Margin', key: 'ldMargin' },
              { label: 'Testing Charges', key: 'testingCharges' },
              { label: 'Commission', key: 'commission' },
            ].map(({ label: lbl, key }) => (
              <tr key={key} className="border-b border-gray-100 hover:bg-gray-50/60">
                <td className="py-0 px-3">
                  <span className="text-xs text-gray-700 py-1 block">{lbl}</span>
                </td>
                <td colSpan={2} className="border-l border-gray-100" />
                <td className="border-l border-gray-100">
                  <NumCell value={d[key]} onChange={v => set(key, v)} disabled={!canEdit} />
                </td>
                <td className="border-l border-gray-100" />
                <td className="w-6" />
              </tr>
            ))}

            {/* ── DIVIDER ── */}
            <tr><td colSpan={colCount} className="py-0 border-t-2 border-gray-200" /></tr>

            {/* ── TOTAL PRICE PKR ── */}
            <tr className="bg-gray-900 text-white border-b border-gray-200">
              <td colSpan={3} className="py-2 px-3 text-xs font-bold uppercase tracking-wide">Total Price PKR</td>
              <td className="text-right font-bold text-xs px-2 py-2">{fmt2(totals.totalPricePkr)}</td>
              <td colSpan={2} />
            </tr>

            {/* Currency rate & Final FOB */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="py-1 px-3 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase">Currency Rate (PKR/USD)</span>
                  <NumCell
                    value={d.currencyRate}
                    onChange={v => set('currencyRate', v)}
                    disabled={!canEdit}
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
              <td className="w-6" />
            </tr>

            {/* ── QUOTE TRACKING ── */}
            <tr className="bg-gray-50 border-y border-gray-200">
              <td colSpan={colCount} className="py-1 px-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Quote Tracking</span>
              </td>
            </tr>
            {[
              { label: 'First Quoted', key: 'firstQuoted', prefix: '$' },
              { label: 'Target $', key: 'targetPrice', prefix: '$' },
              { label: 'Difference', key: 'difference', computed: true, prefix: '$' },
              { label: '2nd Quote $', key: 'secondQuote', prefix: '$' },
              { label: 'Confirmed', key: 'confirmedPrice', prefix: '$' },
            ].map(({ label: lbl, key, computed, prefix }) => (
              <tr key={key} className="border-b border-gray-100 hover:bg-gray-50/60">
                <td className="py-0 px-3">
                  <span className="text-xs text-gray-700 py-1 block">{lbl}</span>
                </td>
                <td colSpan={2} className="border-l border-gray-100" />
                <td className="border-l border-gray-100 text-right text-xs px-2 py-1 font-semibold text-gray-900">
                  {computed ? (
                    <span>{prefix}{fmt2(totals.difference)}</span>
                  ) : (
                    <NumCell value={d[key]} onChange={v => set(key, v)} disabled={!canEdit} />
                  )}
                </td>
                <td className="border-l border-gray-100" />
                <td className="w-6" />
              </tr>
            ))}
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
            onChange={images => {
              setD(prev => ({ ...prev, images }));
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
