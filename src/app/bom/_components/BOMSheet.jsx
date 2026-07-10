'use client';

import { useState, useCallback, useRef } from 'react';
import { Plus, Trash2, Save, Send, CheckCircle2, XCircle, RotateCcw, Clock, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/use-toast';
import { useSession } from 'next-auth/react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n = (v) => Number(v) || 0;

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-500',  Icon: Clock },
  submitted: { label: 'Submitted', cls: 'bg-blue-50 text-blue-600',   Icon: Send },
  approved:  { label: 'Approved',  cls: 'bg-green-50 text-green-600', Icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  cls: 'bg-red-50 text-red-500',     Icon: XCircle },
};

// ─── Generic editable cell ────────────────────────────────────────────────────
function Cell({ value, onChange, disabled, type = 'text', align = 'left', placeholder = '' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(type === 'number' ? e.target.value : e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      step={type === 'number' ? 'any' : undefined}
      className={`w-full h-full bg-transparent outline-none text-xs px-1.5 py-1 focus:bg-blue-50 transition-colors disabled:cursor-default ${align === 'right' ? 'text-right' : 'text-left'}`}
    />
  );
}

// ─── Section header row ────────────────────────────────────────────────────────
function SectionHeader({ title, colSpan = 7 }) {
  return (
    <tr className="bg-gray-800 text-white">
      <td colSpan={colSpan} className="py-1.5 px-3 text-[11px] font-bold uppercase tracking-widest text-center">
        {title}
      </td>
    </tr>
  );
}

// ─── Meta field pair ──────────────────────────────────────────────────────────
function MetaField({ label, value, onChange, disabled, wide = false }) {
  return (
    <div className={`flex items-start gap-1.5 py-1 px-2 border-b border-r border-gray-300 ${wide ? 'col-span-2' : ''}`}>
      <span className="text-[10px] font-bold text-gray-500 uppercase shrink-0 w-20 pt-0.5">{label}</span>
      {disabled
        ? <span className="text-xs text-gray-800 flex-1">{value || <span className="text-gray-300">—</span>}</span>
        : <input
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="flex-1 text-xs bg-transparent outline-none text-gray-800 focus:bg-blue-50 rounded min-w-0"
          />
      }
    </div>
  );
}

// ─── Fabric Details table ─────────────────────────────────────────────────────
function FabricTable({ rows, onChange, canEdit }) {
  const update = (idx, key, val) => {
    const next = rows.map((r, i) => i === idx ? { ...r, [key]: val } : r);
    onChange(next);
  };
  const remove = (idx) => onChange(rows.filter((_, i) => i !== idx));
  const add = () => onChange([...rows, { description: '', composition: '', placement: '', sourceOrigin: '', consNo: 0, portngPcs: 0, cons: 0 }]);

  return (
    <table className="w-full text-xs border-collapse">
      <colgroup>
        <col style={{ width: '24%' }} /><col style={{ width: '20%' }} />
        <col style={{ width: '14%' }} /><col style={{ width: '14%' }} />
        <col style={{ width: '9%'  }} /><col style={{ width: '9%'  }} />
        <col style={{ width: '9%'  }} /><col style={{ width: '24px' }} />
      </colgroup>
      <thead>
        <SectionHeader title="Fabric Details" colSpan={8} />
        <tr className="bg-gray-100 border-b border-gray-300 text-[10px] font-bold text-gray-600 uppercase">
          <th className="py-1.5 px-2 text-left border-r border-gray-200">Description</th>
          <th className="py-1.5 px-2 text-left border-r border-gray-200">Composition / Color</th>
          <th className="py-1.5 px-2 text-left border-r border-gray-200">Placement</th>
          <th className="py-1.5 px-2 text-left border-r border-gray-200">Source / Origin</th>
          <th className="py-1.5 px-2 text-right border-r border-gray-200">Cons No</th>
          <th className="py-1.5 px-2 text-right border-r border-gray-200">Frtng Pcs</th>
          <th className="py-1.5 px-2 text-right border-r border-gray-200">Cons</th>
          <th className="w-6" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 group">
            <td className="border-r border-gray-100 p-0"><Cell value={row.description}  onChange={v => update(i, 'description',  v)} disabled={!canEdit} /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={row.composition}  onChange={v => update(i, 'composition',  v)} disabled={!canEdit} /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={row.placement}    onChange={v => update(i, 'placement',    v)} disabled={!canEdit} /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={row.sourceOrigin} onChange={v => update(i, 'sourceOrigin', v)} disabled={!canEdit} /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={n(row.consNo)}    onChange={v => update(i, 'consNo',  v)} disabled={!canEdit} type="number" align="right" /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={n(row.portngPcs)} onChange={v => update(i, 'portngPcs', v)} disabled={!canEdit} type="number" align="right" /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={n(row.cons)}      onChange={v => update(i, 'cons',  v)} disabled={!canEdit} type="number" align="right" /></td>
            <td className="w-6">
              {canEdit && (
                <button onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 flex items-center justify-center w-full py-1">
                  <Trash2 size={10} />
                </button>
              )}
            </td>
          </tr>
        ))}
        {canEdit && (
          <tr><td colSpan={8} className="py-0.5 pl-3 border-b border-gray-100">
            <button onClick={add} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 py-0.5">
              <Plus size={10} /> add row
            </button>
          </td></tr>
        )}
      </tbody>
    </table>
  );
}

