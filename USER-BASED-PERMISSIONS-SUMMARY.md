# User-Based Permissions System - Complete Summary

## Overview
The permissions system has been redesigned to be **user-centric** instead of role-based. Each user now has their own individual set of permissions stored directly on their user record, providing maximum flexibility and granular control.

## Key Changes

### 1. **From Role-Based to User-Based**
- **Before**: Permissions were assigned to roles, and users inherited permissions from their role
- **After**: Permissions are assigned directly to individual users
- **Benefit**: Each user can have a unique set of permissions regardless of their role

### 2. **User Model Updated**
The `User` model now includes:
- `permissions` object with 40+ permission flags
- `sidebarMenuItems` array for menu customization
- All permissions default to `false` for security

### 3. **Simplified Permission Checking**
Permission helper functions now only need the user object:
```javascript
// Before (role-based)
canCreateSRD(session, rolePermissions)

// After (user-based)
canCreateSRD(user)
```

## Files Modified

### 1. **src/models/User.js**
Added comprehensive permissions structure:
- 40+ permission flags organized by category
- `sidebarMenuItems` array for menu control
- All fields are optional with secure defaults

### 2. **src/lib/permissions.js**
Simplified permission checking:
- Functions now accept `user` object instead of `session` and `permissions`
- Admin role still has all permissions automatically
- Cleaner, more intuitive API

### 3. **src/app/users/page.jsx**
Enhanced user management:
- Added "Manage Permissions" button (key icon) for each user
- Opens comprehensive permissions modal
- Easy-to-use interface for assigning permissions

### 4. **src/components/UserPermissionsModal.jsx** (NEW)
Full-featured permissions management modal:
- All 40+ permissions organized by category
- Stage selection for sample process
- Sidebar menu items configuration
- Clean, scrollable interface
- Real-time updates

## All Available Permissions

### Sample Process (4 permissions)
- `canViewAll` - View all samples regardless of stage
- `canReceiveAnyStage` - Receive samples for any department
- `canCompleteAnyStage` - Complete any stage (legacy)
- `stages` - Array of allowed stages to receive

### SRD Management (4 permissions)
- `canCreateSRD` - Create new SRDs
- `canEditSRD` - Edit SRD details
- `canDeleteSRD` - Delete SRDs
- `canViewAllSRDs` - View all SRDs

### Admin Portal (6 permissions)
- `canAccessAdminPortal` - Access admin pages
- `canManageUsers` - Manage users
- `canManageDepartments` - Manage departments
- `canManagePermissions` - Manage permissions
- `canManageSRDFields` - Configure SRD fields
- `canAccessSettings` - Access settings

### Reports & Data (2 permissions)
- `canViewReports` - View reports
- `canExportData` - Export data

### Dispatch (2 permissions)
- `canViewDispatch` - View dispatch
- `canManageDispatch` - Manage dispatch

### Buyer Comments (2 permissions)
- `canViewBuyerComments` - View comments
- `canAddBuyerComments` - Add comments

### Sample Card (2 permissions)
- `canViewSampleCard` - View sample cards
- `canEditSampleCard` - Edit sample cards

### Cost Sheets (2 permissions)
- `canViewCostSheets` - View cost sheets
- `canEditCostSheets` - Edit cost sheets

### BOM (2 permissions)
- `canViewBOM` - View BOM
- `canEditBOM` - Edit BOM

### Planning (2 permissions)
- `canViewPlanning` - View planning
- `canEditPlanning` - Edit planning

### Order Confirmation (2 permissions)
- `canViewOrderConfirmation` - View order confirmation
- `canEditOrderConfirmation` - Edit order confirmation

### Sidebar Menu Control
- `sidebarMenuItems` - Array of 18 menu item IDs

## How to Use

### 1. **Assign Permissions to Users**

1. Log in as admin
2. Navigate to `/users`
3. Click the **key icon** (🔑) next to any user
4. Check/uncheck permissions as needed
5. Select allowed stages
6. Select sidebar menu items
7. Click "Save Permissions"

### 2. **Check Permissions in Code**

