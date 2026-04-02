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
  Package, Clock, CheckCircle, AlertCircle, 
  TrendingUp, Calendar, ArrowRight 
} from 'lucide-react';
import Link from 'next/link';

export default function ProductionTrackingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [srds, setSRDs] = useState([]);
  const [productionStages, setProductionStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Only production manager and admin can access
    if (session.user.role !== 'production-manager' && session.user.role !== 'admin') {
      router.push(`/dashboard/${session.user.role}`);
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [srdsRes, stagesRes] = await Promise.all([
        fetch('/api/srd?inProduction=true'),
        fetch('/api/production-stages')
      ]);

      const srdsData = await srdsRes.json();
      const stagesData = await stagesRes.json();

      if (srdsData.success) {
        setSRDs(srdsData.data);
      }

      if (stagesData.success) {
        setProductionStages(stagesData.data.filter(s => s.isActive));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stageId) => {
    const stage = productionStages.find(s => s._id === stageId);
    return stage?.color || '#6B7280';
  };

  const getStageName = (stageId) => {
    const stage = productionStages.find(s => s._id === stageId);
    return stage?.name || 'Unknown Stage';
  };

  const getStats = () => {
    const total = srds.length;
    const byStage = {};
    
    productionStages.forEach(stage => {
      byStage[stage._id] = srds.filter(srd => 
        srd.currentProductionStage === stage._id
      ).length;
    });

    const avgProgress = srds.length > 0
      ? Math.round(srds.reduce((sum, srd) => sum + (srd.productionProgress || 0), 0) / srds.length)
      : 0;

    return { total, byStage, avgProgress };
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
            <h1 className="text-app-heading font-bold text-gray-900">Production Tracking</h1>
            <p className="text-gray-600 mt-1">Monitor SRDs in production with dynamic stage tracking</p>
          </div>
          <Link href="/production-stages">
            <Button variant="outline">
              Manage Production Stages
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">In Production</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.total}</div>
              <p className="text-app-text text-muted-foreground">Active SRDs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">Avg Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{stats.avgProgress}%</div>
              <Progress value={stats.avgProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">Production Stages</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">{productionStages.length}</div>
              <p className="text-app-text text-muted-foreground">Active stages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-app-text font-medium">Ready for Production</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-app-heading font-bold">
                {srds.filter(s => s.readyForProduction && !s.inProduction).length}
              </div>
              <p className="text-app-text text-muted-foreground">Awaiting start</p>
            </CardContent>
          </Card>
        </div>

        {/* Production Stages Overview */}
        {productionStages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Production Stages Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {productionStages.map((stage) => (
                  <div key={stage._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-medium text-app-text">{stage.name}</span>
                      </div>
                      <Badge variant="outline">{stats.byStage[stage._id] || 0}</Badge>
                    </div>
                    {stage.estimatedDuration > 0 && (
                      <p className="text-app-text text-gray-500">
                        Est. {stage.estimatedDuration} days
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SRDs in Production */}
        <div>
          <h2 className="text-app-heading font-semibold mb-4">SRDs in Production</h2>
          
          {srds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-app-text font-medium text-gray-900">No SRDs in production</h3>
                <p className="mt-1 text-app-text text-gray-500">
                  SRDs will appear here once they are approved and moved to production.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {srds.map((srd) => (
                <Card key={srd._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-app-text">{srd.title}</CardTitle>
                      <Badge variant="outline">{srd.refNo}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Current Stage */}
                    {srd.currentProductionStage && (
                      <div>
                        <p className="text-app-text text-gray-500 mb-1">Current Stage</p>
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: getStageColor(srd.currentProductionStage) }}
                          />
                          <span className="font-medium">{getStageName(srd.currentProductionStage)}</span>
                        </div>
                      </div>
                    )}

                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-app-text text-gray-500">Production Progress</p>
                        <span className="text-app-text font-medium">{srd.productionProgress || 0}%</span>
                      </div>
                      <Progress value={srd.productionProgress || 0} />
                    </div>

                    {/* Dates */}
                    {srd.productionStartDate && (
                      <div className="flex items-center text-app-text text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        Started: {new Date(srd.productionStartDate).toLocaleDateString()}
                      </div>
                    )}

                    {/* History Count */}
                    {srd.productionHistory && srd.productionHistory.length > 0 && (
                      <div className="text-app-text text-gray-500">
                        {srd.productionHistory.length} stage{srd.productionHistory.length !== 1 ? 's' : ''} completed
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 border-t">
                      <Link href={`/srd/${srd._id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

