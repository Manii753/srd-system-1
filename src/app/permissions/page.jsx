'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, Edit, Trash2, Shield, Eye, CheckCircle, Lock
} from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_STAGES = [
  { id: 'pattern', name: 'Pattern' },
  { id: 'sewing', name: 'Sewing' },
  { id: 'washing', name: 'Washing' },
  { id: 'finishing', name: 'Finishing' },
  { id: 'vmd', name: 'VMD' }
];

const AVAILABLE_MENU_ITEMS = [
  { id: 'home', name: 'Home' },
  { id: 'order-confirmation', name: 'Order Confirmation' },
  { id: 'samples-management', name: 'Samples Management' },
  { id: 'all-srds', name: 'SR In Process' },
  { id: 'sample-process', name: 'Inter Dept Log' },
  { id: 'sample-card', name: 'Sample Card' },
  { id: 'dispatch', name: 'Dispatch Detail' },
  { id: 'reports', name: 'Reports' },
  { id: 'buyer-comment', name: 'Buyer Comment' },
  { id: 'cost-sheets', name: 'Cost Sheets' },
  { id: 'pre-costing', name: 'Pre-Costing' },
  { id: 'cost-sheets-sub', name: 'All Costing' },
  { id: 'bom', name: 'BOM' },
  { id: 'planning', name: 'Planning' },
  { id: 'production', name: 'Production' },
  { id: 'vmd-production', name: 'VMD Production' },
  { id: 'work-queue', name: 'Work Queue' },
  { id: 'stage', name: 'Stage' },
  { id: 'mmc', name: 'MMC Portal' },
  { id: 'purchase-orders', name: 'Purchase Orders' },
  { id: 'srd-fields', name: 'SRD Fields' },
  { id: 'users', name: 'Users' },
  { id: 'permissions', name: 'Permissions' },
  { id: 'settings', name: 'Settings' }
];

// Menu groups whose sub-menu ids are auto-granted when the group is enabled.
const MENU_GROUPS = [
  { id: 'samples-management', name: 'Samples Management', children: ['all-srds', 'sample-process', 'sample-card', 'dispatch', 'reports', 'buyer-comment'] }
];

const MENU_GROUP_CHILD_OF = Object.fromEntries(
  MENU_GROUPS.flatMap(g => g.children.map(childId => [childId, g.id]))
);

