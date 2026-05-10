/**
 * Permission Utility Functions
 * 
 * This file provides helper functions to check user permissions
 * throughout the application. Permissions are stored directly on
 * the user object, not on roles.
 */

/**
 * Check if user has a specific permission
 * @param {Object} user - User object with permissions
 * @param {String} permissionKey - The permission key to check
 * @returns {Boolean}
 */
export function hasPermission(user, permissionKey) {
  if (!user) return false;
  
  // Admin always has all permissions
  if (user.role === 'admin') return true;
  
  return user.permissions?.[permissionKey] === true;
}

/**
 * Check if user can access admin portal
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canAccessAdminPortal(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canAccessAdminPortal === true;
}

/**
 * Check if user can create SRD
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canCreateSRD(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canCreateSRD === true;
}

/**
 * Check if user can edit SRD
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canEditSRD(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canEditSRD === true;
}

/**
 * Check if user can delete SRD
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canDeleteSRD(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canDeleteSRD === true;
}

/**
 * Check if user can view all SRDs
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canViewAllSRDs(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canViewAllSRDs === true;
}

/**
 * Check if user can manage users
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canManageUsers(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canManageUsers === true;
}

/**
 * Check if user can manage permissions
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canManagePermissions(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canManagePermissions === true;
}

/**
 * Check if user can view reports
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canViewReports(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canViewReports === true;
}

/**
 * Check if user can export data
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canExportData(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canExportData === true;
}

/**
 * Check if user can view dispatch
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canViewDispatch(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canViewDispatch === true;
}

/**
 * Check if user can manage dispatch
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canManageDispatch(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canManageDispatch === true;
}

/**
 * Check if user can view buyer comments
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canViewBuyerComments(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canViewBuyerComments === true;
}

/**
 * Check if user can add buyer comments
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canAddBuyerComments(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canAddBuyerComments === true;
}

/**
 * Check if user can view sample card
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canViewSampleCard(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canViewSampleCard === true;
}

/**
 * Check if user can edit sample card
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canEditSampleCard(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canEditSampleCard === true;
}

/**
 * Check if user can view cost sheets
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canViewCostSheets(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canViewCostSheets === true;
}

/**
 * Check if user can edit cost sheets
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canEditCostSheets(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canEditCostSheets === true;
}

/**
 * Check if user can view BOM
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canViewBOM(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canViewBOM === true;
}

/**
 * Check if user can edit BOM
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canEditBOM(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canEditBOM === true;
}

/**
 * Check if user can view planning
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canViewPlanning(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canViewPlanning === true;
}

/**
 * Check if user can edit planning
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canEditPlanning(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canEditPlanning === true;
}

/**
 * Check if user can view order confirmation
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canViewOrderConfirmation(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canViewOrderConfirmation === true;
}

/**
 * Check if user can edit order confirmation
 * @param {Object} user - User object with permissions
 * @returns {Boolean}
 */
export function canEditOrderConfirmation(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions?.canEditOrderConfirmation === true;
}

/**
 * Check if menu item should be visible for user
 * @param {Object} user - User object with permissions
 * @param {String} menuItemId - The menu item ID to check
 * @returns {Boolean}
 */
export function canViewMenuItem(user, menuItemId) {
  if (!user) return false;
  
  // Admin can see all menu items
  if (user.role === 'admin') return true;
  
  // Check if menu item is in the allowed list
  const allowedItems = user.sidebarMenuItems || [];
  return allowedItems.includes(menuItemId);
}

/**
 * Get all menu items that user can see
 * @param {Object} user - User object with permissions
 * @returns {Array} Array of menu item IDs
 */
export function getAllowedMenuItems(user) {
  if (!user) return [];
  
  // Admin can see all menu items
  if (user.role === 'admin') {
    return [
      'home',
      'order-confirmation',
      'samples-management',
      'create-srd',
      'sample-request',
      'sample-process',
      'sample-card',
      'dispatch',
      'reports',
      'buyer-comment',
      'cost-sheets',
      'bom',
      'planning',
      'all-srds',
      'srd-fields',
      'users',
      'permissions',
      'settings'
    ];
  }
  
  return user.sidebarMenuItems || [];
}
