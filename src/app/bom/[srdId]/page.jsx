'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, AlertCircle, ArrowLeft, Layers } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import Layout from '@/components/layout/Layout';
import BOMSheet from '../_components/BOMSheet';
import { useBOM } from '../_components/useBOM';

function BOMContent({ srdId }) {
  const { bom, srd, company, loading, error, saving, mutate, reset } = useBOM(srdId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-rose-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-gray-600 text-sm">{error}</p>
        <Link href="/bom" className="text-blue-600 hover:underline text-sm font-medium">
          ← Back to BOM
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/bom" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft size={14} /> BOM
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-800 flex items-center gap-1">
          <Layers size={13} className="text-rose-600" />
          {srd?.refNo || '…'}
        </span>
      </div>

      <BOMSheet
        bomData={bom}
        srd={srd}
        company={company}
        onSave={mutate}
        saving={saving}
        onReset={reset}
      />
    </div>
  );
}

export default function BOMDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'vmd', 'commercial', 'cad', 'mmc'].includes(session.user.role)) {
      router.push('/home');
    }
  }, [session, status, router]);

  return (
    <Layout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-rose-400" />
        </div>
      }>
        <BOMContent srdId={params.srdId} />
      </Suspense>
    </Layout>
  );
}
