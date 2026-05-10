'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/lib/use-toast';
import { Loader2, Download, Filter, Eye, Edit, Trash2 } from 'lucide-react';

// Dynamic Stage Configuration
const STAGE_CONFIG = [
  { id: 'pattern', name: 'Pattern', department: 'pattern', order: 1 },
  { id: 'sewing', name: 'Sewing', department: 'sewing', order: 2 },
  { id: 'washing', name: 'Washing', department: 'washing', order: 3 },
  { id: 'finishing', name: 'Finishing', department: 'finishing', order: 4 },
  { id: 'vmd', name: 'VMD', department: 'vmd', order: 5 }
];

export default function SampleProcessReportPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [srds, setSrds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // all, in-progress, completed, pending
  const [expandedRows, setExpandedRows] = useState(new Set()); // Track which rows are expanded

  useEffect(() => {
    fetchSRDs();
  }, []);

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

  // Toggle row expansion
  const toggleRowExpansion = (srdId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(srdId)) {
      newExpanded.delete(srdId);
    } else {
      newExpanded.add(srdId);
    }
    setExpandedRows(newExpanded);
  };

  // Get current status summary for an SRD
  const getCurrentStatusSummary = (srd) => {
    const sampleProcess = srd.sampleProcess || [];
    
    if (sampleProcess.length === 0) {
      return { text: 'Not Started', color: 'bg-gray-400 text-white' };
    }

    const completedCount = sampleProcess.filter(s => s.completedDate).length;
    const totalStages = STAGE_CONFIG.length;

    if (completedCount === totalStages) {
      return { text: 'Completed', color: 'bg-green-700 text-white' };
    }

    // Find current stage (first non-completed stage)
    const currentStage = sampleProcess.find(s => !s.completedDate);
    if (currentStage) {
      const stageConfig = STAGE_CONFIG.find(c => c.id === currentStage.stage);
      const stageName = stageConfig?.name || currentStage.stage;
      
      if (currentStage.receivedDate) {
        return { 
          text: `${completedCount} March in Process`, 
          color: 'bg-yellow-600 text-white',
          detail: `At ${stageName}`
        };
      }
      return { 
        text: `${completedCount} March in Process`, 
        color: 'bg-yellow-600 text-white',
        detail: `Waiting for ${stageName}`
      };
    }

    return { text: 'In Progress', color: 'bg-yellow-600 text-white' };
  };

  // Get stage date display (date when completed)
  const getStageDate = (srd, stageId) => {
    const sampleProcess = srd.sampleProcess || [];
    const stage = sampleProcess.find(s => s.stage === stageId);
    
    if (!stage) return '-';
    
    if (stage.completedDate) {
      const date = new Date(stage.completedDate);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    }
    
    return '-';
  };

  // Get approval status
  const getApprovalStatus = (srd) => {
    if (srd.internalApproved) return 'Internal Approved';
    if (srd.BuyerApproved) return 'Buyer Approved';
    if (srd.sampleDispatchedToBuyer) return 'Dispatched to Buyer';
    
    const sampleProcess = srd.sampleProcess || [];
    const allCompleted = sampleProcess.length > 0 && 
      sampleProcess.every(s => s.completedDate);
    
    if (allCompleted) return 'Awaiting Approval';
    return '-';
  };

  // Filter SRDs based on status
  const getFilteredSrds = () => {
    if (filterStatus === 'all') return srds;
    
    return srds.filter(srd => {
      const sampleProcess = srd.sampleProcess || [];
      const completedCount = sampleProcess.filter(s => s.completedDate).length;
      const totalStages = STAGE_CONFIG.length;
      
      if (filterStatus === 'completed') {
        return completedCount === totalStages;
      } else if (filterStatus === 'in-progress') {
        return completedCount > 0 && completedCount < totalStages;
      } else if (filterStatus === 'pending') {
        return completedCount === 0;
      }
      
      return true;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredSrds = getFilteredSrds();

  return (
    <div className="container mx-auto p-4 max-w-full">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-app-heading font-bold text-gray-900">Sample Process Report</h1>
          <p className="text-app-text text-gray-600 mt-1">
            Comprehensive view of all sample requests and their progress
          </p>
        </div>
        
        {/* Filter and Export */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-app-text focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-app-text font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-app-heading font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">Date</th>
                <th className="px-4 py-3 text-left text-app-heading font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">INQUIRY #</th>
                <th className="px-4 py-3 text-left text-app-heading font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">VMD</th>
                <th className="px-4 py-3 text-left text-app-heading font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">CAD</th>
                <th className="px-4 py-3 text-left text-app-heading font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">MMC</th>
                <th className="px-4 py-3 text-left text-app-heading font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">COM</th>
                <th className="px-4 py-3 text-left text-app-heading font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">STATUS</th>
                <th className="px-4 py-3 text-left text-app-heading font-semibold text-gray-700 uppercase tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSrds.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-app-text text-gray-500">
                    No samples found
                  </td>
                </tr>
              ) : (
                filteredSrds.map((srd, index) => {
                  const statusSummary = getCurrentStatusSummary(srd);
                  const isExpanded = expandedRows.has(srd._id);
                  
                  // Get department statuses
                  const vmdStatus = srd.status?.find(s => s.department === 'vmd');
                  const cadStatus = srd.status?.find(s => s.department === 'cad');
                  const mmcStatus = srd.status?.find(s => s.department === 'mmc');
                  const comStatus = srd.status?.find(s => s.department === 'commercial');
                  
                  const getStatusDisplay = (status) => {
                    if (!status) return { text: '-', color: 'text-gray-400' };
                    
                    const now = new Date();
                    const updatedAt = new Date(status.updatedAt);
                    const daysDiff = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
                    
                    if (status.value === 'approved') {
                      return { 
                        text: updatedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' }), 
                        color: 'text-gray-900' 
                      };
                    } else if (daysDiff > 0) {
                      return { 
                        text: `Delayed ( ${daysDiff} days )`, 
                        color: 'text-red-600 font-medium' 
                      };
                    }
                    return { text: 'Pending', color: 'text-gray-500' };
                  };
                  
                  const vmdDisplay = getStatusDisplay(vmdStatus);
                  const cadDisplay = getStatusDisplay(cadStatus);
                  const mmcDisplay = getStatusDisplay(mmcStatus);
                  const comDisplay = getStatusDisplay(comStatus);
                  
                  return (
                    <>
                      {/* Main Row */}
                      <tr key={srd._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-app-text text-gray-900 border-r border-gray-200">
                          {srd.createdAt ? new Date(srd.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 py-3 text-app-text font-medium text-blue-600 border-r border-gray-200">
                          {srd.refNo}
                        </td>
                        <td className={`px-4 py-3 text-app-text border-r border-gray-200 ${vmdDisplay.color}`}>
                          {vmdDisplay.text}
                        </td>
                        <td className={`px-4 py-3 text-app-text border-r border-gray-200 ${cadDisplay.color}`}>
                          {cadDisplay.text}
                        </td>
                        <td className={`px-4 py-3 text-app-text border-r border-gray-200 ${mmcDisplay.color}`}>
                          {mmcDisplay.text}
                        </td>
                        <td className={`px-4 py-3 text-app-text border-r border-gray-200 ${comDisplay.color}`}>
                          {comDisplay.text}
                        </td>
                        <td className="px-4 py-3 border-r border-gray-200">
                          <button
                            onClick={() => toggleRowExpansion(srd._id)}
                            className="text-left w-full"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-2 py-1 rounded text-app-text font-medium ${statusSummary.color}`}>
                                {statusSummary.text}
                              </span>
                              <svg 
                                className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button className="p-1 hover:bg-blue-50 rounded transition-colors" title="View">
                              <Eye className="h-4 w-4 text-blue-600" />
                            </button>
                            <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Edit">
                              <Edit className="h-4 w-4 text-gray-600" />
                            </button>
                            <button className="p-1 hover:bg-red-50 rounded transition-colors" title="Delete">
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expandable Stage Details Row */}
                      {isExpanded && (
                        <tr className="bg-blue-50 border-t border-blue-100">
                          <td colSpan="8" className="px-4 py-3">
                            <div className="grid grid-cols-7 gap-3">
                              {/* Pattern */}
                              <div className="text-center">
                                <div className="text-app-heading font-semibold text-gray-700 mb-1">Pattern</div>
                                <div className={`text-app-text px-2 py-1 rounded ${getStageDate(srd, 'pattern') !== '-' ? 'bg-green-500 text-white font-medium' : 'text-gray-500'}`}>
                                  {getStageDate(srd, 'pattern')}
                                </div>
                              </div>
                              
                              {/* Cutting */}
                              <div className="text-center">
                                <div className="text-app-heading font-semibold text-gray-700 mb-1">Cutting</div>
                                <div className="text-app-text text-gray-500">-</div>
                              </div>
                              
                              {/* Sewing */}
                              <div className="text-center">
                                <div className="text-app-heading font-semibold text-gray-700 mb-1">Sewing</div>
                                <div className={`text-app-text px-2 py-1 rounded ${getStageDate(srd, 'sewing') !== '-' ? 'bg-green-500 text-white font-medium' : 'text-gray-500'}`}>
                                  {getStageDate(srd, 'sewing')}
                                </div>
                              </div>
                              
                              {/* Washing */}
                              <div className="text-center">
                                <div className="text-app-heading font-semibold text-gray-700 mb-1">Washing</div>
                                <div className={`text-app-text px-2 py-1 rounded ${getStageDate(srd, 'washing') !== '-' ? 'bg-yellow-500 text-white font-medium' : 'text-gray-500'}`}>
                                  {getStageDate(srd, 'washing')}
                                </div>
                              </div>
                              
                              {/* Finishing */}
                              <div className="text-center">
                                <div className="text-app-heading font-semibold text-gray-700 mb-1">Finishing</div>
                                <div className={`text-app-text px-2 py-1 rounded ${getStageDate(srd, 'finishing') !== '-' ? 'bg-green-500 text-white font-medium' : 'text-gray-500'}`}>
                                  {getStageDate(srd, 'finishing')}
                                </div>
                              </div>
                              
                              {/* VMD */}
                              <div className="text-center">
                                <div className="text-app-heading font-semibold text-gray-700 mb-1">VMD</div>
                                <div className={`text-app-text px-2 py-1 rounded ${getStageDate(srd, 'vmd') !== '-' ? 'bg-green-500 text-white font-medium' : 'text-gray-500'}`}>
                                  {getStageDate(srd, 'vmd')}
                                </div>
                              </div>
                              
                              {/* Dispatch */}
                              <div className="text-center">
                                <div className="text-app-heading font-semibold text-gray-700 mb-1">Dispatch</div>
                                <div className="text-app-text text-gray-500">
                                  {srd.dispatchDate ? new Date(srd.dispatchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        <div className="border-2 border-gray-300 bg-white p-3">
          <div className="text-app-text text-gray-600">Total Samples</div>
          <div className="text-app-heading text-2xl font-bold text-gray-900">{srds.length}</div>
        </div>
        <div className="border-2 border-gray-300 bg-white p-3">
          <div className="text-app-text text-gray-600">In Progress</div>
          <div className="text-app-heading text-2xl font-bold text-yellow-600">
            {srds.filter(srd => {
              const sp = srd.sampleProcess || [];
              const completed = sp.filter(s => s.completedDate).length;
              return completed > 0 && completed < STAGE_CONFIG.length;
            }).length}
          </div>
        </div>
        <div className="border-2 border-gray-300 bg-white p-3">
          <div className="text-app-text text-gray-600">Completed</div>
          <div className="text-app-heading text-2xl font-bold text-green-700">
            {srds.filter(srd => {
              const sp = srd.sampleProcess || [];
              return sp.filter(s => s.completedDate).length === STAGE_CONFIG.length;
            }).length}
          </div>
        </div>
        <div className="border-2 border-gray-300 bg-white p-3">
          <div className="text-app-text text-gray-600">Pending</div>
          <div className="text-app-heading text-2xl font-bold text-gray-500">
            {srds.filter(srd => {
              const sp = srd.sampleProcess || [];
              return sp.filter(s => s.completedDate).length === 0;
            }).length}
          </div>
        </div>
      </div>
    </div>
  );
}
