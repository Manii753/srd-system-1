'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { FlaskConical, Loader2, AlertCircle } from 'lucide-react';
import ModuleHeader from '../_components/ModuleHeader';
import { useSRD } from '../_components/useSRD';

function SampleManagementContent() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('refNo');
  const { srd, loading, error } = useSRD(refNo);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-emerald-400" />
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

  // Sample-related dynamic fields
  const sampleFields = (srd?.dynamicFields ?? []).filter(
    f => f.department?.toLowerCase().includes('sample') || f.name?.toLowerCase().includes('sample')
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">
      {/* SRD Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <FlaskConical size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{srd.refNo}</p>
            {srd.title && <p className="text-xs text-gray-400">{srd.title}</p>}
          </div>
        </div>
      </div>

      {/* Sample Fields */}
      {sampleFields.length > 0 ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Sample Fields
          </h3>
          <div className="space-y-2">
            {sampleFields.map((f, i) => (
              <div key={i} className="flex flex-col bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-400">{f.name}</span>
                <span className="text-sm font-medium text-gray-900">
                  {f.value != null && f.value !== '' ? String(f.value) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-400">No sample fields recorded for this SRD.</p>
        </div>
      )}

      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
        <p className="text-xs text-emerald-600 font-medium">
          Full Sample Management functionality coming soon
        </p>
      </div>
    </div>
  );
}

export default function SampleManagementPage() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('refNo');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ModuleHeader
        title="Sample Management"
        srd={refNo ? { refNo } : null}
        accentColor="text-emerald-600"
      />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-emerald-400" /></div>}>
        <SampleManagementContent />
      </Suspense>
    </div>
  );
}
