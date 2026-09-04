'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import SRDCard from '@/components/SRDCard';
import SRDTable from '@/components/SRDTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Clock, CheckCircle, AlertCircle, Scissors, Plus } from 'lucide-react';

// Read a department's status from an SRD status field, supporting both the
// canonical array [{department, value}] and legacy flat object {cad: 'pending'}.
const getStatus = (srd, dept) => {
  const status = srd.status;
  if (Array.isArray(status)) {
    return status.find(s => s?.department === dept)?.value || 'pending';
  }
  if (status && typeof status === 'object') {
    const v = status[dept];
    return v === undefined || v === null ? 'pending' : String(v);
  }
  return 'pending';
};

export default function CADDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [srds, setSRDs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    const allowedRoles = ['cad', 'admin'];
    if (!allowedRoles.includes(session.user.role)) {
      router.push(`/dashboard/${session.user.role}`);
      return;
    }

    fetchSRDs();
  }, [session, status, router]);

  const fetchSRDs = async () => {
    try {
      const response = await fetch('/api/srd?department=cad&limit=100');
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

  const stats = useMemo(() => {
    const total = srds.length;
    const pending = srds.filter(srd => getStatus(srd, 'cad') === 'pending').length;
    const inProgress = srds.filter(srd => getStatus(srd, 'cad') === 'in-progress').length;
    const approved = srds.filter(srd => getStatus(srd, 'cad') === 'approved').length;
    const flagged = srds.filter(srd => getStatus(srd, 'cad') === 'flagged').length;
    
    return { total, pending, inProgress, approved, flagged };
  }, [srds]);

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-app-heading font-bold text-gray-900">CAD Portal</h1>
            <p className="text-gray-600 mt-1">Manage pattern development and CAD processes</p>
          </div>
          <Link href="/dashboard/cad/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create SRD
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">Total SRDs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.total}</div>
              <p className="text-app-text text-muted-foreground">Assigned to CAD</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.pending}</div>
              <p className="text-app-text text-muted-foreground">Awaiting start</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">In Progress</CardTitle>
              <Scissors className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.inProgress}</div>
              <p className="text-app-text text-muted-foreground">Currently working</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.approved}</div>
              <p className="text-app-text text-muted-foreground">Successfully completed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">Flagged</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.flagged}</div>
              <p className="text-app-text text-muted-foreground">Issues flagged</p>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-app-heading font-semibold">CAD SRDs</h2>
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
              <SRDCard key={srd._id} srd={srd} department="cad" />
            ))}
          </div>
        ) : (
          <SRDTable department="cad" />
        )}

        {srds.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-app-text font-medium text-gray-900">No SRDs assigned</h3>
            <p className="mt-1 text-app-text text-gray-500">New SRDs will appear here when assigned by VMD.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

