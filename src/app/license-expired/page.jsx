import { redirect } from 'next/navigation';
import LicenseExpiredScreen from '@/components/license/LicenseExpiredScreen';
import { getSafeLicenseStatus } from '@/lib/license';

export const runtime = 'nodejs';

export default async function LicenseExpiredPage() {
  const status = await getSafeLicenseStatus();

  if (status.valid) {
    redirect('/login');
  }

  return (
    <LicenseExpiredScreen
      grace={status.grace}
      graceDaysLeft={status.graceDaysLeft}
      message={status.error ?? 'This license is no longer valid.'}
    />
  );
}
