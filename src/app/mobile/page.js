'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function MobileSplash() {
  const router = useRouter();
  const [company, setCompany] = useState(null);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    fetch('/api/company')
      .then(r => r.json())
      .then(data => setCompany(data))
      .catch(() => setCompany({}));
  }, []);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 5600);
    const navTimer = setTimeout(() => router.replace('/mobile/home'), 6000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [router]);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-gray-900 transition-opacity duration-400 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {company?.logo ? (
        <div className="w-28 h-28 rounded-2xl overflow-hidden mb-6 shadow-2xl">
          <img
            src={company.logo}
            alt="Company logo"
            className="w-full h-full object-contain bg-white"
          />
        </div>
      ) : (
        <div className="w-28 h-28 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-2xl">
          <span className="text-4xl font-bold text-gray-900">
            {company?.name?.[0] ?? 'S'}
          </span>
        </div>
      )}

      <h1 className="text-2xl font-bold text-white tracking-wide">
        {company?.name ?? 'Loading…'}
      </h1>
      <p className="text-gray-400 text-sm mt-2">SRD Tracking System</p>

      <div className="absolute bottom-12 flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-white opacity-60 animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
