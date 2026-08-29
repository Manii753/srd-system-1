'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
  { id: 'create-srd', name: 'Create SRD' },
  { id: 'sample-request', name: 'Sample Request' },
  { id: 'sample-process', name: 'SR In Process' },
  { id: 'sample-card', name: 'Sample Card' },
  { id: 'dispatch', name: 'Dispatch Detail' },
  { id: 'reports', name: 'Reports' },
  { id: 'buyer-comment', name: 'Buyer Comment' },
  { id: 'cost-sheets', name: 'Cost Sheets' },
  { id: 'bom', name: 'BOM' },
  { id: 'planning', name: 'Planning' },
  { id: 'all-srds', name: 'All SRDs' },
  { id: 'srd-fields', name: 'SRD Fields' },
  { id: 'users', name: 'Users' },
  { id: 'permissions', name: 'Permissions' },
  { id: 'settings', name: 'Settings' }
];

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
      { key: 'canManagePermissions', label: 'Can Manage Permissions', description: 'Can modify user permissions' },
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

export default function UserPermissionsModal({ user, isOpen, onClose, onSave }) {
  const [permissions, setPermissions] = useState({});
  const [sidebarMenuItems, setSidebarMenuItems] = useState([]);

  useEffect(() => {
    if (user) {
      setPermissions(user.permissions || {});
      setSidebarMenuItems(user.sidebarMenuItems || []);
    }
  }, [user]);

  const togglePermission = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleStage = (stageId) => {
    const currentStages = permissions.stages || [];
    const newStages = currentStages.includes(stageId)
      ? currentStages.filter(s => s !== stageId)
      : [...currentStages, stageId];
    
    setPermissions(prev => ({
      ...prev,
      stages: newStages
    }));
  };

  const toggleMenuItem = (menuItemId) => {
    const newItems = sidebarMenuItems.includes(menuItemId)
      ? sidebarMenuItems.filter(i => i !== menuItemId)
      : [...sidebarMenuItems, menuItemId];
    
    setSidebarMenuItems(newItems);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(permissions, sidebarMenuItems);
  };

  if (!isOpen || !user) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl border border-gray-200 my-8 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-app-heading font-semibold">
                Manage Permissions: {user.name}
              </h2>
              <p className="text-sm text-gray-500">{user.email} • {user.role.toUpperCase()}</p>
            </div>
            <button
              className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
            {/* Permissions Groups */}
            <div className="space-y-6">
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
                          checked={permissions[perm.key] || false}
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
              <p className="text-sm text-gray-600">Select which stages this user can receive samples for</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_STAGES.map(stage => (
                  <div key={stage.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`stage-${stage.id}`}
                      checked={permissions.stages?.includes(stage.id) || false}
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
              <h3 className="font-semibold text-gray-900">Sidebar Menu Items</h3>
              <p className="text-sm text-gray-600">Select which menu items should appear in the sidebar for this user</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_MENU_ITEMS.map(item => (
                  <div key={item.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`menu-${item.id}`}
                      checked={sidebarMenuItems.includes(item.id)}
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

            <div className="flex justify-end space-x-3 pt-4 border-t sticky bottom-0 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save Permissions
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
