'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function ModuleHeader({ title, srd, accentColor = 'text-indigo-600' }) {
  const router = useRouter();

  return (
    <div className="bg-white px-4 pt-12 pb-4 shadow-sm border-b border-gray-100">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/mobile/home')}
          className="p-2 -ml-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-widest ${accentColor}`}>
            {title}
          </p>
          {srd && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-bold text-gray-900 truncate">{srd.refNo}</span>
              {srd.title && (
                <span className="text-xs text-gray-400 truncate hidden sm:inline">— {srd.title}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
