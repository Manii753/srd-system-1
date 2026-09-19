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
      background: 'radial-gradient(ellipse at 50% 40%, #0f172a 0%, #0c1120 60%, #080d18 100%)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        /* ── background grid ── */
        @keyframes ld-grid-move {
          0%   { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }

        /* ── logo pulse ring ── */
        @keyframes ld-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.9); opacity: 0;   }
        }

        /* ── logo float ── */
        @keyframes ld-float {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-6px); }
        }

        /* ── shimmer on logo box ── */
        @keyframes ld-shine {
          0%   { left: -100%; }
          60%, 100% { left: 160%; }
        }

        /* ── text lines fade up ── */
        @keyframes ld-up {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0);    }
        }

        /* ── scanning bar ── */
        @keyframes ld-scan {
          0%   { left: 0%;    opacity: 1; }
          90%  { left: 100%;  opacity: 1; }
          100% { left: 100%;  opacity: 0; }
        }

        /* ── ticker dots ── */
        @keyframes ld-tick {
          0%, 60%, 100% { transform: scaleY(0.4); opacity: 0.3; }
          30%            { transform: scaleY(1.0); opacity: 1;   }
        }

        .ld-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: ld-grid-move 4s linear infinite;
          pointer-events: none;
        }

        .ld-ring {
          position: absolute; inset: -10px;
          border-radius: 24px;
          border: 1.5px solid rgba(99,102,241,0.7);
          animation: ld-ring 2s ease-out infinite;
        }
        .ld-ring-2 {
          animation-delay: 0.7s;
        }
        .ld-ring-3 {
          animation-delay: 1.4s;
        }

        .ld-logo-wrap {
          animation: ld-float 3s ease-in-out infinite;
        }

        .ld-shine::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 40%;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0.18) 50%,
            transparent 100%
          );
          animation: ld-shine 2.4s ease-in-out infinite 0.5s;
        }

        .ld-line-1 { animation: ld-up 0.6s cubic-bezier(.22,.68,0,1.2) 0.2s both; }
        .ld-line-2 { animation: ld-up 0.6s cubic-bezier(.22,.68,0,1.2) 0.4s both; }
        .ld-line-3 { animation: ld-up 0.6s cubic-bezier(.22,.68,0,1.2) 0.6s both; }

        .ld-track {
          position: relative;
          width: 200px; height: 2px;
          background: rgba(99,102,241,0.15);
          border-radius: 9999px;
          overflow: visible;
          margin-top: 28px;
        }
        .ld-fill {
          position: absolute;
          left: 0; top: 0; height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #6366f1, #818cf8);
          border-radius: 9999px;
          box-shadow: 0 0 8px rgba(99,102,241,0.6);
          animation: ld-scan 3s cubic-bezier(.4,0,.2,1) forwards 0.3s;
        }

        .ld-ticker {
          display: flex; gap: 4px; align-items: center; margin-top: 18px;
        }
        .ld-bar-1 { animation: ld-tick 1.2s ease-in-out infinite 0s;    }
        .ld-bar-2 { animation: ld-tick 1.2s ease-in-out infinite 0.15s; }
        .ld-bar-3 { animation: ld-tick 1.2s ease-in-out infinite 0.3s;  }
        .ld-bar-4 { animation: ld-tick 1.2s ease-in-out infinite 0.45s; }
        .ld-bar-5 { animation: ld-tick 1.2s ease-in-out infinite 0.6s;  }
        .ld-bar-6 { animation: ld-tick 1.2s ease-in-out infinite 0.75s; }
        .ld-bar-7 { animation: ld-tick 1.2s ease-in-out infinite 0.9s;  }
      `}</style>

      {/* Animated grid background */}
      <div className="ld-grid" />

      {/* Subtle radial glow behind logo */}
      <div style={{
        position: 'absolute',
        width: 320, height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Logo ── */}
      <div style={{ position: 'relative', marginBottom: 28 }}>
        {/* Pulse rings */}
        <div className="ld-ring" />
        <div className="ld-ring ld-ring-2" />
        <div className="ld-ring ld-ring-3" />

        {/* Logo box */}
        <div className="ld-logo-wrap">
          <div className="ld-shine" style={{
            width: 84, height: 84,
            borderRadius: 20,
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: '1.5px solid rgba(99,102,241,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {companyLogo ? (
              <Image
                src={companyLogo}
                alt={companyName}
                width={84}
                height={84}
                style={{ objectFit: 'contain', width: '100%', height: '100%', padding: 8 }}
              />
            ) : (
              <span style={{ color: '#818cf8', fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>
                {companyName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Text ── */}
      <div style={{ textAlign: 'center' }}>
        <p className="ld-line-1" style={{
          margin: '0 0 6px 0',
          fontSize: 10, fontWeight: 600,
          color: 'rgba(129,140,248,0.7)',
          letterSpacing: 5, textTransform: 'uppercase',
        }}>
          Welcome To
        </p>
        <h1 className="ld-line-2" style={{
          margin: '0 0 5px 0',
          fontSize: 22, fontWeight: 700,
          color: '#f1f5f9',
          letterSpacing: -0.3,
          lineHeight: 1.25,
        }}>
          {companyName}
        </h1>
        <p className="ld-line-3" style={{
          margin: 0,
          fontSize: 12,
          color: '#64748b',
          letterSpacing: 0.3,
        }}>
          Merchandising Management System&nbsp;
          <span style={{ color: '#818cf8', fontWeight: 600 }}>(MMS)</span>
        </p>
      </div>

      {/* ── Scanning progress bar ── */}
      <div className="ld-track">
        <div className="ld-fill" />
      </div>

      {/* ── Audio-visualizer ticker ── */}
      <div className="ld-ticker">
        {['ld-bar-1','ld-bar-2','ld-bar-3','ld-bar-4','ld-bar-5','ld-bar-6','ld-bar-7'].map((cls, i) => (
          <span key={i} className={cls} style={{
            display: 'block',
            width: 3, height: 16,
            borderRadius: 9999,
            background: i === 3
              ? 'rgba(129,140,248,0.9)'
              : `rgba(99,102,241,${0.3 + Math.abs(i - 3) * 0.1})`,
          }} />
        ))}
      </div>

      {/* ── Footer ── */}
      <p style={{
        color: '#334155', fontSize: 10, marginTop: 28,
        letterSpacing: 2, textTransform: 'uppercase',
      }}>
        Lazienda Denim (PVT) Ltd.
      </p>
    </div>
  );
}
