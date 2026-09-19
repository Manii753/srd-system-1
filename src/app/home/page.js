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

  // Show splash screen — premium blue/indigo design, no green
  if (showSplash) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
          fadeOut ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #0f172a 0%, #0c1120 60%, #080d18 100%)',
          position: 'relative',
        }}
      >
        <style>{`
          @keyframes sp-grid-move {
            0%   { background-position: 0 0; }
            100% { background-position: 40px 40px; }
          }
          @keyframes sp-ring {
            0%   { transform: scale(1);   opacity: 0.6; }
            100% { transform: scale(1.9); opacity: 0;   }
          }
          @keyframes sp-float {
            0%, 100% { transform: translateY(0px);  }
            50%       { transform: translateY(-6px); }
          }
          @keyframes sp-shine {
            0%   { left: -100%; }
            60%, 100% { left: 160%; }
          }
          @keyframes sp-up {
            0%   { opacity: 0; transform: translateY(14px); }
            100% { opacity: 1; transform: translateY(0);    }
          }
          @keyframes sp-scan {
            0%   { left: 0%;   opacity: 1; }
            90%  { left: 100%; opacity: 1; }
            100% { left: 100%; opacity: 0; }
          }
          @keyframes sp-tick {
            0%, 60%, 100% { transform: scaleY(0.4); opacity: 0.3; }
            30%            { transform: scaleY(1.0); opacity: 1;   }
          }
          .sp-grid {
            position: absolute; inset: 0;
            background-image:
              linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
            background-size: 40px 40px;
            animation: sp-grid-move 4s linear infinite;
            pointer-events: none;
          }
          .sp-ring {
            position: absolute; inset: -10px;
            border-radius: 24px;
            border: 1.5px solid rgba(99,102,241,0.7);
            animation: sp-ring 2s ease-out infinite;
          }
          .sp-ring-2 { animation-delay: 0.7s; }
          .sp-ring-3 { animation-delay: 1.4s; }
          .sp-logo-wrap { animation: sp-float 3s ease-in-out infinite; }
          .sp-shine { position: relative; overflow: hidden; }
          .sp-shine::after {
            content: '';
            position: absolute; top: 0; bottom: 0;
            width: 40%;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
            animation: sp-shine 2.4s ease-in-out infinite 0.5s;
          }
          .sp-line-1 { animation: sp-up 0.6s cubic-bezier(.22,.68,0,1.2) 0.2s both; }
          .sp-line-2 { animation: sp-up 0.6s cubic-bezier(.22,.68,0,1.2) 0.4s both; }
          .sp-line-3 { animation: sp-up 0.6s cubic-bezier(.22,.68,0,1.2) 0.6s both; }
          .sp-track {
            position: relative; width: 200px; height: 2px;
            background: rgba(99,102,241,0.15); border-radius: 9999px;
            overflow: visible; margin-top: 28px;
          }
          .sp-fill {
            position: absolute; left: 0; top: 0; height: 100%; width: 0%;
            background: linear-gradient(90deg, #6366f1, #818cf8);
            border-radius: 9999px;
            box-shadow: 0 0 8px rgba(99,102,241,0.6);
            animation: sp-scan 5s cubic-bezier(.4,0,.2,1) forwards 0.3s;
          }
          .sp-ticker { display: flex; gap: 4px; align-items: center; margin-top: 18px; }
          .sp-b1 { animation: sp-tick 1.2s ease-in-out infinite 0s;    }
          .sp-b2 { animation: sp-tick 1.2s ease-in-out infinite 0.15s; }
          .sp-b3 { animation: sp-tick 1.2s ease-in-out infinite 0.3s;  }
          .sp-b4 { animation: sp-tick 1.2s ease-in-out infinite 0.45s; }
          .sp-b5 { animation: sp-tick 1.2s ease-in-out infinite 0.6s;  }
          .sp-b6 { animation: sp-tick 1.2s ease-in-out infinite 0.75s; }
          .sp-b7 { animation: sp-tick 1.2s ease-in-out infinite 0.9s;  }
        `}</style>

        {/* Grid bg */}
        <div className="sp-grid" />

        {/* Glow */}
        <div style={{
          position: 'absolute', width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <div className="sp-ring" />
          <div className="sp-ring sp-ring-2" />
          <div className="sp-ring sp-ring-3" />
          <div className="sp-logo-wrap">
            <div className="sp-shine" style={{
              width: 84, height: 84, borderRadius: 20,
              background: 'linear-gradient(145deg, #1e293b, #0f172a)',
              border: '1.5px solid rgba(99,102,241,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 20px 40px rgba(0,0,0,0.4)',
              overflow: 'hidden', position: 'relative',
            }}>
              {company.logo ? (
                <img src={company.logo} alt={company.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
              ) : (
                <span style={{ color: '#818cf8', fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>
                  {(company?.name?.[0] ?? 'M').toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center' }}>
          <p className="sp-line-1" style={{ margin: '0 0 6px 0', fontSize: 10, fontWeight: 600, color: 'rgba(129,140,248,0.7)', letterSpacing: 5, textTransform: 'uppercase' }}>
            Welcome To
          </p>
          <h1 className="sp-line-2" style={{ margin: '0 0 5px 0', fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.3, lineHeight: 1.25 }}>
            {company?.name ?? 'Loading...'}
          </h1>
          <p className="sp-line-3" style={{ margin: 0, fontSize: 12, color: '#64748b', letterSpacing: 0.3 }}>
            Merchandising Management System&nbsp;<span style={{ color: '#818cf8', fontWeight: 600 }}>(MMS)</span>
          </p>
        </div>

        {/* Scan bar */}
        <div className="sp-track"><div className="sp-fill" /></div>

        {/* Visualizer */}
        <div className="sp-ticker">
          {[['sp-b1',0],['sp-b2',1],['sp-b3',2],['sp-b4',3],['sp-b5',2],['sp-b6',1],['sp-b7',0]].map(([cls,d],i) => (
            <span key={i} className={cls} style={{
              display: 'block', width: 3, height: 16, borderRadius: 9999,
              background: d === 3 ? 'rgba(129,140,248,0.9)' : `rgba(99,102,241,${0.3 + d * 0.1})`,
            }} />
          ))}
        </div>

        <p style={{ color: '#334155', fontSize: 10, marginTop: 28, letterSpacing: 2, textTransform: 'uppercase' }}>
          Lazienda Denim (PVT) Ltd.
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
