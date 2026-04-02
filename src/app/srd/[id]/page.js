'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import DepartmentPanelExcel from '@/components/DepartmentPanelExcel';
import ProductionControl from '@/components/ProductionControl';
import { useToast } from '@/lib/use-toast';
import { FileText } from 'lucide-react';
import DispatchPanel from '@/components/DispatchPanel';

export default function SRDDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [srd, setSrd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [excelHeaderContent, setExcelHeaderContent] = useState(null);
  const [productionHeaderContent, setProductionHeaderContent] = useState(null);


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
        if (data.success) {
          setSrd(data.data);
        } else {
          router.push('/dashboard/vmd');
        }
      } catch (error) {
        console.error('Error fetching SRD:', error);
        router.push('/dashboard/vmd');
      } finally {
        console.log(srd);
        setLoading(false);
      }
    };

    fetchSRD();
  }, [session, status, router, params.id]);

  const handleDepartmentUpdate = async (department, updateData) => {
    try {


      const response = await fetch(`/api/srd/${params.id}/department/${department}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();


      if (data.success) {
        if (data.data) {
          setSrd(data.data);
        }
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

        return data.data;
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Update failed',
          variant: 'destructive',
        });

        return null;
      }
    } catch (error) {
      console.error('[Frontend] Update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update department',
        variant: 'destructive',
      });

      return null;
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

  if (userRole === 'dispatch') {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dispatch Verification: {srd.refNo}</h1>
              <p className="text-gray-600 mt-2">{srd.description || 'No description provided.'}</p>
            </div>
          </div>
          <DispatchPanel
            srd={srd}
            onUpdate={(data) => setSrd(data)}
            canEdit={true}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerContent={
      <div className="flex items-center gap-2 w-full">
        {excelHeaderContent}
        {productionHeaderContent}
      </div>
    }>
      <div className="h-full flex flex-col min-h-0">
        {/* Production Control - Only for VMD/Admin */}
        {(userRole === 'vmd' || userRole === 'admin') && (
          <ProductionControl
            srdId={srd._id}
            initialData={srd}
            onUpdate={(updatedSrd) => setSrd(updatedSrd)}
            onHeaderContent={setProductionHeaderContent}
          />
        )}

        <DepartmentPanelExcel
          srd={srd}
          userRole={userRole}
          onUpdate={(department, data, shouldRefresh) => handleDepartmentUpdate(department, data, shouldRefresh)}
          onSrdUpdate={setSrd}
          onHeaderContent={setExcelHeaderContent}
        />
      </div>
    </Layout>
  );
}
