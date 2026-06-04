'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/use-toast';
import { Settings, Save, AlertCircle } from 'lucide-react';

export default function AutoApprovalSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Global settings
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [globalThreshold, setGlobalThreshold] = useState(80);
  
  // Department-specific settings
  const [deptSettings, setDeptSettings] = useState({
    vmd: { enabled: true, threshold: 80 },
    cad: { enabled: true, threshold: 80 },
    commercial: { enabled: true, threshold: 80 },
    mmc: { enabled: true, threshold: 80 },
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    // Only admin can access this page
    if (session.user.role !== 'admin') {
      router.push('/dashboard/' + session.user.role);
      return;
    }

    fetchSettings();
  }, [session, status, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/company');
      const data = await response.json();
      
      if (data.success) {
        const company = data.data;
        const autoApproval = company.autoApprovalSettings || {};
        
        setGlobalEnabled(autoApproval.enabled !== false);
        setGlobalThreshold(autoApproval.threshold || 80);
        
        if (autoApproval.departments) {
          setDeptSettings({
            vmd: autoApproval.departments.vmd || { enabled: true, threshold: 80 },
            cad: autoApproval.departments.cad || { enabled: true, threshold: 80 },
            commercial: autoApproval.departments.commercial || { enabled: true, threshold: 80 },
            mmc: autoApproval.departments.mmc || { enabled: true, threshold: 80 },
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoApprovalSettings: {
            enabled: globalEnabled,
            threshold: globalThreshold,
            departments: deptSettings,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Saved',
          description: 'Auto-approval settings updated successfully',
        });
      } else {
        throw new Error(data.error || 'Save failed');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateDeptSetting = (dept, field, value) => {
    setDeptSettings(prev => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        [field]: value,
      },
    }));
  };

  const applyGlobalToAll = () => {
    setDeptSettings({
      vmd: { enabled: globalEnabled, threshold: globalThreshold },
      cad: { enabled: globalEnabled, threshold: globalThreshold },
      commercial: { enabled: globalEnabled, threshold: globalThreshold },
      mmc: { enabled: globalEnabled, threshold: globalThreshold },
    });
    
    toast({
      title: 'Applied',
      description: 'Global settings applied to all departments',
    });
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

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Auto-Approval Settings
            </h1>
            <p className="text-gray-600 mt-2">
              Configure automatic department approval when required fields are filled
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How Auto-Approval Works</p>
            <p>
              When a user fills required fields in a department and saves, the system calculates 
              the completion percentage. If it meets or exceeds the threshold, the department status 
              is automatically changed to "Approved". You can disable this feature globally or per-department.
            </p>
          </div>
        </div>

        {/* Global Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Global Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="global-enabled" className="text-base font-semibold">
                  Enable Auto-Approval
                </Label>
                <p className="text-sm text-gray-500">
                  Turn on/off automatic approval for all departments
                </p>
              </div>
              <Switch
                id="global-enabled"
                checked={globalEnabled}
                onCheckedChange={setGlobalEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="global-threshold" className="text-base font-semibold">
                Global Threshold Percentage
              </Label>
              <p className="text-sm text-gray-500 mb-2">
                Minimum percentage of required fields that must be filled for auto-approval
              </p>
              <div className="flex items-center gap-4">
                <input
                  id="global-threshold"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={globalThreshold}
                  onChange={(e) => setGlobalThreshold(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  disabled={!globalEnabled}
                />
                <div className="flex items-center gap-2 min-w-[80px]">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={globalThreshold}
                    onChange={(e) => setGlobalThreshold(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    disabled={!globalEnabled}
                  />
                  <span className="text-lg font-semibold text-gray-700">%</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0% - Never approve</span>
                <span>50% - Half filled</span>
                <span>100% - All filled</span>
              </div>
            </div>

            <Button
              onClick={applyGlobalToAll}
              variant="outline"
              className="w-full"
              disabled={!globalEnabled}
            >
              Apply Global Settings to All Departments
            </Button>
          </CardContent>
        </Card>

        {/* Department-Specific Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Department-Specific Settings</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Override global settings for individual departments
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {['vmd', 'cad', 'commercial', 'mmc'].map((dept) => (
              <div key={dept} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold capitalize">{dept}</h3>
                  <Switch
                    checked={deptSettings[dept].enabled}
                    onCheckedChange={(checked) => updateDeptSetting(dept, 'enabled', checked)}
                    disabled={!globalEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Threshold: {deptSettings[dept].threshold}%
                  </Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={deptSettings[dept].threshold}
                      onChange={(e) => updateDeptSetting(dept, 'threshold', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      disabled={!globalEnabled || !deptSettings[dept].enabled}
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={deptSettings[dept].threshold}
                      onChange={(e) => updateDeptSetting(dept, 'threshold', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                      disabled={!globalEnabled || !deptSettings[dept].enabled}
                    />
                  </div>
                </div>

                <div className={`text-xs ${!globalEnabled || !deptSettings[dept].enabled ? 'text-gray-400' : 'text-gray-600'}`}>
                  {deptSettings[dept].threshold === 0 && 'Auto-approval disabled for this department'}
                  {deptSettings[dept].threshold > 0 && deptSettings[dept].threshold < 100 && 
                    `Will auto-approve when ${deptSettings[dept].threshold}% of required fields are filled`}
                  {deptSettings[dept].threshold === 100 && 'Will auto-approve only when all required fields are filled'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-green-600 min-w-[40px]">80%:</span>
              <span>If VMD has 10 required fields, auto-approve when 8 are filled</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-green-600 min-w-[40px]">100%:</span>
              <span>Auto-approve only when every single required field is filled</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-gray-600 min-w-[40px]">0%:</span>
              <span>Disable auto-approval - requires manual approval</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-600 min-w-[40px]">Note:</span>
              <span>Optional fields and heading fields are not counted in the calculation</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
