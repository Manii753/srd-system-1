'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import SRDLookup from '@/components/SRDLookup';
import DispatchCardPrint from '@/app/dispatch/components/DispatchCardPrint';

export default function SampleCardPage() {
  const [srd, setSrd] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/samples" className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-800">Sample Card</h1>
      </div>

      <div className="mb-6">
        <SRDLookup
          placeholder="Enter SRD number (e.g. SRD-1011)..."
          onFound={setSrd}
        />
      </div>

      {srd && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-gray-700">{srd.refNo}</span>
            <DispatchCardPrint srd={srd} />
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            {srd.description && <p><span className="font-medium">Description:</span> {srd.description}</p>}
            {srd.dynamicFields?.filter(f => f.value && ['Buyer', 'Brand', 'Sample Type', 'Buyer Style Ref.'].includes(f.name)).map(f => (
              <p key={f.name}><span className="font-medium">{f.name}:</span> {String(f.value)}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
