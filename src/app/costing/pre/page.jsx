'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Loader2, AlertCircle, ArrowLeft, ClipboardList,
  CheckCircle2, Clock, Send, XCircle, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600',  Icon: Clock },
  submitted: { label: 'Submitted', cls: 'bg-blue-50 text-blue-600',   Icon: Send },
  approved:  { label: 'Approved',  cls: 'bg-green-50 text-green-700', Icon: CheckCircle2 },
  rejected:  { label: 'Rejected',  cls: 'bg-red-50 text-red-600',     Icon: XCircle },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${m.cls}`}>
      <Icon size={10} />{m.label}
    </span>
  );
}

const fmt2 = (v) =>
  (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── List content ─────────────────────────────────────────────────────────────

function PreCostingListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If a srdId is passed, redirect to the detail view (legacy URL compat)
  const srdIdParam = searchParams.get('srdId');

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    if (srdIdParam) return; // handled below
    const load = async () => {
      setLoading(true);
      try {
        const res  = await fetch('/api/costing');
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        setItems(json.data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [srdIdParam]);

  // ── If a srdId query param is present, go directly to detail ──────────────
  if (srdIdParam) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-gray-600 text-sm">{error}</p>
        <Link href="/costing" className="text-blue-600 hover:underline text-sm font-medium">← Back to Costing</Link>
      </div>
    );
  }

  // Filter items that have a pre-costing record
  const filtered = items
    .filter(item => item.preCost)
    .filter(item => filterStatus === 'all' || item.preCost?.status === filterStatus)
    .filter(item => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.srd?.refNo?.toLowerCase().includes(q) ||
        item.preCost?.buyer?.toLowerCase().includes(q) ||
        item.preCost?.style?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/costing" className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft size={14} /> Costing
          </Link>
          <span>/</span>
          <span className="text-blue-700 font-semibold flex items-center gap-1">
            <ClipboardList size={13} /> Pre-Costing
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-gray-900 flex-1">Pre-Costing List</h1>
        <span className="text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by SRD ref, buyer, style…"
          className="flex-1 min-w-[200px] h-8 px-3 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-200"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No pre-costing records found.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">SRD</th>
                <th className="px-4 py-2.5 text-left">Buyer</th>
                <th className="px-4 py-2.5 text-left">Style</th>
                <th className="px-4 py-2.5 text-right">Total Cost</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-right">Last Updated</th>
                <th className="px-2 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const pre = item.preCost;
                return (
                  <tr
                    key={item._id}
                    onClick={() => router.push(`/costing/pre/${item.srd?._id || item._id}`)}
                    className="border-b border-gray-100 hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-2.5 font-semibold text-gray-900 font-mono">
                      {item.srd?.refNo || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{pre?.buyer || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-gray-700">{pre?.style || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {pre?.total > 0
                        ? <>{pre.currency || 'USD'} {fmt2(pre.total)}</>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusBadge status={pre?.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-2 py-2.5 text-gray-300 group-hover:text-blue-400">
                      <ChevronRight size={14} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PreCostingPage() {
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
        <PreCostingListContent />
      </Suspense>
    </Layout>
  );
}
