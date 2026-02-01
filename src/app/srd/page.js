'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Layout from '@/components/layout/Layout';
import SRDCard from '@/components/SRDCard';
import SRDTable from '@/components/SRDTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

function SRDListPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [srds, setSRDs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // cards or table

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
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {departmentFilter !== 'all' ? `${departmentFilter.toUpperCase()} SRDs` : 'All SRDs'}
            </h1>
            <p className="text-gray-600 mt-1">
              {statusFilter !== 'all' ? `Filtered by status: ${statusFilter}` : 'View and manage all Sample Request Documents'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
          </div>
        </div>

        {/* SRDs List */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {srds.map((srd) => (
              <SRDCard key={srd._id} srd={srd} department={departmentFilter} />
            ))}
          </div>
        ) : (
          <SRDTable srds={srds} department={departmentFilter} />
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