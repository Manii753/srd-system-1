'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Play, CheckCircle, Clock, Package, AlertCircle,
  Calendar, User, X
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProductionControl({ srdId, initialData, onUpdate, onHeaderContent }) {
  const [productionData, setProductionData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completedBy, setCompletedBy] = useState('');

  // Production modal state
  const [showProductionModal, setShowProductionModal] = useState(false);

  // Customer Approval state
  const [showCustomerApprovalModal, setShowCustomerApprovalModal] = useState(false);
  const [customerApprovalStatus, setCustomerApprovalStatus] = useState('approved');
  const [customerApprovalComments, setCustomerApprovalComments] = useState('');
  const [customerApprovalBy, setCustomerApprovalBy] = useState('');

  useEffect(() => {
    if (initialData) {

      setProductionData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    if (!onHeaderContent) return;
    if (!productionData?.inProduction) return;
    onHeaderContent(
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-app-text flex items-center gap-1"
        onClick={() => setShowProductionModal(true)}
      >
        <Package className="h-3 w-3" />
        Production
        {productionData?.productionProgress != null && (
          <span className="ml-1 text-[10px] font-bold text-blue-600">{productionData.productionProgress}%</span>
        )}
      </Button>
    );
  }, [onHeaderContent, productionData?.inProduction, productionData?.productionProgress, showProductionModal]);

  const startProduction = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/srd/${srdId}/production`, {
        method: 'POST'
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setProductionData(data.data);
        if (onUpdate) onUpdate(data.data);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error starting production:', error);
      toast.error('Failed to start production');
    } finally {
      setLoading(false);
    }
  };

  const completeStage = async () => {
    if (!completedBy.trim()) {
      toast.error('Please enter who completed this stage');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/srd/${srdId}/production`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_stage',
          notes: completionNotes,
          completedBy: completedBy
        })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setProductionData(data.data);
        setShowCompleteModal(false);
        setCompletionNotes('');
        setCompletedBy('');
        if (onUpdate) onUpdate(data.data);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error completing stage:', error);
      toast.error('Failed to complete stage');
    } finally {
      setLoading(false);
    }
  };

  const updateStageStatus = async (status) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/srd/${srdId}/production`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_stage',
          status: status
        })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setProductionData(data.data);
        if (onUpdate) onUpdate(data.data);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    } finally {
      setLoading(false);
    }
  };

  const submitCustomerApproval = async () => {
    if (!customerApprovalBy.trim()) {
      toast.error('Please enter who is providing this approval/rejection');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/srd/${srdId}/customer-approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: customerApprovalStatus,
          comments: customerApprovalComments,
          completedBy: customerApprovalBy
        })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setProductionData({
          ...productionData,
          customerApproval: data.data.customerApproval
        });
        setShowCustomerApprovalModal(false);
        setCustomerApprovalComments('');
        setCustomerApprovalBy('');
        if (onUpdate) onUpdate(data.data);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Error submitting customer approval:', error);
      toast.error('Failed to submit customer approval');
    } finally {
      setLoading(false);
    }
  };

  if (!productionData) {
    return null;
  }

  const { readyForProduction, inProduction, productionProgress, currentProductionStage, productionHistory, isComplete, customerApproval } = productionData;

  // Not ready for production
  if (!readyForProduction) {
    return;
  }

  // Ready but not started
  if (readyForProduction && !inProduction) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Ready for Production</p>
                <p className="text-app-text text-green-700">
                  All departments approved. Click to start production.
                </p>
              </div>
            </div>
            <Button
              onClick={startProduction}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Production
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // In production
  return (
    <div className="space-y-6">
      {/* Production Modal */}
      {showProductionModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowProductionModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                <h2 className="text-app-heading font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Production Status
                  <Badge className="bg-blue-100 text-blue-800 ml-2">In Production</Badge>
                </h2>
                <button className="text-gray-500 hover:text-gray-800" onClick={() => setShowProductionModal(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-app-text font-medium">Overall Progress</span>
                    <span className="text-app-heading font-bold">{productionProgress}%</span>
                  </div>
                  <Progress value={productionProgress} className="h-3" />
                </div>

                {/* Current Stage */}
                {currentProductionStage && (
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-app-text text-gray-600">Current Stage</p>
                        <p className="text-app-heading font-semibold">
                          {productionHistory?.find(h =>
                            String(h.stage) === String(currentProductionStage)
                          )?.stageDisplayName}
                        </p>
                      </div>
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: currentProductionStage.color }}
                      >
                        <Package className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {currentProductionStage.estimatedDuration > 0 && (
                      <p className="text-app-text text-gray-600">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Estimated: {currentProductionStage.estimatedDuration} days
                      </p>
                    )}

                    <div className="flex items-center space-x-2 mt-4">
                      <Button
                        onClick={() => setShowCompleteModal(true)}
                        disabled={loading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Stage
                      </Button>
                      <Button
                        onClick={() => updateStageStatus('on-hold')}
                        disabled={loading}
                        size="sm"
                        variant="outline"
                      >
                        Put On Hold
                      </Button>
                      <Button
                        onClick={() => updateStageStatus('issue')}
                        disabled={loading}
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Report Issue
                      </Button>
                    </div>
                  </div>
                )}

                {/* Production Complete */}
                {!currentProductionStage && productionProgress === 100 && (
                  <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-app-heading font-semibold text-green-900">Sample Complete!</p>
                        <p className="text-app-text text-green-700">
                          All production stages have been completed successfully.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Production History */}
                {productionHistory && productionHistory.length > 0 && (
                  <div>
                    <h3 className="text-app-heading font-semibold mb-3">Production History</h3>
                    <div className="space-y-4">
                      {productionHistory.map((entry, index) => (
                        <div key={index} className="flex items-start space-x-4 pb-4 border-b last:border-b-0">
                          <div className="flex-shrink-0">
                            {entry.status === 'completed' ? (
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : entry.status === 'in-progress' ? (
                              <Clock className="h-6 w-6 text-blue-600" />
                            ) : entry.status === 'on-hold' ? (
                              <AlertCircle className="h-6 w-6 text-yellow-600" />
                            ) : (
                              <AlertCircle className="h-6 w-6 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{entry.stageDisplayName || entry.stageName || 'Unknown Stage'}</p>
                              <Badge className={
                                entry.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  entry.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                    entry.status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                              }>
                                {entry.status}
                              </Badge>
                            </div>
                            <div className="text-app-text text-gray-600 mt-1 space-y-1">
                              <p>
                                <Calendar className="h-3 w-3 inline mr-1" />
                                Started: {new Date(entry.startDate).toLocaleString()}
                              </p>
                              {entry.endDate && (
                                <p>
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  Completed: {new Date(entry.endDate).toLocaleString()}
                                </p>
                              )}
                              {entry.completedBy && (
                                <p>
                                  <User className="h-3 w-3 inline mr-1" />
                                  By: {entry.completedBy}
                                </p>
                              )}
                              {entry.notes && (
                                <p className="text-gray-700 mt-2 italic">"{entry.notes}"</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Customer Approval Section */}

      {/* Complete Stage Modal */}
      {showCompleteModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowCompleteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-app-heading font-semibold">Complete Production Stage</h2>
                <button className="text-gray-500 hover:text-gray-800 text-app-text" onClick={() => setShowCompleteModal(false)}>×</button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <Label htmlFor="completedBy">Completed By *</Label>
                  <Input
                    id="completedBy"
                    value={completedBy}
                    onChange={(e) => setCompletedBy(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Add any notes about this stage completion..."
                    rows={4}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={completeStage} disabled={loading}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Stage
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Customer Approval Modal */}
      {showCustomerApprovalModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowCustomerApprovalModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-app-heading font-semibold flex items-center">
                  {customerApprovalStatus === 'approved' ? (
                    <><CheckCircle className="h-5 w-5 text-green-600 mr-2" /> Approve Production</>
                  ) : (
                    <><AlertCircle className="h-5 w-5 text-red-600 mr-2" /> Reject Production</>
                  )}
                </h2>
                <button className="text-gray-500 hover:text-gray-800 text-app-text" onClick={() => setShowCustomerApprovalModal(false)}>×</button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <Label htmlFor="customerBy">Performed By *</Label>
                  <Input
                    id="customerBy"
                    value={customerApprovalBy}
                    onChange={(e) => setCustomerApprovalBy(e.target.value)}
                    placeholder="Enter who is making this decision"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerNotes">Comments (Optional)</Label>
                  <Textarea
                    id="customerNotes"
                    value={customerApprovalComments}
                    onChange={(e) => setCustomerApprovalComments(e.target.value)}
                    placeholder={customerApprovalStatus === 'approved' ? "Add any approval notes..." : "Add reasons for rejection..."}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowCustomerApprovalModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={submitCustomerApproval}
                    disabled={loading}
                    variant={customerApprovalStatus === 'approved' ? "default" : "destructive"}
                    className={customerApprovalStatus === 'approved' ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {customerApprovalStatus === 'approved' ? "Submit Approval" : "Submit Rejection"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

