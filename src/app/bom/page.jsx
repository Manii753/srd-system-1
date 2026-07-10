'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import SRDSearch from '@/app/costing/_components/SRDSearch';
import { Layers } from 'lucide-react';

export default function BOMIndexPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedSrd, setSelectedSrd] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'vmd', 'commercial', 'cad', 'mmc'].includes(session.user.role)) {
      router.push('/home');
    }
  }, [session, status, router]);

  const handleOpen = () => {
    if (!selectedSrd) return;
    router.push(`/bom/${selectedSrd._id}`);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers size={22} className="text-rose-600" />
            Bill of Materials
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage BOM sheets for any SRD — fabrics, trims, size grids and more.
          </p>
        </div>

        {/* SRD Search */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Select SRD</h2>
          <SRDSearch onSelect={setSelectedSrd} />

          {selectedSrd && (
            <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100 rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{selectedSrd.refNo}</p>
                {selectedSrd.title && <p className="text-xs text-gray-500">{selectedSrd.title}</p>}
              </div>
              <span className="text-xs text-rose-600 font-medium">Selected ✓</span>
            </div>
          )}
        </div>

        {/* Open BOM button */}
        <button
          onClick={handleOpen}
          disabled={!selectedSrd}
          className="w-full group flex flex-col items-start p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-rose-400 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center mb-3 group-hover:bg-rose-100 transition-colors">
            <Layers size={20} className="text-rose-600" />
          </div>
          <h3 className="font-bold text-gray-900">Open BOM Sheet</h3>
          <p className="text-xs text-gray-500 mt-1">
            Manage fabric details, size grid, before/after wash trims and packaging for the selected SRD.
          </p>
        </button>

        {!selectedSrd && (
          <p className="text-xs text-gray-400 text-center">Search and select an SRD above to open its BOM sheet.</p>
        )}
      </div>
    </Layout>
  );
}