// ─── Trims table (Before / After Wash) ────────────────────────────────────────
function TrimsTable({ title, rows, onChange, canEdit }) {
  const update = (idx, key, val) => {
    const next = rows.map((r, i) => i === idx ? { ...r, [key]: val } : r);
    onChange(next);
  };
  const remove = (idx) => onChange(rows.filter((_, i) => i !== idx));
  const add = () => onChange([...rows, { description: '', placement: '', uom: '', cons: 0, portngPcs: 0, totalCons: 0 }]);

  return (
    <table className="w-full text-xs border-collapse">
      <colgroup>
        <col style={{ width: '30%' }} /><col style={{ width: '22%' }} />
        <col style={{ width: '8%'  }} /><col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} /><col style={{ width: '10%' }} />
        <col style={{ width: '10%' }} /><col style={{ width: '24px' }} />
      </colgroup>
      <thead>
        <SectionHeader title={title} colSpan={8} />
        <tr className="bg-gray-100 border-b border-gray-300 text-[10px] font-bold text-gray-600 uppercase">
          <th className="py-1.5 px-2 text-left border-r border-gray-200">Description</th>
          <th className="py-1.5 px-2 text-left border-r border-gray-200">Placement</th>
          <th className="py-1.5 px-2 text-center border-r border-gray-200">UOM</th>
          <th className="py-1.5 px-2 text-right border-r border-gray-200">Cons</th>
          <th className="py-1.5 px-2 text-right border-r border-gray-200">Portng Pcs</th>
          <th className="py-1.5 px-2 text-right border-r border-gray-200">Total Cons</th>
          <th className="w-6" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 group">
            <td className="border-r border-gray-100 p-0"><Cell value={row.description} onChange={v => update(i, 'description', v)} disabled={!canEdit} /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={row.placement}   onChange={v => update(i, 'placement',   v)} disabled={!canEdit} /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={row.uom}         onChange={v => update(i, 'uom',         v)} disabled={!canEdit} align="center" /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={n(row.cons)}      onChange={v => update(i, 'cons',      v)} disabled={!canEdit} type="number" align="right" /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={n(row.portngPcs)} onChange={v => update(i, 'portngPcs', v)} disabled={!canEdit} type="number" align="right" /></td>
            <td className="border-r border-gray-100 p-0"><Cell value={n(row.totalCons)} onChange={v => update(i, 'totalCons', v)} disabled={!canEdit} type="number" align="right" /></td>
            <td className="w-6">
              {canEdit && (
                <button onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 flex items-center justify-center w-full py-1">
                  <Trash2 size={10} />
                </button>
              )}
            </td>
          </tr>
        ))}
        {canEdit && (
          <tr><td colSpan={8} className="py-0.5 pl-3 border-b border-gray-100">
            <button onClick={add} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 py-0.5">
              <Plus size={10} /> add row
            </button>
          </td></tr>
        )}
      </tbody>
    </table>
  );
}

