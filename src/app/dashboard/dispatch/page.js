'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import SrdListPage from '@/components/SrdListPage';

export default function DispatchDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    const allowedRoles = ['dispatch', 'admin', 'vmd'];
    if (!allowedRoles.includes(session.user.role)) {
      router.push(`/dashboard/${session.user.role}`);
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return <SrdListPage department="dispatch" />;
}