'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/use-toast';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import MobileSampleStageCard from '@/components/MobileSampleStageCard';

// Simple ModuleHeader component inline
function ModuleHeader({ title, subtitle, accentColor }) {
  const router = useRouter();
  return (
    <div className="bg-white px-4 pt-12 pb-4 shadow-sm border-b border-gray-100">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/mobile/sample-management')}
          className="p-2 -ml-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            {title}
          </p>
          {subtitle && (
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Dynamic Stage Configuration - will be fetched from API
const STAGE_CONFIG = [];

// Role-based permissions
const ROLE_PERMISSIONS = {
  admin: {
    canViewAll: true,
    canCompleteAnyStage: true,
    canReceiveAnyStage: false,
    stages: [] // Will be populated with all stage IDs dynamically
  },
  vmd: {
    canViewAll: true,
    canCompleteAnyStage: true,
    canReceiveAnyStage: false,
    stages: ['vmd']
  },
  sewing: { canViewAll: false, canCompleteAnyStage: false, canReceiveAnyStage: false, stages: ['sewing'] },
  washing: { canViewAll: false, canCompleteAnyStage: false, canReceiveAnyStage: false, stages: ['washing'] },
  finishing: { canViewAll: false, canCompleteAnyStage: false, canReceiveAnyStage: false, stages: ['finishing'] },
  dispatch: { canViewAll: false, canCompleteAnyStage: false, canReceiveAnyStage: false, stages: ['dispatch'] }
};

export default function MobileSampleProcessPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const srdId = searchParams.get('srdId');
  const refNo = searchParams.get('refNo');
  
  const [srd, setSrd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [productionStages, setProductionStages] = useState([]);
  const [stagesLoaded, setStagesLoaded] = useState(false);
  const [userPerms, setUserPerms] = useState(null);

  useEffect(() => {
    fetchProductionStages();
  }, []);

  // Live permissions come from the user record (revocations take effect here).
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    fetch(`/api/users/${session.user.id}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) setUserPerms(d?.success ? (d.data?.permissions || null) : null);
      })
      .catch(() => { if (!cancelled) setUserPerms(null); });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    if (srdId && stagesLoaded) {
      fetchSRD();
    } else if (srdId && !stagesLoaded) {
      setError('Loading production stages...');
    } else {
      setError('No SRD ID provided');
      setLoading(false);
    }
  }, [srdId, stagesLoaded]);

  const fetchProductionStages = async () => {
    try {
      const response = await fetch('/api/production-stages');
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        // Convert production stages to the format we need
        const stages = data.data
          .filter(stage => stage.isActive)
          .sort((a, b) => a.order - b.order)
          .map(stage => ({
            id: stage.slug || stage.name.toLowerCase(),
            name: stage.name,
            department: stage.slug || stage.name.toLowerCase(),
            order: stage.order
          }));
        
        if (stages.length > 0) {
          setProductionStages(stages);
          
          // Update admin role permissions with all stage IDs
          ROLE_PERMISSIONS.admin.stages = stages.map(s => s.id);
          
          console.log('Loaded production stages:', stages);
          setStagesLoaded(true);
        }
      }
    } catch (error) {
      console.error('Error fetching production stages:', error);
      setError('Failed to load production stages');
    }
  };

  const fetchSRD = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/srd/${srdId}`);
      const data = await response.json();
      
      console.log('Fetched SRD data:', {
        success: data.success,
        hasSampleProcess: !!data.data?.sampleProcess,
        sampleProcessLength: data.data?.sampleProcess?.length,
        sampleProcess: data.data?.sampleProcess,
        hasProductionHistory: !!data.data?.productionHistory,
        productionHistoryLength: data.data?.productionHistory?.length,
        productionHistory: data.data?.productionHistory
      });
      
      if (data.success) {
        // Check if we should use productionHistory instead
        const useProductionHistory = (!data.data.sampleProcess || data.data.sampleProcess.length === 0) 
                                      && data.data.productionHistory && data.data.productionHistory.length > 0;
        
        if (useProductionHistory) {
          // Start with all stages as pending
          const allStages = productionStages.map(stage => ({
            stage: stage.id,
            stageDisplayName: stage.name,
            status: 'pending',
            order: stage.order
          }));
          
          // Update stages that have history
          data.data.productionHistory.forEach((historyItem) => {
            const stageName = historyItem.stage?.slug || historyItem.stageName?.toLowerCase();
            const stageIndex = allStages.findIndex(s => s.stage === stageName);
            
            if (stageIndex !== -1) {
              allStages[stageIndex] = {
                ...allStages[stageIndex],
                status: historyItem.status === 'completed' ? 'completed' : 
                        historyItem.status === 'in-progress' ? 'received' : 'pending',
                receivedDate: historyItem.startDate,
                completedDate: historyItem.endDate,
                completedBy: historyItem.completedBy ? { name: historyItem.completedBy } : null,
                notes: historyItem.notes
              };
            }
          });
          
          data.data.sampleProcess = allStages;
          console.log('Converted productionHistory to sampleProcess:', data.data.sampleProcess);
        } else if (!data.data.sampleProcess || data.data.sampleProcess.length === 0) {
          // Initialize sampleProcess with dynamic stages if both are empty
          data.data.sampleProcess = productionStages.map(stage => ({
            stage: stage.id,
            stageDisplayName: stage.name,
            status: 'pending',
            order: stage.order
          }));
        }
        setSrd(data.data);
      } else {
        setError(data.error || 'Failed to fetch SRD');
      }
    } catch (error) {
      console.error('Error fetching SRD:', error);
      setError('Failed to fetch SRD');
    } finally {
      setLoading(false);
    }
  };

  const getUserPermissions = () => {
    if (!session?.user?.role) return ROLE_PERMISSIONS.pattern;
    const role = session.user.role.toLowerCase();
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.pattern;
  };

  // Check if a stage can be accessed by the user
  const canAccessStage = (stage) => {
    console.log(`Checking access for ${stage.id}:`, {
      hasSampleProcess: !!srd.sampleProcess,
      sampleProcessLength: srd.sampleProcess?.length,
      allStages: srd.sampleProcess?.map(s => ({ stage: s.stage, status: s.status }))
    });

    if (!srd.sampleProcess || !Array.isArray(srd.sampleProcess)) {
      // If no sampleProcess exists yet, only first stage can start
      const stageIndex = productionStages.findIndex(s => s.id === stage.id);
      console.log(`No sampleProcess, stageIndex: ${stageIndex}`);
      return stageIndex === 0;
    }
    
    const stageIndex = productionStages.findIndex(s => s.id === stage.id);
    const stageData = srd.sampleProcess.find(s => s.stage === stage.id);
    
    console.log(`Stage ${stage.id} index: ${stageIndex}, exists: ${!!stageData}`);
    
    // First stage can always be accessed
    if (stageIndex === 0) {
      console.log(`${stage.id} is first stage, accessible`);
      return true;
    }
    
    // For subsequent stages, check the previous stage
    const previousStage = productionStages[stageIndex - 1];
    const previousStageData = srd.sampleProcess.find(s => s.stage === previousStage.id);
    
    console.log(`Previous stage (${previousStage.id}):`, {
      exists: !!previousStageData,
      status: previousStageData?.status
    });
    
    // If previous stage doesn't exist, this stage cannot be accessed yet
    if (!previousStageData) {
      console.log(`Previous stage doesn't exist, not accessible`);
      return false;
    }
    
    // If previous stage is received, in-progress, or completed, this stage can receive it
    // Even if current stage doesn't exist in sampleProcess yet
    const canAccess = previousStageData.status === 'received' || 
                      previousStageData.status === 'in-progress' || 
                      previousStageData.status === 'completed';
    
    console.log(`Previous stage status check: ${canAccess}`);
    return canAccess;
  };

  const handleReceive = async (srdId, stageId) => {
    try {
      setActionLoading(`${srdId}-${stageId}-receive`);
      console.log('Attempting to receive:', { srdId, stageId });
      
      const response = await fetch(`/api/srd/${srdId}/sample-process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId, action: 'receive' })
      });

      const data = await response.json();
      console.log('Receive response:', data);
      
      if (data.success) {
        toast({ title: 'Success', description: 'Sample received successfully' });
        fetchSRD();
      } else {
        console.error('Receive failed:', data);
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Receive error:', error);
      toast({ title: 'Error', description: 'Failed to receive sample', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (srdId, stageId) => {
    try {
      setActionLoading(`${srdId}-${stageId}-complete`);
      const response = await fetch(`/api/srd/${srdId}/sample-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId, action: 'complete' })
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Stage completed successfully' });
        fetchSRD();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to complete stage', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const permissions = getUserPermissions();

  // DB permissions are authoritative over the role defaults where present.
  // `canReceiveAnyStage` also grants cross-stage "mark ready".
  const crossReceive = userPerms != null
    ? userPerms.canReceiveAnyStage === true
    : permissions.canReceiveAnyStage;
  const crossComplete = userPerms != null
    ? (userPerms.canCompleteAnyStage === true || userPerms.canReceiveAnyStage === true)
    : permissions.canCompleteAnyStage;

  if (loading || !stagesLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !srd) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <ModuleHeader title="SR Progress" />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <AlertCircle size={48} className="text-red-400" />
          <p className="text-gray-600 font-medium">{error || 'SRD not found'}</p>
          <button
            onClick={() => router.push('/mobile/sample-management')}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg"
          >
            Back to Sample Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <ModuleHeader
        title="SR Progress"
        subtitle={refNo || srd.refNo}
      />

      {/* Stage Cards */}
      <div className="px-4 py-4 space-y-4">
        {productionStages.filter(stage => 
          permissions.canViewAll || permissions.stages.includes(stage.id)
        ).map(stage => {
          const canAccess = canAccessStage(stage);
          const hasPermission = permissions.stages.includes(stage.id);
          const canReceive = (crossReceive || hasPermission) && canAccess;
          const canComplete = (crossComplete || hasPermission) && canAccess;

          // Debug logging
          console.log(`Stage ${stage.id}:`, {
            canAccess,
            hasPermission,
            canReceive,
            canComplete,
            crossReceive,
            crossComplete,
            stageData: srd.sampleProcess?.find(s => s.stage === stage.id)
          });

          return (
            <MobileSampleStageCard
              key={stage.id}
              srd={srd}
              stage={stage}
              canReceive={canReceive}
              canComplete={canComplete}
              onReceive={handleReceive}
              onComplete={handleComplete}
              loading={actionLoading === `${srd._id}-${stage.id}-receive` || 
                      actionLoading === `${srd._id}-${stage.id}-complete`}
            />
          );
        })}
      </div>
    </div>
  );
}
