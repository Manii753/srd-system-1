'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { DollarSign, Loader2, AlertCircle } from 'lucide-react';
import ModuleHeader from '../_components/ModuleHeader';
import { useSRD } from '../_components/useSRD';

function CostSheetsContent() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('refNo');
  const { srd, loading, error } = useSRD(refNo);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <AlertCircle size={36} className="text-red-400" />
        <p className="text-gray-600 text-sm">{error}</p>
      </div>
    );
  }

  // Cost-related dynamic fields
  const costFields = (srd?.dynamicFields ?? []).filter(
    f =>
      f.name?.toLowerCase().includes('cost') ||
      f.name?.toLowerCase().includes('price') ||
      f.name?.toLowerCase().includes('rate') ||
      f.slug?.toLowerCase().includes('cost')
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">
      {/* SRD Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <DollarSign size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{srd.refNo}</p>
            {srd.title && <p className="text-xs text-gray-400">{srd.title}</p>}
          </div>
        </div>
      </div>

      {/* Cost Fields */}
      {costFields.length > 0 ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Cost Information
          </h3>
          <div className="space-y-2">
            {costFields.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-500">{f.name}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {f.value != null && f.value !== '' ? String(f.value) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-400">No cost information available for this SRD.</p>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
        <p className="text-xs text-amber-600 font-medium">
          Full Cost Sheets functionality coming soon
        </p>
      </div>
    </div>
  );
}

export default function CostSheetsPage() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('refNo');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ModuleHeader
        title="Cost Sheets"
        srd={refNo ? { refNo } : null}
        accentColor="text-amber-600"
      />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-amber-400" /></div>}>
        <CostSheetsContent />
      </Suspense>
    </div>
  );
}
