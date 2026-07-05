'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const fabricAmt    = sectionSum(d.fabrics);
  const bwtAmt       = sectionSum(d.beforeWashTrims);
  const awtAmt       = sectionSum(d.afterWashTrims);
  const packAmt      = sectionSum(d.packaging);
  const embAmt       = sectionSum(d.embellishment);
  const testing      = n(d.testingCharges);
  const patches      = n(d.patchesAttachment);
  const gusset       = n(d.gussetAttachment);
  const badges       = n(d.badgesAttachments);
  const cmtCargo     = n(d.cmtCargo);
  const cmtsPocket   = n(d.cmtsPocket);
  const oh           = n(d.oh);
  const washing      = n(d.washing);
  const extraCut     = n(d.extraCut);
  const fob          = n(d.fob);

  const total = fabricAmt + bwtAmt + awtAmt + packAmt + embAmt
    + testing + patches + gusset + badges + cmtCargo + cmtsPocket
    + oh + washing + extraCut + fob;

  const loMargin   = n(d.loMargin);
  const linds      = n(d.linds) || 1;
  const priceIsPkr = n(d.priceIsPkr);
  const pchErrorPct= n(d.pchErrorPct);

  const finalFobUs = (total + loMargin) / linds;
  const totalCost  = finalFobUs * (1 + pchErrorPct / 100);

  return { fabricAmt, bwtAmt, awtAmt, packAmt, embAmt, total, finalFobUs, totalCost };
}

