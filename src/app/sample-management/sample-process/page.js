'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/use-toast';
import { Loader2, ArrowLeft, Clock } from 'lucide-react';

// Dynamic Stage Configuration
const STAGE_CONFIG = [
  { id: 'pattern', name: 'Pattern', department: 'pattern', order: 1 },
  { id: 'sewing', name: 'Sewing', department: 'sewing', order: 2 },
  { id: 'washing', name: 'Washing', department: 'washing', order: 3 },
  { id: 'finishing', name: 'Finishing', department: 'finishing', order: 4 },
  { id: 'vmd', name: 'VMD', department: 'vmd', order: 5 }
];

// Role-based permissions
const ROLE_PERMISSIONS = {
  admin: {
    canViewAll: true,
    canCompleteAnyStage: true,
    canReceiveAnyStage: false, // Admin can't receive for others
    stages: ['pattern', 'sewing', 'washing', 'finishing', 'vmd']
  },
  vmd: {
    canViewAll: true,
    canCompleteAnyStage: true,
    canReceiveAnyStage: false, // VMD can't receive for others
    stages: ['vmd'] // VMD can only receive for VMD stage
  },
  pattern: {
    canViewAll: false,
    canCompleteAnyStage: false,
    canReceiveAnyStage: false,
    stages: ['pattern']
  },
  sewing: {
    canViewAll: false,
    canCompleteAnyStage: false,
    canReceiveAnyStage: false,
    stages: ['sewing']
  },
  washing: {
    canViewAll: false,
    canCompleteAnyStage: false,
    canReceiveAnyStage: false,
    stages: ['washing']
  },
  finishing: {
    canViewAll: false,
    canCompleteAnyStage: false,
    canReceiveAnyStage: false,
    stages: ['finishing']
  }
};

