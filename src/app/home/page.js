'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Package, DollarSign, List, Calendar, Truck, BarChart2, MessageSquare, ClipboardList } from 'lucide-react';

const APP_GROUPS = [
  {
    label: 'Home Page',
    apps: [
      { 
        label: 'Order Confirmation', 
        icon: ClipboardList, 
        href: '/dashboard/vmd', 
        color: 'bg-indigo-500', 
        lightColor: 'bg-indigo-50', 
        textColor: 'text-indigo-600' 
      },
      { 
        label: 'Samples Management', 
        icon: Package, 
        href: '/samples', 
        color: 'bg-emerald-500', 
        lightColor: 'bg-emerald-50', 
        textColor: 'text-emerald-600' 
      },
      { 
        label: 'Cost Sheets', 
        icon: DollarSign, 
        href: '#', 
        color: 'bg-amber-500', 
        lightColor: 'bg-amber-50', 
        textColor: 'text-amber-600' 
      },
      { 
        label: 'Bom', 
        icon: List, 
        href: '#', 
        color: 'bg-rose-500', 
        lightColor: 'bg-rose-50', 
        textColor: 'text-rose-600' 
      },
      { 
        label: 'Planning', 
        icon: Calendar, 
        href: '#', 
        color: 'bg-violet-500', 
        lightColor: 'bg-violet-50', 
        textColor: 'text-violet-600' 
      },
    ],
  },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [company, setCompany] = useState({ name: 'SRD System' });
  const [showSplash, setShowSplash] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    fetch('/api/company').then(r => r.json()).then(d => { if (d?.name) setCompany(d); }).catch(() => {});
  }, []);

  // Check if splash should be shown (only first time after login)
  useEffect(() => {
    if (status === 'authenticated') {
      const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
      if (!hasSeenSplash) {
        setShowSplash(true);
        sessionStorage.setItem('hasSeenSplash', 'true');
      }
    }
  }, [status]);

  // Splash screen timing
  useEffect(() => {
    if (showSplash && status === 'authenticated' && company.name) {
      const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
      const hideTimer = setTimeout(() => setShowSplash(false), 2500);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [showSplash, status, company.name]);

  if (status === 'loading') return null;

  // Show splash screen
  if (showSplash) {
    return (
      <div
        className={`min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex flex-col items-center justify-center transition-opacity duration-500 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Animated background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Logo container with glow effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-2xl opacity-50 animate-pulse" />
            {company.logo ? (
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-2xl bg-white p-4">
                <img
                  src={company.logo}
                  alt="Company logo"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="relative w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl">
                <span className="text-5xl font-bold text-white">
                  {company?.name?.[0] ?? 'S'}
                </span>
              </div>
            )}
          </div>

          {/* Company name with gradient text */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
              {company?.name ?? 'Loading...'}
            </h1>
            <p className="text-gray-400 text-sm tracking-wider uppercase">
              Sample Request & Dispatch System
            </p>
          </div>

          {/* Loading animation */}
          <div className="flex gap-2 mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute bottom-8 text-gray-600 text-xs">
          Powered by SRD System
        </div>
      </div>
    );
  }

  // Main home page
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Left Logo */}
            <div className="flex items-center gap-4">
              {company.logo && (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-gray-200 p-1.5">
                  <img src={company.logo} alt="logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {company.name}
                </h1>
                <p className="text-sm text-gray-500">Sample Request & Dispatch System</p>
              </div>
            </div>

            {/* User Info */}
            {session && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
                <p className="text-xs text-gray-500 uppercase">{session.user?.role}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {APP_GROUPS.map((group) => (
          <div key={group.label} className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-lg font-semibold text-gray-700 uppercase tracking-wide">
                {group.label}
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
            </div>

            {/* App Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {group.apps.map((app) => {
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
        ))}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs text-gray-500">
            © {new Date().getFullYear()} {company.name} • All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
