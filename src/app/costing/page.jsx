'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import SRDSearch from './_components/SRDSearch';
import { DollarSign, ClipboardList, TrendingUp } from 'lucide-react';

export default function CostingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedSrd, setSelectedSrd] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'vmd'].includes(session.user.role)) {
      router.push('/home');
    }
  }, [session, status, router]);

  const handleSelect = (srd) => {
    setSelectedSrd(srd);
  };

  const goTo = (path) => {
    if (!selectedSrd) return;
    router.push(`/costing/${path}?srdId=${selectedSrd._id}`);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign size={22} className="text-blue-600" />
            Costing Module
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage pre-production estimates and post-production actual costs for any SRD.
          </p>
        </div>

        {/* SRD Search */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Select SRD</h2>
          <SRDSearch onSelect={handleSelect} />

          {selectedSrd && (
            <div className="flex items-center gap-3 mt-1 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{selectedSrd.refNo}</p>
                {selectedSrd.title && <p className="text-xs text-gray-500">{selectedSrd.title}</p>}
              </div>
              <span className="text-xs text-blue-600 font-medium">Selected ✓</span>
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => router.push(`/costing/pre${selectedSrd ? `?srdId=${selectedSrd._id}` : ''}`)}
            className="group flex flex-col items-start p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
              <ClipboardList size={20} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900">Pre-Costing</h3>
            <p className="text-xs text-gray-500 mt-1">
              Estimated / budgeted costs before production begins.
            </p>
          </button>

          <button
            onClick={() => goTo('post')}
            disabled={!selectedSrd}
            className="group flex flex-col items-start p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-emerald-400 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900">Post-Costing</h3>
            <p className="text-xs text-gray-500 mt-1">
              Actual costs incurred after or during production.
            </p>
          </button>
        </div>

        {!selectedSrd && (
          <p className="text-xs text-gray-400 text-center">Search and select an SRD above to open post costing.</p>
        )}
      </div>
    </Layout>
  );
}
