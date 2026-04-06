'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ClipboardCheck, Loader2, AlertCircle } from 'lucide-react';
import ModuleHeader from '../_components/ModuleHeader';
import { useSRD } from '../_components/useSRD';

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('refNo');
  const { srd, loading, error } = useSRD(refNo);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
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

  const overallStatus = srd?.status ?? [];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">
      {/* SRD Summary Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <ClipboardCheck size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{srd.refNo}</p>
            {srd.title && <p className="text-xs text-gray-400">{srd.title}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Progress" value={`${srd.progress ?? 0}%`} />
          <InfoRow label="Complete" value={srd.isComplete ? 'Yes' : 'No'} />
          <InfoRow label="Ready for Prod." value={srd.readyForProduction ? 'Yes' : 'No'} />
          <InfoRow label="In Production" value={srd.inProduction ? 'Yes' : 'No'} />
        </div>
      </div>

      {/* Department Status */}
      {overallStatus.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Department Approvals
          </h3>
          <div className="space-y-2">
            {overallStatus.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">{s.department}</span>
                <StatusBadge value={s.value} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Created By */}
      {srd.createdBy && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Created By
          </h3>
          <p className="text-sm text-gray-900 font-medium">{srd.createdBy.name}</p>
          <p className="text-xs text-gray-400">{srd.createdBy.role}</p>
        </div>
      )}

      <ComingSoonBanner module="Order Confirmation" />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({ value }) {
  const colors = {
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    flagged: 'bg-amber-100 text-amber-700',
    pending: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${colors[value] ?? colors.pending}`}>
      {value}
    </span>
  );
}

function ComingSoonBanner({ module }) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center">
      <p className="text-xs text-indigo-500 font-medium">
        Full {module} functionality coming soon
      </p>
    </div>
  );
}

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('refNo');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ModuleHeader
        title="Order Confirmation"
        srd={refNo ? { refNo } : null}
        accentColor="text-indigo-600"
      />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>}>
        <OrderConfirmationContent />
      </Suspense>
    </div>
  );
}
