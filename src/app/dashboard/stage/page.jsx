'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Loader2, RefreshCw, Search, Filter, X, ArrowDownToLine, CheckCircle2, Package, Inbox } from 'lucide-react';
import { useToast } from '@/lib/use-toast';
import {
  getBrand,
  getSampleType,
  getDescription,
  getStageEntry,
  classifyForStage,
} from '@/lib/sampleFilters';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function StageDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [srds, setSrds] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [receiveInput, setReceiveInput] = useState('');
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveMsg, setReceiveMsg] = useState(null);
  const [filterInquiry, setFilterInquiry] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSampleType, setFilterSampleType] = useState('');

  const userRole = session?.user?.role?.toLowerCase() || '';

  const stageIndex = useMemo(() => {
    return stages.findIndex(s => s.name?.toLowerCase() === userRole || s.slug?.toLowerCase() === userRole);
  }, [stages, userRole]);

  const myStage = stageIndex >= 0 ? stages[stageIndex] : null;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [srdsRes, stagesRes] = await Promise.all([
        fetch('/api/srd?inProduction=true&limit=1000&select=refNo,title,description,createdAt,isComplete,inProduction,sampleProcess,status,dynamicFields&lean=true'),
        fetch('/api/production-stages'),
      ]);
      const srdsData = await srdsRes.json();
      const stagesData = await stagesRes.json();

      if (srdsData.success) setSrds(srdsData.data || []);

      if (stagesData.success) {
        const active = (stagesData.data || []).filter(s => s.isActive).sort((a, b) => a.order - b.order);
        if (!active.some(s => s.name?.toLowerCase() === 'cad')) {
          active.unshift({ _id: 'cad-virtual', name: 'cad', displayName: 'CAD', slug: 'cad', order: 0, isActive: true });
        }
        setStages(active);
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  const allBrands = useMemo(() => {
    const set = new Set(srds.map(getBrand).filter(Boolean));
    return [...set].sort();
  }, [srds]);

  const allSampleTypes = useMemo(() => {
    const set = new Set(srds.map(getSampleType).filter(Boolean));
    return [...set].sort();
  }, [srds]);

  const rows = useMemo(() => {
    const incoming = [];
    const myWork = [];

    for (const srd of srds) {
      if (filterInquiry && !srd.refNo?.toLowerCase().includes(filterInquiry.toLowerCase())) continue;
      if (filterBrand && getBrand(srd) !== filterBrand) continue;
      if (filterSampleType && getSampleType(srd).toLowerCase() !== filterSampleType.toLowerCase()) continue;
      if (stageIndex < 0) continue;

      const slug = stages[stageIndex].name?.toLowerCase();
      const prevSlug = stageIndex > 0 ? stages[stageIndex - 1]?.name?.toLowerCase() : null;
      const entry = getStageEntry(srd, slug);
      const prevEntry = prevSlug ? getStageEntry(srd, prevSlug) : null;

      const cls = classifyForStage(srd, entry, prevEntry, { first: stageIndex === 0 });
      if (cls === 'incoming') incoming.push(srd);
      else if (cls === 'my-work') myWork.push(srd);
    }
    return { incoming, myWork };
  }, [srds, stages, stageIndex, filterInquiry, filterBrand, filterSampleType]);

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

  // Legacy flow: receive an SRD by typing its ref no (works even when the SRD
  // has not been linked into the sampleProcess pipeline yet).
  const handleReceiveByRef = async () => {
    const ref = receiveInput.trim();
    if (!ref) return;
    const slug = stages[stageIndex]?.name?.toLowerCase();
    if (!slug) { setReceiveMsg({ type: 'error', text: 'Your production stage is not recognised.' }); return; }
    setReceiveLoading(true);
    setReceiveMsg(null);
    try {
      const res = await fetch(`/api/srd?search=${encodeURIComponent(ref)}`);
      const data = await res.json();
      const list = data.data || data.srds || [];
      const srd = list.find(s => s.refNo?.toLowerCase() === ref.toLowerCase());
      if (!srd) { setReceiveMsg({ type: 'error', text: `SRD "${ref}" not found.` }); return; }
      if (!srd.inProduction) { setReceiveMsg({ type: 'error', text: `SRD "${ref}" is not in production yet.` }); return; }
      const receiveRes = await fetch(`/api/srd/${srd._id}/sample-process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'receive', stage: slug }),
      });
      const receiveData = await receiveRes.json();
      if (receiveData.success) {
        setReceiveMsg({ type: 'success', text: `SRD "${ref}" received successfully!` });
        setReceiveInput('');
        fetchAll();
      } else {
        setReceiveMsg({ type: 'error', text: receiveData.error || 'Failed to receive SRD.' });
      }
    } catch (e) {
      console.error('Receive error:', e);
      setReceiveMsg({ type: 'error', text: e.message });
    } finally {
      setReceiveLoading(false);
    }
  };

  const renderTable = (items, kind) => {
    if (items.length === 0) {
      return (
        <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-400">{kind === 'incoming' ? 'Nothing is heading your way right now.' : 'No pending work at your stage right now.'}</p>
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full border-separate border-spacing-0">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Date</th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-36">Inquiry #</th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Brand</th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-44">Status / From</th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(srd => {
              const slug = stages[stageIndex]?.name?.toLowerCase();
              const prevSlug = stageIndex > 0 ? stages[stageIndex - 1]?.name?.toLowerCase() : null;
              const entry = getStageEntry(srd, slug);
              const prevEntry = prevSlug ? getStageEntry(srd, prevSlug) : null;
              const key = `${srd._id}-${kind}`;

              let statusText = '—';
              if (kind === 'incoming' && prevEntry) {
                const prevLabel = stages[stageIndex - 1]?.displayName || stages[stageIndex - 1]?.name || prevSlug;
                statusText = (
                  <>
                    <span className="font-medium text-green-700">Ready at {prevLabel}</span>
                    <span className="block text-[11px] text-gray-500">{fmtDate(prevEntry.completedDate)}</span>
                  </>
                );
              } else if (kind === 'my-work') {
                statusText = (
                  <>
                    <span className="font-medium text-blue-600">Received</span>
                    <span className="block text-[11px] text-gray-500">{fmtDate(entry?.receivedDate)}</span>
                  </>
                );
              }

              return (
                <tr key={key} className="hover:bg-blue-50 transition-colors">
                  <td className="px-3 py-2 border-b border-black/10 text-sm text-gray-700 whitespace-nowrap">{fmtDate(srd.createdAt)}</td>
                  <td className="px-3 py-2 border-b border-black/10 whitespace-nowrap text-sm font-medium text-blue-600">{srd.refNo}</td>
                  <td className="px-3 py-2 border-b border-black/10 text-sm text-gray-700 whitespace-nowrap">{getBrand(srd) || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 border-b border-black/10 text-sm text-gray-700 max-w-xs"><span className="line-clamp-1">{getDescription(srd) || '—'}</span></td>
                  <td className="px-3 py-2 border-b border-black/10 text-sm">{statusText}</td>
                  <td className="px-3 py-2 border-b border-black/10">
                    {kind === 'incoming' ? (
                      <button
                        onClick={() => handleAction(srd._id, slug, 'receive')}
                        disabled={actionLoading === `${srd._id}-${slug}-receive`}
                        className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded px-3 py-1 font-medium disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === `${srd._id}-${slug}-receive` && <Loader2 className="h-3 w-3 animate-spin" />}
                        <ArrowDownToLine className="h-3 w-3" /> Receive
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(srd._id, slug, 'complete')}
                        disabled={actionLoading === `${srd._id}-${slug}-complete`}
                        className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded px-3 py-1 font-medium disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === `${srd._id}-${slug}-complete` && <Loader2 className="h-3 w-3 animate-spin" />}
                        <CheckCircle2 className="h-3 w-3" /> Mark Ready
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const headerBar = (
    <div className="flex items-center gap-2 w-full flex-wrap">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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

      {(filterInquiry || filterBrand || filterSampleType) && (
        <button onClick={() => { setFilterInquiry(''); setFilterBrand(''); setFilterSampleType(''); }}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500">
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <button onClick={fetchAll}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white shadow-sm">
        <RefreshCw className="h-3.5 w-3.5" /> Refresh
      </button>
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
      <div className="p-4 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 capitalize">
              {myStage?.displayName || userRole} — Production Stage
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Your pending work and the samples coming to you from the previous stage
            </p>
          </div>
        </div>

        {/* Receive by ref box */}
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Receive by Inquiry #</span>
          </div>
          <p className="text-xs text-blue-700 mt-1 mb-2">
            If the previous stage handed you an SRD that is not listed below, enter its Inquiry # to receive it now.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={receiveInput}
              onChange={e => setReceiveInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReceiveByRef()}
              placeholder="e.g. INQ0001"
              className="w-48 pl-3 pr-3 h-9 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <button
              onClick={handleReceiveByRef}
              disabled={receiveLoading || !receiveInput.trim()}
              className="px-4 h-9 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-40"
            >
              {receiveLoading ? 'Processing...' : 'Receive'}
            </button>
          </div>
          {receiveMsg && (
            <p className={`mt-2 text-sm font-medium ${receiveMsg.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
              {receiveMsg.text}
            </p>
          )}
        </div>

        {stageIndex < 0 ? (
          <div className="border-2 border-dashed border-yellow-300 bg-yellow-50 rounded-lg p-8 text-center">
            <Package className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
            <p className="font-medium text-gray-800">Production stage not configured</p>
            <p className="text-sm text-gray-500 mt-1">
              Ask your admin to create a production stage named <strong>{userRole}</strong>.
            </p>
          </div>
        ) : (
          <>
            {/* Coming to me soon */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownToLine className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Coming to Me Soon
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 font-semibold rounded-full">{rows.incoming.length}</span>
                </h2>
              </div>
              {renderTable(rows.incoming, 'incoming')}
            </section>

            {/* My pending work */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <h2 className="text-sm font-semibold text-gray-700">
                  My Pending Work
                  <span className="ml-2 px-2 py-0.5 text-xs bg-green-50 text-green-700 font-semibold rounded-full">{rows.myWork.length}</span>
                </h2>
              </div>
              {renderTable(rows.myWork, 'my-work')}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}