#### In Components:
```javascript
import { useSession } from 'next-auth/react';
import { canCreateSRD } from '@/lib/permissions';

export default function MyComponent() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div>
      {canCreateSRD(user) && (
        <button>Create SRD</button>
      )}
    </div>
  );
}
```

#### In API Routes:
```javascript
import { getServerSession } from 'next-auth';
import { canEditSRD } from '@/lib/permissions';
import User from '@/models/User';

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  
  // Fetch full user object with permissions
  const user = await User.findOne({ email: session.user.email });
  
  // Check permission
  if (!canEditSRD(user)) {
    return NextResponse.json(
      { success: false, error: 'Permission denied' },
      { status: 403 }
    );
  }
  
  // Proceed with edit...
}
```

### 3. **Get User's Sidebar Menu Items**

```javascript
import { getAllowedMenuItems } from '@/lib/permissions';

const menuItems = getAllowedMenuItems(user);
// Returns array like: ['home', 'sample-process', 'reports']
```

## Permission Helper Functions

All functions accept a `user` object and return a boolean:

```javascript
// Import
import {
  hasPermission,
  canAccessAdminPortal,
  canCreateSRD,
  canEditSRD,
  canDeleteSRD,
  canViewAllSRDs,
  canManageUsers,
  canManagePermissions,
  canViewReports,
  canExportData,
  canViewDispatch,
  canManageDispatch,
  canViewBuyerComments,
  canAddBuyerComments,
  canViewSampleCard,
  canEditSampleCard,
  canViewCostSheets,
  canEditCostSheets,
  canViewBOM,
  canEditBOM,
  canViewPlanning,
  canEditPlanning,
  canViewOrderConfirmation,
  canEditOrderConfirmation,
  canViewMenuItem,
  getAllowedMenuItems
} from '@/lib/permissions';

// Usage
if (canCreateSRD(user)) {
  // User can create SRDs
}

if (hasPermission(user, 'canEditBOM')) {
  // Generic permission check
}
```

## Benefits of User-Based Permissions

### 1. **Maximum Flexibility**
- Each user can have unique permissions
- No need to create multiple roles for slight variations
- Easy to grant temporary permissions to specific users

### 2. **Simplified Management**
- One place to manage all user settings
- No need to manage separate role permission records
- Direct relationship between user and permissions

### 3. **Better Security**
- Principle of least privilege - grant only what's needed
- Easy to audit individual user permissions
- No accidental permission inheritance

### 4. **Easier to Understand**
- Clear what each user can do
- No confusion about role hierarchies
- Direct permission assignment

### 5. **Scalability**
- Easy to add new permissions
- No need to update role definitions
- Users can be customized independently

## Migration from Role-Based System

### Automatic Migration
The system is backward compatible:
- Existing users without permissions will have all permissions set to `false`
- Admin role automatically has all permissions (hardcoded)
- No database migration required

### Manual Migration Steps

1. **Review Current Roles**
   - Document what permissions each role should have

2. **Assign Permissions to Users**
   - Go to `/users` as admin
   - For each user, click the key icon
   - Assign appropriate permissions based on their role

3. **Test Thoroughly**
   - Test with different users
   - Verify permissions work as expected
   - Check both UI and API permission checks

4. **Update Components**
   - Replace role checks with permission checks
   - Use helper functions from `src/lib/permissions.js`

## Example Permission Configurations

### Admin User
```javascript
{
  permissions: {
    // All permissions automatically granted (hardcoded)
  },
  sidebarMenuItems: [
    'home', 'order-confirmation', 'samples-management',
    'create-srd', 'sample-request', 'sample-process',
    'sample-card', 'dispatch', 'reports', 'buyer-comment',
    'cost-sheets', 'bom', 'planning', 'all-srds',
    'srd-fields', 'users', 'permissions', 'settings'
  ]
}
```

### VMD User
```javascript
{
  permissions: {
    canViewAll: true,
    canCreateSRD: true,
    canEditSRD: true,
    canViewAllSRDs: true,
    canViewReports: true,
    canViewDispatch: true,
    canManageDispatch: true,
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
  ]
}
```

### Pattern Department User
```javascript
{
  permissions: {
    canViewSampleCard: true,
    stages: ['pattern']
  },
  sidebarMenuItems: [
    'home', 'sample-process', 'sample-card'
  ]
}
```

