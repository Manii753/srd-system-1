'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import SRDCard from '@/components/SRDCard';
import SRDTable from '@/components/SRDTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus, FileText, Clock, CheckCircle, AlertCircle,
  TrendingUp, Users, Package, Settings
} from 'lucide-react';
import Link from 'next/link';
import ProductionStageDashboard from '@/components/ProductionStageDashboard';

export default function DynamicDepartmentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const departmentSlug = params.department;

  const [department, setDepartment] = useState(null);
  const [srds, setSRDs] = useState([]);
  const [stages, setStages] = useState([]);
  const [fields, setFields] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards');

  // List of production stages that should use the new stage dashboard
  const productionStages = ['cutting', 'sewing', 'washing', 'finishing', 'pattren'];
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

    fetchDashboardData();
  }, [session, status, router, departmentSlug]);

  const fetchDashboardData = async () => {
    try {
      const promises = [
        fetch('/api/departments').then(r => r.json()),
        fetch(`/api/srd?department=${departmentSlug}`).then(r => r.json()),
        fetch('/api/stages').then(r => r.json()),
        fetch('/api/newField').then(r => r.json()),
      ];

      if (departmentSlug === 'mmc') {
        promises.push(fetch('/api/notifications').then(r => r.json()).catch(() => null));
      }

      const results = await Promise.all(promises);
      const [deptData, srdData, stagesData, fieldsData, notifData] = results;

      if (deptData.success) {
        const dept = deptData.data.find(d => d.slug === departmentSlug);
        if (!dept && departmentSlug !== 'admin') {
          router.push('/dashboard/admin');
          return;
        }
        setDepartment(dept);
      }

      if (srdData.success) {
        setSRDs(srdData.data);
      }

      if (stagesData.success) {
        setStages(stagesData.data.filter(s => s.isActive));
      }

      if (Array.isArray(fieldsData)) {
        setFields(fieldsData.filter(f =>
          f.active && (f.department === departmentSlug || f.department === 'global')
        ));
      }

      if (notifData?.success && Array.isArray(notifData.data)) {
        setPurchaseRequests(notifData.data.filter(n => n.action === 'purchase-request'));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    if (departmentSlug === 'admin') {
      return {
        total: srds.length,
        completed: srds.filter(srd => srd.progress === 100).length,
        flagged: srds.filter(srd => {
          if (!srd.status) return false;
          return Array.from(Object.values(srd.status)).includes('flagged');
        }).length,
        inProgress: srds.filter(srd => srd.progress > 0 && srd.progress < 100).length
      };
    }

    const total = srds.length;
    const statusKey = departmentSlug;

    const stageCounts = {};
    stages.forEach(stage => {
      stageCounts[stage.slug] = srds.filter(srd =>
        srd.status && srd.status[statusKey] === stage.slug
      ).length;
    });

    return {
      total,
      ...stageCounts,
      pending: stageCounts['pending'] || 0,
      'in-progress': stageCounts['in-progress'] || 0,
      approved: stageCounts['approved'] || 0,
      flagged: stageCounts['flagged'] || 0
    };
  }, [srds, stages, departmentSlug]);

  const getStageColor = (stageSlug) => {
    const stage = stages.find(s => s.slug === stageSlug);
    return stage?.color || '#6B7280';
  };

  const getStageIcon = (stageSlug) => {
    const iconMap = {
      'pending': Clock,
      'in-progress': Package,
      'approved': CheckCircle,
      'flagged': AlertCircle,
      'ready-for-production': TrendingUp
    };
    return iconMap[stageSlug] || FileText;
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

  // If this is a production stage, use the specific dashboard component
  if (isProductionStage) {
    return <ProductionStageDashboard stageName={departmentSlug} />;
  }

  const departmentName = department?.name || (departmentSlug === 'admin' ? 'Admin' : departmentSlug.toUpperCase());
  const canCreate = ['vmd', 'cad', 'commercial', 'mmc', 'admin'].includes(departmentSlug);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{departmentName}</h1>
            <p className="text-gray-600 mt-1">
              {department?.description || `Manage ${departmentName} operations and track progress`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {canCreate && (
              <Link href={`/dashboard/${departmentSlug}/create`}>
                <Button className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Create SRD</span>
                </Button>
              </Link>
            )}
            {departmentSlug === 'admin' && (
              <Link href="/settings">
                <Button variant="outline" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Dynamic Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total SRDs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total SRDs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {departmentSlug === 'admin' ? 'Across all departments' : 'Assigned to department'}
              </p>
            </CardContent>
          </Card>

          {/* Dynamic stage cards */}
          {stages.slice(0, 3).map((stage) => {
            const Icon = getStageIcon(stage.slug);
            const count = stats[stage.slug] || 0;

            return (
              <Card key={stage._id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="flex items-center mt-1">
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: stage.color }}
                    />
                    <p className="text-xs text-muted-foreground">{stage.description || stage.name}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* MMC Buy Requests */}
        {departmentSlug === 'mmc' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Buy Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {purchaseRequests.length === 0 ? (
                <p className="text-app-text text-gray-500">No purchase requests at the moment. Items are set to InStock by default.</p>
              ) : (
                <div className="space-y-3">
                  {purchaseRequests.slice(0, 6).map((request) => (
                    <div key={request._id} className="rounded-lg border border-gray-200 p-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{request.metadata?.itemName || request.message}</p>
                          <p className="text-xs text-gray-500 mt-1">SRD: {request.srd?.refNo || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(request.timestamp).toLocaleString()}</p>
                        </div>
                        {request.srd && (
                          <Link href={`/srd/${request.srd._id}`} className="text-sm text-blue-600 hover:underline">View SRD</Link>
                        )}
                      </div>
                    </div>
                  ))}
                  {purchaseRequests.length > 6 && (
                    <p className="text-xs text-gray-500">Showing latest 6 purchase requests.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Department-Specific Info */}
        {fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Department Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {fields.map((field) => (
                  <Badge key={field._id} variant="outline" className="text-xs">
                    {field.name}
                    {field.isRequired && <span className="ml-1 text-red-500">*</span>}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions for Admin */}
        {departmentSlug === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/srd">
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    View All SRDs
                  </Button>
                </Link>
                <Link href="/departments">
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Departments
                  </Button>
                </Link>
                <Link href="/stages">
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Manage Stages
                  </Button>
                </Link>
                <Link href="/srdfields">
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Manage Fields
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Dynamic System</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Departments</span>
                    <Badge className="bg-blue-100 text-blue-800">{stages.length} Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Stage Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stages.slice(0, 4).map((stage) => (
                    <div key={stage._id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-sm">{stage.name}</span>
                      </div>
                      <Badge variant="outline">{stats[stage.slug] || 0}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {departmentSlug === 'admin' ? 'All SRDs' : `${departmentName} SRDs`}
          </h2>
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
        {srds.length > 0 ? (
          viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {srds.map((srd) => (
                <SRDCard key={srd._id} srd={srd} department={departmentSlug} />
              ))}
            </div>
          ) : (
            <SRDTable srds={srds} department={departmentSlug} />
          )
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No SRDs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {canCreate
                ? 'Get started by creating a new SRD.'
                : 'New SRDs will appear here when assigned.'}
            </p>
            {canCreate && (
              <div className="mt-6">
                <Link href={`/dashboard/${departmentSlug}/create`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create SRD
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
