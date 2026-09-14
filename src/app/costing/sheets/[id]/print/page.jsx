'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2, Printer } from 'lucide-react';
import CostSheetGrid from '@/components/CostSheetGrid';
import CostSheetFormHeader from '@/components/CostSheetFormHeader';

function PrintContent() {
  const { id } = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'vmd'].includes(session.user.role)) { router.push('/home'); return; }

    fetch(`/api/cost-sheets/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data);
        else setError(d.error || 'Failed to load');
      })
      .catch(() => setError('Failed to load cost sheet'))
      .finally(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session, status, router]);

  if (error) return <div className="p-8 text-sm text-red-500">{error}</div>;
  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-blue-400" />
      </div>
    );
  }

  const columns = (data.columns || []).map(c => ({ ...c, width: c.width || 120 }));
  const rows = Array.isArray(data.rows) ? data.rows : [];

  return (
    <div className="max-w-[210mm] mx-auto p-6">
      <div className="no-print flex justify-end mb-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg"
        >
          <Printer size={14} /> Print
        </button>
      </div>

      <CostSheetFormHeader
        title={data.title || ''}
        srd={data.srd}
        srdRef={data.srdRefNo || ''}
        headerFields={data.headerFields || []}
        headers={data.headers || {}}
        currency={data.currency || 'USD'}
        editable={false}
      />

      <div className="mt-3">
        <CostSheetGrid
          columns={columns}
          rows={rows}
          editable={false}
          subtotalColumnKey={data.subtotalColumnKey || ''}
        />
      </div>

      {data.notes && (
        <p className="mt-3 text-xs text-gray-600 whitespace-pre-wrap">Notes: {data.notes}</p>
      )}

      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @page { size: A4; margin: 12mm; }
      `}</style>
    </div>
  );
}

export default function CostSheetPrintPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-blue-400" />
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}