'use client';

import { useState } from 'react';
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
  },
  {
    title: 'Brand Groups Permissions',
    permissions: [
      { key: 'canManageBrandGroups', label: 'Can Manage Brand Groups', description: 'Can create, edit, and delete brand-wise SR groups and assign users to them on the SR In Process page' }
    ]
  }
];

export default function UserPermissionsModal({ user, isOpen, onClose, onSave }) {
  const [permissions, setPermissions] = useState(user?.permissions || {});
  const [sidebarMenuItems, setSidebarMenuItems] = useState(user?.sidebarMenuItems || []);

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
    // Toggling the group heading (e.g. Samples Management): it always includes
    // every sub-page when enabled, and unhides them all when disabled.
    const group = MENU_GROUPS.find(g => g.id === menuItemId);
    if (group) {
      const wasChecked = sidebarMenuItems.includes(group.id);
      const newItems = wasChecked
        ? sidebarMenuItems.filter(i => i !== group.id && !group.children.includes(i))
        : [...new Set([...sidebarMenuItems, group.id, ...group.children])];
      setSidebarMenuItems(newItems);
      return;
    }

    // Toggling an individual sub-page: only that link is added/removed, so the
    // rest of the group stays in the navbar.
    const parentId = MENU_GROUP_CHILD_OF[menuItemId];
    const groupDef = MENU_GROUPS.find(g => g.id === parentId);
    const willCheck = !sidebarMenuItems.includes(menuItemId);

    let newItems;
    if (willCheck) {
      newItems = [...new Set([...sidebarMenuItems, parentId, menuItemId])];
    } else {
      newItems = sidebarMenuItems.filter(i => i !== menuItemId);
      const remainingSiblings = (groupDef?.children || []).filter(s => newItems.includes(s));
      if (remainingSiblings.length === 0) {
        newItems = newItems.filter(i => i !== parentId);
      }
    }
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
              <h3 className="font-semibold text-gray-900">Access Groups</h3>
              <p className="text-sm text-gray-600">
                Select which menu groups should appear in the sidebar for this user. The group heading (e.g. &quot;Samples Management&quot;) appears in the navbar with its sub-pages beneath it — untick a sub-page to hide just that link.
              </p>

              {/* Menu groups (enabling a group auto-grants its sub-pages) */}
              {MENU_GROUPS.map(group => {
                const checked = sidebarMenuItems.includes(group.id);
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
                            checked={sidebarMenuItems.includes(item.id)}
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

              {/* Standalone menu items */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_MENU_ITEMS
                  .filter(item => !MENU_GROUPS.some(g => g.id === item.id || g.children.includes(item.id)))
                  .map(item => (
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
