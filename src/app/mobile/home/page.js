'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ClipboardCheck,
  FlaskConical,
  DollarSign,
  Layers,
  CalendarDays,
  LogOut,
} from 'lucide-react';
import SRDLookupModal from './SRDLookupModal';
import { signOut } from 'next-auth/react';

const MODULES = [
  {
    key: 'order-confirmation',
    label: 'Order Confirmation',
    description: 'Review & confirm order details',
    icon: ClipboardCheck,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
  {
    key: 'sample-management',
    label: 'Sample Management',
    description: 'Track and manage samples',
    icon: FlaskConical,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    key: 'cost-sheets',
    label: 'Cost Sheets',
    description: 'View costing & pricing details',
    icon: DollarSign,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    key: 'bom',
    label: 'BOM',
    description: 'Bill of Materials breakdown',
    icon: Layers,
    color: 'bg-rose-500',
    lightColor: 'bg-rose-50',
    textColor: 'text-rose-600',
  },
  {
    key: 'planning',
    label: 'Planning',
    description: 'Timelines & production planning',
    icon: CalendarDays,
    color: 'bg-violet-500',
    lightColor: 'bg-violet-50',
    textColor: 'text-violet-600',
  },
];

export default function MobileHome() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeModule, setActiveModule] = useState(null);

  const handleModulePress = (module) => {
    setActiveModule(module);
  };

  const handleSRDFound = (srd) => {
    router.push(`/mobile/${activeModule.key}?srdId=${srd._id}&refNo=${encodeURIComponent(srd.refNo)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Welcome back</p>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5">
              {session?.user?.name ?? 'User'}
            </h1>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
            className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} className="text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-3">
          Select a module and enter an SRD reference to get started.
        </p>
      </div>

      {/* Module Grid */}
      <div className="flex-1 px-4 py-5 overflow-y-auto pb-10">
        <div className="grid grid-cols-2 gap-3">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.key}
                onClick={() => handleModulePress(mod)}
                className={`aspect-square flex flex-col items-center justify-center gap-3 ${mod.lightColor} rounded-2xl shadow-sm border border-gray-100 active:scale-[0.96] transition-transform p-4`}
              >
                <div className={`w-14 h-14 ${mod.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                  <Icon size={26} className="text-white" />
                </div>
                <p className={`font-semibold text-xs text-center leading-tight ${mod.textColor}`}>
                  {mod.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* SRD Lookup Modal */}
      {activeModule && (
        <SRDLookupModal
          moduleKey={activeModule.key}
          moduleLabel={activeModule.label}
          onClose={() => setActiveModule(null)}
          onFound={handleSRDFound}
        />
      )}
    </div>
  );
}
