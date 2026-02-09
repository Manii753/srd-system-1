'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Factory, CheckCircle, Clock, Play,
  Package, ArrowRight, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function VMDProductionDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [readyForProduction, setReadyForProduction] = useState([]);
  const [inProduction, setInProduction] = useState([]);
  const [productionStages, setProductionStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    // Allow vmd and admin
    if (session.user.role !== 'vmd' && session.user.role !== 'admin') {
      router.push(`/dashboard/${session.user.role}`);
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [readyRes, productionRes, stagesRes] = await Promise.all([
        // Ready for production: readyForProduction=true AND inProduction=false
        fetch('/api/srd?readyForProduction=true&inProduction=false'),
        // In production: both readyForProduction=true AND inProduction=true
        fetch('/api/srd?readyForProduction=true&inProduction=true'),
        fetch('/api/production-stages')
      ]);

      const readyData = await readyRes.json();
      const productionData = await productionRes.json();
      const stagesData = await stagesRes.json();

      if (readyData.success) setReadyForProduction(readyData.data);
      if (productionData.success) setInProduction(productionData.data);
      if (stagesData.success) setProductionStages(stagesData.data.filter(s => s.isActive));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartProduction = async (srdId) => {
    if (!confirm('Are you sure you want to mark this SRD as in production? It will be sent to the first production stage (Cutting).')) {
      return;
    }

    try {
      const response = await fetch(`/api/srd/${srdId}/production`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success) {
        alert(`Production started! SRD moved to first production stage.`);
        fetchData(); // Refresh data after starting production
      } else {
        console.error('Failed to start production:', result.error);
        alert('Failed to start production: ' + result.error);
      }
    } catch (error) {
      console.error('Error starting production:', error);
      alert('Error starting production');
    }
  };

  const getStats = () => {
    const total = inProduction.length;
    const avgProgress = total > 0
      ? Math.round(inProduction.reduce((sum, srd) => sum + (srd.productionProgress || 0), 0) / total)
      : 0;

    const byStage = {};
    productionStages.forEach(stage => {
      byStage[stage._id] = inProduction.filter(srd =>
        String(srd.currentProductionStage) === String(stage._id)
      ).length;
    });

    return { total, avgProgress, byStage, ready: readyForProduction.length };
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production Management</h1>
            <p className="text-gray-600 mt-1">Mark SRDs as in production and track their progress</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready to Start</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ready}</div>
              <p className="text-xs text-muted-foreground">Awaiting production start</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Production</CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgProgress}%</div>
              <Progress value={stats.avgProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Production Stages</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productionStages.length}</div>
              <p className="text-xs text-muted-foreground">Active stages</p>
            </CardContent>
          </Card>
        </div>

        {/* Ready for Production */}
        {readyForProduction.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Ready to Start Production</h2>
            <p className="text-sm text-gray-600 mb-4">
              These SRDs have been approved by all departments. Click "Mark as In Production" to send them to the first production stage.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readyForProduction.map((srd) => (
                <Card key={srd._id} className="border-green-200 bg-green-50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{srd.title}</CardTitle>
                      <Badge className="bg-green-100 text-green-800">{srd.refNo}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      All departments approved
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/srd/${srd._id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => handleStartProduction(srd._id)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Mark as In Production
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {readyForProduction.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No SRDs ready for production</h3>
              <p className="mt-1 text-sm text-gray-500">
                SRDs will appear here once all departments have approved them.
              </p>
            </CardContent>
          </Card>
        )}

        {/* In Production */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Currently in Production</h2>
            {inProduction.length > 0 && (
              <Link href="/srd?inProduction=true">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>

          {inProduction.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Factory className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No SRDs in production</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Mark SRDs as in production to see them here and track their progress through production stages.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProduction.map((srd) => {
                const currentStage = srd.productionHistory?.find(h => String(h.stageId) === String(srd.currentProductionStage)) ||
                  productionStages.find(s => String(s._id) === String(srd.currentProductionStage));
                return (
                  <Card key={srd._id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{srd.title}</CardTitle>
                        <Badge variant="outline">{srd.refNo}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentStage && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Current Stage</p>
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: currentStage.color }}
                            />
                            <span className="font-medium capitalize">{currentStage.displayName || currentStage.name}</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-500">Progress</p>
                          <span className="text-sm font-medium">{srd.productionProgress || 0}%</span>
                        </div>
                        <Progress value={srd.productionProgress || 0} />
                      </div>

                      {srd.productionStartDate && (
                        <div className="flex items-center text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2">
                          <Clock className="h-3.5 w-3.5 mr-2 text-blue-600" />
                          <span>Started: {new Date(srd.productionStartDate).toLocaleDateString()}</span>
                        </div>
                      )}

                      <Link href={`/srd/${srd._id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Production Stages Overview */}
        {productionStages.length > 0 && inProduction.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
              <CardTitle className="flex items-center">
                <Factory className="h-5 w-5 mr-2 text-orange-600" />
                Production Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute top-8 left-0 right-0 h-1 bg-gradient-to-r from-orange-200 via-red-200 to-pink-200 rounded-full"
                  style={{ width: 'calc(100% - 40px)', left: '20px' }} />

                {/* Stages */}
                <div className="grid grid-cols-5 gap-2 relative">
                  {productionStages.map((stage, index) => {
                    const count = stats.byStage[stage._id] || 0;
                    return (
                      <div key={stage._id} className="flex flex-col items-center">
                        {/* Stage circle */}
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg relative z-10 transition-transform hover:scale-110"
                          style={{ backgroundColor: stage.color }}
                        >
                          {count}
                        </div>

                        {/* Stage name */}
                        <div className="mt-3 text-center">
                          <p className="font-semibold text-sm capitalize">{stage.displayName || stage.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {count} {count === 1 ? 'SRD' : 'SRDs'}
                          </p>
                        </div>

                        {/* Arrow */}
                        {index < productionStages.length - 1 && (
                          <div className="absolute top-8 text-gray-400"
                            style={{ left: `${(index + 1) * 20}%` }}>
                            <ArrowRight className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

