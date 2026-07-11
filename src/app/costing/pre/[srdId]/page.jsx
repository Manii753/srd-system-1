'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, AlertCircle, ArrowLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import CostingSheet from '../../_components/CostingSheet';
import { useCosting } from '../../_components/useCosting';

function PreCostingDetailContent() {
  const { srdId } = useParams();
  const { costing, srd, loading, error, saving, mutate } = useCosting(srdId);

  if (!srdId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle size={32} className="text-amber-400" />
        <p className="text-gray-600 text-sm">No SRD selected.</p>
        <Link href="/costing/pre" className="text-blue-600 hover:underline text-sm font-medium">← Back to Pre-Costing</Link>
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
        <Link href="/costing/pre" className="text-blue-600 hover:underline text-sm font-medium">← Back to Pre-Costing</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/costing/pre" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft size={14} /> Pre-Costing
        </Link>
        <span>/</span>
        {srd?.refNo && (
          <>
            <span className="font-medium text-gray-800">{srd.refNo}</span>
            <span>/</span>
          </>
        )}
        <span className="text-blue-700 font-semibold flex items-center gap-1">
          <ClipboardList size={13} /> Pre-Costing
        </span>
      </div>

      <CostingSheet
        type="pre"
        costData={costing?.preCost}
        srd={srd}
        onSave={mutate}
        saving={saving}
      />
    </div>
  );
}

export default function PreCostingDetailPage() {
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
        <PreCostingDetailContent />
      </Suspense>
    </Layout>
  );
}
