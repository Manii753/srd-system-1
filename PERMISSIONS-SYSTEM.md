# Role-Based Permissions Management System

## Overview
A comprehensive permissions management system that allows administrators to control sample process permissions for each role through the admin portal.

## Features

### 1. **Database-Driven Permissions**
- Permissions are stored in MongoDB instead of being hardcoded
- Can be modified in real-time without code changes
- Supports dynamic role creation

### 2. **Admin Portal Management**
- Full CRUD operations for role permissions
- Visual interface to grant/revoke permissions
- Real-time updates across the system

### 3. **Granular Permission Control**
Each role can have the following permissions:

#### **Sample Process Permissions**
- **Can View All**: User can see all samples regardless of stage
- **Can Receive Any Stage**: User can receive samples for any department (admin override)
- **Can Complete Any Stage**: User can manually complete any stage (legacy)
- **Allowed Stages**: Specific stages this role can receive samples for

#### **SRD Management Permissions**
- **Can Create SRD**: Can create new Sample Request Documents
- **Can Edit SRD**: Can edit SRD details
- **Can Delete SRD**: Can delete SRDs
- **Can View All SRDs**: Can view all SRDs (not just own department)

#### **Admin Portal Permissions**
- **Can Access Admin Portal**: Can access admin portal pages
- **Can Manage Users**: Can create, edit, and delete users
- **Can Manage Departments**: Can manage department settings
- **Can Manage Permissions**: Can modify role permissions
- **Can Manage SRD Fields**: Can configure SRD fields
- **Can Access Settings**: Can access system settings

#### **Reports & Data Permissions**
- **Can View Reports**: Can view reports section
- **Can Export Data**: Can export data and reports

#### **Dispatch Permissions**
- **Can View Dispatch**: Can view dispatch details
- **Can Manage Dispatch**: Can update dispatch information

#### **Buyer Comments Permissions**
- **Can View Buyer Comments**: Can view buyer comments
- **Can Add Buyer Comments**: Can add buyer comments

#### **Sample Card Permissions**
- **Can View Sample Card**: Can view sample cards
- **Can Edit Sample Card**: Can edit sample cards

#### **Cost Sheet Permissions**
- **Can View Cost Sheets**: Can view cost sheets
- **Can Edit Cost Sheets**: Can edit cost sheets

#### **BOM Permissions**
- **Can View BOM**: Can view Bill of Materials
- **Can Edit BOM**: Can edit Bill of Materials

#### **Planning Permissions**
- **Can View Planning**: Can view planning section
- **Can Edit Planning**: Can edit planning

#### **Order Confirmation Permissions**
- **Can View Order Confirmation**: Can view order confirmation
- **Can Edit Order Confirmation**: Can edit order confirmation

#### **Sidebar Menu Configuration**
- **Sidebar Menu Items**: Array of menu items to show in sidebar for this role

## File Structure

```
src/
├── models/
│   └── RolePermission.js              # Database model for permissions
├── app/
│   ├── api/
│   │   └── permissions/
│   │       ├── route.js               # GET all, POST new permission
│   │       └── [id]/
│   │           └── route.js           # PATCH, DELETE permission
│   ├── permissions/
│   │   └── page.jsx                   # Admin UI for managing permissions
│   └── sample-management/
│       └── sample-process/
│           └── page.js                # Updated to fetch permissions from DB
├── components/
│   └── layout/
│       └── DynamicSidebar.js          # Added Permissions link
└── scripts/
    └── seed-permissions.js            # Script to initialize default permissions
```

## Database Schema

