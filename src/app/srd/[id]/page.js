'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import DepartmentPanel from '@/components/DepartmentPanel';
import DepartmentPanelExcel from '@/components/DepartmentPanelExcel';
import ProductionControl from '@/components/ProductionControl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/lib/use-toast';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  MessageCircle, 
  Clock,
  Table,
  Grid3X3
} from 'lucide-react';

export default function SRDDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [srd, setSrd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState([]);
  const [viewMode, setViewMode] = useState('form'); // 'form' or 'excel'
  const allowedDepartments = ['vmd', 'cad', 'mmc', 'commercial'];

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchSRD = async () => {
      try {
        const response = await fetch(`/api/srd/${params.id}`);
        const data = await response.json();
        console.log('[Frontend] Fetched SRD:', data.data?.refNo, 'Status:', data.data?.status);
        if (data.success) {
          setSrd(data.data);
        } else {
          router.push('/dashboard/vmd');
        }
      } catch (error) {
        console.error('Error fetching SRD:', error);
        router.push('/dashboard/vmd');
      } finally {
        
        setLoading(false);
      }
    };

    const fetchTimeline = async () => {
      try {
        const response = await fetch(`/api/srd/${params.id}/timeline`);
        const data = await response.json();
        if (data.success) {
          setTimeline(data.data);
        }
      } catch (error) {
        console.error('Error fetching timeline:', error);
      }
    };

    fetchSRD();
    fetchTimeline();
  }, [session, status, router, params.id]);

  const handleDepartmentUpdate = async (department, updateData) => {
    try {
      console.log('[Frontend] Sending update:', department, updateData);
      
      const response = await fetch(`/api/srd/${params.id}/department/${department}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      console.log('[Frontend] Response:', data);
      
      if (data.success) {
        setSrd(data.data);
        toast({
          title: 'Success',
          description: `${department.toUpperCase()} updated successfully`,
        });
        
        // Refresh timeline
        const timelineResponse = await fetch(`/api/srd/${params.id}/timeline`);
        const timelineData = await timelineResponse.json();
        if (timelineData.success) {
          setTimeline(timelineData.data);
        }
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Update failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[Frontend] Update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update department',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'flagged': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (!srd) {
    return (
      <Layout>
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">SRD not found</h3>
          <p className="mt-1 text-sm text-gray-500">The requested SRD could not be found.</p>
        </div>
      </Layout>
    );
  }

  const userRole = session.user.role;
  const canViewAll = true

  return (
    <Layout>
      <div className={cn("space-y-6", viewMode === 'excel' && "space-y-3")}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">{srd.title}</h1>
              <Badge className="bg-blue-100 text-blue-800">{srd.refNo}</Badge>
            </div>
            <p className="text-gray-600 mt-2">{srd.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Overall Progress</div>
            <div className="text-2xl font-bold">{srd.progress}%</div>
            <Progress value={srd.progress} className="w-32 mt-1" />
          </div>
        </div>

        {/* SRD Info */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">SRD Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Created by</div>
                  <div className="font-medium">{srd.createdBy.name}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Created date</div>
                  <div className="font-medium">
                    {new Date(srd.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Comments</div>
                  <div className="font-medium">{srd.comments.length}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Department Status - Hide in Excel mode to save space */}
        {viewMode !== 'excel' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Department Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {srd.status && Object.entries(srd.status)
                  .filter(([dept]) => allowedDepartments.includes(dept))
                  .map(([dept, status]) => (
                    <div key={dept} className="text-center">
                      <Badge className={getStatusColor(status)}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                      <div className="mt-2 text-sm font-medium text-gray-900">
                        {dept.toUpperCase()}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SRD Diagnostic Tool - For Admin and Production Manager */}
        

        {/* Production Control - Only for Production Manager */}
        {(userRole === 'production-manager' || userRole === 'admin') && (
          <ProductionControl 
            srdId={srd._id} 
            initialData={srd}
            onUpdate={(updatedSrd) => setSrd(updatedSrd)}
          />
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Department Details</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'form' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('form')}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              Form View
            </Button>
            <Button
              variant={viewMode === 'excel' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('excel')}
              className="flex items-center gap-2"
            >
              <Table className="h-4 w-4" />
              Excel View
            </Button>
          </div>
        </div>

        {/* Department Tabs */}
        <div className={cn("w-full", viewMode === 'excel' && "space-y-2")}>
          <Tabs defaultValue={userRole} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {allowedDepartments.filter(dept => (canViewAll ? true : dept === userRole)).map((dept) => (
                <TabsTrigger key={dept} value={dept}>
                  {dept.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>

            {srd.status && allowedDepartments.filter(dept => (canViewAll ? true : dept === userRole)).map((dept) => {
              const canEdit = userRole === dept || userRole === 'admin' || userRole === 'vmd';

              return (
                <TabsContent key={dept} value={dept} className={cn(viewMode === 'excel' && "mt-2")}>
                  {viewMode === 'excel' ? (
                    <DepartmentPanelExcel
                      srd={srd}
                      department={dept}
                      onUpdate={(data) => handleDepartmentUpdate(dept, data)}
                      canEdit={canEdit}
                    />
                  ) : (
                    <DepartmentPanel
                      srd={srd}
                      department={dept}
                      onUpdate={(data) => handleDepartmentUpdate(dept, data)}
                      canEdit={canEdit}
                    />
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>


        {/* Timeline - Hide in Excel mode to save space */}
        {viewMode !== 'excel' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No activity yet</p>
                ) : (
                  timeline.map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {item.type === 'audit' ? (
                          <Clock className="h-5 w-5 text-gray-400" />
                        ) : (
                          <MessageCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            {item.type === 'audit' ? item.action : item.author}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.department && `${item.department.toUpperCase()} • `}
                            {new Date(item.timestamp || item.date).toLocaleString()}
                          </span>
                        </div>
                        {item.type === 'comment' && (
                          <p className="text-sm text-gray-600 mt-1">{item.text}</p>
                        )}
                        {item.type === 'audit' && item.details && (
                          <p className="text-sm text-gray-600 mt-1">
                            Status: {item.details.status}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}