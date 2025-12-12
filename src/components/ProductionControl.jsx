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
  ArrowRight, Calendar, User
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProductionControl({ srdId, initialData, onUpdate }) {
  const [productionData, setProductionData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completedBy, setCompletedBy] = useState('');

  useEffect(() => {
    if (initialData) {
      setProductionData(initialData);
    }
  }, [initialData]);

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

  if (!productionData) {
    return null;
  }

  const { readyForProduction, inProduction, productionProgress, currentProductionStage, productionHistory } = productionData;

  // Not ready for production
  if (!readyForProduction) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-900">Awaiting Department Approvals</p>
              <p className="text-sm text-yellow-700">
                All departments must approve before production can start
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
                <p className="text-sm text-green-700">
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Production Status</span>
            </CardTitle>
            <Badge className="bg-blue-100 text-blue-800">
              In Production
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold">{productionProgress}%</span>
            </div>
            <Progress value={productionProgress} className="h-3" />
          </div>

          {/* Current Stage */}
          {currentProductionStage && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600">Current Stage</p>
                  <p className="text-lg font-semibold">{currentProductionStage.name}</p>
                  {currentProductionStage.description && (
                    <p className="text-sm text-gray-600 mt-1">{currentProductionStage.description}</p>
                  )}
                </div>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: currentProductionStage.color }}
                >
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>

              {currentProductionStage.estimatedDuration > 0 && (
                <p className="text-sm text-gray-600">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Estimated: {currentProductionStage.estimatedDuration} days
                </p>
              )}

              {/* Stage Actions */}
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
                  <p className="text-lg font-semibold text-green-900">Production Complete!</p>
                  <p className="text-sm text-green-700">
                    All production stages have been completed successfully.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Production History */}
      {productionHistory && productionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Production History</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
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
          </CardContent>
        </Card>
      )}

      {/* Complete Stage Modal */}
      {showCompleteModal && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowCompleteModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Complete Production Stage</h2>
                <button className="text-gray-500 hover:text-gray-800 text-2xl" onClick={() => setShowCompleteModal(false)}>×</button>
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
    </div>
  );
}
