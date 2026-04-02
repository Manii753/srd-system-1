'use client'
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Layout from "@/components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Database, 
  Download, 
  Upload, 
  Cloud, 
  HardDrive, 
  Settings,
  Clock,
  Trash2,
  RefreshCw
} from "lucide-react";
import { toast } from 'sonner';

export default function BackupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [settings, setSettings] = useState({
    autoBackup: true,
    retentionDays: 30,
    backupLocation: 'local',
    googleDriveEnabled: false,
    backupFrequency: 'daily'
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'admin') {
      router.push('/login');
      return;
    }

    fetchBackups();
    fetchSettings();
  }, [session, status, router]);

  const fetchBackups = async () => {
    try {
      const response = await fetch('/api/backup/list');
      const data = await response.json();
      if (data.success) {
        setBackups(data.backups);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/backup/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const createBackup = async () => {
    setBackupInProgress(true);
    setUploadProgress(0);
    
    try {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location: 'local' }),
      });

      const data = await response.json();
      
      if (data.success) {
        const summary = data.summary;
        const detail = summary
          ? ` ${summary.collectionCount} collections, ${summary.totalDocuments} documents${summary.includesUploads ? ', uploads included' : ''}.`
          : '';
        toast.success(`ZIP backup created successfully.${detail}`);
        fetchBackups();
      } else {
        toast.error(data.message || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create backup');
    } finally {
      setBackupInProgress(false);
      setUploadProgress(0);
    }
  };

  const downloadBackup = async (backupId) => {
    try {
      const response = await fetch(`/api/backup/download/${backupId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const backup = backups.find((item) => item.id === backupId);
        const downloadName = extractDownloadFileName(
          response.headers.get('content-disposition'),
          backup?.name || `backup-${backupId}`
        );
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Backup downloaded successfully');
      } else {
        toast.error('Failed to download backup');
      }
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Failed to download backup');
    }
  };

  const deleteBackup = async (backupId) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    
    try {
      const response = await fetch(`/api/backup/delete/${backupId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Backup deleted successfully');
        fetchBackups();
      } else {
        toast.error(data.message || 'Failed to delete backup');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast.error('Failed to delete backup');
    }
  };

  const restoreBackup = async (backupId) => {
    const backup = backups.find((item) => item.id === backupId);
    const confirmMessage = backup?.format === 'json-v1'
      ? 'Restore this legacy JSON backup? Matching documents will be replaced by _id, missing documents will be inserted, unrelated current data will stay, and no upload files will be restored from this backup.'
      : 'Restore this backup? Matching documents will be replaced by _id, missing documents will be inserted, unrelated current data will stay, existing upload files will be kept, and missing upload files from the backup will be restored.';

    if (!confirm(confirmMessage)) return;
    
    try {
      const response = await fetch(`/api/backup/restore/${backupId}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(buildRestoreSummaryMessage(data));
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        toast.error(data.message || 'Failed to restore backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error('Failed to restore backup');
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const response = await fetch('/api/backup/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        toast.success('Settings updated successfully');
      } else {
        toast.error(data.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setBackupInProgress(true);
    
    try {
      const formData = new FormData();
      formData.append('backup', file);

      const response = await fetch('/api/backup/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        const summary = data.summary;
        const detail = summary?.format === 'json-v1'
          ? ' Legacy JSON backup uploaded. It will restore database data only.'
          : summary?.includesUploads
            ? ' ZIP backup uploaded with uploads included.'
            : ' ZIP backup uploaded.';
        toast.success(`Backup uploaded successfully.${detail}`);
        fetchBackups();
      } else {
        toast.error(data.message || 'Failed to upload backup');
      }
    } catch (error) {
      console.error('Error uploading backup:', error);
      toast.error('Failed to upload backup');
    } finally {
      setBackupInProgress(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const cleanupOldBackups = async () => {
    if (!confirm(`This will delete backups older than ${settings.retentionDays} days. Continue?`)) return;
    
    try {
      const response = await fetch('/api/backup/cleanup', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        fetchBackups();
      } else {
        toast.error(data.message || 'Failed to cleanup backups');
      }
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      toast.error('Failed to cleanup backups');
    }
  };

  const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes)) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getBackupDisplayDate = (backup) => {
    return backup.lastRunAt || backup.updatedAt || backup.createdAt;
  };

  const extractDownloadFileName = (contentDisposition, fallbackName) => {
    if (!contentDisposition) {
      return fallbackName;
    }

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || fallbackName;
  };

  const buildRestoreSummaryMessage = (data) => {
    const summary = data?.summary;
    if (!summary) {
      return data?.message || 'Backup restored successfully';
    }

    const uploadPart = summary.format === 'json-v1'
      ? 'No upload files were included.'
      : `${summary.filesRestored} files restored, ${summary.filesSkipped} existing files skipped.`;

    return `${summary.collectionsProcessed} collections processed, ${summary.documentsInserted} documents inserted, ${summary.documentsReplaced} documents replaced. ${uploadPart}`;
  };

  const getBackupFormatLabel = (backup) => {
    if (backup.format === 'json-v1') {
      return 'Legacy JSON';
    }

    return backup.includesUploads ? 'ZIP + uploads' : 'ZIP';
  };

  const getBackupTypeLabel = (backup) => {
    switch (backup.type) {
      case 'automatic':
        return 'Automatic';
      case 'uploaded':
        return 'Uploaded';
      case 'pre-restore':
        return 'Pre-restore';
      default:
        return 'Manual';
    }
  };

  const getBackupTypeDescription = (backup) => {
    switch (backup.type) {
      case 'automatic':
        return 'Rolling automatic snapshot. Requires the `npm run backup:scheduler` worker to be running.';
      case 'uploaded':
        return 'Uploaded backup file stored on this server for restore/download.';
      case 'pre-restore':
        return 'Safety backup captured automatically before a restore runs.';
      default:
        return 'Manual local snapshot created from this page.';
    }
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-8 w-8 text-gray-700" />
            <div>
              <h1 className="text-app-heading font-bold text-gray-900">Backup Management</h1>
              <p className="text-gray-600 mt-1">Create, manage, and restore system backups</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => fetchBackups()} 
              variant="outline"
              disabled={backupInProgress}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={cleanupOldBackups} 
              variant="outline"
              disabled={backupInProgress}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Old
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <p className="text-app-text text-gray-700">
              Automatic backups use one rolling ZIP file and stay separate from manual backups. They only run when the separate scheduler worker is running with `npm run backup:scheduler`.
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HardDrive className="h-5 w-5" />
                <span>Local Backup</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-app-text text-gray-600 mb-4">
                Create a downloadable ZIP backup with database data and everything under `public/uploads`
              </p>
              <Button 
                onClick={createBackup} 
                className="w-full"
                disabled={backupInProgress}
              >
                {backupInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Create Local Backup
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload Backup</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-app-text text-gray-600 mb-4">
                Upload a ZIP backup or legacy JSON backup, then restore it from backup history
              </p>
              <input
                type="file"
                accept=".zip,.json"
                className="hidden"
                id="backup-upload"
                onChange={handleFileUpload}
              />
              <Button 
                onClick={() => document.getElementById('backup-upload').click()}
                className="w-full"
                variant="outline"
                disabled={backupInProgress}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Backup
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        {backupInProgress && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-app-text">
                  <span>Processing backup...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Backup Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-app-text font-medium">Retention Period</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md"
                    value={settings.retentionDays}
                    onChange={(e) => updateSettings({...settings, retentionDays: parseInt(e.target.value)})}
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-app-text font-medium">Backup Frequency</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md"
                    value={settings.backupFrequency}
                    onChange={(e) => updateSettings({...settings, backupFrequency: e.target.value})}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-app-text font-medium">Default Location</label>
                  <div className="w-full mt-1 p-2 border rounded-md bg-gray-50 text-app-text text-gray-700">
                    Local storage only
                  </div>
                  <p className="text-app-text text-gray-500 mt-2">
                    Google Drive backup is currently disabled. Automatic backup is a rolling full ZIP snapshot and requires the separate scheduler worker process.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="auto-backup"
                    checked={settings.autoBackup}
                    onChange={(e) => updateSettings({...settings, autoBackup: e.target.checked})}
                  />
                  <label htmlFor="auto-backup" className="text-app-text font-medium">
                    Enable Automatic Backups
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Backup History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No backups found</p>
                <p className="text-app-text">Create your first backup to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {backup.location === 'google' ? (
                          <Cloud className="h-8 w-8 text-blue-500" />
                        ) : (
                          <HardDrive className="h-8 w-8 text-gray-500" />
                        )}
                      </div>
                        <div>
                          <h3 className="font-medium">{backup.name}</h3>
                          <p className="text-app-text text-gray-500 mt-1">
                            {getBackupTypeDescription(backup)}
                          </p>
                          <div className="flex items-center space-x-4 text-app-text text-gray-500 mt-2">
                            <span>{formatDate(getBackupDisplayDate(backup))}</span>
                            <span>{formatFileSize(backup.size)}</span>
                            <Badge variant={backup.type === 'automatic' ? 'secondary' : 'outline'}>
                              {getBackupTypeLabel(backup)}
                            </Badge>
                            <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'}>
                              {backup.status}
                            </Badge>
                            <Badge variant="outline">
                              {getBackupFormatLabel(backup)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadBackup(backup.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreBackup(backup.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteBackup(backup.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

