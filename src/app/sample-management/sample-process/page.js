'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/use-toast';
import Layout from '@/components/layout/Layout';
import { Loader2, RefreshCw, Filter, X } from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function daysSince(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function getStageEntry(srd, stageSlug) {
  return (srd.sampleProcess || []).find(s => s.stage === stageSlug) || null;
}

function getBrand(srd) {
  return (
    srd.dynamicFields?.find(
      f => f.name?.toLowerCase() === 'brand' || f.slug === 'brand' || f.name?.toLowerCase() === 'buyer'
    )?.value || ''
  );
}

function getDescription(srd) {
  return (
    srd.dynamicFields?.find(
      f => f.name?.toLowerCase() === 'description' || f.slug === 'description'
    )?.value ||
    srd.title ||
    srd.description ||
    ''
  );
}

// Status for a SPECIFIC stage entry — shown in the "Current Status" column
// This reflects what's happening at THIS stage, not the overall SRD status.
function getStageStatus(srd, stageSlug) {
  const entry = (srd.sampleProcess || []).find(s => s.stage === stageSlug);

  if (!entry) {
    // Stage not initialised yet — SRD hasn't entered production
    const days = daysSince(srd.createdAt);
    if (days > 2) return { text: `Pending (${days}d)`, cls: 'text-red-600 font-semibold' };
    return { text: 'Pending', cls: 'text-orange-500 font-semibold' };
  }

  if (entry.status === 'completed' && entry.completedDate) {
    return { text: `Ready ${fmtDate(entry.completedDate)}`, cls: 'text-green-700 font-bold' };
  }

  if (entry.status === 'received' && entry.receivedDate) {
    return { text: `Received ${fmtDate(entry.receivedDate)}`, cls: 'text-blue-700 font-semibold' };
  }

  if (entry.status === 'in-progress') {
    return { text: 'In Progress', cls: 'text-blue-600 font-semibold' };
  }

  // pending — check delay
  const days = daysSince(srd.createdAt);
  if (days > 2) return { text: `Pending (${days}d — overdue)`, cls: 'text-red-600 font-semibold' };
  return { text: 'Pending', cls: 'text-orange-500 font-semibold' };
}

// ─── component ───────────────────────────────────────────────────────────────

export default function SampleProcessPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [srds, setSrds] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterInquiry, setFilterInquiry] = useState('');

  const userRole = session?.user?.role?.toLowerCase() || '';
  const canViewAll = userRole === 'admin' || userRole === 'vmd';

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [srdsRes, stagesRes] = await Promise.all([
        fetch('/api/srd'),                // ALL SRDs — no inProduction filter
        fetch('/api/production-stages'),
      ]);
      const srdsData = await srdsRes.json();
      const stagesData = await stagesRes.json();

      if (srdsData.success) setSrds(srdsData.data || []);

      if (stagesData.success) {
        const active = (stagesData.data || [])
          .filter(s => s.isActive)
          .sort((a, b) => a.order - b.order);

        // CAD is order:0 so it sorts first. If missing for any reason, prepend virtual entry.
        const hasCad = active.some(s => s.name?.toLowerCase() === 'cad');
        if (!hasCad) {
          active.unshift({ _id: 'cad-virtual', name: 'cad', displayName: 'CAD', order: 0, isActive: true });
        }
        setStages(active);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ─── brand list for filter ────────────────────────────────────────────────
  const allBrands = useMemo(() => {
    const set = new Set(srds.map(getBrand).filter(Boolean));
    return [...set].sort();
  }, [srds]);

  // ─── base visibility per role ─────────────────────────────────────────────
  const baseSrds = useMemo(() => {
    // Admin and VMD always see everything
    if (canViewAll) return srds;

    return srds.filter(srd => {
      // CAD: sees ALL SRDs (their job starts before production)
      if (userRole === 'cad') return true;

      // Other stage workers: see SRDs in production where their stage is active
      if (srd.inProduction) {
        return (srd.sampleProcess || []).some(
          s => s.stage === userRole && ['pending', 'in-progress', 'received'].includes(s.status)
        );
      }
      return false;
    });
  }, [srds, canViewAll, userRole]);

  // ─── apply search / brand / status filters ────────────────────────────────
  const filteredSrds = useMemo(() => {
    let list = baseSrds;
    if (filterBrand)   list = list.filter(s => getBrand(s) === filterBrand);
    if (filterInquiry) list = list.filter(s => s.refNo?.toLowerCase().includes(filterInquiry.toLowerCase()));
    if (filterStatus === 'pending')      list = list.filter(s => !s.inProduction && !s.isComplete);
    else if (filterStatus === 'in-progress') list = list.filter(s => s.inProduction && !s.isComplete);
    else if (filterStatus === 'completed')   list = list.filter(s => s.isComplete);
    return list;
  }, [baseSrds, filterBrand, filterInquiry, filterStatus]);

  // ─── which SRDs to show in each stage section ─────────────────────────────
  const srdsForStage = (stageSlug, stageIndex) => {
    if (stageIndex === 0) {
      // CAD section: only SRDs where CAD work is NOT yet completed
      // (once CAD marks Ready the SR moves to the next section only)
      return filteredSrds.filter(srd => {
        const cadEntry = (srd.sampleProcess || []).find(s => s.stage === stageSlug);
        // No sampleProcess initialised yet — still pending, show it
        if (!cadEntry) return true;
        // Show until CAD has completed (marked ready)
        return cadEntry.status !== 'completed' && !cadEntry.completedDate;
      });
    }

    return filteredSrds.filter(srd => {
      if (!srd.inProduction) return false;
      const sp = srd.sampleProcess || [];
      const prevSlug = stages[stageIndex - 1]?.name?.toLowerCase();
      const prevEntry = sp.find(s => s.stage === prevSlug);
      const thisEntry = sp.find(s => s.stage === stageSlug);
      // Show once the previous stage is completed/ready OR this stage is already active
      return (
        prevEntry?.status === 'completed' || !!prevEntry?.completedDate ||
        thisEntry?.status === 'received'  || thisEntry?.status === 'completed' ||
        !!thisEntry?.receivedDate
      );
    });
  };

  // ─── actions ─────────────────────────────────────────────────────────────
  const handleAction = async (srdId, stageSlug, action) => {
    const key = `${srdId}-${stageSlug}-${action}`;
    setActionLoading(key);
    try {
      const res = await fetch(`/api/srd/${srdId}/sample-process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, stage: stageSlug }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: action === 'complete' ? 'Marked Ready' : 'Received', description: data.message });
        fetchAll();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ─── permission helpers ───────────────────────────────────────────────────
  const canMarkReady = (srd, stageSlug, stageIndex) => {
    if (!(userRole === stageSlug || userRole === 'admin' || userRole === 'vmd')) return false;
    const entry = getStageEntry(srd, stageSlug);
    if (!entry || entry.status === 'completed' || entry.completedDate) return false;
    if (stageIndex === 0) return !!srd.inProduction; // CAD: just needs to be in production
    return !!entry.receivedDate; // others: must have received first
  };

  const canReceive = (srd, stageSlug, stageIndex) => {
    if (stageIndex === 0 || userRole !== stageSlug) return false;
    const entry = getStageEntry(srd, stageSlug);
    if (entry?.receivedDate || entry?.status === 'received') return false;
    const prevSlug = stages[stageIndex - 1]?.name?.toLowerCase();
    const prevEntry = getStageEntry(srd, prevSlug);
    return !!srd.inProduction && (prevEntry?.status === 'completed' || !!prevEntry?.completedDate);
  };

  // ─── render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 max-w-full">

        {/* ── page header ── */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Work Queue</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {canViewAll ? 'All SRDs across every stage' : `Your queue — ${userRole.toUpperCase()}`}
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        {/* ── filters ── */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />

          <div className="relative">
            <input
              type="text"
              placeholder="Search Inquiry #"
              value={filterInquiry}
              onChange={e => setFilterInquiry(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {filterInquiry && (
              <button onClick={() => setFilterInquiry('')} className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-gray-400" />
              </button>
            )}
          </div>

          <select
            value={filterBrand}
            onChange={e => setFilterBrand(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Brands</option>
            {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {(filterBrand || filterStatus || filterInquiry) && (
            <button
              onClick={() => { setFilterBrand(''); setFilterStatus(''); setFilterInquiry(''); }}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}

          <span className="text-xs text-gray-400 ml-auto">
            {filteredSrds.length} record{filteredSrds.length !== 1 ? 's' : ''}
          </span>
        </div>

        {filteredSrds.length === 0 ? (
          <div className="border-2 border-gray-200 bg-white p-10 text-center rounded">
            <p className="text-sm text-gray-400">No SRDs found. Try clearing the filters.</p>
          </div>
        ) : (
          <div className="border-2 border-gray-800 bg-white overflow-x-auto">

            {/* ── one section per stage ── */}
            {stages.map((stage, stageIndex) => {
              const slug = stage.name?.toLowerCase();
              const label = stage.displayName || stage.name?.toUpperCase();
              const isFirst = stageIndex === 0; // CAD
              const sectionRows = srdsForStage(slug, stageIndex);

              // Non-admin/vmd: only render their own section
              if (!canViewAll && userRole !== slug) return null;
              if (sectionRows.length === 0) return null;

              return (
                <div key={stage._id || slug} className="border-b-2 border-gray-800">

                  {/* stage heading */}
                  <div className="bg-gray-100 border-b border-gray-400 px-3 py-1.5">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-widest">{label}</span>
                  </div>

                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-300 text-gray-700">
                        <th className="px-2 py-1.5 text-left font-semibold border-r border-gray-200 w-20">Date</th>
                        <th className="px-2 py-1.5 text-left font-semibold border-r border-gray-200 w-28">Inq Ref No</th>
                        <th className="px-2 py-1.5 text-left font-semibold border-r border-gray-200 w-24">Brand</th>
                        <th className="px-2 py-1.5 text-left font-semibold border-r border-gray-200">Description</th>
                        {/* "Click To Receive" — hidden for first stage (CAD) */}
                        {!isFirst && (
                          <th className="px-2 py-1.5 text-center font-semibold border-r border-gray-200 w-36 text-blue-600">
                            Click To Receive
                          </th>
                        )}
                        <th className="px-2 py-1.5 text-left font-semibold border-r border-gray-200 w-52">Current Status</th>
                        <th className="px-2 py-1.5 text-center font-semibold w-36">
                          {isFirst ? '(Click to show Ready)' : 'Mark Ready'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.map((srd, rowIdx) => {
                        const entry    = getStageEntry(srd, slug);
                        const brand    = getBrand(srd);
                        const desc     = getDescription(srd);
                        const stageStatus = getStageStatus(srd, slug);
                        const showReady = canMarkReady(srd, slug, stageIndex);
                        const showRcv   = canReceive(srd, slug, stageIndex);
                        const readyKey  = `${srd._id}-${slug}-complete`;
                        const rcvKey    = `${srd._id}-${slug}-receive`;

                        const isReceived = !!entry?.receivedDate;
                        const isReady    = !!entry?.completedDate;

                        return (
                          <tr
                            key={srd._id}
                            className={`border-b border-gray-200 hover:bg-blue-50/60 transition-colors ${
                              rowIdx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                            }`}
                          >
                            {/* Date */}
                            <td className="px-2 py-1.5 border-r border-gray-200 text-gray-600">
                              {fmtDate(srd.createdAt)}
                            </td>

                            {/* Inq Ref No */}
                            <td className="px-2 py-1.5 border-r border-gray-200 font-semibold text-blue-700">
                              {srd.refNo}
                            </td>

                            {/* Brand */}
                            <td className="px-2 py-1.5 border-r border-gray-200 text-gray-700">
                              {brand || <span className="text-gray-300">—</span>}
                            </td>

                            {/* Description */}
                            <td className="px-2 py-1.5 border-r border-gray-200 text-gray-700 max-w-xs">
                              <span className="line-clamp-1">{desc || '—'}</span>
                            </td>

                            {/* Receive — only non-first stages */}
                            {!isFirst && (
                              <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                                {isReceived ? (
                                  <span className="text-blue-700 font-medium">
                                    Received {fmtDate(entry.receivedDate)}
                                  </span>
                                ) : showRcv ? (
                                  <button
                                    onClick={() => handleAction(srd._id, slug, 'receive')}
                                    disabled={actionLoading === rcvKey}
                                    className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-2.5 py-0.5 font-medium disabled:opacity-50"
                                  >
                                    {actionLoading === rcvKey && <Loader2 className="h-3 w-3 animate-spin" />}
                                    Receive
                                  </button>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            )}

                            {/* Current Status — this stage's status */}
                            <td className="px-2 py-1.5 border-r border-gray-200">
                              <span className={stageStatus.cls}>{stageStatus.text}</span>
                            </td>

                            {/* Ready */}
                            <td className="px-2 py-1.5 text-center">
                              {isReady ? (
                                <span className="text-green-700 font-bold">
                                  Ready {fmtDate(entry.completedDate)}
                                </span>
                              ) : showReady ? (
                                <button
                                  onClick={() => handleAction(srd._id, slug, 'complete')}
                                  disabled={actionLoading === readyKey}
                                  className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white rounded px-2.5 py-0.5 font-medium disabled:opacity-50"
                                >
                                  {actionLoading === readyKey && <Loader2 className="h-3 w-3 animate-spin" />}
                                  Ready
                                </button>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
