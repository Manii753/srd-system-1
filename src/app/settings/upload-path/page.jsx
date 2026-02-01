'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FolderOpen, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  HardDrive,
  Network,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function UploadPathSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [settings, setSettings] = useState({
    uploadPath: './public/uploads',
    uploadPathType: 'local',
    pathStatus: 'unknown',
    pathError: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetchSettings();
  }, [session, status, router]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/upload-path');
      const data = await res.json();
      
      if (data.success) {
        setSettings(data.data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load settings' });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const res = await fetch('/api/settings/upload-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadPath: settings.uploadPath,
          uploadPathType: settings.uploadPathType,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        fetchSettings(); // Refresh to get updated status
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = () => {
    switch (settings.pathStatus) {
      case 'accessible':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Accessible & Writable
          </Badge>
        );
      case 'read-only':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Read Only
          </Badge>
        );
      case 'not-found':
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Not Found
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Unknown
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <FolderOpen className="h-8 w-8 text-amber-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upload Path Settings</h1>
              <p className="text-gray-600 mt-1">Configure where uploaded files are stored</p>
            </div>
          </div>
          <Button onClick={fetchSettings} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Message Alert */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {message.type === 'error' ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Status</span>
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              Current upload path configuration and accessibility status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-500">Current Path</Label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1 break-all">
                  {settings.uploadPath}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Path Type</Label>
                <p className="flex items-center gap-2 mt-1">
                  {settings.uploadPathType === 'network' ? (
                    <>
                      <Network className="h-4 w-4 text-blue-600" />
                      <span>Network Drive</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="h-4 w-4 text-gray-600" />
                      <span>Local Path</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            {settings.pathError && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {settings.pathError}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Configure Upload Path</CardTitle>
            <CardDescription>
              Set the path where all uploaded files (images, Excel files, etc.) will be stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Path Type Selection */}
            <div className="space-y-3">
              <Label>Path Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, uploadPathType: 'local' }))}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-colors ${
                    settings.uploadPathType === 'local'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <HardDrive className={`h-6 w-6 ${settings.uploadPathType === 'local' ? 'text-amber-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className="font-medium">Local Path</p>
                    <p className="text-sm text-gray-500">Relative to project directory</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, uploadPathType: 'network' }))}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 transition-colors ${
                    settings.uploadPathType === 'network'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Network className={`h-6 w-6 ${settings.uploadPathType === 'network' ? 'text-amber-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className="font-medium">Network Drive</p>
                    <p className="text-sm text-gray-500">UNC path or mapped drive</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Path Input */}
            <div className="space-y-2">
              <Label htmlFor="uploadPath">Upload Path</Label>
              <Input
                id="uploadPath"
                value={settings.uploadPath}
                onChange={(e) => setSettings(prev => ({ ...prev, uploadPath: e.target.value }))}
                placeholder={settings.uploadPathType === 'network' ? '\\\\server\\share\\uploads' : './public/uploads'}
                className="font-mono"
              />
              <p className="text-sm text-gray-500">
                {settings.uploadPathType === 'network' ? (
                  <>
                    Enter the full network path (e.g., <code className="bg-gray-100 px-1 rounded">\\\\server\\share\\uploads</code> or <code className="bg-gray-100 px-1 rounded">Z:\\uploads</code>)
                  </>
                ) : (
                  <>
                    Enter a path relative to the project root (e.g., <code className="bg-gray-100 px-1 rounded">./public/uploads</code> or <code className="bg-gray-100 px-1 rounded">./data/uploads</code>)
                  </>
                )}
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-2">Important Notes</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>The application must have read/write permissions to the specified path</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>For network drives, ensure the server is accessible from the application server</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Existing files in the old location will not be automatically moved</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Files uploaded to custom paths are served through an API endpoint for security</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>Default path (<code className="bg-blue-100 px-1 rounded">./public/uploads</code>) serves files directly for better performance</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
