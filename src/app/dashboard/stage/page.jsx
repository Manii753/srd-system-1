'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import { CheckCircle, Clock, Package, RefreshCw, Search } from 'lucide-react';

export default function StageDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stage, setStage] = useState(null);
  const [srds, setSrds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiveInput, setReceiveInput] = useState('');
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveMsg, setReceiveMsg] = useState(null); // { type: 'success'|'error', text }
  const inputRef = useRef(null);

  const userRole = session?.user?.role;

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    fetchData();
  }, [session, status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Find the production stage matching this user's role
      const stagesRes = await fetch('/api/production-stages');
      const stagesData = await stagesRes.json();
      if (!stagesData.success) return;

      const myStage = stagesData.data.find(s =>
        s.name?.toLowerCase() === userRole?.toLowerCase() ||
        s.displayName?.toLowerCase() === userRole?.toLowerCase()
      );
      setStage(myStage || null);

      if (myStage) {
        const srdsRes = await fetch(`/api/srd?inProduction=true&currentProductionStage=${myStage._id}`);
        const srdsData = await srdsRes.json();
        setSrds(srdsData.success ? (srdsData.data || []) : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Called by the next-stage person: they type the SRD ref no to mark the previous stage done
  const handleReceive = async () => {
    const ref = receiveInput.trim();
    if (!ref) return;
    setReceiveLoading(true);
    setReceiveMsg(null);
    try {
      // 1. Fetch all stages once
      const stagesRes = await fetch('/api/production-stages');
      const stagesData = await stagesRes.json();
      const allStages = stagesData.data || [];

      // 2. Find MY stage (the one I'm receiving INTO)
      const myStage = allStages.find(s =>
        s.name?.toLowerCase() === userRole?.toLowerCase() ||
        s.displayName?.toLowerCase() === userRole?.toLowerCase()
      );
      if (!myStage) {
        setReceiveMsg({ type: 'error', text: 'Your production stage is not configured. Ask admin to create a stage matching your role.' });
        return;
      }

      // 3. Find the SRD by refNo
      const res = await fetch(`/api/srd?search=${encodeURIComponent(ref)}`);
      const data = await res.json();
      const list = data.data || data.srds || [];
      const srd = list.find(s => s.refNo?.toLowerCase() === ref.toLowerCase());

      if (!srd) {
        setReceiveMsg({ type: 'error', text: `SRD "${ref}" not found.` });
        return;
      }
      if (!srd.inProduction) {
        setReceiveMsg({ type: 'error', text: `SRD "${ref}" is not in production yet.` });
        return;
      }

      // 4. Find the CURRENT stage of the SRD (the one being completed)
      const currentStage = allStages.find(s =>
        String(s._id) === String(srd.currentProductionStage)
      );
      if (!currentStage) {
        setReceiveMsg({ type: 'error', text: `Could not identify the current stage of SRD "${ref}".` });
        return;
      }

      // 5. Validate: the SRD's current stage must come directly before mine
      const sortedStages = [...allStages].sort((a, b) => a.order - b.order);
      const currentIdx = sortedStages.findIndex(s => String(s._id) === String(currentStage._id));
      const nextStageAfterCurrent = sortedStages[currentIdx + 1];

      if (!nextStageAfterCurrent || String(nextStageAfterCurrent._id) !== String(myStage._id)) {
        const nextName = nextStageAfterCurrent
          ? (nextStageAfterCurrent.displayName || nextStageAfterCurrent.name)
          : 'nobody (last stage)';
        setReceiveMsg({
          type: 'error',
          text: `SRD "${ref}" is at "${currentStage.displayName || currentStage.name}". The next stage is ${nextName}, not your stage.`,
        });
        return;
      }

      // 6. Call complete-stage — this completes the current stage and moves to mine
      const completeRes = await fetch(`/api/srd/${srd._id}/production/complete-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageName: currentStage.name,
          stageId: String(srd.currentProductionStage),
          completedBy: session.user.name,
          notes: `Received by ${session.user.name} at ${myStage.displayName || myStage.name}`,
        }),
      });
      const completeData = await completeRes.json();

      if (completeData.success) {
        setReceiveMsg({ type: 'success', text: `✅ SRD "${ref}" received! ${completeData.message}` });
        setReceiveInput('');
        fetchData();
      } else {
        setReceiveMsg({ type: 'error', text: completeData.error || 'Failed to receive SRD.' });
      }
    } catch (e) {
      setReceiveMsg({ type: 'error', text: e.message });
    } finally {
      setReceiveLoading(false);
      inputRef.current?.focus();
    }
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="p-4 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 capitalize">
              {stage?.displayName || userRole} — Production Stage
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              SRDs currently assigned to your stage
            </p>
          </div>
          <button onClick={fetchData} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* Receive SRD box */}
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-green-900 mb-1">
            📥 Receive SRD from previous stage
          </h2>
          <p className="text-xs text-green-700 mb-3">
            When the previous stage person hands you an SRD, enter its reference number here to mark it as received and move it to your stage.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={receiveInput}
                onChange={e => setReceiveInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReceive()}
                placeholder="Enter SRD Ref No (e.g. INQ0001)"
                className="w-full pl-8 pr-3 h-9 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
                autoFocus
              />
            </div>
            <button
              onClick={handleReceive}
              disabled={receiveLoading || !receiveInput.trim()}
              className="px-4 h-9 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded disabled:opacity-40"
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

        {/* My SRDs */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            My Work Queue
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{srds.length}</span>
          </h2>

          {!stage ? (
            <div className="border-2 border-dashed border-yellow-300 bg-yellow-50 rounded-lg p-8 text-center">
              <Package className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
              <p className="font-medium text-gray-800">Production stage not configured</p>
              <p className="text-sm text-gray-500 mt-1">
                Ask your admin to create a production stage named <strong>"{userRole}"</strong>.
              </p>
            </div>
          ) : srds.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <CheckCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="font-medium text-gray-600">No SRDs in your queue</p>
              <p className="text-sm text-gray-400 mt-1">SRDs will appear here when they reach your stage.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {srds.map(srd => {
                const startDate = srd.productionStartDate
                  ? new Date(srd.productionStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                  : '—';
                const brand = srd.dynamicFields?.find(f => f.name?.toLowerCase() === 'brand')?.value || '';
                const desc  = srd.dynamicFields?.find(f => ['description','style'].includes(f.name?.toLowerCase()))?.value || '';

                return (
                  <div key={srd._id} className="border border-gray-200 bg-white rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-blue-700 text-sm">{srd.refNo}</span>
                          {brand && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{brand}</span>}
                        </div>
                        {desc && <p className="text-xs text-gray-500 truncate mt-0.5">{desc}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {startDate}
                      </span>
                      <span className="font-medium text-green-700">{srd.productionProgress || 0}%</span>
                      <a
                        href={`/srd/${srd._id}`}
                        className="px-2.5 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                      >
                        View
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