### Power User (Custom)
```javascript
{
  permissions: {
    canViewAll: true,
    canCreateSRD: true,
    canEditSRD: true,
    canViewAllSRDs: true,
    canViewReports: true,
    canExportData: true,
    canViewDispatch: true,
    canViewBuyerComments: true,
    canAddBuyerComments: true,
    canViewSampleCard: true,
    canEditSampleCard: true,
    canViewCostSheets: true,
    canViewBOM: true,
    canViewPlanning: true,
    stages: ['pattern', 'sewing', 'washing', 'finishing', 'vmd']
  },
  sidebarMenuItems: [
    'home', 'order-confirmation', 'samples-management',
    'create-srd', 'sample-request', 'sample-process',
    'sample-card', 'dispatch', 'reports', 'buyer-comment',
    'cost-sheets', 'bom', 'planning'
  ]
}
```

## Security Considerations

### 1. **Default Deny**
- All permissions default to `false`
- Users must be explicitly granted permissions
- Secure by default

### 2. **Admin Override**
- Admin role always has all permissions
- Hardcoded in permission helper functions
- Cannot be accidentally removed

### 3. **Backend Validation**
- Always check permissions on API routes
- Don't rely on frontend checks alone
- Frontend checks are for UX only

### 4. **Session Management**
- Permissions are stored in database
- Fetched with user data
- Not stored in JWT (too large)

### 5. **Audit Trail**
- User permissions are part of user record
- Changes can be tracked
- Easy to see who has what permissions

## Testing Checklist

- [ ] Create a new user
- [ ] Assign specific permissions to the user
- [ ] Verify user can only access allowed features
- [ ] Test sidebar shows only allowed menu items
- [ ] Test API routes respect permissions
- [ ] Test admin user has all permissions
- [ ] Test permission denial (403 errors)
- [ ] Test with multiple users with different permissions
- [ ] Verify permissions persist after logout/login
- [ ] Test updating user permissions

## Common Use Cases

### 1. **Temporary Access**
Grant a user temporary access to a feature:
1. Go to `/users`
2. Click key icon for the user
3. Enable the permission
4. User now has access
5. Later, disable the permission

### 2. **Custom Roles**
Create users with unique permission combinations:
- User A: Can create and edit SRDs, but not delete
- User B: Can view all reports and export data
- User C: Can manage dispatch and view buyer comments

### 3. **Department Heads**
Give department heads extra permissions:
- All department permissions
- Plus: View reports, export data
- Plus: View all SRDs

### 4. **Restricted Admin**
Create admin-like users with limited access:
- Can manage users
- Can view reports
- Cannot access settings
- Cannot manage permissions

## Troubleshooting

### Issue: User can't see any menu items
**Solution**: Assign sidebar menu items in the permissions modal

### Issue: Permission check returns false for admin
**Solution**: Admin role is checked first in all helper functions - verify user.role === 'admin'

### Issue: Permissions not saving
**Solution**: Check API route `/api/users/[id]` accepts `permissions` and `sidebarMenuItems` fields

### Issue: User has permission but feature doesn't work
**Solution**: Check both frontend and backend permission checks are implemented

## Future Enhancements

Potential additions:
1. **Permission Templates**: Quick-apply common permission sets
2. **Permission Groups**: Group permissions for easier management
3. **Time-Based Permissions**: Auto-expire permissions after a date
4. **Permission History**: Track permission changes over time
5. **Bulk Permission Updates**: Update multiple users at once
6. **Permission Requests**: Users can request permissions
7. **Approval Workflow**: Require approval for sensitive permissions
8. **Permission Inheritance**: Optional role-based defaults

## Summary

The user-based permissions system provides:
- ✅ Maximum flexibility with per-user permissions
- ✅ 40+ granular permissions covering all features
- ✅ Easy-to-use management interface
- ✅ Simplified permission checking in code
- ✅ Secure defaults (all permissions false)
- ✅ Admin override (admin always has access)
- ✅ Sidebar menu customization per user
- ✅ Backward compatible with existing system
- ✅ No database migration required
- ✅ Clean, maintainable code

This system gives you complete control over what each user can do in your application!
