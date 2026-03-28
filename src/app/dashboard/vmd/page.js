'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import SRDCard from '@/components/SRDCard';
import SRDTable from '@/components/SRDTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/lib/use-toast';

export default function VMDDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [srds, setSRDs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // cards or table
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    const allowedRoles = ['vmd', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      router.push(`/dashboard/${session.user.role}`);
      return;
    }

    fetchSRDs();
  }, [session, status, router]);

  const fetchSRDs = async () => {
    try {
      const response = await fetch('/api/srd?department=vmd');
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

  const handleRaiseSrd = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/srd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          createdBy: {
            id: session.user.id,
            name: session.user.name,
            role: session.user.role,
          },
          // title is now optional and will be omitted
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create SRD');
      }

      const result = await res.json();
      if (result.success) {
        toast({
          title: 'SRD Raised',
          description: `SRD ${result.data.refNo} has been created.`,
        });
        router.push(`/srd/${result.data._id}`);
      } else {
        throw new Error(result.error || 'An unknown error occurred');
      }
    } catch (error) {
      console.error('Error creating SRD:', error);
      toast({
        title: 'Error',
        description: `Could not create SRD: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getStats = () => {
    const total = srds.length;
    const pending = srds.filter(srd =>
      (srd.status?.vmd === 'pending' || srd.status?.VMD === 'pending')
    ).length;
    const approved = srds.filter(srd =>
      (srd.status?.vmd === 'approved' || srd.status?.VMD === 'approved')
    ).length;
    const flagged = srds.filter(srd =>
      (srd.status?.vmd === 'flagged' || srd.status?.VMD === 'flagged')
    ).length;

    return { total, pending, approved, flagged };
  };

  const stats = getStats();

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
      <div className="">
        {/* Header */}
        <div className="flex items-center justify-end gap-2 fixed top-1 right-20 z-[50]">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
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
          <Button
            className=""
            onClick={handleRaiseSrd}
            size='sm'
            disabled={isCreating}
          >
            <Plus className="h-5 w-5" />
            <span>{isCreating ? 'Raising SRD...' : 'New SRD'}</span>
          </Button>
        </div>

        {/* SRDs List */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {srds.map((srd) => (
              <SRDCard key={srd._id} srd={srd} department="vmd" />
            ))}
          </div>
        ) : (
          <SRDTable srds={srds} department="vmd" />
        )}

        {srds.length === 0 && (
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No SRDs found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new SRD.</p>
            <div className="mt-6">
              <Button
                onClick={handleRaiseSrd}
                disabled={isCreating}
              >
                {isCreating ? 'Raising SRD...' : 'SRD'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}