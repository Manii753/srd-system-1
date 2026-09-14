'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, ArrowLeft, Save, LayoutTemplate } from 'lucide-react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import CostSheetGrid from '@/components/CostSheetGrid';
import CostSheetColumnDesigner from '@/components/CostSheetColumnDesigner';
import { useToast } from '@/lib/use-toast';

const newEmptyRow = () => ({ type: 'data' });

export default function TemplateDesignerPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const isNew = id === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultRows, setDefaultRows] = useState(5);
  const [columns, setColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState(() =>
    Array.from({ length: 5 }, () => newEmptyRow())
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'vmd'].includes(session.user.role)) { router.push('/home'); return; }

    if (!isNew) {
      fetch(`/api/cost-sheet-templates/${id}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            const t = d.data;
            setName(t.name || '');
            setDescription(t.description || '');
            setDefaultRows(Math.max(1, parseInt(t.defaultRows, 10) || 5));
            setColumns((t.columns || []).map(c => ({ ...c, width: c.width || 120 })));
            if (Array.isArray(t.skeleton) && t.skeleton.length) {
              setPreviewRows(JSON.parse(JSON.stringify(t.skeleton)));
            } else {
              setPreviewRows(Array.from({ length: Math.max(1, parseInt(t.defaultRows, 10) || 5) }, () => newEmptyRow()));
            }
          } else {
            toast({ title: 'Error', description: d.error, variant: 'destructive' });
          }
        })
        .catch(() => toast({ title: 'Error', description: 'Failed to load template', variant: 'destructive' }))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session, status, router]);

  const touch = () => setIsDirty(true);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', description: 'Give your template a name.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name,
      description,
      columns: columns.map(c => ({
        key: c.key,
        label: c.label,
        type: c.type,
        formula: c.type === 'formula' ? c.formula || '' : '',
        width: parseInt(c.width, 10) || 120,
      })),
      defaultRows,
      // Save the section skeleton — section headings are kept, data values are
      // treated as throwaway preview content and stripped by the API.
      skeleton: previewRows,
      author: session?.user?.name || session?.user?.email || '',
    };

    try {
      if (isNew) {
        const res = await fetch('/api/cost-sheet-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (d.success) {
          toast({ title: 'Template created' });
          setIsDirty(false);
          router.replace(`/costing/templates/${d.data._id}`);
        } else {
          toast({ title: 'Save failed', description: d.error, variant: 'destructive' });
        }
      } else {
        const res = await fetch(`/api/cost-sheet-templates/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (d.success) {
          toast({ title: 'Template saved' });
          setIsDirty(false);
        } else {
          toast({ title: 'Save failed', description: d.error, variant: 'destructive' });
        }
      }
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
          <Link href="/costing/templates" className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft size={14} /> Cost Sheet Templates
          </Link>
          <span>/</span>
          <span className="text-blue-700 font-semibold flex items-center gap-1">
            <LayoutTemplate size={13} /> {isNew ? 'New Template' : 'Design Template'}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {isDirty && <span className="text-[11px] text-amber-500 font-medium">● unsaved</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save Template'}
            </button>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        ) : (
          <>
            {/* ── Template settings ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase">Template Name *</label>
                  <input
                    value={name}
                    onChange={e => { setName(e.target.value); touch(); }}
                    placeholder="e.g. Full Costing Sheet"
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase">Description</label>
                  <input
                    value={description}
                    onChange={e => { setDescription(e.target.value); touch(); }}
                    placeholder="What is this template for?"
                    className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase">Default Rows</label>
                  <input
                    type="number"
                    min="1"
                    value={defaultRows}
                    onChange={e => { setDefaultRows(Math.max(1, parseInt(e.target.value, 10) || 1)); touch(); }}
                    className="mt-1 w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* ── Column designer ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">Columns</h2>
              </div>
              <CostSheetColumnDesigner
                columns={columns}
                onChange={(next) => { setColumns(next); touch(); }}
              />
            </div>

            <p className="text-[11px] text-gray-400">
              Tip: use <span className="font-mono bg-gray-100 px-1 rounded">{'{row}'}</span> inside a formula to refer to
              the current row, e.g. <span className="font-mono bg-gray-100 px-1 rounded">=B{'{row}'}*C{'{row}'}</span>.
              Formula columns also support SUM, AVG, MIN, MAX, COUNT, ROUND, ABS and IF with cell references like{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">=SUM(D2:D10)</span>.
            </p>

            {/* ── Live preview ── */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Live Preview — press Enter to move down (new rows/sections are added automatically; this structure becomes the default skeleton for new sheets)</h3>
              <CostSheetGrid
                columns={columns}
                rows={previewRows}
                onRowsChange={setPreviewRows}
                onAddRow={() => setPreviewRows(prev => [...prev, newEmptyRow()])}
                onRemoveRow={(idx) => setPreviewRows(prev => prev.filter((_, i) => i !== idx))}
                emptyRow={newEmptyRow}
              />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}