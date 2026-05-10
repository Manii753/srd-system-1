# Permissions System Migration Guide

## Overview
This guide helps you migrate existing code to use the new comprehensive permissions system.

## Step-by-Step Migration

### Step 1: Update Database Schema (Automatic)
The new permissions are added to the RolePermission model. No manual database migration is needed - MongoDB will automatically add the new fields when you create or update permissions.

**Action Required:** None - fields are optional and default to `false`

### Step 2: Update Existing Permissions via Admin UI

1. Log in as admin
2. Navigate to `/permissions`
3. For each existing role, click "Edit"
4. Review and configure the new permissions
5. Select appropriate sidebar menu items
6. Save changes

**Recommended Configurations:**

#### Admin Role
- ✅ Enable ALL permissions
- ✅ Select ALL sidebar menu items

#### VMD Role
- ✅ canViewAll
- ✅ canCreateSRD
- ✅ canEditSRD
- ✅ canViewAllSRDs
- ✅ canViewReports
- ✅ canExportData
- ✅ canViewDispatch
- ✅ canManageDispatch
- ✅ canViewBuyerComments
- ✅ canAddBuyerComments
- ✅ canViewSampleCard
- ✅ canEditSampleCard
- ✅ canViewOrderConfirmation
- ✅ canEditOrderConfirmation
- Sidebar: home, order-confirmation, samples-management, create-srd, sample-request, sample-process, sample-card, dispatch, reports, buyer-comment, cost-sheets, bom, planning

#### Department Roles (Pattern, Sewing, Washing, Finishing)
- ✅ canViewSampleCard
- ✅ stages: [their own stage]
- Sidebar: home, sample-process, sample-card

### Step 3: Update Components to Use Permission Checks

#### Before (Hardcoded Role Checks):
```javascript
// ❌ Old way - hardcoded role checks
if (session?.user?.role === 'admin' || session?.user?.role === 'vmd') {
  // Show create button
}

if (session?.user?.role === 'admin') {
  // Show admin menu
}
```

#### After (Permission-Based Checks):
```javascript
// ✅ New way - permission-based checks
import { canCreateSRD, canAccessAdminPortal } from '@/lib/permissions';

const { permissions } = usePermissions(); // Custom hook

if (canCreateSRD(session, permissions)) {
  // Show create button
}

if (canAccessAdminPortal(session, permissions)) {
  // Show admin menu
}
```

### Step 4: Update API Routes

#### Before:
```javascript
// ❌ Old way
export async function POST(request) {
  const session = await getServerSession(authOptions);
  
  if (session.user.role !== 'admin' && session.user.role !== 'vmd') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // Process request...
}
```

#### After:
```javascript
// ✅ New way
import { canCreateSRD } from '@/lib/permissions';
import RolePermission from '@/models/RolePermission';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  
  const permissions = await RolePermission.findOne({ 
    role: session.user.role.toLowerCase() 
  });
  
  if (!canCreateSRD(session, permissions)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }
  
  // Process request...
}
```

### Step 5: Update Sidebar/Navigation Components

#### Before:
```javascript
// ❌ Old way - hardcoded menu items
const menuItems = [
  { name: 'Home', href: '/home' },
  { name: 'Reports', href: '/reports' },
];

if (userRole === 'admin') {
  menuItems.push({ name: 'Users', href: '/users' });
  menuItems.push({ name: 'Settings', href: '/settings' });
}
```

#### After:
```javascript
// ✅ New way - permission-based menu
import { getAllowedMenuItems } from '@/lib/permissions';

const allowedItems = getAllowedMenuItems(session, permissions);

const allMenuItems = [
  { id: 'home', name: 'Home', href: '/home' },
  { id: 'reports', name: 'Reports', href: '/reports' },
  { id: 'users', name: 'Users', href: '/users' },
  { id: 'settings', name: 'Settings', href: '/settings' },
];

const visibleMenuItems = allMenuItems.filter(item => 
  allowedItems.includes(item.id)
);
```

## Common Migration Patterns

### Pattern 1: Replace Role-Based Conditionals

#### Find and Replace:
```javascript
// Find this pattern:
if (session?.user?.role === 'admin' || session?.user?.role === 'vmd')

// Replace with:
import { canCreateSRD } from '@/lib/permissions';
if (canCreateSRD(session, permissions))
```

### Pattern 2: Replace Admin-Only Checks

#### Find and Replace:
```javascript
// Find this pattern:
if (session?.user?.role === 'admin')

// Replace with appropriate permission:
import { canAccessAdminPortal } from '@/lib/permissions';
if (canAccessAdminPortal(session, permissions))

// Or for user management:
import { canManageUsers } from '@/lib/permissions';
if (canManageUsers(session, permissions))
```

### Pattern 3: Replace Department Checks

#### Find and Replace:
```javascript
// Find this pattern:
if (userRole === fieldDepartment || userRole === 'admin' || userRole === 'vmd')

// Replace with:
import { canEditSRD } from '@/lib/permissions';
if (canEditSRD(session, permissions) || userRole === fieldDepartment)
```

## Files That Need Updates

### High Priority (Security-Critical)

1. **API Routes** - Add permission checks to all API endpoints
   - `/api/srd/route.js` - Check `canCreateSRD`
   - `/api/srd/[id]/route.js` - Check `canEditSRD`, `canDeleteSRD`
   - `/api/users/route.js` - Check `canManageUsers`
   - `/api/permissions/route.js` - Check `canManagePermissions`
   - `/api/departments/route.js` - Check `canManageDepartments`
   - `/api/srdfields/route.js` - Check `canManageSRDFields`

