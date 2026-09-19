'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import SrdListPage from '@/components/SrdListPage';

export default function DynamicDepartmentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const departmentSlug = params.department;

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  // List of production stages that redirect to the unified stage dashboard
  const productionStages = ['cutting', 'sewing', 'washing', 'finishing', 'pattern'];
  const isProductionStage = productionStages.includes(departmentSlug);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    // Redirect production stage workers to the new unified stage dashboard
    if (isProductionStage) {
      router.replace('/dashboard/stage');
      return;
    }

    // Dynamic (admin-created) departments: verify the department exists
    fetch('/api/departments')
      .then(r => r.json())
      .then(data => {
        const dept = data.success ? data.data.find(d => d.slug === departmentSlug) : null;
        if (!dept) {
          router.replace('/dashboard/admin');
          return;
        }
        setValid(true);
      })
      .catch(() => { setValid(true); })
      .finally(() => setLoading(false));
  }, [session, status, router, departmentSlug, isProductionStage]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!valid) return null;

  const canCreate = ['vmd', 'cad', 'commercial', 'mmc'].includes(departmentSlug);
  const canCreateSRD = canCreate && (session?.user?.role === departmentSlug || session?.user?.role === 'admin');

  return (
    <SrdListPage
      department={departmentSlug}
      canCreate={canCreateSRD}
      createHref={canCreate ? `/dashboard/${departmentSlug}/create` : undefined}
    />
  );
}