'use client';

import { Clock, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STAGE_COLORS = {
  pattern: 'bg-purple-500',
  sewing: 'bg-blue-500',
  washing: 'bg-cyan-500',
  finishing: 'bg-green-500',
  vmd: 'bg-pink-500',
};

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
  received: {
    label: 'Received',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  'in-progress': {
    label: 'In Progress',
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
};

export default function MobileSampleStageCard({ 
  srd, 
  stage, 
  canReceive, 
  canComplete, 
  onReceive, 
  onComplete,
  loading 
}) {
  // Find stage data from sampleProcess array (might not exist yet)
  const stageData = srd.sampleProcess?.find(s => s.stage === stage.id) || {};
  const status = stageData.status || 'pending';
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Stage Header */}
      <div className={`${STAGE_COLORS[stage.id] || 'bg-gray-500'} px-4 py-3`}>
        <h3 className="text-white font-semibold text-base">{stage.name}</h3>
      </div>

      {/* Stage Content */}
      <div className="p-4 space-y-3">
        {/* SRD Info */}
        <div>
          <p className="text-sm text-gray-500">Ref No</p>
          <p className="font-semibold text-gray-900">{srd.refNo}</p>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-2 p-3 rounded-lg ${statusConfig.bgColor}`}>
          <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
          <span className={`font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Timestamps */}
        {stageData.receivedDate && (
          <div className="text-sm">
            <span className="text-gray-500">Received:</span>
            <span className="text-gray-900 ml-2">
              {new Date(stageData.receivedDate).toLocaleString()}
            </span>
          </div>
        )}
        
        {stageData.completedDate && (
          <div className="text-sm">
            <span className="text-gray-500">Completed:</span>
            <span className="text-gray-900 ml-2">
              {new Date(stageData.completedDate).toLocaleString()}
            </span>
          </div>
        )}

        {/* User who completed (if available) */}
        {stageData.completedBy && (
          <div className="text-sm">
            <span className="text-gray-500">By:</span>
            <span className="text-gray-900 ml-2">
              {stageData.completedBy.name || stageData.completedBy.email}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          {/* Can receive if stage is pending or in-progress AND user has permission */}
          {canReceive && (status === 'pending' || status === 'in-progress') && (
            <Button
              onClick={() => onReceive(srd._id, stage.id)}
              disabled={loading}
              className="w-full h-10"
              variant="default"
            >
              {loading ? 'Processing...' : 'Receive Sample'}
            </Button>
          )}
          

          {/* Show message if stage is not accessible yet */}
          {!canReceive && !canComplete && status === 'pending' && (
            <div className="text-sm text-gray-500 text-center py-2 italic">
              Waiting for previous stage to complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
