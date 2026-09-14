'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Loader2, Plus, ClipboardList, Trash2, FileEdit, ExternalLink, X,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useToast } from '@/lib/use-toast';

function CostSheetsListContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [sheets, setSheets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [creating, setCreating] = useState(false);

  const autoTemplateId = searchParams.get('template');
  const autoCreate = searchParams.get('create') === '1';

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, tRes] = await Promise.all([
        fetch('/api/cost-sheets'),
        fetch('/api/cost-sheet-templates'),
      ]);
      const sData = await sRes.json();
      const tData = await tRes.json();
      if (sData.success) setSheets(sData.data || []);
      if (tData.success) setTemplates(tData.data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load cost sheets', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const setShowingCreationError = () => {
    if (autoTemplateId && autoCreate) router.replace('/costing/sheets');
    setShowPicker(false);
  };

  const createSheet = async (templateId) => {
    setCreating(true);
    try {
      const res = await fetch('/api/cost-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: templateId || null,
          author: session?.user?.name || session?.user?.email || '',
        }),
      });
      const d = await res.json();
      if (d.success) {
        toast({ title: 'Cost sheet created' });
        router.replace(`/costing/sheets/${d.data._id}`);
      } else {
        toast({ title: 'Create failed', description: d.error, variant: 'destructive' });
        setShowingCreationError();
      }
    } catch {
      toast({ title: 'Create failed', variant: 'destructive' });
      setShowingCreationError();
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'vmd'].includes(session.user.role)) { router.push('/home'); return; }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router]);

  useEffect(() => {
    if (autoTemplateId && autoCreate && status !== 'loading' && session) {
      createSheet(autoTemplateId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTemplateId, autoCreate, status, session]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this cost sheet?')) return;
    const res = await fetch(`/api/cost-sheets/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) { toast({ title: 'Cost sheet deleted' }); loadAll(); }
    else toast({ title: 'Delete failed', description: d.error, variant: 'destructive' });
  };

  if (creating) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-400" />
          <p className="text-sm text-gray-500">Creating cost sheet…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList size={18} className="text-blue-600" /> Cost Sheets
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Standalone or SRD-linked sheets built from your reusable templates.
          </p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          <Plus size={15} /> New Cost Sheet
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
      ) : sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 border border-dashed border-gray-200 rounded-xl bg-white">
          <ClipboardList size={32} className="text-gray-300" />
          <p className="text-sm text-gray-500">No cost sheets yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
                <th className="py-2.5 px-4 text-left">Title</th>
                <th className="py-2.5 px-4 text-left">Template</th>
                <th className="py-2.5 px-4 text-left">Link</th>
                <th className="py-2.5 px-4 text-left">Updated</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {sheets.map(s => (
                <tr key={s._id} className="border-t border-gray-100 hover:bg-gray-50/60 cursor-pointer"
                  onClick={() => router.push(`/costing/sheets/${s._id}`)}>
                  <td className="py-2.5 px-4 font-medium text-gray-900">{s.title || 'Untitled'}</td>
                  <td className="py-2.5 px-4 text-gray-500">{s.templateName || <span className="text-gray-300">Blank sheet</span>}</td>
                  <td className="py-2.5 px-4">
                    {s.srdRefNo ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-2 py-0.5">
                        {s.srdRefNo}
                      </span>
                    ) : (
                      <span className="text-gray-300">Standalone</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-gray-400 text-xs">{s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '—'}</td>
                  <td className="py-2.5 px-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/costing/sheets/${s._id}`)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                      >
                        <FileEdit size={12} /> Open
                      </button>
                      <button
                        onClick={() => handleDelete(s._id)}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Template picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Choose a template</h3>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
              {templates.map(t => (
                <button
                  key={t._id}
                  onClick={() => { setShowPicker(false); createSheet(t._id); }}
                  className="w-full text-left flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    {t.description && <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                      {t.columns?.length || 0} cols
                    </span>
                    <ExternalLink size={13} className="text-gray-300" />
                  </div>
                </button>
              ))}
              <button
                onClick={() => { setShowPicker(false); createSheet(null); }}
                className="w-full text-left flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-700">Blank sheet (no template)</p>
                  <p className="text-xs text-gray-400">Start with nothing and define columns here.</p>
                </div>
                <Plus size={13} className="text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CostSheetsPage() {
  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
      }>
        <CostSheetsListContent />
      </Suspense>
    </Layout>
  );
}