# Permissions System - Quick Reference Guide

## All Available Permissions

### Sample Process Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can View All Samples | `canViewAll` | User can see all samples regardless of stage |
| Can Receive Any Stage | `canReceiveAnyStage` | User can receive samples for any department (admin override) |
| Can Complete Any Stage | `canCompleteAnyStage` | Can complete any stage (legacy - admin override) |
| Allowed Stages | `stages` | Array of stage IDs user can receive samples for |

### SRD Management Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can Create SRD | `canCreateSRD` | Can create new Sample Request Documents |
| Can Edit SRD | `canEditSRD` | Can edit SRD details |
| Can Delete SRD | `canDeleteSRD` | Can delete SRDs |
| Can View All SRDs | `canViewAllSRDs` | Can view all SRDs (not just own department) |

### Admin Portal Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can Access Admin Portal | `canAccessAdminPortal` | Can access admin portal pages |
| Can Manage Users | `canManageUsers` | Can create, edit, and delete users |
| Can Manage Departments | `canManageDepartments` | Can manage department settings |
| Can Manage Permissions | `canManagePermissions` | Can modify role permissions |
| Can Manage SRD Fields | `canManageSRDFields` | Can configure SRD fields |
| Can Access Settings | `canAccessSettings` | Can access system settings |

### Reports & Data Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can View Reports | `canViewReports` | Can view reports section |
| Can Export Data | `canExportData` | Can export data and reports |

### Dispatch Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can View Dispatch | `canViewDispatch` | Can view dispatch details |
| Can Manage Dispatch | `canManageDispatch` | Can update dispatch information |

### Buyer Comments Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can View Buyer Comments | `canViewBuyerComments` | Can view buyer comments |
| Can Add Buyer Comments | `canAddBuyerComments` | Can add buyer comments |

### Sample Card Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can View Sample Card | `canViewSampleCard` | Can view sample cards |
| Can Edit Sample Card | `canEditSampleCard` | Can edit sample cards |

### Cost Sheet Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can View Cost Sheets | `canViewCostSheets` | Can view cost sheets |
| Can Edit Cost Sheets | `canEditCostSheets` | Can edit cost sheets |

### BOM Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can View BOM | `canViewBOM` | Can view Bill of Materials |
| Can Edit BOM | `canEditBOM` | Can edit Bill of Materials |

### Planning Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can View Planning | `canViewPlanning` | Can view planning section |
| Can Edit Planning | `canEditPlanning` | Can edit planning |

### Order Confirmation Permissions
| Permission | Key | Description |
|------------|-----|-------------|
| Can View Order Confirmation | `canViewOrderConfirmation` | Can view order confirmation |
| Can Edit Order Confirmation | `canEditOrderConfirmation` | Can edit order confirmation |

## Sidebar Menu Items

| Menu Item ID | Display Name |
|--------------|--------------|
| `home` | Home |
| `order-confirmation` | Order Confirmation |
| `samples-management` | Samples Management |
| `create-srd` | Create SRD |
| `sample-request` | Sample Request |
| `sample-process` | Sample Process |
| `sample-card` | Sample Card |
| `dispatch` | Dispatch Detail |
| `reports` | Reports |
| `buyer-comment` | Buyer Comment |
| `cost-sheets` | Cost Sheets |
| `bom` | BOM |
| `planning` | Planning |
| `all-srds` | All SRDs |
| `srd-fields` | SRD Fields |
| `users` | Users |
| `permissions` | Permissions |
| `settings` | Settings |

## Quick Code Examples

### 1. Check Permission in Component

```javascript
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { canCreateSRD } from '@/lib/permissions';

export default function MyComponent() {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState(null);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      const res = await fetch(`/api/permissions?role=${session.user.role}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setPermissions(data.data[0]);
        setCanCreate(canCreateSRD(session, data.data[0]));
      }
    };
    
    if (session?.user?.role) {
      fetchPermissions();
    }
  }, [session]);

  return (
    <div>
      {canCreate && (
        <button>Create SRD</button>
      )}
    </div>
  );
}
```

### 2. Check Permission in API Route

```javascript
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { canEditSRD } from '@/lib/permissions';
import RolePermission from '@/models/RolePermission';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
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
  return NextResponse.json({ success: true });
}
```

### 3. Conditional Rendering Based on Multiple Permissions

```javascript
import { 
  canViewReports, 
  canExportData,
  canAccessAdminPortal 
} from '@/lib/permissions';

