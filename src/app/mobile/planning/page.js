'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CalendarDays, Loader2, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import ModuleHeader from '../_components/ModuleHeader';
import { useSRD } from '../_components/useSRD';

function PlanningContent() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('refNo');
  const { srd, loading, error } = useSRD(refNo);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-violet-400" />
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

  const productionHistory = srd?.productionHistory ?? [];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const stageStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 size={16} className="text-green-500" />;
    if (status === 'in-progress') return <Clock size={16} className="text-amber-500" />;
    if (status === 'issue') return <XCircle size={16} className="text-red-500" />;
    return <Clock size={16} className="text-gray-300" />;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">
      {/* SRD Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
            <CalendarDays size={20} className="text-violet-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-sm">{srd.refNo}</p>
            {srd.title && <p className="text-xs text-gray-400">{srd.title}</p>}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{srd.progress ?? 0}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-violet-500 h-2 rounded-full transition-all"
              style={{ width: `${srd.progress ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Key Dates */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Key Dates
        </h3>
        <div className="space-y-2">
          <DateRow label="Created" value={formatDate(srd.createdAt)} />
          <DateRow label="Last Updated" value={formatDate(srd.updatedAt)} />
          {srd.productionStartDate && <DateRow label="Production Start" value={formatDate(srd.productionStartDate)} />}
          {srd.productionEndDate && <DateRow label="Production End" value={formatDate(srd.productionEndDate)} />}
          {srd.dispatchDate && <DateRow label="Dispatch Date" value={formatDate(srd.dispatchDate)} />}
        </div>
      </div>

      {/* Production History */}
      {productionHistory.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Production Stages
          </h3>
          <div className="space-y-3">
            {productionHistory.map((stage, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5">{stageStatusIcon(stage.status)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {stage.stageDisplayName || stage.stageName || 'Stage'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(stage.startDate)}
                    {stage.endDate ? ` → ${formatDate(stage.endDate)}` : ' → ongoing'}
                  </p>
                  {stage.notes && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">"{stage.notes}"</p>
                  )}
                </div>
                <span className={`text-xs font-medium capitalize px-2 py-0.5 rounded-full ${
                  stage.status === 'completed' ? 'bg-green-100 text-green-700' :
                  stage.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                  stage.status === 'issue' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {stage.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {productionHistory.length === 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-400">No production history recorded yet.</p>
        </div>
      )}

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-center">
        <p className="text-xs text-violet-600 font-medium">
          Full Planning functionality coming soon
        </p>
      </div>
    </div>
  );
}

function DateRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function PlanningPage() {
  const searchParams = useSearchParams();
  const refNo = searchParams.get('refNo');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ModuleHeader
        title="Planning"
        srd={refNo ? { refNo } : null}
        accentColor="text-violet-600"
      />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-violet-400" /></div>}>
        <PlanningContent />
      </Suspense>
    </div>
  );
}
