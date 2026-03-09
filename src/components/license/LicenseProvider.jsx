'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import LicenseExpiredScreen from './LicenseExpiredScreen';

const LicenseContext = createContext({
  licenseStatus: null,
  loading: true,
});

function LicenseLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
    </div>
  );
}

export function LicenseProvider({ children, initialStatus }) {
  const [licenseStatus, setLicenseStatus] = useState(initialStatus ?? null);
  const [loading, setLoading] = useState(!initialStatus);
  const contextValue = { licenseStatus, loading };

  useEffect(() => {
    let cancelled = false;

    async function refreshLicense() {
      try {
        const response = await fetch('/api/license', { cache: 'no-store' });
        const nextStatus = await response.json();

        if (!cancelled) {
          setLicenseStatus(nextStatus);
        }
      } catch {
        if (!cancelled) {
          setLicenseStatus({
            valid: false,
            grace: false,
            graceDaysLeft: null,
            error: 'Unable to validate license.',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    refreshLicense();
    const intervalId = window.setInterval(refreshLicense, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  if (loading && !licenseStatus) {
    return (
      <LicenseContext.Provider value={contextValue}>
        <LicenseLoadingScreen />
      </LicenseContext.Provider>
    );
  }

  if (!licenseStatus?.valid) {
    return (
      <LicenseContext.Provider value={contextValue}>
        <LicenseExpiredScreen
          grace={licenseStatus?.grace}
          graceDaysLeft={licenseStatus?.graceDaysLeft}
          message={licenseStatus?.error ?? 'This license is no longer valid.'}
        />
      </LicenseContext.Provider>
    );
  }

  return (
    <LicenseContext.Provider value={contextValue}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicenseStatus() {
  return useContext(LicenseContext);
}
