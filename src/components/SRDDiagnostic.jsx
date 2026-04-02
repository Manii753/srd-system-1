'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Wrench, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function SRDDiagnostic({ srdId, onFixed }) {
  const [diagnostic, setDiagnostic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/srd/${srdId}/diagnose`);
      const data = await res.json();
      
      if (data.success) {
        setDiagnostic(data.data);
        setShowDetails(true);
        
        if (data.data.summary.hasIssues) {
          toast.warning(`Found ${data.data.summary.issueCount} issue(s)`);
        } else {
          toast.success('No issues found!');
        }
      } else {
        toast.error('Failed to run diagnostic');
      }
    } catch (error) {
      console.error('Error running diagnostic:', error);
      toast.error('Failed to run diagnostic');
    } finally {
      setLoading(false);
    }
  };

  const autoFix = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/srd/${srdId}/diagnose`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setShowDetails(false);
        setDiagnostic(null);
        
        // Refresh the page
        if (onFixed) {
          onFixed();
        } else {
          window.location.reload();
        }
      } else {
        toast.error(data.error || 'Failed to fix SRD');
      }
    } catch (error) {
      console.error('Error fixing SRD:', error);
      toast.error('Failed to fix SRD');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wrench className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">SRD Diagnostic Tool</p>
                <p className="text-app-text text-blue-700">
                  Check if this SRD is ready for production
                </p>
              </div>
            </div>
            <Button
              onClick={runDiagnostic}
              disabled={loading}
              variant="outline"
              className="bg-white"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              Run Diagnostic
            </Button>
          </div>
        </CardContent>
      </Card>

      {showDetails && diagnostic && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div>
                <h3 className="font-semibold text-app-heading">Diagnostic Results</h3>
                <p className="text-app-text text-gray-600">
                  {diagnostic.summary.approvedCount} of {diagnostic.summary.totalDepartments} departments approved
                </p>
              </div>
              {diagnostic.summary.hasIssues ? (
                <Badge className="bg-red-100 text-red-800">
                  {diagnostic.summary.issueCount} Issue(s) Found
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  All Good
                </Badge>
              )}
            </div>

            {/* Current Status */}
            <div>
              <h4 className="font-medium mb-2">Current Status</h4>
              <div className="grid grid-cols-2 gap-4 text-app-text">
                <div>
                  <span className="text-gray-600">Progress:</span>
                  <span className="ml-2 font-medium">{diagnostic.currentStatus.progress}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Ready for Production:</span>
                  <span className="ml-2 font-medium">
                    {diagnostic.currentStatus.readyForProduction ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">In Production:</span>
                  <span className="ml-2 font-medium">
                    {diagnostic.currentStatus.inProduction ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Departments in Status:</span>
                  <span className="ml-2 font-medium">{diagnostic.departments.inStatus}</span>
                </div>
              </div>
            </div>

            {/* Department Details */}
            <div>
              <h4 className="font-medium mb-2">Department Status</h4>
              <div className="space-y-2">
                {diagnostic.departments.list.map((dept) => (
                  <div key={dept.slug} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-app-text font-medium">{dept.name}</span>
                    <div className="flex items-center space-x-2">
                      {dept.inStatus ? (
                        <>
                          <Badge className={
                            dept.approved ? 'bg-green-100 text-green-800' :
                            dept.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            dept.status === 'flagged' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {dept.status}
                          </Badge>
                          {dept.approved && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Missing</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Issues */}
            {diagnostic.issues.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-red-900">Issues Found</h4>
                <div className="space-y-2">
                  {diagnostic.issues.map((issue, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-app-text font-medium text-red-900">{issue.type}</p>
                        <p className="text-app-text text-red-700">{issue.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {diagnostic.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {diagnostic.recommendations.map((rec, index) => (
                    <li key={index} className="text-app-text text-gray-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Auto-Fix Button */}
            {diagnostic.summary.hasIssues && (
              <div className="pt-4 border-t">
                <Button
                  onClick={autoFix}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wrench className="h-4 w-4 mr-2" />
                  )}
                  Auto-Fix Issues
                </Button>
                <p className="text-app-text text-gray-500 mt-2 text-center">
                  This will automatically fix all detected issues
                </p>
              </div>
            )}

            {/* Summary Message */}
            {diagnostic.summary.shouldBeReady && !diagnostic.summary.hasIssues && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-app-text font-medium text-green-900">
                    This SRD is ready for production!
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