const STATUS_META = {
  draft:     { label: 'Draft',     bg: 'bg-gray-100 text-gray-600',   Icon: Clock },
  submitted: { label: 'Submitted', bg: 'bg-blue-100 text-blue-700',   Icon: Send },
  approved:  { label: 'Approved',  bg: 'bg-green-100 text-green-700', Icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  bg: 'bg-red-100 text-red-700',     Icon: AlertCircle },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single editable row in a section table */
function ItemRow({ row, onChange, onRemove, canEdit, rowIndex, isGray }) {
  const amt = rowAmount(row);
  return (
    <tr className={`border-b border-gray-200 group ${isGray ? 'bg-[#dce6f1]' : 'bg-white'}`}>
      {/* Row number */}
      <td className="w-7 text-center text-[10px] text-gray-400 border-r border-gray-200 py-0.5">
        {rowIndex + 1}
      </td>
      {/* Description */}
      <td className="border-r border-gray-200 py-0.5 px-1">
        {canEdit ? (
          <input
            value={row.description}
            onChange={e => onChange({ ...row, description: e.target.value })}
            className="w-full text-xs bg-transparent outline-none px-0.5"
          />
        ) : (
          <span className="text-xs px-0.5 uppercase tracking-wide">{row.description}</span>
        )}
      </td>
      {/* Consumption */}
      <td className="w-20 border-r border-gray-200 py-0.5 px-1">
        <input
          type="number" min="0" step="any"
          value={row.consumption || ''}
          onChange={e => onChange({ ...row, consumption: e.target.value })}
          disabled={!canEdit}
          className="w-full text-xs text-right bg-transparent outline-none px-0.5 disabled:opacity-60"
        />
      </td>
      {/* Price */}
      <td className="w-20 border-r border-gray-200 py-0.5 px-1">
        <input
          type="number" min="0" step="0.01"
          value={row.price || ''}
          onChange={e => onChange({ ...row, price: e.target.value })}
          disabled={!canEdit}
          className="w-full text-xs text-right bg-transparent outline-none px-0.5 disabled:opacity-60"
        />
      </td>
      {/* Amount */}
      <td className="w-24 py-0.5 px-2 text-right text-xs font-medium text-gray-800">
        {amt > 0 ? fmt2(amt) : '0'}
      </td>
      {/* Remove */}
      <td className="w-6">
        {canEdit && (
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 px-1"
          >
            <Trash2 size={11} />
          </button>
        )}
      </td>
    </tr>
  );
}

/** Section heading row (red background, matching the spreadsheet) */
function SectionHeader({ label, total, currency }) {
  return (
    <tr className="bg-white border-b border-gray-200">
      <td colSpan={3} className="py-1 px-2">
        <span className="text-xs font-bold text-red-600 uppercase tracking-wider">{label}</span>
      </td>
      <td className="py-1 px-2 text-right text-xs font-bold text-red-600 uppercase tracking-wider">
        {total > 0 ? fmt2(total) : ''}
      </td>
      <td className="text-right text-xs text-red-600 font-bold px-2">
        {total > 0 ? fmt2(total) : '0'}
      </td>
      <td />
    </tr>
  );
}

/** Column header row (yellow background like spreadsheet) */
function ColHeader() {
  return (
    <tr className="bg-[#ffff00] border-b-2 border-gray-400 text-xs font-bold text-black uppercase tracking-wide">
      <th className="w-7 border-r border-gray-300 py-1 text-center">#</th>
      <th className="border-r border-gray-300 py-1 px-2 text-left">Description</th>
      <th className="w-20 border-r border-gray-300 py-1 px-2 text-right">Consump</th>
      <th className="w-20 border-r border-gray-300 py-1 px-2 text-right">Price</th>
      <th className="w-24 py-1 px-2 text-right">Amount</th>
      <th className="w-6" />
    </tr>
  );
}

/** A fixed-value row (non-repeating — e.g. Testing Charges, CMT, OH) */
function FixedRow({ label, value, onChange, canEdit, isGray, highlight }) {
  return (
    <tr className={`border-b border-gray-200 ${isGray ? 'bg-[#dce6f1]' : 'bg-white'} ${highlight ? 'font-semibold' : ''}`}>
      <td className="w-7 border-r border-gray-200" />
      <td className="border-r border-gray-200 py-0.5 px-2">
        <span className={`text-xs uppercase tracking-wide ${highlight ? 'font-bold text-red-600' : ''}`}>{label}</span>
      </td>
      <td className="border-r border-gray-200" />
      <td className="border-r border-gray-200" />
      <td className="w-24 py-0.5 px-2">
        <input
          type="number" min="0" step="any"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={!canEdit}
          className={`w-full text-xs text-right bg-transparent outline-none disabled:opacity-60 ${highlight ? 'font-bold text-red-600' : ''}`}
        />
      </td>
      <td className="w-6" />
    </tr>
  );
}

/** Summary rows at the bottom */
function SummaryRow({ label, value, isYellow, isGray, currency, editable, onChange, canEdit }) {
  const bgClass = isYellow ? 'bg-[#ffff00]' : isGray ? 'bg-[#dce6f1]' : 'bg-white';
  return (
    <tr className={`border-b border-gray-200 ${bgClass}`}>
      <td colSpan={4} className="py-0.5 px-2 text-xs font-medium uppercase tracking-wide">{label}</td>
      <td className="py-0.5 px-2 text-right text-xs font-medium">
        {editable && canEdit ? (
          <input
            type="number" step="any"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="text-right bg-transparent outline-none w-full text-xs font-medium"
          />
        ) : (
          <span>{fmt2(value)}</span>
        )}
      </td>
      <td />
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CostingSheet({ type, costData, srd, onSave, saving }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const isAdmin = ['admin', 'vmd'].includes(session?.user?.role);

  const label = type === 'pre' ? 'Pre-Costing' : 'Post-Costing';

  // ── Local state ──────────────────────────────────────────────────────────────

  const [d, setD] = useState(() => ({
    currency: 'USD',
    date: '', buyer: '', style: '', fit: '', fabric: '', wash: '',
    fabrics:          [],
    beforeWashTrims:  [],
    afterWashTrims:   [],
    packaging:        [],
    embellishment:    [],
    testingCharges:   0,
    patchesAttachment: 0,
    gussetAttachment:  0,
    badgesAttachments: 0,
    cmtCargo:    0,
    cmtsPocket:  0,
    oh:          0,
    washing:     0,
    extraCut:    0,
    fob:         0,
    loMargin:    0,
    priceIsPkr:  0,
    linds:       245,
    pchErrorPct: 0,
    notes:       '',
    status:      'draft',
    ...costData,
  }));
  const [isDirty, setIsDirty] = useState(false);

  // Sync when costData prop changes (e.g. after reload)
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

  const totals = useMemo(() => calcAll(d), [d]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

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
    if (result?.success) {
      toast({ title: `${label} saved` });
      setIsDirty(false);
    } else {
      toast({ title: 'Save failed', description: result?.error, variant: 'destructive' });
    }
    return result;
  };

  const handleSubmit = async () => {
    const saveRes = await handleSave();
    if (!saveRes?.success) return;
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

  // ── Render sections ──────────────────────────────────────────────────────────

  const renderSection = (sectionKey, label) => {
    const rows = d[sectionKey] || [];
    return (
      <>
        <SectionHeader label={label} total={sectionSum(rows)} currency={d.currency} />
        {rows.map((row, idx) => (
          <ItemRow
            key={idx}
            row={row}
            rowIndex={idx}
            isGray={idx % 2 === 1}
            canEdit={canEdit}
            onChange={updated => updateRow(sectionKey, idx, updated)}
            onRemove={() => removeRow(sectionKey, idx)}
          />
        ))}
        {canEdit && (
          <tr className="bg-white">
            <td colSpan={6} className="py-1 px-2">
              <button
                onClick={() => addRow(sectionKey)}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
              >
                <Plus size={11} /> Add row
              </button>
            </td>
          </tr>
        )}
      </>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-900">{label}</h2>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sm.bg}`}>
            <StatusIcon size={11} />
            {sm.label}
          </span>
          {isDirty && <span className="text-[11px] text-amber-600">● Unsaved</span>}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={d.currency}
            onChange={e => set('currency', e.target.value)}
            disabled={!canEdit}
            className="border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-700"
          >
            {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'PKR'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Approval metadata */}
      {d.submittedBy && (
        <div className="text-[11px] text-gray-500">
          Submitted by <strong>{d.submittedBy}</strong>
          {d.submittedAt && ` on ${new Date(d.submittedAt).toLocaleDateString()}`}
          {d.approvedBy && (
            <> · Approved by <strong>{d.approvedBy}</strong>
              {d.approvedAt && ` on ${new Date(d.approvedAt).toLocaleDateString()}`}
            </>
          )}
        </div>
      )}

      {/* ── SPREADSHEET ── */}
      <div className="border-2 border-gray-400 rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            {/* Header info rows */}
            <tr className="bg-[#dce6f1] border-b border-gray-300">
              <td colSpan={2} className="py-1 px-2 font-bold text-xs uppercase text-center tracking-wider" />
              <td colSpan={2} className="py-1 px-2 text-center text-xs font-bold text-blue-800 uppercase">
                {srd?.refNo}
              </td>
              <td colSpan={2} />
            </tr>
          </thead>
          <tbody>
            {/* Meta fields */}
            {[
              { label: 'DATE',   key: 'date' },
              { label: 'BUYER',  key: 'buyer' },
              { label: 'STYLE',  key: 'style' },
              { label: 'FIT',    key: 'fit' },
              { label: 'FABRIC', key: 'fabric' },
              { label: 'WASH',   key: 'wash' },
            ].map(({ label: lbl, key }, i) => (
              <tr key={key} className={`border-b border-gray-200 ${i % 2 === 0 ? 'bg-[#dce6f1]' : 'bg-white'}`}>
                <td className="w-7 border-r border-gray-200" />
                <td className="border-r border-gray-200 py-0.5 px-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">{lbl}</span>
                </td>
                <td colSpan={3} className="py-0.5 px-2">
                  {canEdit ? (
                    <input
                      value={d[key]}
                      onChange={e => set(key, e.target.value)}
                      className="w-full text-xs bg-transparent outline-none"
                    />
                  ) : (
                    <span className="text-xs text-gray-800">{d[key]}</span>
                  )}
                </td>
                <td />
              </tr>
            ))}

            {/* Column headers */}
            <ColHeader />

            {/* FABRICS */}
            {renderSection('fabrics', 'FABRICS')}

            {/* BEFORE WASH TRIMS */}
            {renderSection('beforeWashTrims', 'BEFORE WASH TRIMS')}

            {/* AFTER WASH TRIMS */}
            {renderSection('afterWashTrims', 'AFTER WASH TRIMS')}

            {/* PACKAGING */}
            {renderSection('packaging', 'PACKAGING')}

            {/* EMBELLISHMENT */}
            {renderSection('embellishment', 'EMBELLISHMENT')}

            {/* TESTING CHARGES */}
            <tr className="bg-white border-b border-gray-200">
              <td className="w-7 border-r border-gray-200" />
              <td colSpan={2} className="py-1 px-2">
                <span className="text-xs font-bold text-red-600 uppercase">TESTING CHARGES</span>
              </td>
              <td className="border-r border-gray-200 py-0.5 px-2">
                <input
                  type="number" min="0" step="any"
                  value={d.testingCharges || ''}
                  onChange={e => set('testingCharges', e.target.value)}
                  disabled={!canEdit}
                  className="w-full text-xs text-right bg-transparent outline-none disabled:opacity-60 text-red-600 font-bold"
                />
              </td>
              <td className="py-1 px-2 text-right text-xs font-bold text-red-600">
                {n(d.testingCharges) > 0 ? fmt2(n(d.testingCharges)) : '0'}
              </td>
              <td />
            </tr>

            {/* Spacer */}
            <tr className="bg-white border-b border-gray-100"><td colSpan={6} className="py-0.5" /></tr>

            {/* Fixed labour/charge rows */}
            {[
              { label: 'PATCHES ATTACHMENT', key: 'patchesAttachment' },
              { label: 'GUSSET ATTACHMENT',  key: 'gussetAttachment' },
              { label: 'BADGES ATTACHMENTS', key: 'badgesAttachments' },
              { label: 'CMT CARGO',          key: 'cmtCargo' },
              { label: "CMT'S POCKET",       key: 'cmtsPocket' },
              { label: 'OH',                 key: 'oh' },
              { label: 'WASHING',            key: 'washing' },
            ].map(({ label: lbl, key }, i) => (
              <FixedRow
                key={key}
                label={lbl}
                value={d[key]}
                onChange={v => set(key, v)}
                canEdit={canEdit}
                isGray={i % 2 === 0}
              />
            ))}

            {/* Spacer */}
            <tr className="bg-white border-b border-gray-100"><td colSpan={6} className="py-0.5" /></tr>

            {/* Extra Cut & FOB */}
            <FixedRow label="EXTRA CUT" value={d.extraCut} onChange={v => set('extraCut', v)} canEdit={canEdit} isGray={false} />
            <FixedRow label="FOB" value={d.fob} onChange={v => set('fob', v)} canEdit={canEdit} isGray={true} />

            {/* Spacer */}
            <tr className="bg-white border-b border-gray-100"><td colSpan={6} className="py-0.5" /></tr>

            {/* TOTAL */}
            <tr className="bg-[#dce6f1] border-b-2 border-gray-400">
              <td colSpan={4} className="py-1.5 px-2 font-bold text-sm uppercase tracking-wide">TOTAL</td>
              <td className="py-1.5 px-2 text-right font-bold text-sm">{fmt2(totals.total)}</td>
              <td />
            </tr>

            {/* Summary rows */}
            <SummaryRow label="LO MARGIN"  value={d.loMargin}   isGray editable canEdit={canEdit} onChange={v => set('loMargin', v)} currency={d.currency} />
            <SummaryRow label="PRICE IS PKR" value={d.priceIsPkr} isGray editable canEdit={canEdit} onChange={v => set('priceIsPkr', v)} currency={d.currency} />
            <SummaryRow label="LINDS"      value={d.linds}      isGray editable canEdit={canEdit} onChange={v => set('linds', v)} currency={d.currency} />
            <SummaryRow label={`FINAL FOB US$`} value={totals.finalFobUs} isYellow currency={d.currency} />
            <SummaryRow label={`P.CH + ERROR % (${d.pchErrorPct}%)`} value={d.pchErrorPct} isGray editable canEdit={canEdit} onChange={v => set('pchErrorPct', v)} currency={d.currency} />

            {/* Total Cost — highlighted green */}
            <tr className="bg-[#92d050] border-t-2 border-gray-400">
              <td colSpan={4} className="py-2 px-2 font-bold text-sm uppercase tracking-wide">Total Cost</td>
              <td className="py-2 px-2 text-right font-bold text-sm">${fmt2(totals.totalCost)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[11px] text-gray-500 mb-1 font-medium uppercase tracking-wide">Notes</label>
        <Textarea
          value={d.notes}
          onChange={e => set('notes', e.target.value)}
          disabled={!canEdit}
          placeholder="Notes or assumptions..."
          rows={2}
          className="text-xs resize-none"
        />
      </div>

      {/* Action buttons */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {canEdit && (
            <Button onClick={handleSave} disabled={saving || !isDirty} size="sm" variant="outline">
              {saving ? 'Saving…' : 'Save Draft'}
            </Button>
          )}
          {canEdit && status === 'draft' && (
            <Button onClick={handleSubmit} disabled={saving} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              Submit for Approval
            </Button>
          )}
          {status === 'submitted' && (
            <>
              <Button onClick={handleApprove} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                Approve
              </Button>
              <Button onClick={handleReject} disabled={saving} size="sm" variant="destructive">
                Reject
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
