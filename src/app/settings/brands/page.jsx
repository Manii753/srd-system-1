'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Pencil, Trash2, X, Loader2, Merge } from 'lucide-react';
import { toast } from 'sonner';

export default function BrandsPage() {
  const { data: session, status } = useSession();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [mergeName, setMergeName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const isAdmin = status !== 'loading' && session?.user?.role === 'admin';

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/srd/brands');
      const d = await res.json();
      if (d.success) setTypes(d.data || []);
      else toast.error(d.error || 'Failed to load brands');
    } catch {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetch('/api/srd/brands')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setTypes(d.data || []);
        else toast.error(d.error || 'Failed to load brands');
      })
      .catch(() => { if (!cancelled) toast.error('Failed to load brands'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return types;
    return types.filter(
      (t) =>
        t.canonical.toLowerCase().includes(q) ||
        (t.variants || []).some((v) => v.value.toLowerCase().includes(q))
    );
  }, [types, filter]);

  const selectedRows = useMemo(
    () => types.filter((t) => selected.has(t.canonical)),
    [types, selected]
  );

  const totalAssociations = useMemo(
    () => types.reduce((sum, t) => sum + t.count, 0),
    [types]
  );

  const toggle = (canonical) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(canonical)) next.delete(canonical);
      else next.add(canonical);
      return next;
    });

  const runOperation = async (values, newValue, summary) => {
    if (values.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/srd/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values, newValue }),
      });
      const d = await res.json();
      if (d.success) {
        if (d.modifiedCount) toast.success(`${summary} Updated ${d.modifiedCount} SRD(s).`);
        else toast.success('No SRDs matched.');
        setSelected(new Set());
        setMergeName('');
        setRenaming(null);
        setDeleting(null);
        await load();
      } else {
        toast.error(d.error || 'Operation failed');
      }
    } catch {
      toast.error('Operation failed');
    } finally {
      setBusy(false);
    }
  };

  const handleMerge = () => {
    const target = mergeName.trim();
    if (selectedRows.length < 2) {
      toast.error('Select at least two brands to merge');
      return;
    }
    if (!target) {
      toast.error('Enter the name for the merged brand');
      return;
    }
    const affected = selectedRows.reduce((sum, t) => sum + t.count, 0);
    if (!confirm(`Merge ${selectedRows.length} brands (${affected} SRDs) into "${target}"?`)) return;
    const values = selectedRows.flatMap((t) => (t.variants || []).map((v) => v.value));
    runOperation(values, target, `Merged into "${target}".`);
  };

  const handleRename = () => {
    if (!renaming) return;
    const target = renaming.newValue.trim();
    if (!target) {
      toast.error('Enter the new name');
      return;
    }
    const values = renaming.variants.map((v) => v.value);
    runOperation(values, target, `Renamed "${renaming.canonical}" to "${target}".`);
  };

  const handleDelete = () => {
    if (!deleting) return;
    if (!confirm(`Clear brand "${deleting.canonical}" from ${deleting.count} SRD(s)?`)) return;
    const values = deleting.variants.map((v) => v.value);
    runOperation(values, '', `Deleted "${deleting.canonical}".`);
  };

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600 font-medium">Admin access required.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full overflow-y-auto custom-scrollbar p-2">
        <div className="space-y-6">
          <div>
            <h1 className="text-app-heading font-bold text-gray-900">Brand Manager</h1>
            <p className="text-app-text text-gray-600 mt-1">
              Rename, merge or delete brand values. Changes are applied to every SRD that uses the value.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-app-text font-medium text-gray-500">Brands</p>
              <p className="text-app-heading font-bold text-2xl mt-1">{types.length}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-app-text font-medium text-gray-500">SRDs Using These Brands</p>
              <p className="text-app-heading font-bold text-2xl mt-1">{totalAssociations}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-app-text font-medium text-gray-500">Selected for Merge</p>
              <p className="text-app-heading font-bold text-2xl mt-1">{selected.size}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search brands..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Merge bar */}
          <div
            className={`flex items-center gap-2 flex-wrap p-3 rounded-lg border transition-colors ${
              selectedRows.length >= 2
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <span className="text-sm font-medium text-gray-700">
              {selectedRows.length >= 2
                ? `Merge ${selectedRows.length} selected brands:`
                : 'Select two or more brands below to merge them into one.'}
            </span>
            {selectedRows.length >= 2 && (
              <>
                <Input
                  type="text"
                  placeholder="New merged brand name"
                  value={mergeName}
                  onChange={(e) => setMergeName(e.target.value)}
                  className="flex-1 min-w-[200px]"
                  maxLength={60}
                />
                <Button
                  onClick={handleMerge}
                  disabled={busy}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
                  Merge {selectedRows.length} into one
                </Button>
              </>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500">No brands found.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-4 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                      SRDs
                    </th>
                    <th className="px-4 py-3 text-right text-app-text font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((t) => (
                    <tr key={t.canonical} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(t.canonical)}
                          onChange={() => toggle(t.canonical)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-app-text font-semibold text-gray-900">{t.canonical}</span>
                        {t.variants.length > 1 && (
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-400">
                            {t.variants.map((v) => (
                              <span key={v.value}>
                                {v.value} ({v.count})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-app-text text-sm text-gray-600">{t.count}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            setRenaming({
                              canonical: t.canonical,
                              count: t.count,
                              variants: t.variants,
                              newValue: t.canonical,
                            })
                          }
                          className="text-blue-600 hover:text-blue-900"
                          title="Rename"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            setDeleting({
                              canonical: t.canonical,
                              count: t.count,
                              variants: t.variants,
                            })
                          }
                          className="text-red-600 hover:text-red-900 ml-1"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      {renaming && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-app-heading font-semibold">Rename Brand</h2>
              <button className="text-gray-500 hover:text-gray-800" onClick={() => setRenaming(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Renaming <strong>{renaming.canonical}</strong> ({renaming.count} SRD(s)) to a new value
                updates every SRD that uses it.
              </p>
              <Input
                type="text"
                value={renaming.newValue}
                onChange={(e) => setRenaming({ ...renaming, newValue: e.target.value })}
                placeholder="New brand name"
                maxLength={60}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setRenaming(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRename}
                  disabled={busy || !renaming.newValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rename'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}