'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Package, DollarSign, List, Calendar, Truck, BarChart2, MessageSquare, ClipboardList } from 'lucide-react';

const APP_GROUPS = [
  {
    label: 'Applications',
    apps: [
      { 
        label: 'Cost Sheets', 
        icon: DollarSign, 
        href: '/costing/pre', 
        color: 'bg-amber-500', 
        lightColor: 'bg-amber-50', 
        textColor: 'text-amber-600' 
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
        label: 'Order Confirmation', 
        icon: ClipboardList, 
        href: '/dashboard/vmd', 
        color: 'bg-indigo-500', 
        lightColor: 'bg-indigo-50', 
        textColor: 'text-indigo-600' 
      },
      { 
        label: 'Planning', 
        icon: Calendar, 
        href: '/production', 
        color: 'bg-violet-500', 
        lightColor: 'bg-violet-50', 
        textColor: 'text-violet-600' 
      },
      { 
        label: 'Bom', 
        icon: List, 
        href: '/bom', 
        color: 'bg-rose-500', 
        lightColor: 'bg-rose-50', 
        textColor: 'text-rose-600' 
      },
    ],
  },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [company, setCompany] = useState({ name: 'MMS' });
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
      const fadeTimer = setTimeout(() => setFadeOut(true), 5500);
      const hideTimer = setTimeout(() => setShowSplash(false), 6000);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [showSplash, status, company.name]);

  if (status === 'loading') return null;

  // Show splash screen — matches loading.js theme (dark + green)
  if (showSplash) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ background: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)' }}
      >
        <style>{`
          @keyframes sp-orbit {
            0%   { transform: rotate(0deg)   translateX(52px) rotate(0deg);    }
            100% { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
          }
          @keyframes sp-bar {
            0%   { width: 0%;   }
            100% { width: 100%; }
          }
          @keyframes sp-dot {
            0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
            40%           { opacity: 1;   transform: scale(1.2); }
          }
          @keyframes sp-fade {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0);   }
          }
          .sp-orbit { animation: sp-orbit 3s linear infinite; }
          .sp-bar   { animation: sp-bar 5s ease-out forwards; }
          .sp-dot-1 { animation: sp-dot 1.4s ease-in-out infinite 0s;   }
          .sp-dot-2 { animation: sp-dot 1.4s ease-in-out infinite 0.2s; }
          .sp-dot-3 { animation: sp-dot 1.4s ease-in-out infinite 0.4s; }
          .sp-fade  { animation: sp-fade 0.8s ease-out both; }
        `}</style>

        {/* Logo mark with orbiting dot */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #22c55e, #10b981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(34,197,94,0.35)',
            overflow: 'hidden',
          }}>
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
              />
            ) : (
              <span style={{ color: '#fff', fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>
                {(company?.name?.[0] ?? 'M').toUpperCase()}
              </span>
            )}
          </div>
          {/* Orbiting dot */}
          <div className="sp-orbit" style={{ position: 'absolute', inset: 0 }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 8px rgba(74,222,128,0.6)',
            }} />
          </div>
        </div>

        {/* Company name */}
        <div className="sp-fade" style={{ textAlign: 'center', marginBottom: 12 }}>
          <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 500, color: 'rgba(74,222,128,0.8)', letterSpacing: 4, textTransform: 'uppercase' }}>
            Welcome To
          </p>
          <h1 style={{ margin: '0 0 4px 0', fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -0.5, lineHeight: 1.3 }}>
            {company?.name ?? 'Loading...'}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#9ca3af', letterSpacing: 0.3 }}>
            Merchandising Management System <span style={{ color: '#4ade80', fontWeight: 600 }}>(MMS)</span>
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ width: 192, height: 4, background: '#374151', borderRadius: 9999, overflow: 'hidden', marginTop: 24 }}>
          <div className="sp-bar" style={{ height: '100%', background: 'linear-gradient(to right, #22c55e, #34d399)', borderRadius: 9999 }} />
        </div>

        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
          <span className="sp-dot-1" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'block' }} />
          <span className="sp-dot-2" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'block' }} />
          <span className="sp-dot-3" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'block' }} />
        </div>

        <p style={{ color: '#6b7280', fontSize: 11, marginTop: 24 }}>
          LAZIENDA DENIM (PVT) LTD.
        </p>
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
                <p className="text-sm text-gray-500"></p>
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
