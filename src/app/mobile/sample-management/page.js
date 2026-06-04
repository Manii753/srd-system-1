'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Package, ClipboardList, Truck, BarChart3, MessageSquare } from 'lucide-react';
import SRDLookupModal from '../home/SRDLookupModal';

// Simple ModuleHeader component inline
function ModuleHeader({ title }) {
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
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}

const SAMPLE_MODULES = [
  {
    key: 'srd',
    label: 'SR In Process',
    description: 'View sample requests in process',
    icon: FileText,
    href: '/srd',
    requiresSRD: false,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    key: 'sample-process',
    label: 'SR Progress',
    description: 'Track sample production progress',
    icon: Package,
    href: '/mobile/sample-process',
    requiresSRD: true,
    color: 'bg-emerald-500',
    lightColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    key: 'sample-card',
    label: 'Sample Card',
    description: 'Manage sample cards',
    icon: ClipboardList,
    href: '/samples/sample-card',
    requiresSRD: false,
    color: 'bg-amber-500',
    lightColor: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    key: 'dispatch',
    label: 'Dispatch Detail',
    description: 'View dispatch information',
    icon: Truck,
    href: '/samples/dispatch',
    requiresSRD: false,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'View sample management reports',
    icon: BarChart3,
    href: '/sample-management/reports',
    requiresSRD: false,
    color: 'bg-rose-500',
    lightColor: 'bg-rose-50',
    textColor: 'text-rose-600',
  },
  {
    key: 'buyer-comment',
    label: 'Buyer Comment',
    description: 'View buyer feedback',
    icon: MessageSquare,
    href: '/samples/buyer-comment',
    requiresSRD: false,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
];

export default function MobileSampleManagement() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState(null);

  const handleModuleClick = (module) => {
    if (module.requiresSRD) {
      // Show SRD lookup modal
      setActiveModule(module);
    } else {
      // Navigate directly
      router.push(module.href);
    }
  };

  const handleSRDFound = (srd) => {
    // Navigate to the module with the SRD
    router.push(`${activeModule.href}?srdId=${srd._id}&refNo=${encodeURIComponent(srd.refNo)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ModuleHeader title="Sample Management" />

      {/* Module Grid */}
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 gap-3">
          {SAMPLE_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.key}
                onClick={() => handleModuleClick(module)}
                className={`aspect-square flex flex-col items-center justify-center gap-3 ${module.lightColor} rounded-2xl shadow-sm border border-gray-100 active:scale-[0.96] transition-transform p-4`}
              >
                <div className={`w-14 h-14 ${module.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                  <Icon size={26} className="text-white" />
                </div>
                <p className={`font-semibold text-xs text-center leading-tight ${module.textColor}`}>
                  {module.label}
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
