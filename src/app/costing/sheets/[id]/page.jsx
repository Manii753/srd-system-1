'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, ArrowLeft, Save, ClipboardList, Printer } from 'lucide-react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import CostSheetGrid from '@/components/CostSheetGrid';
import CostSheetColumnDesigner from '@/components/CostSheetColumnDesigner';
import CostSheetFormHeader from '@/components/CostSheetFormHeader';
import { useToast } from '@/lib/use-toast';

const newEmptyRow = () => ({ type: 'data' });

function SheetEditorContent() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [title, setTitle] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [columns, setColumns] = useState([]);
  const [headerFields, setHeaderFields] = useState([]);
  const [headers, setHeaders] = useState({});
  const [subtotalColumnKey, setSubtotalColumnKey] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([]);
  const [srd, setSrd] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const [srdQuery, setSrdQuery] = useState('');
  const [srdResults, setSrdResults] = useState([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'vmd'].includes(session.user.role)) { router.push('/home'); return; }

    fetch(`/api/cost-sheets/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const s = d.data;
          setTitle(s.title || '');
          setTemplateName(s.templateName || '');
          setColumns((s.columns || []).map(c => ({ ...c, width: c.width || 120 })));
          setHeaderFields((s.headerFields || []).map(f => ({ ...f, options: f.options || [] })));
          setHeaders(s.headers || {});
          setSubtotalColumnKey(s.subtotalColumnKey || '');
          setCurrency(s.currency || 'USD');
          setNotes(s.notes || '');
          setRows(Array.isArray(s.rows) ? s.rows : []);
          setSrd(s.srd || null);
          setSrdQuery(s.srdRefNo || '');
        } else {
          toast({ title: 'Error', description: d.error, variant: 'destructive' });
        }
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load cost sheet', variant: 'destructive' }))
      .finally(() => { setLoading(false); setLoaded(true); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session, status, router]);

  const searchSrd = useCallback(async (q) => {
    if (!q) { setSrdResults([]); return; }
    try {
      const res = await fetch(`/api/srd?search=${encodeURIComponent(q)}&limit=8`);
      const d = await res.json();
      if (d.success) setSrdResults(d.data || []);
    } catch {
      setSrdResults([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchSrd(srdQuery), 300);
    return () => clearTimeout(t);
  }, [srdQuery, searchSrd]);

  const selectSrd = (r) => {
    setSrd(r);
    setSrdQuery(r?.refNo || '');
    setSrdResults([]);
    setIsDirty(true);
  };

  const onChangeHeader = (key, val) => {
    setHeaders(prev => ({ ...prev, [key]: val }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title: title.trim() || 'Untitled Cost Sheet',
      columns: columns.map(c => ({
        key: c.key,
        label: c.label,
        type: c.type,
        formula: c.type === 'formula' ? c.formula || '' : '',
        width: parseInt(c.width, 10) || 120,
      })),
      rows,
      headerFields,
      headers,
      subtotalColumnKey,
      currency,
      notes,
      srd: srd?._id || null,
      srdRefNo: srd?.refNo || '',
      standalone: !srd,
      author: session?.user?.name || session?.user?.email || '',
    };
    try {
      const res = await fetch(`/api/cost-sheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) { toast({ title: 'Cost sheet saved' }); setIsDirty(false); }
      else toast({ title: 'Save failed', description: d.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.open(`/costing/sheets/${id}/print`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-4 print:hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
        <Link href="/costing/sheets" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft size={14} /> Cost Sheets
        </Link>
        <span>/</span>
        <span className="text-blue-700 font-semibold flex items-center gap-1">
          <ClipboardList size={13} /> {title || 'Cost Sheet'}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{templateName ? `Template: ${templateName}` : 'Blank sheet'}</span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg"
          >
            <Printer size={14} /> Print A4
          </button>
          {isDirty && <span className="text-[11px] text-amber-500 font-medium">● unsaved</span>}
          <button
            onClick={handleSave}
            disabled={saving || !loaded}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Saving…' : 'Save Sheet'}
          </button>
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
      ) : (
        <>
          {/* ── Costing-form style header (title, SRD, currency, header fields) ── */}
          <CostSheetFormHeader
            title={title}
            onTitleChange={(v) => { setTitle(v); setIsDirty(true); }}
            srd={srd}
            srdRef={srd?.refNo || ''}
            srdQuery={srdQuery}
            onSrdQueryChange={(v) => { setSrdQuery(v); if (v !== srd?.refNo) setSrd(null); setIsDirty(true); }}
            onClearSrd={() => selectSrd(null)}
            srdResults={srdResults}
            onSelectSrd={selectSrd}
            headerFields={headerFields}
            headers={headers}
            onChangeHeader={onChangeHeader}
            currency={currency}
            onCurrencyChange={(v) => { setCurrency(v); setIsDirty(true); }}
            editable
          />

          {/* ── Columns ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Columns</h2>
            </div>
            <CostSheetColumnDesigner
              columns={columns}
              onChange={(next) => { setColumns(next); setIsDirty(true); }}
              subtotalColumnKey={subtotalColumnKey}
              onSubtotalColumnChange={(val) => { setSubtotalColumnKey(val); setIsDirty(true); }}
            />
          </div>

          {/* ── Data grid ── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Data — press Enter to move down (a new row is added automatically)
            </h3>
            <CostSheetGrid
              columns={columns}
              rows={rows}
              onRowsChange={(next) => { setRows(next); setIsDirty(true); }}
              onAddRow={() => { setRows(prev => [...prev, newEmptyRow()]); setIsDirty(true); }}
              onRemoveRow={(idx) => { setRows(prev => prev.filter((_, i) => i !== idx)); setIsDirty(true); }}
              emptyRow={newEmptyRow}
              subtotalColumnKey={subtotalColumnKey}
            />
          </div>

          {/* ── Notes ── */}
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setIsDirty(true); }}
            placeholder="Notes or assumptions…"
            rows={2}
            className="w-full text-xs resize-none border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </>
      )}
    </div>
  );
}

export default function SheetEditorPage() {
  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
      }>
        <SheetEditorContent />
      </Suspense>
    </Layout>
  );
}