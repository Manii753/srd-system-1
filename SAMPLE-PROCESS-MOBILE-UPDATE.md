# Sample Process Page - Mobile & Permission Updates

## Summary
Updating the sample-process page to:
1. Use user-based permissions instead of role-based
2. Add mobile-responsive interface
3. Make it accessible to production stage users

## Changes Made

### 1. Permission System Update
- **REMOVED**: Role-based `ROLE_PERMISSIONS` object
- **ADDED**: User-based permission fetching from user object
- **NEW**: `fetchUserData()` - Fetches user with permissions from API
- **UPDATED**: `getUserPermissions()` - Now reads from `user.permissions` instead of hardcoded roles
- Admin role still has all permissions (hardcoded)

### 2. Mobile Interface
- **ADDED**: Mobile detection with `isMobile` state
- **ADDED**: Responsive mobile list view with cards
- **ADDED**: Mobile detail view with stacked layout
- **ADDED**: Touch-friendly buttons and spacing
- **ADDED**: Progress indicators with colored bars

### 3. Mobile UI Features
**List View (Mobile)**:
- Card-based layout instead of table
- Large touch-friendly tap areas
- Status badges (Complete/In Progress/Pending)
- Visual progress bar showing all stages
- Displays: Ref No, Date, Brand, Status

**Detail View (Mobile)**:
- Back button at top
- SR details card with key info
- Individual stage cards with status badges
- Full-width "Receive Sample" buttons
- Collapsible stage information
- Time tracking per stage

### 4. Desktop Interface
- Kept existing Excel-style table layout
- No changes to desktop functionality
- Responsive breakpoint at 768px

## API Integration

The page now fetches full user object:
```javascript
const fetchUserData = async () => {
  const res = await fetch(`/api/users?email=${session.user.email}`);
  const data = await res.json();
  if (data.success && data.data.length > 0) {
    setUser(data.data[0]); // Includes permissions
  }
};
```

## Permission Checks

User can see SRDs where:
- `canViewAll` permission is true (admin, VMD), OR
- Any of their assigned stages (`permissions.stages`) is pending/in-progress

## Production Stage Access

To enable production stage users:
1. Open UserPermissionsModal for the production stage user
2. Enable these permissions:
   - `canViewAll` OR
   - Add their stage to `stages` array (e.g., ['cutting'], ['sewing'], ['washing'], ['finishing'])
3. Add 'sample-process' to their `sidebarMenuItems`

## Next Steps

### File Status
⚠️ **INCOMPLETE**: The file `src/app/sample-management/sample-process/page.js` is incomplete due to disk write error. The desktop detail view and list view code is missing.

### To Complete:
1. Add desktop detail view (Excel-style table - copy from original)
2. Add desktop list view (table with all SRDs - copy from original)
3. Test mobile interface on actual mobile device
4. Update DynamicSidebar to show "SR Progress" for production stage users
5. Create sample permission presets for production stages

## File Structure
```
src/app/sample-management/sample-process/page.js
├── Imports & Config
├── State Management (mobile detection added)
├── Data Fetching (fetchUserData added)
├── Permission Functions (user-based)
├── Helper Functions (calculateStageTime, etc.)
├── Action Handlers
├── Loading State
├── Mobile Detail View ✓
├── Desktop Detail View ❌ (missing)
├── Mobile List View ❌ (missing) 
└── Desktop List View ❌ (missing)
```

## Testing Checklist
- [ ] Admin can view all samples
- [ ] VMD can view all samples  
- [ ] Production stage users see only their samples
- [ ] Mobile list view shows correctly
- [ ] Mobile detail view shows correctly
- [ ] Desktop views work unchanged
- [ ] Receive button only shows for user's own stage
- [ ] Permission checks work correctly