2. **Protected Pages** - Add permission checks to page components
   - `/app/users/page.jsx` - Check `canManageUsers`
   - `/app/permissions/page.jsx` - Check `canManagePermissions`
   - `/app/settings/page.jsx` - Check `canAccessSettings`
   - `/app/srdfields/page.jsx` - Check `canManageSRDFields`

### Medium Priority (UX Improvements)

3. **Components with Conditional Rendering**
   - `src/components/layout/DynamicSidebar.js` - Use `getAllowedMenuItems`
   - `src/components/DepartmentPanel.js` - Use permission checks
   - `src/components/DepartmentPanelExcel.js` - Use permission checks
   - `src/components/DispatchPanel.js` - Check `canViewDispatch`, `canManageDispatch`
   - `src/components/SRDTable.jsx` - Check `canEditSRD`, `canDeleteSRD`

4. **Pages with Action Buttons**
   - `/app/srd/page.js` - Check `canCreateSRD` for create button
   - `/app/srd/[id]/page.js` - Check `canEditSRD`, `canDeleteSRD`
   - `/app/sample-management/sample-process/page.js` - Already has permission checks
   - `/app/sample-management/reports/page.js` - Check `canViewReports`, `canExportData`

### Low Priority (Nice to Have)

5. **Dashboard Components**
   - `/app/dashboard/[department]/page.js` - Add permission-based widgets
   - `/app/home/page.js` - Show features based on permissions

## Testing Checklist

After migration, test the following scenarios:

### Admin Role
- [ ] Can access all pages
- [ ] Can see all menu items
- [ ] Can create/edit/delete SRDs
- [ ] Can manage users
- [ ] Can manage permissions
- [ ] Can access settings
- [ ] Can view and export reports

### VMD Role
- [ ] Can create SRDs
- [ ] Can edit SRDs
- [ ] Can view all SRDs
- [ ] Can view reports
- [ ] Can manage dispatch
- [ ] Can add buyer comments
- [ ] Cannot access admin-only pages (users, permissions, settings)

### Department Roles
- [ ] Can only see their pending samples
- [ ] Can receive samples for their stage
- [ ] Can view sample cards
- [ ] Cannot create SRDs
- [ ] Cannot access admin portal
- [ ] Cannot view reports
- [ ] Sidebar shows only allowed items

### Permission Denial
- [ ] API returns 403 when permission denied
- [ ] UI hides features user cannot access
- [ ] Appropriate error messages shown
- [ ] No console errors

## Rollback Plan

If you need to rollback:

1. **Code Rollback**: Revert to previous commit
   ```bash
   git revert HEAD
   ```

2. **Database**: No rollback needed - old permissions still work
   - New permissions default to `false`
   - Existing permissions are unchanged

3. **Gradual Migration**: You can migrate one feature at a time
   - Old role-based checks continue to work
   - New permission checks can coexist
   - Migrate incrementally over time

## Common Issues and Solutions

### Issue 1: Permission Check Returns False for Admin
**Cause**: Permissions not fetched or null
**Solution**: All permission helper functions check for admin role first
```javascript
// This always returns true for admin
canCreateSRD(session, null) // true if session.user.role === 'admin'
```

### Issue 2: Permissions Not Loading
**Cause**: API call failing or role mismatch
**Solution**: Check browser console and network tab
```javascript
// Add error handling
try {
  const res = await fetch(`/api/permissions?role=${session.user.role}`);
  const data = await res.json();
  if (!data.success) {
    console.error('Failed to fetch permissions:', data.error);
  }
} catch (error) {
  console.error('Error fetching permissions:', error);
}
```

### Issue 3: Permission Check Not Working in API Route
**Cause**: Permissions not fetched from database
**Solution**: Always fetch permissions in API routes
```javascript
import RolePermission from '@/models/RolePermission';

const permissions = await RolePermission.findOne({ 
  role: session.user.role.toLowerCase() 
});
```

### Issue 4: Menu Items Not Showing
**Cause**: `sidebarMenuItems` not configured
**Solution**: Configure sidebar menu items in admin UI for each role

### Issue 5: Backward Compatibility Broken
**Cause**: Removed old permission checks too quickly
**Solution**: Keep both old and new checks temporarily
```javascript
// Temporary during migration
const canCreate = 
  canCreateSRD(session, permissions) || 
  session?.user?.role === 'admin' || 
  session?.user?.role === 'vmd';
```

## Support and Questions

If you encounter issues during migration:

1. Check the console for errors
2. Verify permissions are configured in admin UI
3. Check API responses in network tab
4. Review the Quick Reference Guide
5. Test with admin role first (should always work)

## Timeline Recommendation

### Week 1: Setup and Admin Configuration
- Update database model ✅ (Done)
- Update admin UI ✅ (Done)
- Configure permissions for all roles via admin UI

### Week 2: API Routes Migration
- Add permission checks to all API endpoints
- Test API endpoints with different roles
- Verify 403 responses for denied permissions

### Week 3: Component Migration
- Update components to use permission checks
- Update sidebar/navigation
- Test UI with different roles

### Week 4: Testing and Refinement
- Comprehensive testing with all roles
- Fix any issues found
- Update documentation
- Train users on new permission system

## Success Criteria

Migration is complete when:
- ✅ All API routes have permission checks
- ✅ All protected pages have permission checks
- ✅ Sidebar shows only allowed menu items
- ✅ All roles have permissions configured
- ✅ Tests pass for all roles
- ✅ No hardcoded role checks remain (except admin special case)
- ✅ Documentation is updated
- ✅ Team is trained on new system