const PERMISSION_GROUPS = [
  {
    title: 'Sample Process Permissions',
    permissions: [
      { key: 'canViewAll', label: 'Can View All Samples', description: 'User can see all samples regardless of stage' },
      { key: 'canReceiveAnyStage', label: 'Can Receive Any Stage', description: 'User can receive samples for any department. Also grants marking any stage Ready. Revoking this removes those abilities.' },
      { key: 'canCompleteAnyStage', label: 'Can Complete Any Stage', description: 'User can mark any stage Ready regardless of department. Revoking this removes that ability.' }
    ]
  },
  {
    title: 'SRD Management Permissions',
    permissions: [
      { key: 'canCreateSRD', label: 'Can Create SRD', description: 'Can create new Sample Request Documents' },
      { key: 'canEditSRD', label: 'Can Edit SRD', description: 'Can edit SRD details' },
      { key: 'canDeleteSRD', label: 'Can Delete SRD', description: 'Can delete SRDs' },
      { key: 'canViewAllSRDs', label: 'Can View All SRDs', description: 'Can view all SRDs (not just own department)' },
      { key: 'canApproveAnyDepartment', label: 'Can Approve Any Department', description: 'Can approve VMD, CAD, MMC and COM from the status bar (typically for VMD users)' }
    ]
  },
  {
    title: 'Admin Portal Permissions',
    permissions: [
      { key: 'canAccessAdminPortal', label: 'Can Access Admin Portal', description: 'Can access admin portal pages' },
      { key: 'canManageUsers', label: 'Can Manage Users', description: 'Can create, edit, and delete users' },
      { key: 'canManageDepartments', label: 'Can Manage Departments', description: 'Can manage department settings' },
      { key: 'canManagePermissions', label: 'Can Manage Permissions', description: 'Can modify role permissions' },
      { key: 'canManageSRDFields', label: 'Can Manage SRD Fields', description: 'Can configure SRD fields' },
      { key: 'canAccessSettings', label: 'Can Access Settings', description: 'Can access system settings' }
    ]
  },
  {
    title: 'Reports & Data Permissions',
    permissions: [
      { key: 'canViewReports', label: 'Can View Reports', description: 'Can view reports section' },
      { key: 'canExportData', label: 'Can Export Data', description: 'Can export data and reports' }
    ]
  },
  {
    title: 'Dispatch Permissions',
    permissions: [
      { key: 'canViewDispatch', label: 'Can View Dispatch', description: 'Can view dispatch details' },
      { key: 'canManageDispatch', label: 'Can Manage Dispatch', description: 'Can update dispatch information' }
    ]
  },
  {
    title: 'Buyer Comments Permissions',
    permissions: [
      { key: 'canViewBuyerComments', label: 'Can View Buyer Comments', description: 'Can view buyer comments' },
      { key: 'canAddBuyerComments', label: 'Can Add Buyer Comments', description: 'Can add buyer comments' }
    ]
  },
  {
    title: 'Sample Card Permissions',
    permissions: [
      { key: 'canViewSampleCard', label: 'Can View Sample Card', description: 'Can view sample cards' },
      { key: 'canEditSampleCard', label: 'Can Edit Sample Card', description: 'Can edit sample cards' }
    ]
  },
  {
    title: 'Cost Sheet Permissions',
    permissions: [
      { key: 'canViewCostSheets', label: 'Can View Cost Sheets', description: 'Can view cost sheets' },
      { key: 'canEditCostSheets', label: 'Can Edit Cost Sheets', description: 'Can edit cost sheets' }
    ]
  },
  {
    title: 'BOM Permissions',
    permissions: [
      { key: 'canViewBOM', label: 'Can View BOM', description: 'Can view Bill of Materials' },
      { key: 'canEditBOM', label: 'Can Edit BOM', description: 'Can edit Bill of Materials' }
    ]
  },
  {
    title: 'Planning Permissions',
    permissions: [
      { key: 'canViewPlanning', label: 'Can View Planning', description: 'Can view planning section' },
      { key: 'canEditPlanning', label: 'Can Edit Planning', description: 'Can edit planning' }
    ]
  },
  {
    title: 'Order Confirmation Permissions',
    permissions: [
      { key: 'canViewOrderConfirmation', label: 'Can View Order Confirmation', description: 'Can view order confirmation' },
      { key: 'canEditOrderConfirmation', label: 'Can Edit Order Confirmation', description: 'Can edit order confirmation' }
    ]
  }
];

