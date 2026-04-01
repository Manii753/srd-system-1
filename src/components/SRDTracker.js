'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Factory, ChevronDown, ChevronUp, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SRDTracker({ srd }) {
  const [productionStages, setProductionStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    fetchProductionStages();
  }, []);

  const fetchProductionStages = async () => {
    try {
      const response = await fetch('/api/production-stages');
      const data = await response.json();
      if (data.success) {
        setProductionStages(data.data.filter(stage => stage.isActive).sort((a, b) => a.order - b.order));
      }
    } catch (error) {
      console.error('Error fetching production stages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Department workflow
  const departments = [
    { key: 'vmd', name: 'VMD', color: 'blue' },
    { key: 'cad', name: 'CAD', color: 'purple' },
    { key: 'mmc', name: 'MMC', color: 'indigo' },
    { key: 'commercial', name: 'COM', color: 'teal' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'flagged':
        return 'bg-red-500';
      case 'pending':
        return 'bg-orange-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getDepartmentProgress = () => {
    const approvedCount = departments.filter(dept => (srd.status || []).find(s => s.department === dept.key)?.value === 'approved').length;
    return (approvedCount / departments.length) * 100;
  };

  const getProductionProgress = () => {
    if (!srd.inProduction || !srd.currentProductionStage) return 0;
    
    const currentStageIndex = productionStages.findIndex(
      stage => String(stage._id) === String(srd.currentProductionStage)
    );
    
    if (currentStageIndex === -1) return 0;
    return ((currentStageIndex + 1) / productionStages.length) * 100;
  };

  const departmentProgress = getDepartmentProgress();
  const productionProgress = getProductionProgress();

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
        <div className="animate-pulse flex items-center space-x-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
        </div>
      </div>
    );
  }

  // Minimized floating button
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full w-12 h-12 bg-blue-600 hover:bg-blue-700 shadow-lg"
          size="sm"
        >
          <Factory className="h-5 w-5 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">SRD Workflow Tracker</span>
          <Badge variant="outline" className="text-xs">
            {srd.progress || 0}%
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-6 w-6 p-0"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Workflow Display */}
      <div className="p-6">
        {/* Normal Flow */}
        <div className="mb-8">
          <div className="text-sm font-medium text-gray-600 mb-6">For Normal</div>
          
          <div className="flex items-center justify-start gap-6 relative">
            {/* Progress Line - Extends through all stages */}
            <svg className="absolute top-6 left-6 w-full h-0.5" style={{ zIndex: 0, right: '24px' }}>
              {/* Base gray line - extends to cover all production stages */}
              <line x1="0" y1="1" x2="100%" y2="1" stroke="#e5e7eb" strokeWidth="2" />
              
              {/* Green progress line - shows how far we've progressed */}
              {(() => {
                // Calculate total steps including production
                const departmentSteps = ['sr', 'vmd', 'mmc', 'cad', 'commercial'];
                const totalProductionStages = productionStages.length > 0 ? productionStages.length : 5; // Default 5 stages
                const totalSteps = departmentSteps.length + totalProductionStages;
                
                let completedSteps = 1; // SR is always completed (created)
                
                // Count approved departments
                const _st = srd.status || [];
                if (_st.find(s => s.department === 'vmd')?.value === 'approved') completedSteps++;
                if (_st.find(s => s.department === 'mmc')?.value === 'approved') completedSteps++;
                if (_st.find(s => s.department === 'cad')?.value === 'approved') completedSteps++;
                if (_st.find(s => s.department === 'commercial')?.value === 'approved') completedSteps++;
                
                // Count completed production stages
                if (srd.completedProductionStages) {
                  completedSteps += srd.completedProductionStages.length;
                }
                
                const progressPercent = (completedSteps / totalSteps) * 100;
                
                return (
                  <line 
                    x1="0" 
                    y1="1" 
                    x2={`${Math.min(progressPercent, 100)}%`} 
                    y2="1" 
                    stroke="#10b981" 
                    strokeWidth="2" 
                  />
                );
              })()}
            </svg>

            {/* SR Step */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
              <div className="text-xs text-center mt-2 text-gray-600 font-medium">SR</div>
              <div className="text-xs text-center text-gray-500">CREATED</div>
            </div>

            {/* Main horizontal line connecting all elements */}
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-300" style={{ zIndex: 1 }}></div>

            {/* Diamond Section - VMD, MMC, CAD, COM */}
            <div className="relative w-32 top-[-25] h-20 flex items-center justify-center">
              {/* Diamond SVG lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 80">
                {/* Diamond connections */}
                <line x1="20" y1="40" x2="64" y2="10" stroke="#d1d5db" strokeWidth="1.5" />
                <line x1="64" y1="10" x2="108" y2="40" stroke="#d1d5db" strokeWidth="1.5" />
                <line x1="108" y1="40" x2="64" y2="70" stroke="#d1d5db" strokeWidth="1.5" />
                <line x1="64" y1="70" x2="20" y2="40" stroke="#d1d5db" strokeWidth="1.5" />
              </svg>
              
              {/* VMD (Left - exactly on main line) */}
              <div className="absolute" style={{ left: '14px', top: '37px' }}>
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 border-white shadow-sm",
                  getStatusColor((srd.status || []).find(s => s.department === 'vmd')?.value || 'pending')
                )}></div>
                <div className="text-xs text-center mt-1 text-gray-600 font-medium" style={{ marginLeft: '-10px', width: '26px' }}>VMD</div>
                <div className="text-xs text-center text-gray-500 capitalize" style={{ marginLeft: '-10px', width: '26px' }}>
                  {(srd.status || []).find(s => s.department === 'vmd')?.value || 'Pending'}
                </div>
              </div>
              
              {/* MMC (Top - above the line) */}
              <div className="absolute" style={{ left: '58px', top: '4px' }}>
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 border-white shadow-sm",
                  getStatusColor((srd.status || []).find(s => s.department === 'mmc')?.value || 'pending')
                )}></div>
                <div className="text-xs text-center mt-1 text-gray-600 font-medium" style={{ marginLeft: '-10px', width: '26px' }}>MMC</div>
                <div className="text-xs text-center text-gray-500 capitalize" style={{ marginLeft: '-10px', width: '26px' }}>
                  {(srd.status || []).find(s => s.department === 'mmc')?.value || 'Pending'}
                </div>
              </div>
              
              {/* CAD (Right - exactly on main line) */}
              <div className="absolute" style={{ left: '102px', top: '37px' }}>
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 border-white shadow-sm",
                  getStatusColor((srd.status || []).find(s => s.department === 'cad')?.value || 'pending')
                )}></div>
                <div className="text-xs text-center mt-1 text-gray-600 font-medium" style={{ marginLeft: '-10px', width: '26px' }}>CAD</div>
                <div className="text-xs text-center text-gray-500 capitalize" style={{ marginLeft: '-10px', width: '26px' }}>
                  {(srd.status || []).find(s => s.department === 'cad')?.value || 'Pending'}
                </div>
              </div>
              
              {/* COM (Bottom - below the line) */}
              <div className="absolute" style={{ left: '58px', top: '67px' }}>
                <div className={cn(
                  "w-3 h-3 rounded-full border-2 border-white shadow-sm",
                  getStatusColor((srd.status || []).find(s => s.department === 'commercial')?.value || 'pending')
                )}></div>
                <div className="text-xs text-center mt-1 text-gray-600 font-medium" style={{ marginLeft: '-10px', width: '26px' }}>COM</div>
                <div className="text-xs text-center text-gray-500 capitalize" style={{ marginLeft: '-10px', width: '26px' }}>
                  {(srd.status || []).find(s => s.department === 'commercial')?.value || 'Pending'}
                </div>
              </div>
            </div>

            {/* Production Steps */}
            {productionStages.length > 0 ? (
              productionStages.map((stage) => {
                const isCompleted = srd.completedProductionStages?.includes(String(stage._id));
                const isCurrent = String(stage._id) === String(srd.currentProductionStage);
                
                return (
                  <div key={stage._id} className="flex flex-col items-center relative z-10">
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2 border-white shadow-sm",
                      isCompleted && "bg-green-500",
                      isCurrent && "bg-blue-500",
                      !isCompleted && !isCurrent && "bg-orange-500"
                    )}></div>
                    <div className="text-xs text-center mt-2 text-gray-600 font-medium">
                      {stage.name.substring(0, 3).toUpperCase()}
                    </div>
                    <div className="text-xs text-center text-gray-500">
                      {stage.displayName || stage.name}
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                {/* Default production stages */}
                {[
                  { name: 'CUT', label: 'Cutting' },
                  { name: 'SEW', label: 'Sewing' },
                  { name: 'WAS', label: 'Washing' },
                  { name: 'FIN', label: 'Finishing' },
                  { name: 'DIS', label: 'Dispatch' }
                ].map((stage) => (
                  <div key={stage.name} className="flex flex-col items-center relative z-10">
                    <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm"></div>
                    <div className="text-xs text-center mt-2 text-gray-600 font-medium">{stage.name}</div>
                    <div className="text-xs text-center text-gray-500">{stage.label}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Rejection Flow */}
        {departments.some(dept => (srd.status || []).find(s => s.department === dept.key)?.value === 'flagged') && (
          <div className="border-2 border-dashed border-red-300 rounded-lg p-6 bg-red-50">
            <div className="text-sm font-medium text-red-600 mb-6">In Case of Rejection</div>
            
            <div className="flex items-center justify-start gap-8 relative">
              {/* SR Node - Rejected */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-red-500 border-2 border-red-500 flex items-center justify-center text-white font-bold text-sm">
                  SR
                </div>
                <div className="text-xs text-red-600 mt-2">REJECTED</div>
              </div>

              {/* VMD Node - Rejected */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-bold text-white",
                  (srd.status || []).find(s => s.department === 'vmd')?.value === 'flagged' ? "bg-red-500 border-red-500" : "bg-orange-500 border-orange-500"
                )}>
                  VMD
                </div>
                <div className="text-xs text-red-600 mt-2 capitalize">
                  {(srd.status || []).find(s => s.department === 'vmd')?.value === 'flagged' ? 'Flagged' : 'Pending'}
                </div>
              </div>

              {/* Diamond Pattern - Rejection - CAD on main line */}
              <div className="relative w-32 h-24 flex items-center justify-center">
                {/* SVG for diamond connections - dashed red */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 96">
                  <line x1="64" y1="16" x2="80" y2="48" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
                  <line x1="80" y1="48" x2="64" y2="80" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
                  <line x1="64" y1="80" x2="48" y2="48" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
                  <line x1="48" y1="48" x2="64" y2="16" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
                </svg>

                {/* MMC (Top of diamond) */}
                <div className="absolute" style={{ left: '44px', top: '-4px' }}>
                  <div className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white",
                    (srd.status || []).find(s => s.department === 'mmc')?.value === 'flagged' ? "bg-red-500 border-red-500" : "bg-orange-500 border-orange-500"
                  )}>
                    MMC
                  </div>
                  <div className="text-xs text-center mt-1 text-red-600 capitalize">
                    {(srd.status || []).find(s => s.department === 'mmc')?.value === 'flagged' ? 'Flagged' : 'Pending'}
                  </div>
                </div>

                {/* CAD (Center-right - on main horizontal line) */}
                <div className="absolute" style={{ left: '60px', top: '28px' }}>
                  <div className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white",
                    (srd.status || []).find(s => s.department === 'cad')?.value === 'flagged' ? "bg-red-500 border-red-500" : "bg-orange-500 border-orange-500"
                  )}>
                    CAD
                  </div>
                  <div className="text-xs text-center mt-1 text-red-600 capitalize">
                    {(srd.status || []).find(s => s.department === 'cad')?.value === 'flagged' ? 'Flagged' : 'Pending'}
                  </div>
                </div>

                {/* COM (Bottom of diamond) */}
                <div className="absolute" style={{ left: '44px', top: '60px' }}>
                  <div className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white",
                    (srd.status || []).find(s => s.department === 'commercial')?.value === 'flagged' ? "bg-red-500 border-red-500" : "bg-orange-500 border-orange-500"
                  )}>
                    COM
                  </div>
                  <div className="text-xs text-center mt-1 text-red-600 capitalize">
                    {(srd.status || []).find(s => s.department === 'commercial')?.value === 'flagged' ? 'Flagged' : 'Pending'}
                  </div>
                </div>
              </div>

              {/* Production Halted */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-12 rounded-lg bg-red-100 border-2 border-red-300 flex items-center justify-center">
                  <span className="text-xs text-red-600 font-medium">Production Halted</span>
                </div>
              </div>

              {/* Connecting line for main horizontal line */}
              <svg className="absolute top-6 left-0 right-0 h-0.5" style={{ zIndex: -1 }}>
                <line x1="0" y1="1" x2="100%" y2="1" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" />
              </svg>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-semibold text-gray-700 mb-2">Department Progress</div>
                <Progress value={departmentProgress} className="h-1 mb-2" />
                <div className="text-gray-600">{Math.round(departmentProgress)}% Complete</div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-2">Production Progress</div>
                <Progress value={productionProgress} className="h-1 mb-2" />
                <div className="text-gray-600">{Math.round(productionProgress)}% Complete</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}