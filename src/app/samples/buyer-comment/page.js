'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SRDLookup from '@/components/SRDLookup';
import DispatchPanel from '@/components/DispatchPanel';

export default function BuyerCommentPage() {
  const { data: session } = useSession();
  const [srd, setSrd] = useState(null);

  const canEdit = session?.user?.role === 'vmd' || session?.user?.role === 'admin' || session?.user?.role === 'dispatch';

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/samples" className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-800">Buyer Comment</h1>
      </div>

      <div className="mb-6">
        <SRDLookup
          placeholder="Enter SRD number (e.g. SRD-1011)..."
          onFound={setSrd}
        />
      </div>

      {srd && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="font-semibold text-gray-700">{srd.refNo}</span>
            <span className="text-sm text-gray-500">{srd.description || ''}</span>
          </div>
          {/* Show only the Buyer Comments section from DispatchPanel */}
          <div className="p-2">
            <DispatchPanel
              srd={srd}
              onUpdate={(updated) => setSrd(updated)}
              canEdit={canEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
