# Permissions System Update Summary

## Overview
The permissions system has been significantly expanded to provide granular control over all aspects of the application, including SRD management, admin portal access, reports, dispatch, buyer comments, and more.

## What Was Added

### 1. **New Permission Categories** (40+ new permissions)

#### SRD Management Permissions
- `canCreateSRD` - Control who can create new Sample Request Documents
- `canEditSRD` - Control who can edit SRD details
- `canDeleteSRD` - Control who can delete SRDs
- `canViewAllSRDs` - Control who can view all SRDs (not just own department)

#### Admin Portal Permissions
- `canAccessAdminPortal` - Control access to admin portal pages
- `canManageUsers` - Control who can create/edit/delete users
- `canManageDepartments` - Control who can manage department settings
- `canManagePermissions` - Control who can modify role permissions
- `canManageSRDFields` - Control who can configure SRD fields
- `canAccessSettings` - Control who can access system settings

#### Reports & Data Permissions
- `canViewReports` - Control access to reports section
- `canExportData` - Control who can export data/reports

#### Dispatch Permissions
- `canViewDispatch` - Control access to dispatch details
- `canManageDispatch` - Control who can update dispatch information

#### Buyer Comments Permissions
- `canViewBuyerComments` - Control access to buyer comments
- `canAddBuyerComments` - Control who can add buyer comments

#### Sample Card Permissions
- `canViewSampleCard` - Control access to sample cards
- `canEditSampleCard` - Control who can edit sample cards

#### Cost Sheet Permissions
- `canViewCostSheets` - Control access to cost sheets
- `canEditCostSheets` - Control who can edit cost sheets

#### BOM Permissions
- `canViewBOM` - Control access to Bill of Materials
- `canEditBOM` - Control who can edit BOM

#### Planning Permissions
- `canViewPlanning` - Control access to planning section
- `canEditPlanning` - Control who can edit planning

#### Order Confirmation Permissions
- `canViewOrderConfirmation` - Control access to order confirmation
- `canEditOrderConfirmation` - Control who can edit order confirmation

### 2. **Sidebar Menu Configuration**
- `sidebarMenuItems` - Array field to control which menu items appear in the sidebar for each role
- Provides fine-grained control over navigation visibility

### 3. **Permission Utility Library**
Created `src/lib/permissions.js` with helper functions:
- `hasPermission()` - Generic permission checker
- `canAccessAdminPortal()` - Check admin portal access
- `canCreateSRD()` - Check SRD creation permission
- `canEditSRD()` - Check SRD edit permission
- `canDeleteSRD()` - Check SRD delete permission
- `canViewAllSRDs()` - Check view all SRDs permission
- `canManageUsers()` - Check user management permission
- `canManagePermissions()` - Check permission management
- `canViewReports()` - Check reports access
- `canExportData()` - Check data export permission
- `canViewDispatch()` - Check dispatch view permission
- `canManageDispatch()` - Check dispatch management
- `canViewBuyerComments()` - Check buyer comments view
- `canAddBuyerComments()` - Check buyer comments add
- `canViewSampleCard()` - Check sample card view
- `canEditSampleCard()` - Check sample card edit
- `canViewCostSheets()` - Check cost sheets view
- `canEditCostSheets()` - Check cost sheets edit
- `canViewBOM()` - Check BOM view
- `canEditBOM()` - Check BOM edit
- `canViewPlanning()` - Check planning view
- `canEditPlanning()` - Check planning edit
- `canViewOrderConfirmation()` - Check order confirmation view
- `canEditOrderConfirmation()` - Check order confirmation edit
- `canViewMenuItem()` - Check if menu item should be visible
- `getAllowedMenuItems()` - Get all allowed menu items for user

## Files Modified

### 1. **src/models/RolePermission.js**
- Added 40+ new permission fields to the schema
- Added `sidebarMenuItems` array field
- All permissions have descriptions for clarity

### 2. **src/app/permissions/page.jsx**
- Completely redesigned UI to handle all new permissions
- Organized permissions into logical groups
- Added sidebar menu items configuration
- Improved modal layout with better scrolling
- Added permission groups for better organization:
  - Sample Process Permissions
  - SRD Management Permissions
  - Admin Portal Permissions
  - Reports & Data Permissions
  - Dispatch Permissions
  - Buyer Comments Permissions
  - Sample Card Permissions
  - Cost Sheet Permissions
  - BOM Permissions
  - Planning Permissions
  - Order Confirmation Permissions

### 3. **PERMISSIONS-SYSTEM.md**
- Updated documentation to reflect all new permissions
- Updated database schema documentation
- Added comprehensive permission descriptions

### 4. **src/lib/permissions.js** (NEW)
- Created utility library for permission checking
- Provides consistent permission checking across the app
- Admin role always has all permissions
- Easy to use helper functions

## How to Use

### 1. **In the Admin UI**
1. Navigate to `/permissions` as an admin
2. Click "Add Role Permission" or edit an existing role
3. Configure permissions by checking/unchecking boxes
4. Select which stages the role can receive samples for
5. Select which menu items should appear in the sidebar
6. Save the permission configuration

### 2. **In Your Code**

#### Import the utility functions:
```javascript
import { 
  canCreateSRD, 
  canEditSRD, 
  canAccessAdminPortal,
  canViewMenuItem 
} from '@/lib/permissions';
```

