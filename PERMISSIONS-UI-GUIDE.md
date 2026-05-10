# Permissions System - UI Guide

## User Management Page (`/users`)

### Main Features

1. **User List Table**
   - Shows all users with their details
   - Columns: User (name + email), Role, Department, Status, Created Date, Actions

2. **Action Buttons** (per user)
   - 🔑 **Key Icon** - Manage Permissions (NEW!)
   - 👤 **User Icon** - Activate/Deactivate user
   - ✏️ **Edit Icon** - Edit user details
   - 🗑️ **Trash Icon** - Delete user

### How to Manage User Permissions

#### Step 1: Navigate to Users Page
- Log in as admin
- Go to `/users` or click "Users" in the sidebar

#### Step 2: Open Permissions Modal
- Find the user you want to manage
- Click the **🔑 Key icon** in the Actions column
- Permissions modal opens

#### Step 3: Configure Permissions
The modal has three main sections:

##### Section 1: Permissions (Organized by Category)
Check/uncheck permissions as needed:

**Sample Process Permissions**
- [ ] Can View All Samples
- [ ] Can Receive Any Stage
- [ ] Can Complete Any Stage

**SRD Management Permissions**
- [ ] Can Create SRD
- [ ] Can Edit SRD
- [ ] Can Delete SRD
- [ ] Can View All SRDs

**Admin Portal Permissions**
- [ ] Can Access Admin Portal
- [ ] Can Manage Users
- [ ] Can Manage Departments
- [ ] Can Manage Permissions
- [ ] Can Manage SRD Fields
- [ ] Can Access Settings

**Reports & Data Permissions**
- [ ] Can View Reports
- [ ] Can Export Data

**Dispatch Permissions**
- [ ] Can View Dispatch
- [ ] Can Manage Dispatch

**Buyer Comments Permissions**
- [ ] Can View Buyer Comments
- [ ] Can Add Buyer Comments

**Sample Card Permissions**
- [ ] Can View Sample Card
- [ ] Can Edit Sample Card

**Cost Sheet Permissions**
- [ ] Can View Cost Sheets
- [ ] Can Edit Cost Sheets

**BOM Permissions**
- [ ] Can View BOM
- [ ] Can Edit BOM

**Planning Permissions**
- [ ] Can View Planning
- [ ] Can Edit Planning

**Order Confirmation Permissions**
- [ ] Can View Order Confirmation
- [ ] Can Edit Order Confirmation

##### Section 2: Allowed Stages to Receive
Select which stages this user can receive samples for:
- [ ] Pattern
- [ ] Sewing
- [ ] Washing
- [ ] Finishing
- [ ] VMD

##### Section 3: Sidebar Menu Items
Select which menu items appear in the user's sidebar:
- [ ] Home
- [ ] Order Confirmation
- [ ] Samples Management
- [ ] Create SRD
- [ ] Sample Request
- [ ] Sample Process
- [ ] Sample Card
- [ ] Dispatch Detail
- [ ] Reports
- [ ] Buyer Comment
- [ ] Cost Sheets
- [ ] BOM
- [ ] Planning
- [ ] All SRDs
- [ ] SRD Fields
- [ ] Users
- [ ] Permissions
- [ ] Settings

#### Step 4: Save Changes
- Review your selections
- Click **"Save Permissions"** button
- Success message appears
- Modal closes
- User's permissions are updated immediately

## Common Permission Configurations

### Configuration 1: Basic Department User
**Use Case**: Pattern department worker who only needs to work on their samples

**Permissions to Enable**:
- ✅ Can View Sample Card
- ✅ Stages: Pattern

**Sidebar Menu Items**:
- ✅ Home
- ✅ Sample Process
- ✅ Sample Card

### Configuration 2: Department Manager
**Use Case**: VMD manager who oversees the entire sample process

