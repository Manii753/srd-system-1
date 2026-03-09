'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ShieldAlert, X } from 'lucide-react';
import { useLicenseStatus } from './LicenseProvider';

const GRACE_BANNER_RESET_KEY = 'license-grace-banner-reset';
const GRACE_BANNER_DISMISS_PREFIX = 'license-grace-banner-dismissed';

function getDismissKey(email) {
  return email ? `${GRACE_BANNER_DISMISS_PREFIX}:${email}` : null;
}

function formatGraceDays(daysLeft) {
  if (typeof daysLeft !== 'number') {
    return 'Renew the license soon to avoid interruption.';
  }

  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining in the grace period.`;
}

export default function GraceBanner() {
  const { data: session, status } = useSession();
  const { licenseStatus } = useLicenseStatus();
  const [dismissed, setDismissed] = useState(true);
  const dismissKey = getDismissKey(session?.user?.email);

  useEffect(() => {
    if (status !== 'authenticated' || !licenseStatus?.grace) {
      setDismissed(true);
      return;
    }

    if (!dismissKey) {
      setDismissed(false);
      return;
    }

    const shouldReset = window.sessionStorage.getItem(GRACE_BANNER_RESET_KEY) === '1';

    if (shouldReset) {
      window.sessionStorage.removeItem(dismissKey);
      window.sessionStorage.removeItem(GRACE_BANNER_RESET_KEY);
    }

    setDismissed(window.sessionStorage.getItem(dismissKey) === '1');
  }, [dismissKey, licenseStatus?.grace, status]);

  if (status !== 'authenticated' || !licenseStatus?.grace || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    if (dismissKey) {
      window.sessionStorage.setItem(dismissKey, '1');
    }

    setDismissed(true);
  };

  return (
    <section className="border-b border-amber-200 bg-amber-50" role="status" aria-live="polite">
      <div className="flex items-start gap-3 px-6 py-4 text-amber-950">
        <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">License grace period is active.</p>
          <p className="mt-1 text-sm text-amber-900">
            {formatGraceDays(licenseStatus?.graceDaysLeft)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-amber-700 transition-colors hover:bg-amber-100 hover:text-amber-900"
          aria-label="Close license grace period banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
