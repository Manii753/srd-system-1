'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/lib/use-toast';
import { useSession } from 'next-auth/react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n = (v) => Number(v) || 0;
const fmt2 = (v) =>
  n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function rowAmount(row) { return n(row.consumption) * n(row.price); }
function sectionSum(rows) { return (rows || []).reduce((s, r) => s + rowAmount(r), 0); }

function calcAll(d) {
  const total =
    sectionSum(d.fabrics) +
    sectionSum(d.beforeWashTrims) +
    sectionSum(d.afterWashTrims) +
    sectionSum(d.packaging) +
    sectionSum(d.embellishment) +
    n(d.testingCharges) +
    n(d.patchesAttachment) +
    n(d.gussetAttachment) +
    n(d.badgesAttachments) +
    n(d.cmtCargo) +
    n(d.cmtsPocket) +
    n(d.oh) +
    n(d.washing) +
    n(d.extraCut) +
    n(d.fob);

  const linds       = n(d.linds) || 1;
  const finalFobUs  = (total + n(d.loMargin)) / linds;
  const totalCost   = finalFobUs * (1 + n(d.pchErrorPct) / 100);

  return { total, finalFobUs, totalCost };
}

const STATUS_META = {
  draft:     { label: 'Draft',     bg: 'bg-gray-100 text-gray-500',   Icon: Clock },
  submitted: { label: 'Submitted', bg: 'bg-blue-50 text-blue-600',    Icon: Send },
  approved:  { label: 'Approved',  bg: 'bg-green-50 text-green-600',  Icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  bg: 'bg-red-50 text-red-500',      Icon: AlertCircle },
};

// ─── Shared cell styles ───────────────────────────────────────────────────────

// Editable number input — right-aligned, no border, fills the cell
function NumCell({ value, onChange, disabled, placeholder = '0' }) {
  return (
    <input
      type="number"
      min="0"
      step="any"
      value={value === 0 || value === '0' ? '' : (value ?? '')}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full h-full text-right text-xs bg-transparent outline-none focus:bg-blue-50 transition-colors px-2 py-1 disabled:cursor-default"
    />
  );
}

// ─── Item row (section lines) ─────────────────────────────────────────────────