export default function Dashboard({ session, permissions }) {
  return (
    <div>
      {canViewReports(session, permissions) && (
        <section>
          <h2>Reports</h2>
          {canExportData(session, permissions) && (
            <button>Export Data</button>
          )}
        </section>
      )}
      
      {canAccessAdminPortal(session, permissions) && (
        <section>
          <h2>Admin Tools</h2>
          {/* Admin content */}
        </section>
      )}
    </div>
  );
}
```

### 4. Check Menu Item Visibility

```javascript
import { canViewMenuItem, getAllowedMenuItems } from '@/lib/permissions';

export default function Sidebar({ session, permissions }) {
  const allowedItems = getAllowedMenuItems(session, permissions);
  
  const menuItems = [
    { id: 'home', name: 'Home', href: '/home' },
    { id: 'reports', name: 'Reports', href: '/reports' },
    { id: 'users', name: 'Users', href: '/users' },
  ];
  
  return (
    <nav>
      {menuItems.map(item => (
        allowedItems.includes(item.id) && (
          <a key={item.id} href={item.href}>
            {item.name}
          </a>
        )
      ))}
    </nav>
  );
}
```

### 5. Generic Permission Check

```javascript
import { hasPermission } from '@/lib/permissions';

export default function FeatureComponent({ session, permissions }) {
  const canDoSomething = hasPermission(session, permissions, 'canEditBOM');
  
  return (
    <div>
      {canDoSomething ? (
        <button>Edit BOM</button>
      ) : (
        <p>You don't have permission to edit BOM</p>
      )}
    </div>
  );
}
```

## Common Patterns

### Pattern 1: Fetch and Store Permissions in Layout

```javascript
// In your layout component
export default function Layout({ children }) {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      const res = await fetch(`/api/permissions?role=${session.user.role}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setPermissions(data.data[0]);
      }
    };
    
    if (session?.user?.role) {
      fetchPermissions();
    }
  }, [session]);

  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}
```

### Pattern 2: Create a Custom Hook

```javascript
// hooks/usePermissions.js
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export function usePermissions() {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await fetch(`/api/permissions?role=${session.user.role}`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setPermissions(data.data[0]);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (session?.user?.role) {
      fetchPermissions();
    } else {
      setLoading(false);
    }
  }, [session]);

  return { permissions, loading, session };
}

// Usage in component
import { usePermissions } from '@/hooks/usePermissions';
import { canCreateSRD } from '@/lib/permissions';

export default function MyComponent() {
  const { permissions, loading, session } = usePermissions();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {canCreateSRD(session, permissions) && (
        <button>Create SRD</button>
      )}
    </div>
  );
}
```

### Pattern 3: Protected Route Component

```javascript
// components/ProtectedRoute.js
import { usePermissions } from '@/hooks/usePermissions';
import { hasPermission } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ 
  children, 
  requiredPermission,
  fallback = null 
}) {
  const { permissions, loading, session } = usePermissions();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !hasPermission(session, permissions, requiredPermission)) {
      router.push('/unauthorized');
    }
  }, [loading, session, permissions, requiredPermission, router]);
  
  if (loading) return <div>Loading...</div>;
  
  if (!hasPermission(session, permissions, requiredPermission)) {
    return fallback;
  }
  
  return children;
}

// Usage
<ProtectedRoute requiredPermission="canManageUsers">
  <UserManagementPage />
</ProtectedRoute>
```

## API Endpoints

### Get All Permissions
```
GET /api/permissions
```

### Get Permissions by Role
```
GET /api/permissions?role=vmd
```

### Create Permission
```
POST /api/permissions
Body: {
  role: "pattern",
  displayName: "Pattern Department",
  permissions: { ... },
  sidebarMenuItems: [...],
  isActive: true
}
```

### Update Permission
```
PATCH /api/permissions/[id]
Body: { permissions: { canCreateSRD: true } }
```

### Delete Permission
```
DELETE /api/permissions/[id]
```

## Tips & Best Practices

1. **Always check permissions on both frontend and backend**
   - Frontend checks improve UX (hide unavailable features)
   - Backend checks enforce security (prevent unauthorized access)

2. **Admin role is special**
   - Admin always has all permissions (hardcoded)
   - No need to set individual permissions for admin

3. **Use helper functions**
   - Don't check `permissions.permissions.canCreateSRD` directly
   - Use `canCreateSRD(session, permissions)` instead
   - Handles admin role and null checks automatically

4. **Cache permissions**
   - Fetch once and store in context or state
   - Don't fetch on every component render

5. **Handle loading states**
   - Show loading indicator while fetching permissions
   - Don't render protected content until permissions are loaded

6. **Provide fallbacks**
   - Show appropriate message when permission is denied
   - Redirect to appropriate page if needed

7. **Test thoroughly**
   - Test with different roles
   - Test permission denial scenarios
   - Test admin role behavior
