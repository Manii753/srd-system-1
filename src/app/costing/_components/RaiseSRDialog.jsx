'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, FilePlus2, ExternalLink, AlertCircle, CheckCircle2, Settings2 } from 'lucide-react';
import { useToast } from '@/lib/use-toast';

/**
 * RaiseSRDialog — raises a brand new Sample Request (SRD) with its fields
 * pre-filled from the costing sheet.
 *
 * The mapping is done server-side by GET /api/costing/[id]/raise-sr, which
 * returns one "item" per matched SRD field. The user unticks anything they
 * don't want, and the surviving `dynamicFields` are POSTed to the canonical
 * /api/srd endpoint (which owns refNo, status, stages and notifications).
 */
export default function RaiseSRDialog({ open, onOpenChange, srdId, type = 'pre' }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-gray-100 space-y-1">
          <DialogTitle className="text-base flex items-center gap-2">
            <FilePlus2 size={16} className="text-blue-600" /> Raise a new Sample Request
          </DialogTitle>
          <DialogDescription className="text-xs">
            Creates a new SR with the fields below pre-filled from this costing sheet.
            Untick anything you don&apos;t want carried over.
          </DialogDescription>
        </DialogHeader>

        {/* Keyed so switching costing sheets resets the form state cleanly. */}
        {srdId && (
          <RaiseSRForm
            key={srdId}
            srdId={srdId}
            type={type}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Link to the field-mapping settings ──────────────────────────────────────

function MappingLink({ type }) {
  return (
    <a
      href={`/costing/field-map?side=${type === 'post' ? 'post' : 'pre'}`}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline whitespace-nowrap"
    >
      <Settings2 size={11} /> Configure what goes where
    </a>
  );
}

// ─── Form: loads the mapping plan, lets the user pick fields, raises the SR ──

function RaiseSRForm({ srdId, type, onClose }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/costing/${srdId}/raise-sr?type=${type}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (!json.success) throw new Error(json.error || 'Failed to build the SR');
        setPlan(json);
        setSelected(Object.fromEntries((json.items || []).map(i => [i.key, true])));
        setTitle(json.title || '');
      })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [srdId, type]);

  const groups = useMemo(() => {
    const map = new Map();
    (plan?.items || []).forEach(i => {
      if (!map.has(i.group)) map.set(i.group, []);
      map.get(i.group).push(i);
    });
    return [...map.entries()];
  }, [plan]);

  const toggleGroup = (items, on) =>
    setSelected(prev => {
      const next = { ...prev };
      items.forEach(i => { next[i.key] = on; });
      return next;
    });

  const handleRaise = async () => {
    if (!plan) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/srd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          createdBy: {
            id: session?.user?.id || session?.user?.email,
            name: session?.user?.name,
            role: session?.user?.role,
          },
          dynamicFields: plan.items.filter(i => selected[i.key]).map(i => i.field),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || `Server error ${res.status}`);

      toast({ title: `${json.data.refNo} raised from ${type === 'post' ? 'post' : 'pre'}-costing` });
      onClose();
      router.push(`/srd/${json.data._id}`);
    } catch (err) {
      toast({ title: 'Could not raise SR', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const count = (plan?.items || []).filter(i => selected[i.key]).length;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Matching costing fields…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {!loading && !error && plan?.linkedSrd && (
          <div className="flex items-center justify-between gap-3 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
            <span className="flex items-center gap-2 text-blue-800">
              <CheckCircle2 size={14} className="shrink-0" />
              This sheet is already linked to <strong>{plan.linkedSrd.refNo}</strong>.
            </span>
            <a
              href={`/srd/${plan.linkedSrd._id}`}
              className="shrink-0 inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
            >
              Open SR <ExternalLink size={11} />
            </a>
          </div>
        )}

        {!loading && !error && plan?.items?.length > 0 && (
          <div className="flex items-center justify-between gap-3 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span className="text-gray-600">
              {plan.connectedCount} of {plan.sourceCount} costing values are connected to SR fields
              {plan.mappingSaved ? '' : ' (auto-detected — not saved yet)'}
            </span>
            <MappingLink type={type} />
          </div>
        )}

        {!loading && !error && plan && !plan.items?.length && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              Nothing will be pre-filled — no costing value on this sheet is connected to an SR
              field yet.
            </div>
            <MappingLink type={type} />
          </div>
        )}

        {!loading && !error && plan && (
          <>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                SR Title
              </label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Leave blank to use the generated title"
                className="h-8 text-xs"
              />
            </div>

            {groups.map(([group, items]) => (
              <div key={group} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-3 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {group}
                  </span>
                  <button
                    onClick={() => toggleGroup(items, !items.every(i => selected[i.key]))}
                    className="text-[10px] font-medium text-blue-600 hover:underline"
                  >
                    {items.every(i => selected[i.key]) ? 'None' : 'All'}
                  </button>
                </div>
                <ul className="divide-y divide-gray-100">
                  {items.map(item => (
                    <li key={item.key} className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50/70">
                      <Checkbox
                        checked={!!selected[item.key]}
                        onCheckedChange={() => setSelected(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className="mt-0.5"
                        aria-label={`Include ${item.label}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-800">{item.label}</span>
                          <span className="text-[10px] text-gray-400">
                            → {item.target}
                            {item.type === 'table' && item.columns?.length
                              ? ` (${item.columns.join(', ')})`
                              : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5" title={item.preview}>
                          {item.type === 'table'
                            ? `${item.rows} row${item.rows === 1 ? '' : 's'} — ${item.preview}`
                            : item.preview}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>

      <DialogFooter className="px-6 py-3 border-t border-gray-100">
        <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleRaise}
          disabled={loading || submitting || !!error || !plan}
          className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
        >
          {submitting
            ? <><Loader2 size={12} className="mr-1 animate-spin" /> Raising…</>
            : <><FilePlus2 size={12} className="mr-1" /> Raise SR{count ? ` (${count} field${count === 1 ? '' : 's'})` : ''}</>}
        </Button>
      </DialogFooter>
    </>
  );
}