// ─── Size Grid ────────────────────────────────────────────────────────────────
function SizeGrid({ rows, onChange, canEdit }) {
  const update = (idx, key, val) => {
    const next = rows.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [key]: val };
      // Auto-calc total
      updated.total = n(updated.xs) + n(updated.s) + n(updated.m) + n(updated.l) + n(updated.xl) + n(updated.xxl);
      return updated;
    });
    onChange(next);
  };

  const SIZES = ['xs', 's', 'm', 'l', 'xl', 'xxl'];

  return (
    <table className="w-full text-xs border-collapse">
      <colgroup>
        <col style={{ width: '30%' }} />
        {SIZES.map((_, i) => <col key={i} style={{ width: '9%' }} />)}
        <col style={{ width: '10%' }} />
      </colgroup>
      <thead>
        <tr className="bg-gray-100 border-b border-gray-300 text-[10px] font-bold text-gray-600 uppercase">
          <th className="py-1.5 px-2 text-left border-r border-gray-200">Sizes</th>
          {SIZES.map(s => <th key={s} className="py-1.5 px-1 text-center border-r border-gray-200">{s.toUpperCase()}</th>)}
          <th className="py-1.5 px-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
            <td className="border-r border-gray-100 py-0 px-2">
              <span className="text-[11px] font-medium text-gray-700">{row.label}</span>
            </td>
            {SIZES.map(s => (
              <td key={s} className="border-r border-gray-100 p-0">
                <Cell value={n(row[s])} onChange={v => update(i, s, v)} disabled={!canEdit} type="number" align="right" />
              </td>
            ))}
            <td className="py-0 px-2 text-right font-semibold text-gray-700">
              {n(row.total).toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Main BOM Sheet ───────────────────────────────────────────────────────────

export default function BOMSheet({ bomData, srd, company, onSave, saving, onReset }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const canAdmin = ['admin', 'vmd'].includes(session?.user?.role);

  const [d, setD] = useState(() => ({
    season: '', date: '', buyer: '', style: '', fabric: '', yarn: '',
    styleName: '', composition: '', construction: '', washColor: '', fit: '',
    referenceNo: '',
    sizeGrid: [],
    fabricDetails: [],
    beforeWashTrims: [],
    afterWashTrims: [],
    specialComments: '',
    preparedBy: '', verifiedBy: '', approvedBy: '',
    status: 'draft',
    ...bomData,
  }));
  const [isDirty, setIsDirty] = useState(false);

  // Sync when bomData changes (initial load)
  const [lastBomData, setLastBomData] = useState(bomData);
  if (bomData !== lastBomData) {
    setLastBomData(bomData);
    setD(prev => ({ ...prev, ...bomData }));
    setIsDirty(false);
  }

  const status  = d.status || 'draft';
  const canEdit = canAdmin && ['draft', 'rejected'].includes(status);
  const sm      = STATUS_META[status] || STATUS_META.draft;
  const StatusIcon = sm.Icon;

  const set = useCallback((key, val) => {
    setD(prev => ({ ...prev, [key]: val }));
    setIsDirty(true);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const result = await onSave('save', d, session?.user?.name || session?.user?.email);
    if (result?.success) { toast({ title: 'BOM saved' }); setIsDirty(false); }
    else toast({ title: 'Save failed', description: result?.error, variant: 'destructive' });
    return result;
  };

  const handleSubmit = async () => {
    const r = await handleSave();
    if (!r?.success) return;
    const result = await onSave('submit', {}, session?.user?.name || session?.user?.email);
    if (result?.success) toast({ title: 'BOM submitted for approval' });
  };

  const handleApprove = async () => {
    const result = await onSave('approve', {}, session?.user?.name || session?.user?.email);
    if (result?.success) toast({ title: 'BOM approved' });
  };

  const handleReject = async () => {
    const result = await onSave('reject', {}, session?.user?.name || session?.user?.email);
    if (result?.success) toast({ title: 'BOM rejected', variant: 'destructive' });
  };

  const handlePrint = () => window.print();

  // ── Meta fields config ────────────────────────────────────────────────────────
  const META_LEFT = [
    { label: 'Buyer',        key: 'buyer' },
    { label: 'Style',        key: 'style' },
    { label: 'Fabric',       key: 'fabric' },
    { label: 'Yarn',         key: 'yarn' },
    { label: 'Style Name',   key: 'styleName' },
    { label: 'Composition',  key: 'composition' },
    { label: 'Construction', key: 'construction' },
    { label: 'Reference No', key: 'referenceNo' },
  ];
  const META_RIGHT = [
    { label: 'PO Quantity',  key: 'poQuantity' },
    { label: 'FG Quantity',  key: 'fgQuantity' },
    { label: 'Wash / Color', key: 'washColor' },
    { label: 'Wash Name (City)', key: 'washName' },
    { label: 'Metal Trims QTY', key: 'metalTrimsQty' },
  ];

  return (
    <div className="space-y-3 print:space-y-2">

      {/* ── Action bar (hidden on print) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${sm.cls}`}>
            <StatusIcon size={10} />{sm.label}
          </span>
          {isDirty && <span className="text-[11px] text-amber-500 font-medium">● unsaved</span>}
          {d.submittedBy && (
            <span className="text-[11px] text-gray-400">
              Submitted by <strong className="text-gray-600">{d.submittedBy}</strong>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} size="sm" variant="outline" className="h-7 text-xs px-3 gap-1">
            <Printer size={11} /> Print
          </Button>
          {canAdmin && (
            <Button onClick={onReset} size="sm" variant="outline" className="h-7 text-xs px-3 gap-1 text-gray-400 hover:text-red-500">
              <RotateCcw size={11} /> Reset from SRD
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleSave} disabled={saving || !isDirty} size="sm" variant="outline" className="h-7 text-xs px-3">
              {saving ? 'Saving…' : <><Save size={11} className="mr-1" />Save Draft</>}
            </Button>
          )}
          {canEdit && status === 'draft' && (
            <Button onClick={handleSubmit} disabled={saving} size="sm" className="h-7 text-xs px-3 bg-gray-900 hover:bg-gray-800 text-white">
              <Send size={11} className="mr-1" />Submit
            </Button>
          )}
          {status === 'submitted' && canAdmin && (
            <>
              <Button onClick={handleApprove} disabled={saving} size="sm" className="h-7 text-xs px-3 bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 size={11} className="mr-1" />Approve
              </Button>
              <Button onClick={handleReject} disabled={saving} size="sm" variant="destructive" className="h-7 text-xs px-3">
                <XCircle size={11} className="mr-1" />Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── BOM Document ── */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm print:shadow-none print:border-0" id="bom-print">

        {/* ── Company Header ── */}
        <div className="border-b-2 border-gray-800 px-4 py-3 flex items-start justify-between bg-white">
          <div>
            <h1 className="text-base font-extrabold text-gray-900 uppercase tracking-wide">
              {company?.name || 'LAZIENDA DENIM PVT LTD'}
            </h1>
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mt-0.5">
              Bill of Material
            </h2>
          </div>
          <div className="text-right space-y-0.5">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[10px] text-gray-400 uppercase font-medium">Date</span>
              {canEdit
                ? <input value={d.date || ''} onChange={e => set('date', e.target.value)} className="text-xs border-b border-gray-200 outline-none text-gray-800 text-right w-28" />
                : <span className="text-xs text-gray-700">{d.date || '—'}</span>
              }
            </div>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[10px] text-gray-400 uppercase font-medium">Season</span>
              {canEdit
                ? <input value={d.season || ''} onChange={e => set('season', e.target.value)} className="text-xs border-b border-gray-200 outline-none text-gray-800 text-right w-28" />
                : <span className="text-xs text-gray-700">{d.season || '—'}</span>
              }
            </div>
          </div>
        </div>

        {/* ── Meta info grid ── */}
        <div className="border-b border-gray-300">
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            {/* Left column */}
            <div className="divide-y divide-gray-200">
              {META_LEFT.map(({ label, key }) => (
                <MetaField key={key} label={label} value={d[key]} onChange={v => set(key, v)} disabled={!canEdit} />
              ))}
            </div>
            {/* Right column */}
            <div className="divide-y divide-gray-200">
              {META_RIGHT.map(({ label, key }) => (
                <MetaField key={key} label={label} value={d[key]} onChange={v => set(key, v)} disabled={!canEdit} />
              ))}
              {/* Fit field */}
              <MetaField label="Fit" value={d.fit} onChange={v => set('fit', v)} disabled={!canEdit} />
            </div>
          </div>
        </div>

        {/* ── Size Grid ── */}
        <div className="border-b border-gray-300 overflow-x-auto">
          <SizeGrid rows={d.sizeGrid} onChange={v => set('sizeGrid', v)} canEdit={canEdit} />
        </div>

        {/* ── Fabric Details ── */}
        <div className="border-b border-gray-300 overflow-x-auto">
          <FabricTable rows={d.fabricDetails} onChange={v => set('fabricDetails', v)} canEdit={canEdit} />
        </div>

        {/* ── Before Wash Trims ── */}
        <div className="border-b border-gray-300 overflow-x-auto">
          <TrimsTable
            title="Before Wash Trims Details"
            rows={d.beforeWashTrims}
            onChange={v => set('beforeWashTrims', v)}
            canEdit={canEdit}
          />
        </div>

        {/* ── After Wash Trims ── */}
        <div className="border-b border-gray-300 overflow-x-auto">
          <TrimsTable
            title="After Wash Trims Details"
            rows={d.afterWashTrims}
            onChange={v => set('afterWashTrims', v)}
            canEdit={canEdit}
          />
        </div>

        {/* ── Special Comments ── */}
        <div className="border-b border-gray-300 p-3 space-y-1">
          <p className="text-[11px] font-bold uppercase text-gray-500 tracking-widest">Special Comments</p>
          {canEdit
            ? <textarea
                value={d.specialComments || ''}
                onChange={e => set('specialComments', e.target.value)}
                rows={3}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-300 resize-none"
                placeholder="Add any special instructions or notes…"
              />
            : <p className="text-xs text-gray-700 whitespace-pre-line min-h-[3rem]">{d.specialComments || ''}</p>
          }
        </div>

        {/* ── Footer ── */}
        <div className="grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-300">
          {[
            { label: 'Prepared by',  key: 'preparedBy' },
            { label: 'Verified by',  key: 'verifiedBy' },
            { label: 'Approved by',  key: 'approvedBy' },
          ].map(({ label, key }) => (
            <div key={key} className="px-3 py-2 space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">{label}</p>
              {canEdit
                ? <input value={d[key] || ''} onChange={e => set(key, e.target.value)} className="w-full text-xs border-b border-gray-200 outline-none text-gray-800" />
                : <p className="text-xs text-gray-700">{d[key] || '—'}</p>
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
