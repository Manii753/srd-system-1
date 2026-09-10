'use client';

import Image from 'next/image';

export default function LoadingScreen({ companyName = 'Merchandising Management System', companyLogo = '' }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #111827 100%)',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes ld-orbit {
          0%   { transform: rotate(0deg)   translateX(48px) rotate(0deg);    }
          100% { transform: rotate(360deg) translateX(48px) rotate(-360deg); }
        }
        @keyframes ld-fade {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0);   }
        }
        @keyframes ld-bar {
          0%   { width: 0%;   }
          50%  { width: 70%;  }
          100% { width: 100%; }
        }
        @keyframes ld-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%           { opacity: 1;   transform: scale(1.2); }
        }
        .ld-orbit { animation: ld-orbit 3s linear infinite; }
        .ld-fade  { animation: ld-fade  0.8s ease-out both;  }
        .ld-bar   { animation: ld-bar   2s ease-in-out infinite; }
        .ld-dot-1 { animation: ld-dot 1.4s ease-in-out infinite 0s;    }
        .ld-dot-2 { animation: ld-dot 1.4s ease-in-out infinite 0.2s;  }
        .ld-dot-3 { animation: ld-dot 1.4s ease-in-out infinite 0.4s;  }
      `}</style>

      {/* Logo circle */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #22c55e, #10b981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(34,197,94,0.35)',
          overflow: 'hidden',
        }}>
          {companyLogo ? (
            <Image
              src={companyLogo}
              alt={companyName}
              width={80}
              height={80}
              style={{ objectFit: 'contain', width: '100%', height: '100%', padding: 6 }}
            />
          ) : (
            <span style={{ color: '#fff', fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>
              {companyName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Orbiting dot */}
        <div className="ld-orbit" style={{ position: 'absolute', inset: 0 }}>
          <div style={{
            width: 12, height: 12,
            borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 8px rgba(74,222,128,0.6)',
          }} />
        </div>
      </div>

      {/* Title */}
      <div className="ld-fade" style={{ textAlign: 'center', marginBottom: 12 }}>
        <p style={{ margin: '0 0 4px 0', fontSize: 11, fontWeight: 500, color: 'rgba(74,222,128,0.8)', letterSpacing: 4, textTransform: 'uppercase' }}>
          Welcome To
        </p>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5, lineHeight: 1.3 }}>
          {companyName}
        </h1>
      </div>

      {/* Progress bar */}
      <div style={{
        width: 192, height: 4,
        background: '#374151',
        borderRadius: 9999,
        overflow: 'hidden',
        marginTop: 24,
      }}>
        <div className="ld-bar" style={{
          height: '100%',
          background: 'linear-gradient(to right, #22c55e, #34d399)',
          borderRadius: 9999,
        }} />
      </div>

      {/* Bouncing dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
        <span className="ld-dot-1" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'block' }} />
        <span className="ld-dot-2" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'block' }} />
        <span className="ld-dot-3" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'block' }} />
      </div>

      <p style={{ color: '#6b7280', fontSize: 11, marginTop: 24 }}>
        LAZIENDA DENIM (PVT) LTD.
      </p>
    </div>
  );
}