**Permissions to Enable**:
- ✅ Can View All Samples
- ✅ Can Create SRD
- ✅ Can Edit SRD
- ✅ Can View All SRDs
- ✅ Can View Reports
- ✅ Can Export Data
- ✅ Can View Dispatch
- ✅ Can Manage Dispatch
- ✅ Can View Buyer Comments
- ✅ Can Add Buyer Comments
- ✅ Can View Sample Card
- ✅ Can Edit Sample Card
- ✅ Can View Order Confirmation
- ✅ Can Edit Order Confirmation
- ✅ Stages: VMD

**Sidebar Menu Items**:
- ✅ Home
- ✅ Order Confirmation
- ✅ Samples Management
- ✅ Create SRD
- ✅ Sample Request
- ✅ Sample Process
- ✅ Sample Card
- ✅ Dispatch Detail
- ✅ Reports
- ✅ Buyer Comment
- ✅ Cost Sheets
- ✅ BOM
- ✅ Planning

### Configuration 3: Reports Analyst
**Use Case**: User who only needs to view and export reports

**Permissions to Enable**:
- ✅ Can View All Samples
- ✅ Can View All SRDs
- ✅ Can View Reports
- ✅ Can Export Data
- ✅ Can View Sample Card
- ✅ Can View Dispatch
- ✅ Can View Buyer Comments
- ✅ Can View Cost Sheets
- ✅ Can View BOM
- ✅ Can View Planning

**Sidebar Menu Items**:
- ✅ Home
- ✅ Sample Request
- ✅ Sample Process
- ✅ Sample Card
- ✅ Dispatch Detail
- ✅ Reports
- ✅ Buyer Comment

### Configuration 4: User Manager
**Use Case**: HR or admin assistant who manages users but not other settings

**Permissions to Enable**:
- ✅ Can Access Admin Portal
- ✅ Can Manage Users

**Sidebar Menu Items**:
- ✅ Home
- ✅ Users

### Configuration 5: Full Access (Non-Admin)
**Use Case**: Senior manager who needs access to everything except system settings

**Permissions to Enable**:
- ✅ Can View All Samples
- ✅ Can Receive Any Stage
- ✅ Can Create SRD
- ✅ Can Edit SRD
- ✅ Can Delete SRD
- ✅ Can View All SRDs
- ✅ Can Access Admin Portal
- ✅ Can Manage Users
- ✅ Can Manage Departments
- ✅ Can Manage SRD Fields
- ✅ Can View Reports
- ✅ Can Export Data
- ✅ Can View Dispatch
- ✅ Can Manage Dispatch
- ✅ Can View Buyer Comments
- ✅ Can Add Buyer Comments
- ✅ Can View Sample Card
- ✅ Can Edit Sample Card
- ✅ Can View Cost Sheets
- ✅ Can Edit Cost Sheets
- ✅ Can View BOM
- ✅ Can Edit BOM
- ✅ Can View Planning
- ✅ Can Edit Planning
- ✅ Can View Order Confirmation
- ✅ Can Edit Order Confirmation
- ✅ Stages: All

**Sidebar Menu Items**:
- ✅ All except Settings and Permissions

## Tips for Managing Permissions

### 1. **Start with Minimal Permissions**
- Grant only what the user needs
- Add more permissions as needed
- Easier to add than remove

### 2. **Use Consistent Patterns**
- Create standard configurations for common roles
- Document your permission patterns
- Makes management easier

### 3. **Review Regularly**
- Periodically review user permissions
- Remove permissions that are no longer needed
- Update as roles change

### 4. **Test Before Deploying**
- Test permission configurations with test users
- Verify both UI and functionality
- Check that denied permissions work correctly

### 5. **Document Custom Configurations**
- Keep notes on why specific users have unique permissions
- Helps with audits and reviews
- Makes handoffs easier

## Permission Hierarchy

### Level 1: No Access (Default)
- All permissions unchecked
- No sidebar menu items
- User can only log in

### Level 2: View Only
- Can view specific sections
- No edit or create permissions
- Limited sidebar items

