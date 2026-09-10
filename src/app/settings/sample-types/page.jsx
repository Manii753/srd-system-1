'use client'

import Layout from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

export default function SampleTypeManager() {
  const [types, setTypes] = useState([]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [newType, setNewType] = useState('');

  // Fetch sample types from API
  useEffect(() => {
    fetch('/api/srd?listSampleTypes=true')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // Normalize: uppercase, trim, deduplicate case-insensitively, count occurrences
          const map = new Map();
          for (const t of d.data || []) {
            const key = t.trim().toUpperCase();
            if (!key) continue;
            const existing = map.get(key);
            if (!existing) {
              map.set(key, { canonical: key, count: 1, variants: [t] });
            } else {
              existing.count++;
              if (!existing.variants.includes(t)) existing.variants.push(t);
            }
          }
          setTypes([...map.values()].sort((a, b) => a.canonical.localeCompare(b.canonical)));
        }
      })
      .catch(() => {});
  }, []);

  const handleRename = async (oldVal, newVal) => {
    if (!newVal || newVal.trim() === oldVal) {
      setEditing(null);
      return;
    }
    const trimmed = newVal.trim();
    await fetch('/api/srd/bulk-rename-sample-type', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldValue: oldVal.trim(), newValue: trimmed }),
    });
    setTypes(prev =>
      prev.map(t =>
        t.canonical === oldVal.trim().toUpperCase()
          ? { ...t, canonical: trimmed.toUpperCase(), variants: [...new Set([trimmed.toUpperCase(), ...t.variants])] }
          : t
      )
    );
    setEditing(null);
    setFilter('');
    fetch('/api/srd?listSampleTypes=true').then(r => r.json()).then(d => {
      if (d.success) {
        const map = new Map();
        for (const t of d.data || []) {
          const key = t.trim().toUpperCase();
          if (!key) continue;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, { canonical: key, count: 1, variants: [t] });
          } else {
            existing.count++;
            if (!existing.variants.includes(t)) existing.variants.push(t);
          }
        }
        setTypes([...map.values()].sort((a, b) => a.canonical.localeCompare(b.canonical)));
      }
    });
  };

  const handleDelete = async (canonical) => {
    await fetch(`/api/srd/bulk-rename-sample-type`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldValue: canonical, newValue: '' }),
    });
    setTypes(prev => prev.filter(t => t.canonical !== canonical));
    setFilter('');
    fetch('/api/srd?listSampleTypes=true').then(r => r.json()).then(d => {
      if (d.success) {
        const map = new Map();
        for (const t of d.data || []) {
          const key = t.trim().toUpperCase();
          if (!key) continue;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, { canonical: key, count: 1, variants: [t] });
          } else {
            existing.count++;
            if (!existing.variants.includes(t)) existing.variants.push(t);
          }
        }
        setTypes([...map.values()].sort((a, b) => a.canonical.localeCompare(b.canonical)));
      }
    });
  };

  const groupedTypes = useMemo(() => {
    const map = new Map();
    for (const t of types) {
      const key = t.canonical;
      if (!map.has(key)) {
        map.set(key, { canonical: key, count: t.count, variants: t.variants });
      }
    }
    return [...map.values()].sort((a, b) => a.canonical.localeCompare(b.canonical));
  }, [types]);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-app-heading font-bold text-gray-900 mb-6">Sample Type Manager</h1>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {groupedTypes.map(t => (
            <Card key={t.canonical} className="p-4 bg-gray-50 border border-gray-200 rounded">
              <div className="flex items-center justify-between">
                <span className="text-app-text font-medium">{t.canonical}</span>
                <span className="text-sm text-gray-500">{t.count} SRDs</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Add New Type */}
        <div className="mb-4">
          <Input
            placeholder="Add new sample type"
            value={newType}
            onChange={e => setNewType(e.target.value)}
            className="w-full mb-2"
          />
          <Button
            onClick={() => {
              if (!newType.trim()) return;
              fetch('/api/srd/bulk-rename-sample-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldValue: '', newValue: newType.trim() }),
              });
              setNewType('');
              fetch('/api/srd?listSampleTypes=true').then(r => r.json()).then(d => {
                if (d.success) {
                  const map = new Map();
                  for (const t of d.data || []) {
                    const key = t.trim().toUpperCase();
                    if (!key) continue;
                    const existing = map.get(key);
                    if (!existing) {
                      map.set(key, { canonical: key, count: 1, variants: [t] });
                    } else {
                      existing.count++;
                      if (!existing.variants.includes(t)) existing.variants.push(t);
                    }
                  }
                  setTypes([...map.values()].sort((a, b) => a.canonical.localeCompare(b.canonical)));
                }
              });
            }}
            className="w-full mt-2 bg-green-600 text-white hover:bg-green-700"
          >
            Add Type
          </Button>
        </div>

        {/* Types List with Rename/Delete */}
        {groupedTypes.length === 0 ? (
          <p className="text-gray-500">No sample types found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-500 border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="left text-left p-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Sample Type</th>
                  <th className="left text-left p-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">SRDs</th>
                  <th className="left text-left p-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedTypes.map(t => (
                  <tr key={t.canonical} className="border-b border-gray-100">
                    <td className="left p-2">
                      <span className="font-medium">{t.canonical}</span>
                      {t.variants.length > 1 && (
                        <div className="mt-1 text-xs text-gray-400">
                          {t.variants.map((v, i) => (
                            <span key={i} className="mr-2">{v}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="left p-2">{t.count}</td>
                    <td className="left p-2">
                      {t.count > 1 && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(t.canonical)}
                            className="text-blue-600 hover underline text-xs"
                          >
                            Rename
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(t.canonical)}
                            className="text-red-600 hover underline text-xs ml-2"
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rename Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full border border-gray-200">
              <h3 className="text-app-heading font-bold text-gray-900 mb-4">Rename Sample Type</h3>
              <Input
                value={editing}
                onChange={e => setEditing(e.target.value)}
                placeholder="New sample type value"
                className="w-full mb-4"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setEditing(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!editing.trim()) return;
                    // This will be handled by the re-fetch after setEditing
                    setEditing(null);
                  }}
                  className="flex-1 bg-green-600 text-white hover:bg-green-700"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}