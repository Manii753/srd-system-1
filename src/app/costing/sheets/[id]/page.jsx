'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, ArrowLeft, Save, Link2, Unlink, Search, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import CostSheetGrid from '@/components/CostSheetGrid';
import CostSheetColumnDesigner from '@/components/CostSheetColumnDesigner';
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
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
          {/* ── Sheet header ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Title</label>
                <input
                  value={title}
                  onChange={e => { setTitle(e.target.value); setIsDirty(true); }}
                  placeholder="Untitled Cost Sheet"
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase">Link to SRD (optional)</label>
                <div className="relative">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        value={srdQuery}
                        onChange={e => { setSrdQuery(e.target.value); if (e.target.value !== srd?.refNo) setSrd(null); }}
                        placeholder="Search SRD by reference…"
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>
                    {srd && (
                      <button
                        onClick={() => selectSrd(null)}
                        title="Unlink SRD"
                        className="flex items-center gap-1 px-2 py-2 text-[11px] font-medium text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg"
                      >
                        <Unlink size={13} />
                      </button>
                    )}
                  </div>
                  {srd && srdQuery === srd.refNo && (
                    <p className="mt-1.5 text-[11px] font-medium text-blue-600 flex items-center gap-1">
                      <Link2 size={11} /> Linked to {srd.refNo}
                    </p>
                  )}
                  {srdResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl">
                      {srdResults.map(r => (
                        <button
                          key={r._id}
                          onClick={() => selectSrd(r)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between gap-2"
                        >
                          <span className="text-sm font-medium text-gray-800">{r.refNo}</span>
                          {r.title && <span className="text-[11px] text-gray-400 truncate">{r.title}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Columns ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Columns</h2>
            </div>
            <CostSheetColumnDesigner
              columns={columns}
              onChange={(next) => { setColumns(next); setIsDirty(true); }}
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
            />
          </div>
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