### RolePermission Model
```javascript
{
  role: String,              // Unique role identifier (lowercase)
  displayName: String,       // Human-readable name
  permissions: {
    // Sample Process Permissions
    canViewAll: Boolean,     // Can see all samples
    canCompleteAnyStage: Boolean,  // Can complete any stage (legacy)
    canReceiveAnyStage: Boolean,   // Can receive for any department
    stages: [String],        // Array of stage IDs user can receive for
    
    // SRD Management Permissions
    canCreateSRD: Boolean,   // Can create new SRDs
    canEditSRD: Boolean,     // Can edit SRD details
    canDeleteSRD: Boolean,   // Can delete SRDs
    canViewAllSRDs: Boolean, // Can view all SRDs
    
    // Admin Portal Permissions
    canAccessAdminPortal: Boolean,    // Can access admin portal
    canManageUsers: Boolean,          // Can manage users
    canManageDepartments: Boolean,    // Can manage departments
    canManagePermissions: Boolean,    // Can modify permissions
    canManageSRDFields: Boolean,      // Can configure SRD fields
    canAccessSettings: Boolean,       // Can access settings
    
    // Reports & Data Permissions
    canViewReports: Boolean,          // Can view reports
    canExportData: Boolean,           // Can export data
    
    // Dispatch Permissions
    canViewDispatch: Boolean,         // Can view dispatch
    canManageDispatch: Boolean,       // Can manage dispatch
    
    // Buyer Comments Permissions
    canViewBuyerComments: Boolean,    // Can view buyer comments
    canAddBuyerComments: Boolean,     // Can add buyer comments
    
    // Sample Card Permissions
    canViewSampleCard: Boolean,       // Can view sample cards
    canEditSampleCard: Boolean,       // Can edit sample cards
    
    // Cost Sheet Permissions
    canViewCostSheets: Boolean,       // Can view cost sheets
    canEditCostSheets: Boolean,       // Can edit cost sheets
    
    // BOM Permissions
    canViewBOM: Boolean,              // Can view BOM
    canEditBOM: Boolean,              // Can edit BOM
    
    // Planning Permissions
    canViewPlanning: Boolean,         // Can view planning
    canEditPlanning: Boolean,         // Can edit planning
    
    // Order Confirmation Permissions
    canViewOrderConfirmation: Boolean, // Can view order confirmation
    canEditOrderConfirmation: Boolean  // Can edit order confirmation
  },
  sidebarMenuItems: [String], // Menu items to show in sidebar
  isActive: Boolean,         // Enable/disable role
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### GET /api/permissions
Fetch all role permissions
- **Auth**: Required (any authenticated user)
- **Returns**: Array of all role permissions

### POST /api/permissions
Create new role permission
- **Auth**: Admin only
- **Body**: `{ role, displayName, permissions }`
- **Returns**: Created permission object

### PATCH /api/permissions/[id]
Update existing permission
- **Auth**: Admin only
- **Body**: Any permission fields to update
- **Returns**: Updated permission object

### DELETE /api/permissions/[id]
Delete role permission
- **Auth**: Admin only
- **Returns**: Success message

## Usage

### 1. Initialize Default Permissions
Run the seed script to create default permissions:

```bash
node src/scripts/seed-permissions.js
```

This creates permissions for:
- Admin (view all, all stages)
- VMD (view all, VMD stage only)
- Pattern (pattern stage only)
- Sewing (sewing stage only)
- Washing (washing stage only)
- Finishing (finishing stage only)
- Cutting (no stages - example role)

### 2. Access Permissions Management
1. Log in as admin
2. Navigate to **Permissions** from the sidebar
3. View all existing role permissions

### 3. Create New Role Permission
1. Click **"Add Role Permission"**
2. Fill in:
   - **Role Slug**: Lowercase identifier (e.g., "cutting")
   - **Display Name**: Human-readable name (e.g., "Cutting Department")
   - **Can View All**: Check if role should see all samples
   - **Can Receive Any Stage**: Check for admin override
   - **Allowed Stages**: Select which stages this role can receive for
   - **Active**: Enable/disable the role
3. Click **"Create Permission"**

### 4. Edit Existing Permission
1. Click the **Edit** button on any role
2. Modify permissions as needed
3. Click **"Update Permission"**

### 5. Delete Permission
1. Click the **Delete** button on any role
2. Confirm deletion

## Permission Logic

### Sample Process Page Behavior

#### **View Access**
- If `canViewAll = true`: User sees all samples
- If `canViewAll = false`: User only sees samples where their stage is pending

#### **Receive Button**
- Shows only if:
  - Previous stage is completed
  - Current stage hasn't been received yet
  - User's role is in the `stages` array for that stage
  - OR user has `canReceiveAnyStage = true`

#### **Auto-Complete**
- When a user clicks "Receive" on a stage:
  - Previous stage is automatically marked as completed
  - Current stage is marked as received
  - User who received is recorded

### Backend Validation
The API (`/api/srd/[id]/sample-process`) validates:
- User can only receive for stages in their `stages` array
- Even admin/VMD cannot receive for other departments (unless `canReceiveAnyStage = true`)
- Previous stage must be completed before receiving

## Default Permissions

### Admin
- ✅ View All Samples
- ✅ Complete Any Stage (legacy)
- ❌ Receive Any Stage
- 📋 Stages: pattern, sewing, washing, finishing, vmd

### VMD
- ✅ View All Samples
- ✅ Complete Any Stage (legacy)
- ❌ Receive Any Stage
- 📋 Stages: vmd only

### Department Roles (Pattern, Sewing, Washing, Finishing)
- ❌ View All Samples (only see their pending samples)
- ❌ Complete Any Stage
- ❌ Receive Any Stage
- 📋 Stages: Their own stage only

## Benefits

### For Administrators
- ✅ No code changes needed to modify permissions
- ✅ Real-time permission updates
- ✅ Easy to add new roles
- ✅ Visual interface for permission management
- ✅ Audit trail of permission changes

### For Developers
- ✅ Centralized permission logic
- ✅ Database-driven configuration
- ✅ Easy to extend with new permission types
- ✅ Fallback to hardcoded permissions if DB unavailable

### For Users
- ✅ Clear visibility of what they can do
- ✅ Consistent permission enforcement
- ✅ Role-based access control

## Future Enhancements

Potential additions:
1. **Permission History**: Track who changed permissions and when
2. **Role Groups**: Group multiple roles together
3. **Time-Based Permissions**: Temporary permission grants
4. **Custom Permissions**: Add custom permission flags
5. **Permission Templates**: Pre-defined permission sets
6. **Bulk Operations**: Update multiple roles at once

## Troubleshooting

### Permissions Not Working
1. Check if permissions are seeded: Visit `/permissions` page
2. Verify user role matches a permission role
3. Check browser console for API errors
4. Verify MongoDB connection

### User Can't See Samples
1. Check `canViewAll` permission
2. Verify samples have correct stage status
3. Check user's `stages` array includes relevant stages

### Can't Receive Samples
1. Verify previous stage is completed
2. Check user's role is in `stages` array for that stage
3. Ensure current stage hasn't been received yet

## Security Considerations

- ✅ All API endpoints require authentication
- ✅ Only admins can modify permissions
- ✅ Backend validates all permission checks
- ✅ Frontend permissions are for UX only (backend enforces)
- ✅ Role slugs are case-insensitive

## Migration from Hardcoded Permissions

The system maintains backward compatibility:
1. If DB permissions exist, they are used
2. If DB permissions don't exist, hardcoded `ROLE_PERMISSIONS` are used
3. Run seed script to migrate to DB permissions
4. Hardcoded permissions can be removed after migration

## Summary

This permissions system provides a flexible, database-driven approach to managing role-based access control for the sample process workflow. Administrators can easily grant or revoke permissions through a visual interface without requiring code changes or deployments.
