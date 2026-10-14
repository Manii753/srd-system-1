'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Loader2, AlertCircle, ArrowLeft, Save, Wand2, RotateCcw, Link2, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useToast } from '@/lib/use-toast';
import FieldMappingEditor from '../_components/FieldMappingEditor';
import { autoDetectMapping } from '@/lib/costingSources';

/**
 * /costing/field-map — configure the Costing ➜ SR field connection.
 *
 * Every SR form field comes from the Field collection, so this page lists that
 * live set and lets you point each one at a value on the costing sheet.
 * The connection is stored per side (pre / post) and is what the
 * "Raise SR" dialog reads when it builds a new Sample Request.
 */

const SIDES = [
  { key: 'pre',  label: 'Pre-Costing' },
  { key: 'post', label: 'Post-Costing' },
];

export default function FieldMapPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'vmd'].includes(session.user.role)) {
      router.push('/home');
    }
  }, [session, status, router]);

  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
      }>
        <FieldMapShell />
      </Suspense>
    </Layout>
  );
}

function FieldMapShell() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const side = searchParams.get('side') === 'post' ? 'post' : 'pre';

  const switchSide = (next) => {
    if (next !== side) router.push(`/costing/field-map?side=${next}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/costing" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft size={14} /> Costing
        </Link>
        <span>/</span>
        <span className="text-blue-700 font-semibold flex items-center gap-1">
          <Link2 size={13} /> Field Mapping
        </span>
      </div>

      <div>
        <h1 className="text-lg font-bold text-gray-900">Costing → SR Field Mapping</h1>
        <p className="text-xs text-gray-500 mt-1">
          Decides what is copied from a costing sheet when you press
          <strong className="text-gray-700"> Raise SR</strong>. Each SR form field can be fed by
          at most one costing value.
        </p>
      </div>

      {/* Side switcher */}
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
        {SIDES.map(s => (
          <button
            key={s.key}
            onClick={() => switchSide(s.key)}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
              side === s.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Keyed so switching sides remounts with clean state. */}
      <FieldMapEditor key={side} side={side} />
    </div>
  );
}

function FieldMapEditor({ side }) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [fields, setFields]       = useState([]);
  const [mapping, setMapping]     = useState({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const [savedAt, setSavedAt]     = useState(null);
  const [isSaved, setIsSaved]     = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/costing/field-map?side=${side}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || 'Failed to load the field list');
        setFields(json.fields || []);
        setMapping(json.mapping || {});
        setSavedAt(json.updatedAt);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [side]);

  const handleMappingChange = (next) => { setMapping(next); setIsSaved(false); };

  const handleAutoDetect = () => {
    if (!fields.length) return;
    setMapping(autoDetectMapping(fields));
    setIsSaved(false);
    toast({ title: 'Connections guessed from field names — review and save' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/costing/field-map', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          side,
          mapping,
          author: session?.user?.name || session?.user?.email,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || `Server error ${res.status}`);
      setMapping(json.mapping || {});
      setSavedAt(json.updatedAt);
      setIsSaved(true);
      toast({ title: json.message || 'Field connections saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMapping({});
    setIsSaved(false);
    setSavedAt(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex-1 text-[11px]">
          {isSaved
            ? <span className="inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 size={12} />
                {savedAt
                  ? `Saved ${new Date(savedAt).toLocaleString()}`
                  : 'No custom connections saved yet — showing auto-detected defaults'}
              </span>
            : <span className="inline-flex items-center gap-1 text-amber-600">
                <AlertCircle size={12} /> Unsaved changes
              </span>}
        </span>
        <button
          onClick={handleAutoDetect}
          disabled={loading || saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg transition-colors"
        >
          <Wand2 size={13} /> Auto-detect
        </button>
        <button
          onClick={handleReset}
          disabled={loading || saving}
          title="Clear every connection"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg transition-colors"
        >
          <RotateCcw size={13} /> Clear all
        </button>
        <button
          onClick={handleSave}
          disabled={loading || saving || isSaved}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? 'Saving…' : 'Save connections'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-blue-400" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      ) : (
        <FieldMappingEditor
          fields={fields}
          mapping={mapping}
          onChange={handleMappingChange}
        />
      )}
    </>
  );
}