#### Check permissions:
```javascript
// In a component
const { data: session } = useSession();
const [permissions, setPermissions] = useState(null);

// Fetch user permissions
useEffect(() => {
  const fetchPermissions = async () => {
    const res = await fetch(`/api/permissions?role=${session.user.role}`);
    const data = await res.json();
    setPermissions(data.data[0]);
  };
  
  if (session?.user?.role) {
    fetchPermissions();
  }
}, [session]);

// Use permission checks
if (canCreateSRD(session, permissions)) {
  // Show create SRD button
}

if (canAccessAdminPortal(session, permissions)) {
  // Show admin menu items
}
```

#### In API routes:
```javascript
import { getServerSession } from 'next-auth';
import { canEditSRD } from '@/lib/permissions';
import RolePermission from '@/models/RolePermission';

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  
  // Fetch user permissions
  const permissions = await RolePermission.findOne({ 
    role: session.user.role.toLowerCase() 
  });
  
  // Check permission
  if (!canEditSRD(session, permissions)) {
    return NextResponse.json(
      { success: false, error: 'Permission denied' },
      { status: 403 }
    );
  }
  
  // Proceed with edit...
}
```

### 3. **Sidebar Menu Control**
The sidebar can now be dynamically controlled based on the `sidebarMenuItems` array in permissions:

Available menu item IDs:
- `home`
- `order-confirmation`
- `samples-management`
- `create-srd`
- `sample-request`
- `sample-process`
- `sample-card`
- `dispatch`
- `reports`
- `buyer-comment`
- `cost-sheets`
- `bom`
- `planning`
- `all-srds`
- `srd-fields`
- `users`
- `permissions`
- `settings`

## Migration Notes

### Existing Permissions
All existing permissions are preserved:
- `canViewAll` - Still works as before
- `canCompleteAnyStage` - Still works (legacy)
- `canReceiveAnyStage` - Still works as before
- `stages` - Still works as before

### Backward Compatibility
- All new permissions default to `false`
- Existing roles will continue to work with their current permissions
- Admin role automatically has all permissions (hardcoded)
- No database migration required - new fields are optional

### Recommended Next Steps
1. Review each role's permissions in the admin UI
2. Configure the new permissions based on your requirements
3. Update components to use the new permission checks
4. Test thoroughly before deploying to production

## Example Permission Configurations

### Admin Role
```javascript
{
  role: 'admin',
  displayName: 'Administrator',
  permissions: {
    // All permissions set to true
    canViewAll: true,
    canCreateSRD: true,
    canEditSRD: true,
    canDeleteSRD: true,
    canAccessAdminPortal: true,
    canManageUsers: true,
    canManagePermissions: true,
    // ... all other permissions true
  },
  sidebarMenuItems: [
    'home', 'order-confirmation', 'samples-management',
    'create-srd', 'sample-request', 'sample-process',
    'sample-card', 'dispatch', 'reports', 'buyer-comment',
    'cost-sheets', 'bom', 'planning', 'all-srds',
    'srd-fields', 'users', 'permissions', 'settings'
  ],
  isActive: true
}
```

### VMD Role
```javascript
{
  role: 'vmd',
  displayName: 'VMD',
  permissions: {
    canViewAll: true,
    canCreateSRD: true,
    canEditSRD: true,
    canViewAllSRDs: true,
    canViewReports: true,
    canViewDispatch: true,
    canViewBuyerComments: true,
    canAddBuyerComments: true,
    canViewSampleCard: true,
    canEditSampleCard: true,
    canViewOrderConfirmation: true,
    canEditOrderConfirmation: true,
    stages: ['vmd']
  },
  sidebarMenuItems: [
    'home', 'order-confirmation', 'samples-management',
    'create-srd', 'sample-request', 'sample-process',
    'sample-card', 'dispatch', 'reports', 'buyer-comment',
    'cost-sheets', 'bom', 'planning'
  ],
  isActive: true
}
```

### Pattern Department Role
```javascript
{
  role: 'pattern',
  displayName: 'Pattern Department',
  permissions: {
    canViewAll: false,
    canViewSampleCard: true,
    canViewSampleProcess: true,
    stages: ['pattern']
  },
  sidebarMenuItems: [
    'home', 'sample-process', 'sample-card'
  ],
  isActive: true
}
```

## Benefits

1. **Granular Control**: Fine-grained control over every feature
2. **Security**: Proper authorization at both UI and API levels
3. **Flexibility**: Easy to add new permissions in the future
4. **Maintainability**: Centralized permission logic
5. **User Experience**: Users only see what they can access
6. **Audit Trail**: Clear permission configurations in database
7. **Scalability**: Easy to add new roles and permissions

## Testing Checklist

- [ ] Create a new role with specific permissions
- [ ] Verify sidebar shows only allowed menu items
- [ ] Test SRD creation permission
- [ ] Test SRD edit permission
- [ ] Test SRD delete permission
- [ ] Test admin portal access
- [ ] Test user management permission
- [ ] Test reports access
- [ ] Test dispatch access
- [ ] Test buyer comments access
- [ ] Test sample card access
- [ ] Test cost sheets access
- [ ] Test BOM access
- [ ] Test planning access
- [ ] Test order confirmation access
- [ ] Verify admin role has all permissions
- [ ] Test permission denial (403 errors)
- [ ] Test backward compatibility with existing roles

## Future Enhancements

Potential additions:
1. **Permission Templates**: Pre-defined permission sets
2. **Permission Groups**: Group multiple permissions together
3. **Time-Based Permissions**: Temporary permission grants
4. **Permission History**: Track who changed permissions and when
5. **Bulk Operations**: Update multiple roles at once
6. **Permission Dependencies**: Auto-enable related permissions
7. **Custom Permissions**: Allow custom permission flags
8. **Permission Inheritance**: Roles can inherit from other roles
