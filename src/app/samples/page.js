'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Package, ClipboardList, Truck, BarChart2, MessageSquare } from 'lucide-react';

const SAMPLE_APPS = [
  { label: 'SR In Process', href: '/srd', icon: FileText, color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-600' },
  { label: 'SR Progress', href: '/sample-management/sample-process', icon: Package, color: 'bg-emerald-500', lightColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
  { label: 'Sample Card', href: '/samples/sample-card', icon: ClipboardList, color: 'bg-amber-500', lightColor: 'bg-amber-50', textColor: 'text-amber-600' },
  { label: 'Dispatch Detail', href: '/samples/dispatch', icon: Truck, color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-600' },
  { label: 'Reports', href: '/sample-management/reports', icon: BarChart2, color: 'bg-rose-500', lightColor: 'bg-rose-50', textColor: 'text-rose-600' },
  { label: 'Buyer Comment', href: '/samples/buyer-comment', icon: MessageSquare, color: 'bg-indigo-500', lightColor: 'bg-indigo-50', textColor: 'text-indigo-600' },
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
                  className={`${app.lightColor} rounded-xl p-4 h-32 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200 border border-gray-100 group`}
                >
                  <div className={`${app.color} w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className={`font-semibold text-xs ${app.textColor}`}>{app.label}</span>
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
