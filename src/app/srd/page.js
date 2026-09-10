'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Layout from '@/components/layout/Layout';
import SRDTable from '@/components/SRDTable';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus } from 'lucide-react';
import SRDPrintDialog from '@/components/SRDPrintDialog';

function SRDListPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const departmentFilter = searchParams.get('department') || 'all';
  const statusFilter = searchParams.get('status') || 'all';

  const canCreateSRD = session?.user?.role === 'vmd' || session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      headerContent={
        <div className="flex items-center gap-2 w-full flex-wrap">
          {/* Search */}
          <div className="flex-1 relative min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search SRDs by reference or title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
            />
          </div>

          {/* Status filter — matches the STATUS column (production progress) */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border-0 focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-700 font-medium"
            >
              <option value="all">All Status</option>
              <option value="pre-production">Pre-Production</option>
              <option value="in-production">In Production</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <SRDPrintDialog />

          {canCreateSRD && (
            <Button
              onClick={() => router.push(`/dashboard/${session.user.role}/create`)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create SRD
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col flex-1 h-[calc(100vh-56px)] overflow-hidden space-y-4 p-4">
        <SRDTable
          department={departmentFilter}
          searchTerm={searchTerm}
          filterStatus={filterStatus}
        />
      </div>
    </Layout>
  );
}

export default function SRDListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SRDListPageContent />
    </Suspense>
  );
}
