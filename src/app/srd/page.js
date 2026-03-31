'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Layout from '@/components/layout/Layout';
import SRDCard from '@/components/SRDCard';
import SRDTable from '@/components/SRDTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Search, Filter } from 'lucide-react';
import SRDPrintDialog from '@/components/SRDPrintDialog';

function SRDListPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [srds, setSRDs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const departmentFilter = searchParams.get('department') || 'all';
  const statusFilter = searchParams.get('status') || 'all';
  const readyForProductionFilter = searchParams.get('readyForProduction') === 'true';

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    const fetchSRDs = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (departmentFilter !== 'all') {
          query.append('department', departmentFilter);
        }
        if (statusFilter !== 'all') {
          query.append('status', statusFilter);
        }
        if (readyForProductionFilter) {
          query.append('readyForProduction', 'true');
        }

        const response = await fetch(`/api/srd?${query.toString()}`);
        const data = await response.json();
        if (data.success) {
          setSRDs(data.data);
        }
      } catch (error) {
        console.error('Error fetching SRDs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSRDs();
  }, [session, status, router, departmentFilter, statusFilter, readyForProductionFilter]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerContent={
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search SRDs by reference or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border-0 focus:ring-0 focus:outline-none bg-transparent text-sm text-gray-700 font-medium"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="approved">Approved</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
        <SRDPrintDialog />
        <div className="flex items-center gap-1">
          <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('cards')}>Cards</Button>
          <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>Table</Button>
        </div>
      </div>
    }>
      <div className="flex flex-col flex-1 h-[calc(100vh-56px)] overflow-hidden space-y-4 p-4">
        {/* SRDs List */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 custom-scrollbar">
            {srds.map((srd) => (
              <SRDCard key={srd._id} srd={srd} department={departmentFilter} />
            ))}
          </div>
        ) : (
          <SRDTable srds={srds} department={departmentFilter} searchTerm={searchTerm} filterStatus={filterStatus} />
        )}

        {srds.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No SRDs found</h3>
            <p className="mt-1 text-sm text-gray-500">Adjust your filters or create a new SRD.</p>
          </div>
        )}
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