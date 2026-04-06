'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Layers, Loader2, AlertCircle } from 'lucide-react';
import ModuleHeader from '../_components/ModuleHeader';
import { useSRD } from '../_components/useSRD';

function BOMContent() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('refNo');
  const { srd, loading, error } = useSRD(refNo);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-rose-400" />
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

  // BOM-related fields (materials, fabric, trims etc.)
  const bomFields = (srd?.dynamicFields ?? []).filter(
    f =>
      f.name?.toLowerCase().includes('material') ||
      f.name?.toLowerCase().includes('fabric') ||
      f.name?.toLowerCase().includes('trim') ||
      f.name?.toLowerCase().includes('bom') ||
      f.slug?.toLowerCase().includes('material') ||
      f.slug?.toLowerCase().includes('bom')
  );

  // Table-type fields that may contain BOM data
  const tableFields = (srd?.dynamicFields ?? []).filter(f => f.type === 'table');

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">
      {/* SRD Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
            <Layers size={20} className="text-rose-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{srd.refNo}</p>
            {srd.title && <p className="text-xs text-gray-400">{srd.title}</p>}
          </div>
        </div>
      </div>

      {/* BOM Fields */}
      {bomFields.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Materials & Trims
          </h3>
          <div className="space-y-2">
            {bomFields.map((f, i) => (
              <div key={i} className="flex flex-col bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-400">{f.name}</span>
                <span className="text-sm font-medium text-gray-900">
                  {f.value != null && f.value !== '' ? String(f.value) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table fields */}
      {tableFields.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            BOM Tables ({tableFields.length})
          </h3>
          <p className="text-sm text-gray-500">
            {tableFields.length} table{tableFields.length > 1 ? 's' : ''} available in this SRD.
          </p>
          <p className="text-xs text-gray-400 mt-1">Full table view coming soon.</p>
        </div>
      )}

      {bomFields.length === 0 && tableFields.length === 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-400">No BOM data found for this SRD.</p>
        </div>
      )}

      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
        <p className="text-xs text-rose-600 font-medium">
          Full Bill of Materials functionality coming soon
        </p>
      </div>
    </div>
  );
}

export default function BOMPage() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('refNo');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ModuleHeader
        title="BOM — Bill of Materials"
        srd={refNo ? { refNo } : null}
        accentColor="text-rose-600"
      />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-rose-400" /></div>}>
        <BOMContent />
      </Suspense>
    </div>
  );
}