export default function SampleProcessPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [srds, setSrds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSrd, setSelectedSrd] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [rolePermissions, setRolePermissions] = useState({});

  useEffect(() => {
    fetchSRDs();
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/permissions');
      const data = await response.json();
      
      if (data.success) {
        // Convert array to object keyed by role
        const permissionsMap = {};
        data.data.forEach(perm => {
          permissionsMap[perm.role] = perm.permissions;
        });
        setRolePermissions(permissionsMap);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchSRDs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/srd');
      const data = await response.json();
      
      if (data.success) {
        setSrds(data.data);
      }
    } catch (error) {
      console.error('Error fetching SRDs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch SRDs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get user permissions based on role
  const getUserPermissions = () => {
    if (!session?.user?.role) return ROLE_PERMISSIONS.pattern;
    const role = session.user.role.toLowerCase();
    
    // Check if we have permissions from database
    if (rolePermissions[role]) {
      return rolePermissions[role];
    }
    
    // Fallback to hardcoded permissions
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.pattern;
  };

  // Check if user can see this SRD based on their role
  const canViewSrd = (srd) => {
    const permissions = getUserPermissions();
    if (permissions.canViewAll) return true;

    const sampleProcess = srd.sampleProcess || [];
    const userStages = permissions.stages;

    // User can see SRD if any of their stages is pending or in-progress
    return sampleProcess.some(stage => 
      userStages.includes(stage.stage) && 
      (stage.status === 'pending' || stage.status === 'in-progress')
    );
  };

  // Filter SRDs based on user role
  const getFilteredSrds = () => {
    const permissions = getUserPermissions();
    
    if (permissions.canViewAll) {
      return srds;
    }

    return srds.filter(canViewSrd);
  };

  // Calculate time spent AT a specific stage (from received to completed)
  const calculateStageTime = (stage, prevStage, srd) => {
    // For first stage (Pattern), calculate from SR raise date to completion
    if (!prevStage) {
      if (!srd.createdAt || !stage.completedDate) return null;
      const startDate = new Date(srd.createdAt);
      const endDate = new Date(stage.completedDate);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    
    // For other stages, calculate from when they received to when they completed
    if (!stage.receivedDate || !stage.completedDate) return null;
    
    const startDate = new Date(stage.receivedDate);
    const endDate = new Date(stage.completedDate);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Calculate total time from SR raise to completion
  const calculateTotalTime = (srd) => {
    if (!srd.createdAt || !srd.sampleProcess) return null;
    
    const lastStage = srd.sampleProcess[srd.sampleProcess.length - 1];
    if (!lastStage?.completedDate) return null;
    
    const startDate = new Date(srd.createdAt);
    const endDate = new Date(lastStage.completedDate);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const handleAction = async (srdId, stage, action) => {
    setActionLoading(`${srdId}-${stage}-${action}`);
    try {
      const response = await fetch(`/api/srd/${srdId}/sample-process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, stage })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: data.message
        });
        fetchSRDs();
        if (selectedSrd?._id === srdId) {
          setSelectedSrd(data.data);
        }
      } else {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update sample process',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Check if user can receive a sample (mark previous stage as done)
  const canReceiveSample = (srd, stage, stageIndex) => {
    if (!session?.user?.role || stageIndex === 0) return false;
    
    // Can't receive if already received
    if (stage.receivedDate) return false;
    
    const permissions = getUserPermissions();
    const prevStage = srd.sampleProcess[stageIndex - 1];
    
    // IMPORTANT: User can ONLY receive if it's THEIR OWN stage
    // Even admin/VMD cannot receive for other departments
    const isUserStage = permissions.stages.includes(stage.stage);
    
    // Previous stage must be completed
    const prevCompleted = prevStage?.status === 'completed';
    
    // User must be from the department that is receiving
    return isUserStage && prevCompleted && !stage.receivedDate;
  };

  // Get stage status for display
  const getStageDisplayStatus = (srd, stageName) => {
    const permissions = getUserPermissions();
    const sampleProcess = srd.sampleProcess || [];
    const stage = sampleProcess.find(s => s.stage === stageName);
    
    if (!stage) return { text: 'Pending', color: 'text-gray-500' };
    
    // If user doesn't have permission to view this stage, show limited info
    if (!permissions.canViewAll && !permissions.stages.includes(stageName)) {
      if (stage.completedDate) {
        return { text: 'Completed', color: 'text-green-700' };
      }
      return { text: 'Pending', color: 'text-gray-500' };
    }
    
    // Full status for authorized users
    if (stage.completedDate) {
      return { 
        text: new Date(stage.completedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), 
        color: 'text-gray-900' 
      };
    }
    if (stage.status === 'in-progress') {
      return { text: 'In Progress', color: 'text-yellow-600' };
    }
    return { text: 'Pending', color: 'text-gray-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const permissions = getUserPermissions();
  const filteredSrds = getFilteredSrds();

  if (selectedSrd) {
    const sampleProcess = selectedSrd.sampleProcess && selectedSrd.sampleProcess.length > 0 
      ? selectedSrd.sampleProcess 
      : STAGE_CONFIG.map(config => ({
          stage: config.id,
          stageDisplayName: config.name,
          status: 'pending',
          order: config.order
        }));

    // Sort stages by order
    sampleProcess.sort((a, b) => {
      const aConfig = STAGE_CONFIG.find(c => c.id === a.stage);
      const bConfig = STAGE_CONFIG.find(c => c.id === b.stage);
      return (aConfig?.order || 0) - (bConfig?.order || 0);
    });

    // Calculate total time
    const totalTime = calculateTotalTime(selectedSrd);

    return (
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Back Button */}
        <button 
          onClick={() => setSelectedSrd(null)}
          className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </button>

        {/* Main Excel-Style Container */}
        <div className="border-2 border-gray-300 bg-white overflow-hidden">
          {/* Header */}
          <div className="bg-gray-100 border-b-2 border-gray-300 px-3 py-2 flex items-center justify-between">
            <h1 className="text-sm font-bold text-gray-900 uppercase">Sample Process Tracking</h1>
            {totalTime && (
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-gray-600" />
                <span className="font-semibold text-gray-700">Total Time:</span>
                <span className="font-bold text-green-700">{totalTime} days</span>
              </div>
            )}
          </div>

          {/* Summary Section - Excel Grid Style */}
          <div className="border-b-2 border-gray-300">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <tbody>
                {/* Row 1 */}
                <tr className="border-b border-gray-300 h-6">
                  <td className="bg-gray-50 border-r border-gray-300 px-2">
                    <span className="text-xs font-semibold text-gray-700">SR Raised Date</span>
                  </td>
                  <td className="px-2 border-r border-gray-300">
                    <span className="text-xs text-gray-900">
                      {selectedSrd.createdAt ? new Date(selectedSrd.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </span>
                  </td>
                  <td className="bg-gray-50 border-r border-gray-300 px-2">
                    <span className="text-xs font-semibold text-gray-700">INO REF NO</span>
                  </td>
                  <td className="px-2">
                    <span className="text-xs text-gray-900 font-medium">{selectedSrd.refNo || '-'}</span>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="border-b border-gray-300 h-6">
                  <td className="bg-gray-50 border-r border-gray-300 px-2">
                    <span className="text-xs font-semibold text-gray-700">BRAND</span>
                  </td>
                  <td className="px-2 border-r border-gray-300">
                    <span className="text-xs text-gray-900">
                      {selectedSrd.dynamicFields?.find(f => f.name === 'Brand' || f.name === 'Buyer')?.value || 
                       (typeof selectedSrd.BuyerDetails === 'object' ? selectedSrd.BuyerDetails?.name : '-')}
                    </span>
                  </td>
                  <td className="bg-gray-50 border-r border-gray-300 px-2">
                    <span className="text-xs font-semibold text-gray-700">SAMPLE TYPE</span>
                  </td>
                  <td className="px-2">
                    <span className="text-xs text-gray-900">
                      {selectedSrd.dynamicFields?.find(f => f.name === 'Sample Type')?.value || 'P P SAMPLE'}
                    </span>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="border-b border-gray-300 h-6">
                  <td className="bg-gray-50 border-r border-gray-300 px-2">
                    <span className="text-xs font-semibold text-gray-700">BUYER STYLE REF #</span>
                  </td>
                  <td className="px-2 border-r border-gray-300">
                    <span className="text-xs text-gray-900">
                      {selectedSrd.dynamicFields?.find(f => f.name === 'Style No' || f.name === 'Style')?.value || '-'}
                    </span>
                  </td>
                  <td className="bg-gray-50 border-r border-gray-300 px-2">
                    <span className="text-xs font-semibold text-gray-700">FIT</span>
                  </td>
                  <td className="px-2">
                    <span className="text-xs text-gray-900">
                      {selectedSrd.dynamicFields?.find(f => f.name === 'Fit')?.value || 'Straight'}
                    </span>
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="h-6">
                  <td className="bg-gray-50 border-r border-gray-300 px-2">
                    <span className="text-xs font-semibold text-gray-700">DESCRIPTION</span>
                  </td>
                  <td colSpan="3" className="px-2">
                    <span className="text-xs text-gray-900">
                      {selectedSrd.dynamicFields?.find(f => f.name === 'Description')?.value || 
                       selectedSrd.description || 
                       selectedSrd.title || 
                       '-'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Process Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300 h-6">
                  <th className="px-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">Stage</th>
                  <th className="px-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">Date</th>
                  <th className="px-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">Time Spent</th>
                  <th className="px-2 text-left text-xs font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {sampleProcess.map((stage, index) => {
                  const showReceive = canReceiveSample(selectedSrd, stage, index);
                  const prevStage = index > 0 ? sampleProcess[index - 1] : null;
                  const stageTime = calculateStageTime(stage, prevStage, selectedSrd);

                  // Check if user can see this stage details
                  const canSeeStageDetails = permissions.canViewAll || permissions.stages.includes(stage.stage);

                  // Determine what date to show
                  let dateDisplay = null;
                  if (stage.completedDate) {
                    dateDisplay = (
                      <span className="text-xs text-gray-900">
                        {new Date(stage.completedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        {canSeeStageDetails && stage.completedBy?.name && (
                          <span className="text-gray-600 ml-1">by {stage.completedBy.name}</span>
                        )}
                      </span>
                    );
                  } else if (stage.receivedDate) {
                    dateDisplay = (
                      <span className="text-xs text-gray-900">
                        Received {new Date(stage.receivedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        {canSeeStageDetails && stage.receivedBy?.name && (
                          <span className="text-gray-600 ml-1">by {stage.receivedBy.name}</span>
                        )}
                      </span>
                    );
                  } else if (index === 0 && selectedSrd.createdAt) {
                    dateDisplay = (
                      <span className="text-xs text-gray-900">
                        {new Date(selectedSrd.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    );
                  } else if (canSeeStageDetails) {
                    dateDisplay = <span className="text-xs text-red-600 font-bold">Pending</span>;
                  } else {
                    dateDisplay = <span className="text-xs text-gray-400">-</span>;
                  }

                  return (
                    <tr key={stage.stage} className="border-b border-gray-300 h-6">
                      <td className="px-2 font-semibold text-gray-900 bg-gray-50 border-r border-gray-300">
                        <span className="text-xs">{stage.stageDisplayName || stage.stage.toUpperCase()}</span>
                      </td>
                      <td className="px-2 border-r border-gray-300">
                        {dateDisplay}
                      </td>
                      <td className="px-2 border-r border-gray-300">
                        {canSeeStageDetails && stage.completedDate && stageTime !== null && (
                          <span className="text-xs flex items-center gap-1 text-gray-900">
                            <Clock className="h-3 w-3" />
                            {stageTime} {stageTime === 1 ? 'day' : 'days'}
                          </span>
                        )}
                      </td>
                      <td className="px-2">
                        {showReceive ? (
                          <button
                            onClick={() => handleAction(selectedSrd._id, stage.stage, 'receive')}
                            disabled={actionLoading === `${selectedSrd._id}-${stage.stage}-receive`}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-5 text-xs px-3 font-medium disabled:opacity-50"
                          >
                            {actionLoading === `${selectedSrd._id}-${stage.stage}-receive` ? (
                              <Loader2 className="h-3 w-3 animate-spin inline" />
                            ) : (
                              'Receive'
                            )}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Sample Process Management</h1>
        <p className="text-xs text-gray-600 mt-1">
          {permissions.canViewAll 
            ? 'Viewing all samples - Click on any row to view details' 
            : `Showing samples pending for ${session?.user?.role || 'your department'}`}
        </p>
      </div>

      {filteredSrds.length === 0 ? (
        <div className="border-2 border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-500 text-sm">No samples found for your department</p>
        </div>
      ) : (
        <div className="border-2 border-gray-300 bg-white overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300 h-6">
                <th className="px-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">Date</th>
                <th className="px-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">INQUIRY #</th>
                {STAGE_CONFIG.map(config => (
                  <th key={`header-${config.id}`} className="px-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">
                    {config.name}
                  </th>
                ))}
                <th className="px-2 text-left text-xs font-semibold text-gray-900">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredSrds.map((srd, index) => {
                const sampleProcess = srd.sampleProcess || [];
                
                const completedCount = sampleProcess.filter(s => s.completedDate).length;
                const totalStages = STAGE_CONFIG.length;
                const overallStatus = completedCount === totalStages ? 'Complete' : completedCount > 0 ? 'In Progress' : 'Pending';

                return (
                  <tr 
                    key={srd._id} 
                    className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer h-6 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    onClick={() => setSelectedSrd(srd)}
                  >
                    <td className="px-2 text-xs text-gray-900 border-r border-gray-200">
                      {srd.createdAt ? new Date(srd.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-2 text-xs font-medium text-blue-600 border-r border-gray-200">
                      {srd.refNo}
                    </td>
                    {STAGE_CONFIG.map(config => {
                      const status = getStageDisplayStatus(srd, config.id);
                      return (
                        <td key={`${srd._id}-${config.id}`} className={`px-2 text-xs font-medium border-r border-gray-200 ${status.color}`}>
                          {status.text}
                        </td>
                      );
                    })}
                    <td className="px-2 text-xs">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        overallStatus === 'Complete' ? 'bg-green-700 text-white' :
                        overallStatus === 'In Progress' ? 'bg-yellow-600 text-white' :
                        'bg-gray-400 text-white'
                      }`}>
                        {overallStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
