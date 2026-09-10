'use client';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Animated logo mark */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30 animate-pulse-logo">
          <span className="text-white text-3xl font-black tracking-tighter">M</span>
        </div>
        {/* Orbiting dot */}
        <div className="absolute inset-0 animate-orbit">
          <div className="w-3 h-3 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
        </div>
      </div>

      {/* App name with staggered letter animation */}
      <h1 className="text-center mb-3">
        <span className="block text-sm font-medium text-green-400/80 tracking-widest uppercase animate-fade-in">
          Welcome To
        </span>
        <span className="block text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {'Merchandising'.split('').map((ch, i) => (
            <span key={i} className="inline-block animate-letter" style={{ animationDelay: `${i * 0.04}s` }}>
              {ch}
            </span>
          ))}
        </span>
        <span className="block text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {'Management System'.split('').map((ch, i) => (
            <span key={i} className="inline-block animate-letter" style={{ animationDelay: `${(i + 14) * 0.04}s` }}>
              {ch}
            </span>
          ))}
        </span>
        <span className="block text-lg font-semibold text-green-400 tracking-wider mt-1 animate-fade-in" style={{ animationDelay: '1.2s' }}>
          (MMS)
        </span>
      </h1>

      {/* Loading bar */}
      <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden mt-6">
        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full animate-loading-bar" />
      </div>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-4">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-dot" style={{ animationDelay: '0s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-dot" style={{ animationDelay: '0.2s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-dot" style={{ animationDelay: '0.4s' }} />
      </div>

      <p className="text-gray-500 text-xs mt-6 animate-fade-in" style={{ animationDelay: '1.5s' }}>
        LAZIENDA DENIM (PVT) LTD.
      </p>

      <style jsx>{`
        @keyframes pulse-logo {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px 10px rgba(34,197,94,0.15); }
        }
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(48px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(48px) rotate(-360deg); }
        }
        @keyframes letter-in {
          0% { opacity: 0; transform: translateY(12px) scale(0.8); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
        :global(.animate-pulse-logo) { animation: pulse-logo 2s ease-in-out infinite; }
        :global(.animate-orbit) { animation: orbit 3s linear infinite; }
        :global(.animate-letter) {
          animation: letter-in 0.5s ease-out both;
        }
        :global(.animate-fade-in) {
          animation: fade-in 0.8s ease-out both;
        }
        :global(.animate-loading-bar) {
          animation: loading-bar 2s ease-in-out infinite;
        }
        :global(.animate-dot) {
          animation: dot-bounce 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
