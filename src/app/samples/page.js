'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Package, ClipboardList, Truck, BarChart2, MessageSquare } from 'lucide-react';

const SAMPLE_APPS = [
  { label: 'Sample Request', href: '/srd', icon: FileText, color: 'bg-yellow-400' },
  { label: 'Sample Process', href: '/srd', icon: Package, color: 'bg-yellow-400' },
  { label: 'Sample Card', href: '/samples/sample-card', icon: ClipboardList, color: 'bg-yellow-400' },
  { label: 'Dispatch Detail', href: '/samples/dispatch', icon: Truck, color: 'bg-yellow-400' },
  { label: 'Reports', href: '/reports', icon: BarChart2, color: 'bg-yellow-400' },
  { label: 'Buyer Comment', href: '/samples/buyer-comment', icon: MessageSquare, color: 'bg-yellow-400' },
];

export default function SamplesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  if (status === 'loading') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/home" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back to Home</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-lg font-semibold text-gray-900 uppercase tracking-wide">
                Samples Management
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* App Grid */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {SAMPLE_APPS.map((app) => {
            const Icon = app.icon;
            return (
              <Link key={app.label} href={app.href}>
                <div
                  className={`${app.color} text-black rounded-lg p-4 h-28 flex flex-col items-center justify-center text-center font-semibold text-xs cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border border-gray-200/50`}
                >
                  <Icon className="h-5 w-5 mb-2" />
                  <span>{app.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs text-gray-500">
            © {new Date().getFullYear()} • All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
