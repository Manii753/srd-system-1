'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/use-toast';
import Layout from '@/components/layout/Layout';
import { Loader2, RefreshCw, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
  return srd.dynamicFields?.find(
    f => f.name?.toLowerCase() === 'brand' || f.slug === 'brand' || f.name?.toLowerCase() === 'buyer'
  )?.value || '';
}

function getDescription(srd) {
  return srd.dynamicFields?.find(
    f => f.name?.toLowerCase() === 'description' || f.slug === 'description'
  )?.value || srd.title || srd.description || '';
}

function getStageStatus(srd, stageSlug) {
  const entry = (srd.sampleProcess || []).find(s => s.stage === stageSlug);
  if (!entry) {
    const d = daysSince(srd.createdAt);
    if (d > 2) return { text: `Pending (${d}d)`, cls: 'text-red-500' };
    return { text: 'Pending', cls: 'text-orange-500' };
  }
  if (entry.status === 'completed' && entry.completedDate)
    return { text: `Ready ${fmtDate(entry.completedDate)}`, cls: 'text-green-700 font-semibold' };
  if (entry.status === 'received' || entry.receivedDate)
    return { text: `Received ${fmtDate(entry.receivedDate)}`, cls: 'text-blue-600 font-semibold' };
  if (entry.status === 'in-progress')
    return { text: 'In Progress', cls: 'text-blue-500' };
  const d = daysSince(srd.createdAt);
  if (d > 2) return { text: `Pending (${d}d)`, cls: 'text-red-500' };
  return { text: 'Pending', cls: 'text-orange-500' };
}

// ─── component ───────────────────────────────────────────────────────────────

