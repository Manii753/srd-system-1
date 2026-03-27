'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import SRDCard from '@/components/SRDCard';
import SRDTable from '@/components/SRDTable';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';


export default function DispatchDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [srds, setSRDs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    const allowedRoles = ['dispatch', 'admin', 'vmd']; // Allowed roles to see this dashboard
    if (!allowedRoles.includes(session.user.role)) {
      router.push(`/dashboard/${session.user.role}`);
      return;
    }

    fetchSRDs();
  }, [session, status, router]);

  const fetchSRDs = async () => {
    try {
      const response = await fetch('/api/srd?department=dispatch');
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
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dispatch Department</h1>
            <p className="text-gray-600 mt-1">Manage sample dispatches, internal verification, and buyer approvals</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ready for Dispatch</h2>
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

        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {srds.map((srd) => (
              <SRDCard key={srd._id} srd={srd} department="dispatch" />
            ))}
          </div>
        ) : (
          <SRDTable srds={srds} department="dispatch" />
        )}

        {srds.length === 0 && (
          <div className="text-center py-12">
            <Send className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Dispatches Pending</h3>
            <p className="mt-1 text-sm text-gray-500">There are no SRDs ready for dispatch currently.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
