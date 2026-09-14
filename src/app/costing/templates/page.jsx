'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, Plus, LayoutTemplate, Trash2, FileEdit, Calendar } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useToast } from '@/lib/use-toast';

export default function CostSheetTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cost-sheet-templates');
      const data = await res.json();
      if (data.success) setTemplates(data.data || []);
      else toast({ title: 'Error', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Failed to load templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'vmd'].includes(session.user.role)) { router.push('/home'); return; }
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this template? Existing sheets keep their saved columns.')) return;
    const res = await fetch(`/api/cost-sheet-templates/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast({ title: 'Template deleted' });
      loadTemplates();
    } else {
      toast({ title: 'Delete failed', description: data.error, variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <LayoutTemplate size={18} className="text-blue-600" /> Cost Sheet Templates
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Design reusable cost sheets — add any columns, formulas and press Enter to add rows as you type.
            </p>
          </div>
          <button
            onClick={() => router.push('/costing/templates/new')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            <Plus size={15} /> New Template
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 border border-dashed border-gray-200 rounded-xl bg-white">
            <LayoutTemplate size={32} className="text-gray-300" />
            <p className="text-sm text-gray-500">No templates yet. Create your first cost sheet template.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map(t => (
              <div key={t._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{t.name}</h3>
                    {t.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 shrink-0">
                    {t.columns?.length || 0} col{(t.columns?.length || 0) === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {(t.columns || []).slice(0, 12).map(c => (
                    <span
                      key={c.key}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        c.type === 'formula'
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                          : c.type === 'number'
                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                            : 'bg-gray-50 text-gray-500 border border-gray-100'
                      }`}
                    >
                      {c.label || c.key}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Calendar size={11} />
                    {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : '—'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/costing/templates/${t._id}`)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-600 hover:text-blue-600 rounded hover:bg-blue-50"
                    >
                      <FileEdit size={12} /> Edit
                    </button>
                    <button
                      onClick={() => router.push(`/costing/sheets?create=1&template=${t._id}`)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 rounded hover:bg-blue-50"
                    >
                      <Plus size={12} /> New Sheet
                    </button>
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}