export default function SampleProcessPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [srds, setSrds] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterInquiry, setFilterInquiry] = useState('');
  const [filterStage, setFilterStage] = useState(''); // '' = all stages

  const userRole = session?.user?.role?.toLowerCase() || '';
  const canViewAll = userRole === 'admin' || userRole === 'vmd';

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filterBrand, filterStatus, filterInquiry, filterStage]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [srdsRes, stagesRes, companyRes] = await Promise.all([
        fetch('/api/srd'),
        fetch('/api/production-stages'),
        fetch('/api/company'),
      ]);
      const srdsData   = await srdsRes.json();
      const stagesData = await stagesRes.json();
      const company    = await companyRes.json();

      if (srdsData.success) setSrds(srdsData.data || []);

      const pg = company?.paginationSettings;
      if (pg?.srdList?.itemsPerPage)      setItemsPerPage(pg.srdList.itemsPerPage);
      else if (pg?.itemsPerPage)          setItemsPerPage(pg.itemsPerPage);

      if (stagesData.success) {
        const active = (stagesData.data || []).filter(s => s.isActive).sort((a, b) => a.order - b.order);
        if (!active.some(s => s.name?.toLowerCase() === 'cad')) {
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

  const allBrands = useMemo(() => {
    const set = new Set(srds.map(getBrand).filter(Boolean));
    return [...set].sort();
  }, [srds]);

  const baseSrds = useMemo(() => {
    if (canViewAll) return srds;
    return srds.filter(srd => {
      if (userRole === 'cad') return true;
      if (srd.inProduction) {
        return (srd.sampleProcess || []).some(
          s => s.stage === userRole && ['pending', 'in-progress', 'received'].includes(s.status)
        );
      }
      return false;
    });
  }, [srds, canViewAll, userRole]);

  const filteredSrds = useMemo(() => {
    let list = baseSrds;
    if (filterBrand)   list = list.filter(s => getBrand(s) === filterBrand);
    if (filterInquiry) list = list.filter(s => s.refNo?.toLowerCase().includes(filterInquiry.toLowerCase()));
    if (filterStatus === 'pending')          list = list.filter(s => !s.inProduction && !s.isComplete);
    else if (filterStatus === 'in-progress') list = list.filter(s => s.inProduction && !s.isComplete);
    else if (filterStatus === 'completed')   list = list.filter(s => s.isComplete);
    return list;
  }, [baseSrds, filterBrand, filterInquiry, filterStatus]);

  const srdsForStage = (stageSlug, stageIndex) => {
    if (stageIndex === 0) {
      return filteredSrds.filter(srd => {
        const e = getStageEntry(srd, stageSlug);
        if (!e) return true;
        return e.status !== 'completed' && !e.completedDate;
      });
    }
    return filteredSrds.filter(srd => {
      if (!srd.inProduction) return false;
      const sp = srd.sampleProcess || [];
      const prevSlug  = stages[stageIndex - 1]?.name?.toLowerCase();
      const prevEntry = sp.find(s => s.stage === prevSlug);
      const thisEntry = sp.find(s => s.stage === stageSlug);
      return (
        prevEntry?.status === 'completed' || !!prevEntry?.completedDate ||
        thisEntry?.status === 'received'  || thisEntry?.status === 'completed' ||
        !!thisEntry?.receivedDate
      );
    });
  };

  // Build a flat list of rows for the single table:
  // each item is either { type:'header', label, slug, count }
  // or { type:'row', srd, stageSlug, stageIndex }
  const flatRows = useMemo(() => {
    const rows = [];
    stages.forEach((stage, stageIndex) => {
      const slug  = stage.name?.toLowerCase();
      const label = stage.displayName || stage.name?.toUpperCase();

      if (!canViewAll && userRole !== slug) return;
      // Stage filter: skip if a specific stage is selected and this isn't it
      if (filterStage && slug !== filterStage) return;

      const sectionSrds = srdsForStage(slug, stageIndex);
      if (sectionSrds.length === 0) return;

      rows.push({ type: 'header', label, slug, stageIndex, count: sectionSrds.length });
      sectionSrds.forEach(srd => rows.push({ type: 'row', srd, slug, stageIndex }));
    });
    return rows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSrds, stages, canViewAll, userRole, filterStage]);

  // Pagination on the flat rows (headers always stay with their group —
  // we paginate only the data rows, headers follow their group)
  const dataRows    = flatRows.filter(r => r.type === 'row');
  const totalPages  = Math.max(1, Math.ceil(dataRows.length / itemsPerPage));
  const startIdx    = (currentPage - 1) * itemsPerPage;
  const endIdx      = startIdx + itemsPerPage;

  // Build the visible rows: include a header if at least one of its rows is in the page window
  const visibleRows = useMemo(() => {
    let dataCount = 0;
    const result = [];
    let pendingHeader = null;

    for (const row of flatRows) {
      if (row.type === 'header') {
        pendingHeader = row;
      } else {
        // data row
        if (dataCount >= startIdx && dataCount < endIdx) {
          if (pendingHeader) { result.push(pendingHeader); pendingHeader = null; }
          result.push(row);
        }
        dataCount++;
        if (dataCount >= endIdx) break;
      }
    }
    return result;
  }, [flatRows, startIdx, endIdx]);

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

  const canMarkReady = (srd, stageSlug, stageIndex) => {
    if (!(userRole === stageSlug || userRole === 'admin' || userRole === 'vmd')) return false;
    const entry = getStageEntry(srd, stageSlug);
    if (entry?.status === 'completed' || entry?.completedDate) return false;
    if (stageIndex === 0) {
      const cadApproved = (srd.status || []).some(s => s.department === 'cad' && s.value === 'approved');
      return !!srd.inProduction || cadApproved;
    }
    return !!entry?.receivedDate;
  };

  const canReceive = (srd, stageSlug, stageIndex) => {
    if (stageIndex === 0 || userRole !== stageSlug) return false;
    const entry = getStageEntry(srd, stageSlug);
    if (entry?.receivedDate || entry?.status === 'received') return false;
    const prevSlug  = stages[stageIndex - 1]?.name?.toLowerCase();
    const prevEntry = getStageEntry(srd, prevSlug);
    return !!srd.inProduction && (prevEntry?.status === 'completed' || !!prevEntry?.completedDate);
  };

  // ─── header bar ──────────────────────────────────────────────────────────
  const headerBar = (
    <div className="flex items-center gap-2 w-full">
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search Inquiry #"
          value={filterInquiry}
          onChange={e => setFilterInquiry(e.target.value)}
          className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white w-44"
        />
      </div>

      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm">
        <Filter className="h-3.5 w-3.5 text-gray-400" />
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
          className="border-0 focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-700 font-medium">
          <option value="">All Stages</option>
          {stages.map(s => (
            <option key={s._id || s.name} value={s.name?.toLowerCase()}>
              {s.displayName || s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm">
        <Filter className="h-3.5 w-3.5 text-gray-400" />
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
          className="border-0 focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-700 font-medium">
          <option value="">All Brands</option>
          {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm">
        <Filter className="h-3.5 w-3.5 text-gray-400" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border-0 focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-700 font-medium">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {(filterBrand || filterStatus || filterInquiry || filterStage) && (
        <button onClick={() => { setFilterBrand(''); setFilterStatus(''); setFilterInquiry(''); setFilterStage(''); }}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500">
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <button onClick={fetchAll}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white shadow-sm">
        <RefreshCw className="h-3.5 w-3.5" /> Refresh
      </button>

      <span className="text-sm text-gray-400 whitespace-nowrap">{dataRows.length} records</span>
    </div>
  );

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
    <Layout headerContent={headerBar}>
      <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden p-4">
        <div className="flex-1 bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden flex flex-col">

          {dataRows.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400">No SRDs found. Try clearing the filters.</p>
            </div>
          ) : (
            <>
              {/* ── single table ── */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-black/10 w-24">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-black/10 w-36">Inquiry #</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-black/10 w-36">Brand</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-black/10">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-blue-500 uppercase tracking-wider border-b border-black/10 w-36">Click To Receive</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-black/10 w-44">Current Status</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-black/10 w-36">Mark Ready</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {visibleRows.map((item, i) => {
                      // ── group header row ──────────────────────────────
                      if (item.type === 'header') {
                        return (
                          <tr key={`h-${item.slug}`}>
                            <td colSpan={7} className="px-4 py-1.5 bg-gray-50 border-b border-t border-black/10">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">{item.label}</span>
                                <span className="text-xs text-gray-400">{item.count} SR{item.count !== 1 ? 's' : ''}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      // ── data row ─────────────────────────────────────
                      const { srd, slug, stageIndex } = item;
                      const isFirst     = stageIndex === 0;
                      const entry       = getStageEntry(srd, slug);
                      const stageStatus = getStageStatus(srd, slug);
                      const showReady   = canMarkReady(srd, slug, stageIndex);
                      const showRcv     = canReceive(srd, slug, stageIndex);
                      const readyKey    = `${srd._id}-${slug}-complete`;
                      const rcvKey      = `${srd._id}-${slug}-receive`;
                      const isReceived  = !!entry?.receivedDate;
                      const isReady     = !!entry?.completedDate;

                      return (
                        <tr key={`${srd._id}-${slug}`} className="hover:bg-blue-50 transition-colors">
                          {/* Date */}
                          <td className="px-4 py-2 border-b border-black/10 text-sm text-gray-700 whitespace-nowrap">
                            {fmtDate(srd.createdAt)}
                          </td>

                          {/* Inquiry # */}
                          <td className="px-4 py-2 border-b border-black/10 whitespace-nowrap">
                            <span className="text-sm font-medium text-blue-600">{srd.refNo}</span>
                          </td>

                          {/* Brand */}
                          <td className="px-4 py-2 border-b border-black/10 text-sm text-gray-700 whitespace-nowrap">
                            {getBrand(srd) || <span className="text-gray-300">—</span>}
                          </td>

                          {/* Description */}
                          <td className="px-4 py-2 border-b border-black/10 text-sm text-gray-700 max-w-xs">
                            <span className="line-clamp-1">{getDescription(srd) || '—'}</span>
                          </td>

                          {/* Click To Receive — empty cell for CAD (first stage) */}
                          <td className="px-4 py-2 border-b border-black/10 text-center">
                            {isFirst ? (
                              <span className="text-gray-300">—</span>
                            ) : isReceived ? (
                              <span className="text-sm font-medium text-blue-600">
                                Received {fmtDate(entry.receivedDate)}
                              </span>
                            ) : showRcv ? (
                              <button
                                onClick={() => handleAction(srd._id, slug, 'receive')}
                                disabled={actionLoading === rcvKey}
                                className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded px-3 py-1 font-medium disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === rcvKey && <Loader2 className="h-3 w-3 animate-spin" />}
                                Receive
                              </button>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Current Status */}
                          <td className="px-4 py-2 border-b border-black/10">
                            <span className={`text-sm ${stageStatus.cls}`}>{stageStatus.text}</span>
                          </td>

                          {/* Mark Ready */}
                          <td className="px-4 py-2 border-b border-black/10 text-center">
                            {isReady ? (
                              <span className="text-sm font-semibold text-green-700">
                                Ready {fmtDate(entry.completedDate)}
                              </span>
                            ) : showReady ? (
                              <button
                                onClick={() => handleAction(srd._id, slug, 'complete')}
                                disabled={actionLoading === readyKey}
                                className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded px-3 py-1 font-medium disabled:opacity-50 transition-colors"
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

              {/* ── pagination ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-1 px-4 py-2 border-t border-gray-100 bg-white">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '…' ? (
                        <span key={`e${i}`} className="px-1 text-gray-400 text-xs">…</span>
                      ) : (
                        <button key={p} onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                            currentPage === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
                          }`}>
                          {p}
                        </button>
                      )
                    )}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
