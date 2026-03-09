import { redirect } from 'next/navigation';
import { getSafeLicenseStatus } from '@/lib/license';

export const runtime = 'nodejs';

export default async function HomePage() {
  const status = await getSafeLicenseStatus();

  redirect(status.valid ? '/login' : '/license-expired');
}