### Level 3: Department User
- Can view and edit within their department
- Can receive samples for their stage
- Department-specific sidebar items

### Level 4: Department Manager
- All department permissions
- Plus: View reports, export data
- Plus: View all SRDs
- Extended sidebar access

### Level 5: Power User
- Most permissions enabled
- Can manage multiple areas
- Full sidebar access (except admin)

### Level 6: Admin
- All permissions automatically
- Full sidebar access
- Cannot be restricted

## Visual Indicators

### In the Permissions Modal

**Checked Checkbox** ✅
- Permission is granted
- User can perform this action

**Unchecked Checkbox** ☐
- Permission is denied
- User cannot perform this action

**Permission Description**
- Gray text below each permission
- Explains what the permission allows

### In the User Table

**Key Icon** 🔑
- Blue color
- Click to manage permissions
- Available for all users

**Active Badge**
- Green background
- User account is active

**Inactive Badge**
- Red background
- User account is disabled

## Keyboard Shortcuts

While in the Permissions Modal:
- **Tab** - Navigate between checkboxes
- **Space** - Toggle checkbox
- **Esc** - Close modal (same as Cancel)
- **Enter** - Submit form (when focused on Save button)

## Mobile Responsiveness

The permissions modal is fully responsive:
- **Desktop**: 2-column layout for permissions
- **Tablet**: 2-column layout (slightly narrower)
- **Mobile**: 1-column layout, full-width checkboxes

## Accessibility Features

- ✅ Keyboard navigation support
- ✅ Screen reader friendly labels
- ✅ Clear visual indicators
- ✅ Logical tab order
- ✅ Descriptive button labels
- ✅ High contrast colors

## Common Questions

### Q: Can I copy permissions from one user to another?
**A**: Not yet, but you can:
1. Open permissions for User A
2. Take note of enabled permissions
3. Open permissions for User B
4. Enable the same permissions

### Q: What happens if I don't select any sidebar menu items?
**A**: The user will only see the logout button in the sidebar.

### Q: Can a user have permissions but not see the menu item?
**A**: Yes! Permissions and sidebar items are independent. Best practice is to enable both.

### Q: How do I give someone "read-only" access?
**A**: Enable only "View" permissions (e.g., Can View Reports, Can View Sample Card) and don't enable any "Edit", "Create", or "Manage" permissions.

### Q: Can I restrict admin users?
**A**: No, admin role always has all permissions. This is hardcoded for security.

### Q: Do permission changes take effect immediately?
**A**: Yes! Users will see changes on their next page load or action.

## Troubleshooting

### User says they can't see a feature

1. **Check if user is active**
   - Look for green "Active" badge
   - If inactive, click user icon to activate

2. **Check permissions**
   - Click key icon for the user
   - Verify the relevant permission is checked
   - Example: To create SRDs, "Can Create SRD" must be checked

3. **Check sidebar menu items**
   - Verify the menu item is selected
   - Example: To see Reports, "Reports" must be checked in sidebar items

4. **Check user role**
   - Some features may have additional role requirements
   - Verify user has the correct role assigned

### Permission modal won't open

1. **Check browser console** for errors
2. **Refresh the page** and try again
3. **Verify you're logged in as admin**
4. **Check network tab** for API errors

### Changes not saving

1. **Check for error messages** (red toast notifications)
2. **Verify API is responding** (check network tab)
3. **Try refreshing** and making changes again
4. **Check browser console** for JavaScript errors

## Best Practices Summary

1. ✅ Grant minimal permissions needed
2. ✅ Enable corresponding sidebar menu items
3. ✅ Test with the actual user account
4. ✅ Document custom configurations
5. ✅ Review permissions regularly
6. ✅ Use consistent patterns for similar roles
7. ✅ Keep admin accounts secure
8. ✅ Disable inactive users
9. ✅ Train users on what they can do
10. ✅ Monitor for permission-related issues
