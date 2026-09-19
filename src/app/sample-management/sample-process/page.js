'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/use-toast';
import Layout from '@/components/layout/Layout';
import BrandGroupManager from '@/components/BrandGroupManager';
import { STAGE_FILTER_OPTIONS, getSampleType, matchesStage, getStageEntry, classifyForStage } from '@/lib/sampleFilters';
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
    if (stageSlug === 'cad') {
      const cadApproved = (srd.status || []).find(s => s.department === 'cad' && s.value === 'approved');
      if (cadApproved) return { text: `Received ${fmtDate(cadApproved.updatedAt)}`, cls: 'text-blue-600 font-semibold' };
      const d = daysSince(srd.createdAt);
      if (d > 2) return { text: `Pending (${d}d)`, cls: 'text-red-500' };
      return { text: 'Pending', cls: 'text-orange-500' };
    }
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
  const [filterSampleType, setFilterSampleType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterInquiry, setFilterInquiry] = useState('');
  const [filterStage, setFilterStage] = useState(''); // '' = all stages
  const [blinkingKey, setBlinkingKey] = useState(null);
  const [myPermissions, setMyPermissions] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeGroupBrands, setActiveGroupBrands] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'incoming' | 'pending'

  const userRole = session?.user?.role?.toLowerCase() || '';
  const canViewAll = userRole === 'admin' || userRole === 'vmd';
  const canReceiveAnyStage = !!myPermissions?.canReceiveAnyStage;
  const canCompleteAnyStage =
    !!myPermissions?.canCompleteAnyStage || canReceiveAnyStage;

  // Permissions are stored per-user in the DB, not in the session, so fetch the
  // live record. This way revoking in the User Permissions UI takes effect.
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    fetch(`/api/users/${session.user.id}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setMyPermissions(d?.success ? (d.data?.permissions || {}) : {});
      })
      .catch(() => {
        if (!cancelled) setMyPermissions({});
      });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filterBrand, filterSampleType, filterStatus, filterInquiry, filterStage, activeGroupBrands]);

  const handleGroupSelect = (id, brandList) => {
    setActiveGroupId(id);
    setActiveGroupBrands(brandList || []);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [srdsRes, stagesRes, companyRes] = await Promise.all([
        fetch('/api/srd?limit=1000&select=refNo,title,description,createdAt,isComplete,inProduction,sampleProcess,status,dynamicFields,sampleDispatchedToBuyer,sampleDipatchedtoBuyerDate,dispatchBy,dispatchDate&lean=true'),
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

  const allSampleTypes = useMemo(() => {
    const set = new Set(srds.map(getSampleType).filter(Boolean));
    return [...set].sort();
  }, [srds]);

  const baseSrds = useMemo(() => {
    if (canViewAll) return srds;
    return srds.filter(srd => {
      if (userRole === 'cad') return true;
      if (!srd.inProduction) return false;
      // Only SRDs that are actually heading to / sitting at my stage belong in
      // my view — classify by checking the sampleProcess chain (previous stage
      // ready vs. mine received) instead of a crude status string match.
      const stageIndex = stages.findIndex(s => s.name?.toLowerCase() === userRole);
      if (stageIndex < 0) return false;
      const slug = stages[stageIndex].name?.toLowerCase();
      const prevSlug = stageIndex > 0 ? stages[stageIndex - 1]?.name?.toLowerCase() : null;
      const entry = getStageEntry(srd, slug);
      const prevEntry = prevSlug ? getStageEntry(srd, prevSlug) : null;
      return classifyForStage(srd, entry, prevEntry, { first: stageIndex === 0 }) !== null;
    });
  }, [srds, canViewAll, userRole, stages]);

  const filteredSrds = useMemo(() => {
    let list = baseSrds;
    if (activeGroupBrands.length > 0) {
      const brandSet = new Set(activeGroupBrands.map(b => b.toLowerCase().trim()));
      list = list.filter(s => brandSet.has(getBrand(s).toLowerCase().trim()));
    } else if (filterBrand) {
      list = list.filter(s => getBrand(s) === filterBrand);
    }
    if (filterSampleType) {
      list = list.filter(s => getSampleType(s).toLowerCase() === filterSampleType.toLowerCase());
    }
    if (filterStage) {
      list = list.filter(s => matchesStage(s, filterStage));
    }
    if (filterInquiry) list = list.filter(s => s.refNo?.toLowerCase().includes(filterInquiry.toLowerCase()));
    if (filterStatus === 'pending')          list = list.filter(s => !s.inProduction && !s.isComplete);
    else if (filterStatus === 'in-progress') list = list.filter(s => s.inProduction && !s.isComplete);
    else if (filterStatus === 'completed')   list = list.filter(s => s.isComplete);
    return list;
  }, [baseSrds, filterBrand, filterSampleType, filterInquiry, filterStatus, filterStage, activeGroupBrands]);

  const srdsForStage = (stageSlug, stageIndex) => {
    if (stageIndex === 0) {
      return filteredSrds.filter(srd => {
        const e = getStageEntry(srd, stageSlug);
        if (!e) return true;
        const nextSlug = stages[1]?.name?.toLowerCase();
        const nextEntry = nextSlug ? getStageEntry(srd, nextSlug) : null;
        const nextReceived = nextEntry?.status === 'received' || !!nextEntry?.receivedDate;
        if (nextReceived) return false;
        return true;
      });
    }
    return filteredSrds.filter(srd => {
      if (!srd.inProduction) return false;
      const sp = srd.sampleProcess || [];
      const prevSlug  = stages[stageIndex - 1]?.name?.toLowerCase();
      const prevEntry = sp.find(s => s.stage === prevSlug);
      const thisEntry = sp.find(s => s.stage === stageSlug);
      const nextSlug  = stages[stageIndex + 1]?.name?.toLowerCase();
      const nextEntry = nextSlug ? sp.find(s => s.stage === nextSlug) : null;
      const nextReceived = nextEntry?.status === 'received' || !!nextEntry?.receivedDate;
      if (nextReceived) return false;
      return (
        prevEntry?.status === 'completed' || !!prevEntry?.completedDate ||
        thisEntry?.status === 'received'  || thisEntry?.status === 'completed' ||
        !!thisEntry?.receivedDate
      );
    });
  };

  // Pending vs Coming Soon tallies for the two tabs (production stage users).
  const queueCounts = useMemo(() => {
    const counts = { incoming: 0, pending: 0 };
    if (canViewAll) return counts;
    const stageIndex = stages.findIndex(s => s.name?.toLowerCase() === userRole);
    if (stageIndex < 0) return counts;
    const slug = stages[stageIndex].name?.toLowerCase();
    const prevSlug = stageIndex > 0 ? stages[stageIndex - 1]?.name?.toLowerCase() : null;
    for (const srd of filteredSrds) {
      const cls = classifyForStage(
        srd,
        getStageEntry(srd, slug),
        prevSlug ? getStageEntry(srd, prevSlug) : null,
        { first: stageIndex === 0 }
      );
      if (cls === 'incoming') counts.incoming++;
      else if (cls === 'my-work') counts.pending++;
    }
    return counts;
  }, [filteredSrds, stages, canViewAll, userRole]);

  // Build a flat list of rows for the single table:
  // each item is either { type:'header', label, slug, count }
  // or { type:'row', srd, stageSlug, stageIndex }
  const flatRows = useMemo(() => {
    // Production stage user (not admin/vmd): two tabs — what is coming to me
    // soon (Ready at the previous stage) vs. my pending work at my own stage.
    if (!canViewAll) {
      const rows = [];
      const stageIndex = stages.findIndex(s => s.name?.toLowerCase() === userRole);
      if (stageIndex >= 0) {
        const slug = stages[stageIndex].name?.toLowerCase();
        const prevSlug = stageIndex > 0 ? stages[stageIndex - 1]?.name?.toLowerCase() : null;
        const incoming = [];
        const myWork = [];

        for (const srd of filteredSrds) {
          const entry = getStageEntry(srd, slug);
          const prevEntry = prevSlug ? getStageEntry(srd, prevSlug) : null;
          const cls = classifyForStage(srd, entry, prevEntry, { first: stageIndex === 0 });
          if (cls === 'incoming') incoming.push(srd);
          else if (cls === 'my-work') myWork.push(srd);
        }

        if (activeTab === 'incoming' && incoming.length) {
          rows.push({ type: 'header', label: 'Coming to Me Soon', slug, stageIndex, count: incoming.length });
          incoming.forEach(srd => rows.push({ type: 'row', srd, slug, stageIndex }));
        } else if (activeTab === 'pending' && myWork.length) {
          rows.push({ type: 'header', label: 'My Pending Work', slug, stageIndex, count: myWork.length });
          myWork.forEach(srd => rows.push({ type: 'row', srd, slug, stageIndex }));
        }
      }
      return rows;
    }

    const rows = [];
    stages.forEach((stage, stageIndex) => {
      const slug  = stage.name?.toLowerCase();
      const label = stage.displayName || stage.name?.toUpperCase();

      const sectionSrds = srdsForStage(slug, stageIndex);
      if (sectionSrds.length === 0) return;

      rows.push({ type: 'header', label, slug, stageIndex, count: sectionSrds.length });
      sectionSrds.forEach(srd => rows.push({ type: 'row', srd, slug, stageIndex }));
    });
    return rows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSrds, stages, canViewAll, userRole, activeTab]);

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
        if (action === 'complete') {
          const stageIdx = stages.findIndex(s => s.name?.toLowerCase() === stageSlug);
          const nextSlug = stages[stageIdx + 1]?.name?.toLowerCase();
          if (nextSlug) {
            const blinkId = `${srdId}-${nextSlug}`;
            setBlinkingKey(blinkId);
            setTimeout(() => setBlinkingKey(null), 3000);
          }
        }
        fetchAll();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const canMarkReady = (srd, stageSlug, stageIndex) => {
    if (srd.sampleDispatchedToBuyer) return false;
    if (!(userRole === stageSlug || userRole === 'admin' || canCompleteAnyStage)) return false;
    const entry = getStageEntry(srd, stageSlug);
    if (entry?.status === 'completed' || entry?.completedDate) return false;
    if (stageIndex === 0) {
      const cadApproved = (srd.status || []).some(s => s.department === 'cad' && s.value === 'approved');
      return !!srd.inProduction || cadApproved;
    }
    return !!entry?.receivedDate;
  };

  const canReceive = (srd, stageSlug, stageIndex) => {
    if (srd.sampleDispatchedToBuyer) return false;
    if (stageIndex === 0 || !(userRole === stageSlug || userRole === 'admin' || canReceiveAnyStage)) return false;
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
          {STAGE_FILTER_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
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
        <select value={filterSampleType} onChange={e => setFilterSampleType(e.target.value)}
          className="border-0 focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-700 font-medium">
          <option value="">All Sample Types</option>
          {allSampleTypes.map(t => <option key={t} value={t}>{t}</option>)}
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

      {(filterBrand || filterSampleType || filterStatus || filterInquiry || filterStage) && (
        <button onClick={() => { setFilterBrand(''); setFilterSampleType(''); setFilterStatus(''); setFilterInquiry(''); setFilterStage(''); }}
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

          {/* Brand groups filter bar */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-3 flex-wrap bg-white">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Brand Groups</span>
            <BrandGroupManager
              allBrands={allBrands}
              activeGroupId={activeGroupId}
              onGroupSelect={handleGroupSelect}
            />
          </div>

          {/* Two tabs for production stage users: Coming Soon vs Pending */}
          {!canViewAll && (
            <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 bg-white">
              <button
                onClick={() => { setActiveTab('incoming'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'incoming' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Coming Soon
                {queueCounts.incoming > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 rounded-full ${activeTab === 'incoming' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    {queueCounts.incoming}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'pending' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Pending
                {queueCounts.pending > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 rounded-full ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    {queueCounts.pending}
                  </span>
                )}
              </button>
            </div>
          )}

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
                      <th className="px-4 py-3 text-left text-xs font-bold text-nowrap text-gray-500 uppercase tracking-wider border-b border-black/10 w-24">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-nowrap text-gray-500 uppercase tracking-wider border-b border-black/10 w-36">Inquiry #</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-nowrap text-gray-500 uppercase tracking-wider border-b border-black/10 w-36">Brand</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-nowrap text-gray-500 uppercase tracking-wider border-b border-black/10">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-nowrap text-gray-500 uppercase tracking-wider border-b border-black/10 w-36">Click To Receive</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-nowrap text-gray-500 uppercase tracking-wider border-b border-black/10 w-44">Current Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {visibleRows.map((item, i) => {
                      // ── group header row ──────────────────────────────
                      if (item.type === 'header') {
                        return (
                          <tr key={`h-${item.slug}`}>
                            <td colSpan={6} className="px-4 py-1.5 bg-gray-50 border-b border-t border-black/10">
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
                      const isFirst         = stageIndex === 0;
                      const isDispatchStage = slug === 'dispatch';
                      const entry           = getStageEntry(srd, slug);
                      const stageStatus = getStageStatus(srd, slug);
                      const showReady   = canMarkReady(srd, slug, stageIndex);
                      const showRcv     = canReceive(srd, slug, stageIndex);
                      const readyKey    = `${srd._id}-${slug}-complete`;
                      const rcvKey      = `${srd._id}-${slug}-receive`;
                      const isReceived  = !!entry?.receivedDate;
                      const isReady     = !!entry?.completedDate;
                      const cadApprovedDate = isFirst ? (srd.status || []).find(s => s.department === 'cad' && s.value === 'approved')?.updatedAt : null;
                      const cadReceived = isFirst && (isReceived || !!cadApprovedDate);
                      const prevEntry = stageIndex > 0 ? getStageEntry(srd, stages[stageIndex - 1]?.name?.toLowerCase()) : null;
                      const prevLabel = stageIndex > 0
                        ? (stages[stageIndex - 1]?.displayName || stages[stageIndex - 1]?.name || 'previous stage')
                        : null;

                      return (
                        <tr key={`${srd._id}-${slug}`} className={`hover:bg-blue-50 transition-colors ${blinkingKey === `${srd._id}-${slug}` ? 'animate-pulse bg-yellow-50' : ''}`}>
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

                          {/* Click To Receive */}
                          <td className="px-4 py-2 border-b border-black/10 text-center">
                            {isFirst ? (
                              cadReceived ? (
                                <span className="text-sm font-medium text-blue-600">
                                  Received {fmtDate(entry?.receivedDate || cadApprovedDate)}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )
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

                          {/* Current Status (with Ready button merged in) */}
                          <td className="px-4 py-2 border-b border-black/10">
                            {isDispatchStage && srd.sampleDispatchedToBuyer ? (
                              <span className="text-sm">
                                <span className="font-semibold text-green-700">
                                  Dispatched {fmtDate(srd.sampleDipatchedtoBuyerDate || srd.dispatchDate)}
                                </span>
                                {srd.dispatchBy && (
                                  <span className="block text-[11px] text-gray-500">by {srd.dispatchBy}</span>
                                )}
                              </span>
                            ) : isReady ? (
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
                            ) : showRcv ? (
                              <span className="text-sm">
                                <span className="font-semibold text-green-700">Ready at {prevLabel}</span>
                                {prevEntry?.completedDate && (
                                  <span className="block text-[11px] text-gray-500">{fmtDate(prevEntry.completedDate)}</span>
                                )}
                              </span>
                            ) : (
                              <span className={`text-sm ${stageStatus.cls}`}>{stageStatus.text}</span>
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