function ItemRow({ row, onChange, onRemove, canEdit, descriptionLocked }) {
  const amt = rowAmount(row);
  // For SRD-sourced rows: description & consumption are read-only, only price is editable
  const canEditDesc   = canEdit && !descriptionLocked;
  const canEditConsump = canEdit && !descriptionLocked;
  const canEditPrice  = canEdit; // always editable when canEdit

  return (
    <tr className="border-b border-gray-100 group hover:bg-gray-50/60">
      {/* Description */}
      <td className="py-0 pl-6 pr-1 border-r border-gray-100 w-[45%]">
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
      {/* Consump */}
      <td className="border-r border-gray-100 w-[16%]">
        <NumCell
          value={row.consumption}
          onChange={v => onChange({ ...row, consumption: v })}
          disabled={!canEditConsump}
        />
      </td>
      {/* Price — always editable when canEdit */}
      <td className="border-r border-gray-100 w-[16%]">
        <NumCell
          value={row.price}
          onChange={v => onChange({ ...row, price: v })}
          disabled={!canEditPrice}
        />
      </td>
      {/* Amount (read-only computed) */}
      <td className="w-[18%] text-right text-xs text-gray-800 px-2 py-1">
        {amt > 0 ? fmt2(amt) : <span className="text-gray-300">—</span>}
      </td>
      {/* Remove — only for non-locked rows */}
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

function SectionBlock({ title, sectionKey, rows, onUpdateRow, onRemoveRow, onAddRow, canEdit, fromSrd }) {
  const total = sectionSum(rows);
  return (
    <>
      {/* Section title row */}
      <tr className="bg-gray-50 border-y border-gray-200">
        <td className="py-1 px-3 w-[45%]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{title}</span>
            {fromSrd && (
              <span className="text-[10px] text-blue-400 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                from SRD
              </span>
            )}
          </div>
        </td>
        <td className="border-l border-gray-200 w-[16%]" />
        <td className="border-l border-gray-200 w-[16%]" />
        <td className="border-l border-gray-200 w-[18%] text-right px-2 py-1">
          {total > 0 && (
            <span className="text-[11px] font-semibold text-gray-600">{fmt2(total)}</span>
          )}
        </td>
        <td className="w-6" />
      </tr>

      {/* Rows */}
      {rows.map((row, idx) => (
        <ItemRow
          key={idx}
          row={row}
          canEdit={canEdit}
          descriptionLocked={fromSrd}   // SRD-sourced rows: description & consumption locked, price editable
          onChange={updated => onUpdateRow(sectionKey, idx, updated)}
          onRemove={() => onRemoveRow(sectionKey, idx)}
        />
      ))}

      {/* Add row — only allowed if not exclusively from SRD, or if canEdit */}
      {canEdit && !fromSrd && (
        <tr className="border-b border-gray-100">
          <td colSpan={5} className="py-0.5 pl-6">
            <button
              onClick={() => onAddRow(sectionKey)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors py-0.5"
            >
              <Plus size={10} /> add row
            </button>
          </td>
        </tr>
      )}
      {/* Allow adding extra rows even on SRD-synced sections */}
      {canEdit && fromSrd && (
        <tr className="border-b border-gray-100">
          <td colSpan={5} className="py-0.5 pl-6">
            <button
              onClick={() => onAddRow(sectionKey)}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors py-0.5"
            >
              <Plus size={10} /> add extra row
            </button>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Fixed charge row (single amount, no qty × price) ────────────────────────

function FixedRow({ label, value, onChange, canEdit }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/60">
      <td className="py-0 px-3 w-[45%]">
        <span className="text-xs text-gray-700 py-1 block">{label}</span>
      </td>
      {/* Consump — empty */}
      <td className="border-l border-gray-100 w-[18%]" />
      {/* Price — empty */}
      <td className="border-l border-gray-100 w-[18%]" />
      {/* Amount — editable */}
      <td className="border-l border-gray-100 w-[18%]">
        <NumCell value={value} onChange={onChange} disabled={!canEdit} />
      </td>
      <td className="w-6" />
    </tr>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────

function SummaryRow({ label, value, onChange, canEdit, editable, bold, highlight }) {
  return (
    <tr className={`border-b border-gray-200 ${highlight ? 'bg-gray-50' : 'bg-white'}`}>
      <td colSpan={3} className={`py-- px-3 text-xs uppercase tracking-wide ${bold ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
        {label}
      </td>
      <td className={`text-right text-xs px-2 py-0 ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
        {editable && canEdit ? (
          <NumCell value={value} onChange={onChange} disabled={false} />
        ) : (
          fmt2(value)
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
    date: '', buyer: '', style: '', fit: '', fabric: '', wash: '',
    fabrics: [], beforeWashTrims: [], afterWashTrims: [],
    packaging: [], embellishment: [],
    testingCharges: 0,
    patchesAttachment: 0, gussetAttachment: 0, badgesAttachments: 0,
    cmtCargo: 0, cmtsPocket: 0, oh: 0, washing: 0, extraCut: 0, fob: 0,
    loMargin: 0, priceIsPkr: 0, linds: 245, pchErrorPct: 0,
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
      [section]: [...(prev[section] || []), { description: '', consumption: 0, price: 0, amount: 0 }],
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

  // ── Render ───────────────────────────────────────────────────────────────────

  const FIXED_CHARGES = [
    { label: 'Patches Attachment', key: 'patchesAttachment' },
    { label: 'Gusset Attachment',  key: 'gussetAttachment' },
    { label: 'Badges Attachments', key: 'badgesAttachments' },
    { label: 'CMT Cargo',          key: 'cmtCargo' },
    { label: "CMT's Pocket",       key: 'cmtsPocket' },
    { label: 'OH',                 key: 'oh' },
    { label: 'Washing',            key: 'washing' },
    { label: 'Extra Cut',          key: 'extraCut' },
    { label: 'FOB',                key: 'fob' },
  ];

  return (
    <div className="space-y-3">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">{label}</h2>
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
            <col style={{ width: '45%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '24px' }} />
          </colgroup>

          {/* ── Table header ── */}
          <thead>
            {/* SRD ref + label row */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <th colSpan={3} className="py-2 px-3 text-left text-xs font-semibold text-gray-700 tracking-wide">
                {pocNumber
                  ? <span className="font-mono font-bold text-blue-700 mr-2">POC-{pocNumber}</span>
                  : srd?.refNo
                    ? <span className="font-mono text-gray-500 mr-2">{srd.refNo}</span>
                    : null}
                <span className="text-gray-700">{label}</span>
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

            {/* Meta fields — 2 rows × 3 cols, each cell label + value */}
            {[
              [{ label: 'Date', key: 'date' }, { label: 'Buyer', key: 'buyer' }, { label: 'Style', key: 'style' }],
              [{ label: 'Fit',  key: 'fit'  }, { label: 'Fabric', key: 'fabric' }, { label: 'Wash', key: 'wash' }],
            ].map((row, ri) => (
              <tr key={ri} className="border-b border-gray-200 bg-white">
                <td colSpan={5} className="p-0">
                  <div className="grid grid-cols-3 divide-x divide-gray-100">
                    {row.map(({ label: lbl, key }) => (
                      <div key={key} className="flex items-center gap-1.5 px-3 py-1.5">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase shrink-0 w-9">{lbl}</span>
                        {canEdit ? (
                          <input
                            value={d[key] || ''}
                            onChange={e => set(key, e.target.value)}
                            className="flex-1 text-xs bg-transparent outline-none text-gray-800 focus:bg-gray-50 rounded px-0.5 min-w-0"
                          />
                        ) : (
                          <span className="text-xs text-gray-700 truncate">{d[key] || <span className="text-gray-300">—</span>}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}

            {/* Column headers */}
            <tr className="bg-gray-100 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              <th className="py-1.5 px-3 text-left">Description</th>
              <th className="py-1.5 px-2 text-right border-l border-gray-200">Consump</th>
              <th className="py-1.5 px-2 text-right border-l border-gray-200">Price</th>
              <th className="py-1.5 px-2 text-right border-l border-gray-200">Amount</th>
              <th className="w-6" />
            </tr>
          </thead>

          <tbody>
            {/* ── FABRICS ── */}
            <SectionBlock
              title="Fabrics" sectionKey="fabrics"
              rows={d.fabrics} canEdit={canEdit}
              fromSrd={type === 'post'}
              onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow}
            />

            {/* ── BEFORE WASH TRIMS ── */}
            <SectionBlock
              title="Before Wash Trims" sectionKey="beforeWashTrims"
              rows={d.beforeWashTrims} canEdit={canEdit}
              fromSrd={type === 'post'}
              onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow}
            />

            {/* ── AFTER WASH TRIMS ── */}
            <SectionBlock
              title="After Wash Trims" sectionKey="afterWashTrims"
              rows={d.afterWashTrims} canEdit={canEdit}
              fromSrd={type === 'post'}
              onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow}
            />

            {/* ── PACKAGING ── */}
            <SectionBlock
              title="Packaging" sectionKey="packaging"
              rows={d.packaging} canEdit={canEdit}
              fromSrd={false}
              onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow}
            />

            {/* ── EMBELLISHMENT ── */}
            <SectionBlock
              title="Embellishment" sectionKey="embellishment"
              rows={d.embellishment} canEdit={canEdit}
              fromSrd={type === 'post'}
              onUpdateRow={updateRow} onRemoveRow={removeRow} onAddRow={addRow}
            />

            {/* ── TESTING CHARGES (single value) ── */}
            <tr className="bg-gray-50 border-y border-gray-200">
              <td className="py-1 px-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Testing Charges</span>
              </td>
              <td className="border-l border-gray-200" />
              <td className="border-l border-gray-200" />
              <td className="border-l border-gray-200">
                <NumCell value={d.testingCharges} onChange={v => set('testingCharges', v)} disabled={!canEdit} />
              </td>
              <td className="w-6" />
            </tr>

            {/* ── FIXED CHARGES ── */}
            <tr className="bg-gray-50 border-y border-gray-200">
              <td colSpan={5} className="py-1 px-3">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Charges</span>
              </td>
            </tr>
            {FIXED_CHARGES.map(({ label: lbl, key }) => (
              <FixedRow
                key={key}
                label={lbl}
                value={d[key]}
                onChange={v => set(key, v)}
                canEdit={canEdit}
              />
            ))}

            {/* ── DIVIDER ── */}
            <tr><td colSpan={5} className="py-0 border-t-2 border-gray-200" /></tr>

            {/* ── TOTAL ── */}
            <tr className="bg-gray-50 border-b border-gray-200">
              <td colSpan={3} className="py-2 px-3 text-xs font-bold text-gray-900 uppercase tracking-wide">Total</td>
              <td className="text-right font-bold text-xs text-gray-900 px-2 py-2">{fmt2(totals.total)}</td>
              <td />
            </tr>

            {/* ── SUMMARY ── */}
            <SummaryRow label="LO Margin"     value={d.loMargin}   onChange={v => set('loMargin', v)}   canEdit={canEdit} editable />
            <SummaryRow label="Price is PKR"  value={d.priceIsPkr} onChange={v => set('priceIsPkr', v)} canEdit={canEdit} editable />
            <SummaryRow label="Linds"         value={d.linds}      onChange={v => set('linds', v)}      canEdit={canEdit} editable />

            <tr className="border-b border-gray-200 bg-gray-50">
              <td colSpan={3} className="py-1.5 px-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Final FOB US$
              </td>
              <td className="text-right text-xs font-semibold text-gray-900 px-2 py-0">
                {fmt2(totals.finalFobUs)}
              </td>
              <td />
            </tr>

            <SummaryRow
              label={`P.CH + Error %`}
              value={d.pchErrorPct}
              onChange={v => set('pchErrorPct', v)}
              canEdit={canEdit}
              editable
            />

            {/* ── TOTAL COST ── */}
            <tr className="border-t-2 border-gray-300 bg-gray-900 text-white">
              <td colSpan={3} className="py-2.5 px-3 text-xs font-bold uppercase tracking-widest">
                Total Cost
              </td>
              <td className="text-right text-sm font-bold px-2 py-2.5">
                {d.currency} {fmt2(totals.totalCost)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Notes ── */}
      <Textarea
        value={d.notes}
        onChange={e => set('notes', e.target.value)}
        disabled={!canEdit}
        placeholder="Notes or assumptions…"
        rows={2}
        className="text-xs resize-none border-gray-200"
      />

      {/* ── Actions ── */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button onClick={handleSave} disabled={saving || !isDirty} size="sm" variant="outline"
              className="h-7 text-xs px-3">
              {saving ? 'Saving…' : 'Save Draft'}
            </Button>
          )}
          {canEdit && status === 'draft' && (
            <Button onClick={handleSubmit} disabled={saving} size="sm"
              className="h-7 text-xs px-3 bg-gray-900 hover:bg-gray-800 text-white">
              Submit for Approval
            </Button>
          )}
          {status === 'submitted' && (
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
        </div>
      )}
    </div>
  );
}
