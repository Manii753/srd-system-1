'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/layout/Layout';
import DepartmentPanelExcel from '@/components/DepartmentPanelExcel';
import ProductionControl from '@/components/ProductionControl';
import { useToast } from '@/lib/use-toast';
import { FileText } from 'lucide-react';
import DispatchPanel from '@/components/DispatchPanel';
import WashReportUploader from '@/components/WashReportUploader';
import BuyerCommentsSection from '@/components/BuyerCommentsSection';

export default function SRDDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [srd, setSrd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveUser, setLiveUser] = useState(null);
  const [excelHeaderContent, setExcelHeaderContent] = useState(null);
  const [productionHeaderContent, setProductionHeaderContent] = useState(null);
  const [excelHeaderRightContent, setExcelHeaderRightContent] = useState(null);
  const saveRef = useRef(null); // ref to trigger save from DepartmentPanelExcel

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveRef.current?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);


  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    // Live permissions (e.g. canViewBuyerComments) so permission changes
    // take effect without waiting for the JWT/session to rotate.
    fetch('/api/users/me')
      .then((res) => res.json())
      .then((data) => { if (data.success) setLiveUser(data.data); })
      .catch(() => {});

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
        body: JSON.stringify({ ...updateData, authorName: session?.user?.name, authorRole: session?.user?.role }),
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

  const userRole = session?.user?.role;

  // Dispatch users can view all departments but only edit dispatch section
  return (
    <Layout
      headerContent={
        <div className="flex items-center gap-2 w-full">
          {excelHeaderContent}
          {productionHeaderContent}
        </div>
      }
      headerRightContent={excelHeaderRightContent}
    >
      <div className="flex flex-col">
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
          onSrdUpdate={(patch) => setSrd((prev) => (prev ? { ...prev, ...patch } : prev))}
          onHeaderContent={setExcelHeaderContent}
          onHeaderRightContent={setExcelHeaderRightContent}
          onSaveRef={(fn) => { saveRef.current = fn; }}
        />

        {/* Dispatch Panel — visible for dispatch users and VMD/Admin */}
        {(userRole === 'dispatch' || userRole === 'vmd' || userRole === 'admin') && (
          <div className="mt-2">
            <DispatchPanel
              srd={srd}
              onUpdate={(data) => setSrd(data)}
              canEdit={userRole === 'dispatch' || userRole === 'vmd' || userRole === 'admin'}
            />
          </div>
        )}

        {/* Read-only Buyer Comments — for users granted canViewBuyerComments
            who don't already get the full DispatchPanel above */}
        {(liveUser?.permissions?.canViewBuyerComments === true ||
          session?.user?.permissions?.canViewBuyerComments === true) &&
          userRole !== 'dispatch' && userRole !== 'vmd' && userRole !== 'admin' && (
          <BuyerCommentsSection srd={srd} />
        )}
      </div>
    </Layout>
  );
}
