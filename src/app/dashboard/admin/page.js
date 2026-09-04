'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import SRDCard from '@/components/SRDCard';
import SRDTable from '@/components/SRDTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Users, FileText, CheckCircle, AlertCircle, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [srds, setSRDs] = useState([]);
  const [users, setUsers] = useState([]);
  const [serverStats, setServerStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [paginationSettings, setPaginationSettings] = useState({ itemsPerPage: 10, enabled: true });
  const [savingPagination, setSavingPagination] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [srdRes, userRes, companyRes, statsRes] = await Promise.all([
        fetch('/api/srd?limit=100'),
        fetch('/api/users?limit=100'),
        fetch('/api/company'),
        fetch('/api/dashboard/admin'),
      ]);
      const srdData = await srdRes.json();
      if (srdData.success) setSRDs(srdData.data);
      const userData = await userRes.json();
      if (userData.success) setUsers(userData.data);
      const companyData = await companyRes.json();
      if (companyData?.paginationSettings) {
        setPaginationSettings(companyData.paginationSettings);
      }
      const statsData = await statsRes.json();
      if (statsData.success && statsData.data?.stats) {
        setServerStats(statsData.data.stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePaginationSettings = async () => {
    setSavingPagination(true);
    try {
      await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paginationSettings }),
      });
    } catch (e) {
      console.error('Failed to save pagination settings', e);
    } finally {
      setSavingPagination(false);
    }
  };

  const getStats = () => {
    const totalUsers = users.length;
    if (serverStats) {
      return {
        totalSRDs: serverStats.total ?? srds.length,
        completedSRDs: serverStats.completed ?? srds.filter(srd => srd.progress === 100).length,
        inProgressSRDs: serverStats.inProgress ?? 0,
        totalUsers,
      };
    }
    const totalSRDs = srds.length;
    const completedSRDs = srds.filter(srd => srd.progress === 100).length;
    const inProgressSRDs = srds.filter(srd => srd.progress > 0 && srd.progress < 100).length;
    return { totalSRDs, completedSRDs, inProgressSRDs, totalUsers };
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
      <div className="h-full overflow-y-auto">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">Total SRDs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.totalSRDs}</div>
              <p className="text-app-text text-muted-foreground">Across all departments</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.completedSRDs}</div>
              <p className="text-app-text text-muted-foreground">100% progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">In Progress</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.inProgressSRDs}</div>
              <p className="text-app-text text-muted-foreground">Active SRDs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.totalUsers}</div>
              <p className="text-app-text text-muted-foreground">System users</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + System Status + Pagination Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-app-heading font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                View All SRDs
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => router.push('/srdfields')}>
                <Settings className="h-4 w-4 mr-2" />
                Manage SRD Fields
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => router.push('/dashboard/admin/departments')}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Departments
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => router.push('/settings/backup')}>
                <Settings className="h-4 w-4 mr-2" />
                Backup Management
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-app-heading font-semibold">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-app-text">Database</span>
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-app-text">Pusher (Real-time)</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-app-text">Authentication</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-app-heading font-semibold">Pagination Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="pagination-enabled" className="text-app-text">Enable Pagination</Label>
                <Switch
                  id="pagination-enabled"
                  checked={paginationSettings.enabled}
                  onCheckedChange={(checked) =>
                    setPaginationSettings(prev => ({ ...prev, enabled: checked }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="items-per-page" className="text-app-text">Items per page</Label>
                <Input
                  id="items-per-page"
                  type="number"
                  min={1}
                  max={200}
                  value={paginationSettings.itemsPerPage}
                  disabled={!paginationSettings.enabled}
                  onChange={(e) =>
                    setPaginationSettings(prev => ({
                      ...prev,
                      itemsPerPage: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  className="h-8 text-app-text"
                />
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={savePaginationSettings}
                disabled={savingPagination}
              >
                {savingPagination ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* All SRDs */}
        <div className="flex items-center justify-between">
          <h2 className="text-app-heading font-semibold">All SRDs</h2>
          <div className="flex items-center space-x-2">
            <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('cards')}>Cards</Button>
            <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>Table</Button>
          </div>
        </div>

        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {srds.map((srd) => (
              <SRDCard key={srd._id} srd={srd} department="admin" />
            ))}
          </div>
        ) : (
          <SRDTable department="admin" />
        )}
      </div>
      </div>
    </Layout>
  );
}

