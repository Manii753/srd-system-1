'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft, TrendingUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import CostingSheet from '../_components/CostingSheet';
import { useCosting } from '../_components/useCosting';
import { useToast } from '@/lib/use-toast';

const fmt2 = (v) =>
  (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PostCostingContent() {
  const searchParams = useSearchParams();
  const srdId = searchParams.get('srdId');
  const { costing, srd, loading, error, saving, mutate, reload } = useCosting(srdId);
  const { toast } = useToast();
  const [resyncing, setResyncing] = useState(false);

  // Re-sync trim rows from SRD dynamic fields
  const handleResync = async () => {
    if (!srdId) return;
    setResyncing(true);
    try {
      // Delete existing costing so the GET auto-creates a fresh one from SRD fields
      const res = await fetch(`/api/costing/${srdId}/resync`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await reload();
        toast({ title: 'Re-synced from SRD form', description: 'Trim rows updated from SRD dynamic fields.' });
      }
    } catch {
      toast({ title: 'Re-sync failed', variant: 'destructive' });
    } finally {
      setResyncing(false);
    }
  };

  if (!srdId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle size={32} className="text-amber-400" />
        <p className="text-gray-600 text-sm">No SRD selected.</p>
        <Link href="/costing" className="text-blue-600 hover:underline text-sm font-medium">
          ← Back to Costing
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-gray-600 text-sm">{error}</p>
        <Link href="/costing" className="text-blue-600 hover:underline text-sm font-medium">
          ← Back to Costing
        </Link>
      </div>
    );
  }

  const preTotal  = costing?.preCost?.total  || 0;
  const postTotal = costing?.postCost?.total || 0;
  const variance  = postTotal - preTotal;
  const variancePct = preTotal > 0 ? ((variance / preTotal) * 100).toFixed(1) : null;
  const currency  = costing?.postCost?.currency || 'USD';

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/costing" className="hover:text-emerald-600 flex items-center gap-1">
            <ArrowLeft size={14} /> Costing
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-800">{srd?.refNo}</span>
          <span>/</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <TrendingUp size={13} /> Post-Costing
          </span>
        </div>
        <button
          onClick={handleResync}
          disabled={resyncing}
          title="Re-pull trim rows from SRD form fields"
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 rounded px-2.5 py-1 transition-colors"
        >
          {resyncing
            ? <Loader2 size={12} className="animate-spin" />
            : <RefreshCw size={12} />}
          Re-sync from SRD
        </button>
      </div>

      {/* Variance vs pre-costing */}
      {preTotal > 0 && postTotal > 0 && (
        <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-xs
          ${variance > 0
            ? 'bg-red-50 border-red-100 text-red-700'
            : 'bg-green-50 border-green-100 text-green-700'}`}
        >
          <span>
            <strong>Variance vs Pre-Costing: </strong>
            {variance >= 0 ? '+' : ''}{currency} {fmt2(variance)}
            {variancePct !== null && ` (${variance >= 0 ? '+' : ''}${variancePct}%)`}
          </span>
          <span className="opacity-60">
            Pre: {fmt2(preTotal)} · Post: {fmt2(postTotal)}
          </span>
        </div>
      )}

      <CostingSheet
        type="post"
        costData={costing?.postCost}
        srd={srd}
        onSave={mutate}
        saving={saving}
      />
    </div>
  );
}

export default function PostCostingPage() {
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
          <Loader2 size={28} className="animate-spin text-emerald-400" />
        </div>
      }>
        <PostCostingContent />
      </Suspense>
    </Layout>
  );
}