export default function PermissionsManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [formData, setFormData] = useState({
    role: '',
    displayName: '',
    permissions: {
      // Sample Process
      canViewAll: false,
      canCompleteAnyStage: false,
      canReceiveAnyStage: false,
      stages: [],
      // SRD Management
      canCreateSRD: false,
      canEditSRD: false,
      canDeleteSRD: false,
      canViewAllSRDs: false,
      canApproveAnyDepartment: false,
      // Admin Portal
      canAccessAdminPortal: false,
      canManageUsers: false,
      canManageDepartments: false,
      canManagePermissions: false,
      canManageSRDFields: false,
      canAccessSettings: false,
      // Reports & Data
      canViewReports: false,
      canExportData: false,
      // Dispatch
      canViewDispatch: false,
      canManageDispatch: false,
      // Buyer Comments
      canViewBuyerComments: false,
      canAddBuyerComments: false,
      // Sample Card
      canViewSampleCard: false,
      canEditSampleCard: false,
      // Cost Sheets
      canViewCostSheets: false,
      canEditCostSheets: false,
      // BOM
      canViewBOM: false,
      canEditBOM: false,
      // Planning
      canViewPlanning: false,
      canEditPlanning: false,
      // Order Confirmation
      canViewOrderConfirmation: false,
      canEditOrderConfirmation: false
    },
    sidebarMenuItems: [],
    isActive: true
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    const isAdmin = session?.user?.role === 'admin';
    const canManage = session?.user?.permissions?.canManagePermissions === true;
    if (!session || (!isAdmin && !canManage)) {
      router.push('/login');
      return;
    }

    fetchPermissions();
  }, [session, status, router]);

  async function fetchPermissions() {
    try {
      const res = await fetch('/api/permissions');
      const data = await res.json();

      if (data.success) {
        setPermissions(data.data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }

  const openNewPermissionModal = () => {
    setFormData({
      role: '',
      displayName: '',
      permissions: {
        // Sample Process
        canViewAll: false,
        canCompleteAnyStage: false,
        canReceiveAnyStage: false,
        stages: [],
        // SRD Management
        canCreateSRD: false,
        canEditSRD: false,
        canDeleteSRD: false,
        canViewAllSRDs: false,
        canApproveAnyDepartment: false,
        // Admin Portal
        canAccessAdminPortal: false,
        canManageUsers: false,
        canManageDepartments: false,
        canManagePermissions: false,
        canManageSRDFields: false,
        canAccessSettings: false,
        // Reports & Data
        canViewReports: false,
        canExportData: false,
        // Dispatch
        canViewDispatch: false,
        canManageDispatch: false,
        // Buyer Comments
        canViewBuyerComments: false,
        canAddBuyerComments: false,
        // Sample Card
        canViewSampleCard: false,
        canEditSampleCard: false,
        // Cost Sheets
        canViewCostSheets: false,
        canEditCostSheets: false,
        // BOM
        canViewBOM: false,
        canEditBOM: false,
        // Planning
        canViewPlanning: false,
        canEditPlanning: false,
        // Order Confirmation
        canViewOrderConfirmation: false,
        canEditOrderConfirmation: false
      },
      sidebarMenuItems: [],
      isActive: true
    });
    setEditingPermission(null);
    setModalOpen(true);
  };

  const openEditModal = (permission) => {
    setFormData({
      role: permission.role,
      displayName: permission.displayName,
      permissions: {
        // Sample Process
        canViewAll: permission.permissions?.canViewAll || false,
        canCompleteAnyStage: permission.permissions?.canCompleteAnyStage || false,
        canReceiveAnyStage: permission.permissions?.canReceiveAnyStage || false,
        stages: permission.permissions?.stages || [],
        // SRD Management
        canCreateSRD: permission.permissions?.canCreateSRD || false,
        canEditSRD: permission.permissions?.canEditSRD || false,
        canDeleteSRD: permission.permissions?.canDeleteSRD || false,
        canViewAllSRDs: permission.permissions?.canViewAllSRDs || false,
        canApproveAnyDepartment: permission.permissions?.canApproveAnyDepartment || false,
        // Admin Portal
        canAccessAdminPortal: permission.permissions?.canAccessAdminPortal || false,
        canManageUsers: permission.permissions?.canManageUsers || false,
        canManageDepartments: permission.permissions?.canManageDepartments || false,
        canManagePermissions: permission.permissions?.canManagePermissions || false,
        canManageSRDFields: permission.permissions?.canManageSRDFields || false,
        canAccessSettings: permission.permissions?.canAccessSettings || false,
        // Reports & Data
        canViewReports: permission.permissions?.canViewReports || false,
        canExportData: permission.permissions?.canExportData || false,
        // Dispatch
        canViewDispatch: permission.permissions?.canViewDispatch || false,
        canManageDispatch: permission.permissions?.canManageDispatch || false,
        // Buyer Comments
        canViewBuyerComments: permission.permissions?.canViewBuyerComments || false,
        canAddBuyerComments: permission.permissions?.canAddBuyerComments || false,
        // Sample Card
        canViewSampleCard: permission.permissions?.canViewSampleCard || false,
        canEditSampleCard: permission.permissions?.canEditSampleCard || false,
        // Cost Sheets
        canViewCostSheets: permission.permissions?.canViewCostSheets || false,
        canEditCostSheets: permission.permissions?.canEditCostSheets || false,
        // BOM
        canViewBOM: permission.permissions?.canViewBOM || false,
        canEditBOM: permission.permissions?.canEditBOM || false,
        // Planning
        canViewPlanning: permission.permissions?.canViewPlanning || false,
        canEditPlanning: permission.permissions?.canEditPlanning || false,
        // Order Confirmation
        canViewOrderConfirmation: permission.permissions?.canViewOrderConfirmation || false,
        canEditOrderConfirmation: permission.permissions?.canEditOrderConfirmation || false
      },
      sidebarMenuItems: permission.sidebarMenuItems || [],
      isActive: permission.isActive
    });
    setEditingPermission(permission);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingPermission) {
        // Update permission
        const res = await fetch(`/api/permissions/${editingPermission._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await res.json();
        if (data.success) {
          toast.success('Permission updated successfully');
          fetchPermissions();
          setModalOpen(false);
        } else {
          toast.error(data.error || 'Failed to update permission');
        }
      } else {
        // Create permission
        const res = await fetch('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await res.json();
        if (data.success) {
          toast.success('Permission created successfully');
          fetchPermissions();
          setModalOpen(false);
        } else {
          toast.error(data.error || 'Failed to create permission');
        }
      }
    } catch (error) {
      console.error('Error saving permission:', error);
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (permission) => {
    if (!confirm(`Delete permission for "${permission.displayName}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/permissions/${permission._id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Permission deleted successfully');
        fetchPermissions();
      } else {
        toast.error(data.error || 'Failed to delete permission');
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      toast.error('An error occurred');
    }
  };

  const toggleStage = (stageId) => {
    const currentStages = formData.permissions.stages || [];
    const newStages = currentStages.includes(stageId)
      ? currentStages.filter(s => s !== stageId)
      : [...currentStages, stageId];
    
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        stages: newStages
      }
    });
  };

  const toggleMenuItem = (menuItemId) => {
    const currentItems = formData.sidebarMenuItems || [];
    const isChecked = currentItems.includes(menuItemId) || (MENU_GROUP_CHILD_OF[menuItemId] && currentItems.includes(MENU_GROUP_CHILD_OF[menuItemId]));
    const parentId = MENU_GROUP_CHILD_OF[menuItemId] || menuItemId;
    const group = MENU_GROUPS.find(g => g.id === menuItemId);

    // A menu group is all-or-nothing: toggling the group (or any of its
    // sub-pages) enables or disables the whole group so the sidebar shows it.
    const affects = group
      ? [group.id, ...group.children]
      : [parentId, menuItemId];

    const newItems = isChecked
      ? currentItems.filter(i => !affects.includes(i))
      : [...new Set([...currentItems, parentId, ...(group ? affects : [])])];

    setFormData({
      ...formData,
      sidebarMenuItems: newItems
    });
  };

  const togglePermission = (permissionKey) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permissionKey]: !formData.permissions[permissionKey]
      }
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
      <div className="h-full overflow-y-auto custom-scrollbar p-2">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-app-heading font-bold text-gray-900">Role Permissions</h1>
              <p className="text-app-text text-gray-600 mt-1">Manage role-based permissions and sidebar access</p>
            </div>
            <Button onClick={openNewPermissionModal} className="flex items-center space-x-2">
              <PlusCircle className="h-5 w-5" />
              <span className="text-app-text">Add Role Permission</span>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-app-text font-medium">Total Roles</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-app-heading font-bold">{permissions.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-app-text font-medium">Active Roles</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-app-heading font-bold">
                  {permissions.filter(p => p.isActive).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-app-text font-medium">Full Access Roles</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-app-heading font-bold">
                  {permissions.filter(p => p.permissions?.canViewAll).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Permissions Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        View All
                      </th>
                      <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        Receive Any Stage
                      </th>
                      <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        Allowed Stages
                      </th>
                      <th className="px-6 py-3 text-left text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-app-text font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {permissions.map((permission) => (
                      <tr key={permission._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <Shield className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-app-text font-medium text-gray-900">
                                {permission.displayName}
                              </div>
                              <div className="text-app-text text-gray-500">
                                {permission.role}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {permission.permissions?.canViewAll ? (
                            <Badge className="bg-green-100 text-green-800">
                              <Eye className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">No</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {permission.permissions?.canReceiveAnyStage ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">No</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {permission.permissions?.stages?.length > 0 ? (
                              permission.permissions.stages.map(stage => (
                                <Badge key={stage} className="bg-blue-50 text-blue-700 text-xs">
                                  {AVAILABLE_STAGES.find(s => s.id === stage)?.name || stage}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={permission.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {permission.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-app-text font-medium space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(permission)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(permission)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {permissions.length === 0 && (
            <div className="text-center py-12">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No role permissions configured</p>
              <Button onClick={openNewPermissionModal} className="mt-4">
                Create First Permission
              </Button>
            </div>
          )}
        </div>

        {/* Modal */}
        {modalOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setModalOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
                  <h2 className="text-app-heading font-semibold">
                    {editingPermission ? 'Edit Role Permission' : 'Add New Role Permission'}
                  </h2>
                  <button
                    className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                    onClick={() => setModalOpen(false)}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="role">Role Slug *</Label>
                      <Input
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value.toLowerCase() })}
                        placeholder="e.g., pattern, sewing"
                        required
                        disabled={!!editingPermission}
                      />
                      <p className="text-xs text-gray-500 mt-1">Lowercase, no spaces</p>
                    </div>

                    <div>
                      <Label htmlFor="displayName">Display Name *</Label>
                      <Input
                        id="displayName"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        placeholder="e.g., Pattern Department"
                        required
                      />
                    </div>
                  </div>

                  {/* Permissions Groups */}
                  <div className="space-y-6 border-t pt-4">
                    <h3 className="font-semibold text-gray-900 text-lg">Permissions</h3>
                    
                    {PERMISSION_GROUPS.map((group, groupIndex) => (
                      <div key={groupIndex} className="space-y-3">
                        <h4 className="font-medium text-gray-800 text-sm border-b pb-2">{group.title}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {group.permissions.map((perm) => (
                            <div key={perm.key} className="flex items-start space-x-3 p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                              <input
                                type="checkbox"
                                id={perm.key}
                                checked={formData.permissions[perm.key] || false}
                                onChange={() => togglePermission(perm.key)}
                                className="form-checkbox h-4 w-4 mt-1 text-blue-600"
                              />
                              <div className="flex-1">
                                <Label htmlFor={perm.key} className="font-medium text-sm cursor-pointer">{perm.label}</Label>
                                <p className="text-xs text-gray-600 mt-0.5">{perm.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stages */}
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-semibold text-gray-900">Allowed Stages to Receive</h3>
                    <p className="text-sm text-gray-600">Select which stages this role can receive samples for</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {AVAILABLE_STAGES.map(stage => (
                        <div key={stage.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            id={`stage-${stage.id}`}
                            checked={formData.permissions.stages?.includes(stage.id)}
                            onChange={() => toggleStage(stage.id)}
                            className="form-checkbox h-4 w-4 text-blue-600"
                          />
                          <Label htmlFor={`stage-${stage.id}`} className="cursor-pointer text-sm">
                            {stage.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar Menu Items */}
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-semibold text-gray-900">Access Groups</h3>
                    <p className="text-sm text-gray-600">
                      Select which menu groups should appear in the sidebar for this role. Enabling a group like &quot;Samples Management&quot; also grants its sub-pages (SR In Process, Inter Dept Log, Sample Card, etc.).
                    </p>

                    {MENU_GROUPS.map(group => {
                      const checked = formData.sidebarMenuItems?.includes(group.id);
                      const childrenItems = group.children
                        .map(childId => AVAILABLE_MENU_ITEMS.find(i => i.id === childId))
                        .filter(Boolean);
                      return (
                        <div key={group.id} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center space-x-2 p-3 bg-gray-50 border-b">
                            <input
                              type="checkbox"
                              id={`menu-${group.id}`}
                              checked={checked}
                              onChange={() => toggleMenuItem(group.id)}
                              className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <Label htmlFor={`menu-${group.id}`} className="cursor-pointer font-medium text-sm">
                              {group.name}
                            </Label>
                            <span className="text-xs text-gray-400 ml-auto">Group</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
                            {childrenItems.map(item => (
                              <div key={item.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`menu-${item.id}`}
                                  checked={formData.sidebarMenuItems?.includes(item.id) || checked}
                                  onChange={() => toggleMenuItem(item.id)}
                                  className="form-checkbox h-4 w-4 text-blue-600"
                                />
                                <Label htmlFor={`menu-${item.id}`} className="cursor-pointer text-sm text-gray-600">
                                  {item.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {AVAILABLE_MENU_ITEMS
                        .filter(item => !MENU_GROUPS.some(g => g.id === item.id || g.children.includes(item.id)))
                        .map(item => (
                          <div key={item.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                            <input
                              type="checkbox"
                              id={`menu-${item.id}`}
                              checked={formData.sidebarMenuItems?.includes(item.id)}
                              onChange={() => toggleMenuItem(item.id)}
                              className="form-checkbox h-4 w-4 text-blue-600"
                            />
                            <Label htmlFor={`menu-${item.id}`} className="cursor-pointer text-sm">
                              {item.name}
                            </Label>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center space-x-2 border-t pt-4">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <Label htmlFor="isActive" className="font-medium">Active</Label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingPermission ? 'Update Permission' : 'Create Permission'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

      </div>  
    </Layout>
  );
}
