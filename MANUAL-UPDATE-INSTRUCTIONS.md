# Manual Update Instructions

## ⚠️ IMPORTANT: Required Manual Update

The auto-approval logic in `DepartmentPanelExcel.js` needs manual updates to use the configurable settings from the database.

---

## Step-by-Step Instructions

### Step 1: Open the File
Open: `src/components/DepartmentPanelExcel.js`

### Step 2: Find the Auto-Approval Section
**Search for**: `Auto-approve departments at 80% fill`  
**Line**: Approximately line 426

---

## Changes to Make

### Change 1: Wrap in Global Enable Check

**Find this** (line ~426):
```javascript
        // Auto-approve departments at 80% fill
        // Use template cells to determine which fields/columns belong to each dept
        const savedFields = currentFields;
```

**Replace with**:
```javascript
        // Auto-approve departments based on configurable threshold
        // Check if auto-approval is globally enabled
        if (!autoApprovalSettings?.enabled) {
          console.log('[Auto-Approve] Auto-approval is globally disabled');
        } else {
          // Use template cells to determine which fields/columns belong to each dept
          const savedFields = currentFields;
```

---

### Change 2: Add Department Settings Check

**Find this** (line ~434):
```javascript
        for (const dept of ['vmd', 'cad', 'commercial', 'mmc']) {
          const currentStatus = (data.data?.status || []).find(s => s.department === dept)?.value;
          
          console.log(`[Auto-Approve] ${dept} current status:`, currentStatus);
          
          if (currentStatus === 'approved') {
            console.log(`[Auto-Approve] ${dept} already approved, skipping`);
            continue;
          }
```

**Replace with**:
```javascript
        for (const dept of ['vmd', 'cad', 'commercial', 'mmc']) {
          const currentStatus = (data.data?.status || []).find(s => s.department === dept)?.value;
          
          // Check if auto-approval is enabled for this specific department
          const deptSettings = autoApprovalSettings?.departments?.[dept] || { enabled: true, threshold: 80 };
          
          if (!deptSettings.enabled) {
            console.log(`[Auto-Approve] ${dept} auto-approval is disabled`);
            continue;
          }
          
          const threshold = deptSettings.threshold || autoApprovalSettings?.threshold || 80;
          console.log(`[Auto-Approve] ${dept} current status: ${currentStatus}, threshold: ${threshold}%`);
          
          if (currentStatus === 'approved') {
            console.log(`[Auto-Approve] ${dept} already approved, skipping`);
            continue;
          }
          
          // Threshold of 0 means auto-approval is disabled for this dept
          if (threshold === 0) {
            console.log(`[Auto-Approve] ${dept} threshold is 0%, auto-approval disabled`);
            continue;
          }
```

---

### Change 3: Add isRequired Check

**Find this** (line ~476):
```javascript
            // Skip optional fields and headings
            if (!fDef || fDef.isOptional || fDef.type === 'heading') {
              console.log(`[Auto-Approve] ${dept} skipping optional/heading field:`, fDef?.name);
              continue;
            }
            
            total++;
```

**Replace with**:
```javascript
            // Skip optional fields and headings
            if (!fDef || fDef.isOptional || fDef.type === 'heading') {
              console.log(`[Auto-Approve] ${dept} skipping optional/heading field:`, fDef?.name);
              continue;
            }
            
            // Only count if isRequired is true
            if (!fDef.isRequired) {
              console.log(`[Auto-Approve] ${dept} skipping non-required field:`, fDef?.name);
              continue;
            }
            
            total++;
```

---

### Change 4: Use Configured Threshold

**Find this** (line ~543):
```javascript
          if (total > 0 && filled / total >= 0.8) {
            console.log(`[Auto-Approve] ${dept} reached 80% threshold, auto-approving...`);
```

**Replace with**:
```javascript
          if (total > 0 && fillPercentage >= threshold) {
            console.log(`[Auto-Approve] ${dept} reached ${threshold}% threshold, auto-approving...`);
```

---

### Change 5: Update Else Log

**Find this** (line ~563):
```javascript
          } else {
            console.log(`[Auto-Approve] ${dept} below 80% threshold, not auto-approving`);
          }
        }
```

**Replace with**:
```javascript
          } else {
            console.log(`[Auto-Approve] ${dept} below ${threshold}% threshold (${fillPercentage.toFixed(1)}%), not auto-approving`);
          }
        }
      } // END of global enabled check
```

---

## Verification

After making all changes, verify:

1. **No syntax errors**: Check that all brackets are properly closed
2. **Indentation**: The `for` loop should be inside the `if (!autoApprovalSettings?.enabled) { } else {` block
3. **Save the file**

---

## Testing

### Test 1: Global Disabled
1. Go to `/settings/auto-approval`
2. Toggle "Enable Auto-Approval" to OFF
3. Save
4. Fill fields in an SRD and save
5. **Check console**: Should see `[Auto-Approve] Auto-approval is globally disabled`
6. **Result**: Status stays pending

### Test 2: Department Disabled
1. Enable global auto-approval
2. Disable VMD department
3. Save
4. Fill VMD fields and save
5. **Check console**: Should see `[Auto-Approve] vmd auto-approval is disabled`
6. **Result**: VMD status stays pending

### Test 3: Custom Threshold
1. Set VMD threshold to 100%
2. Save
3. Fill 9 out of 10 required VMD fields
4. Save
5. **Check console**: Should see `[Auto-Approve] vmd below 100% threshold (90.0%), not auto-approving`
6. **Result**: VMD status stays pending
7. Fill the last field and save
8. **Check console**: Should see `[Auto-Approve] vmd reached 100% threshold, auto-approving...`
9. **Result**: VMD status changes to approved

### Test 4: Required Fields Only
1. Ensure some fields have `isRequired: false`
2. Fill only those non-required fields
3. Save
4. **Check console**: Should see `[Auto-Approve] vmd skipping non-required field: [fieldname]`
5. **Result**: Those fields don't count toward percentage

---

## Troubleshooting

### Syntax Error After Changes
- Check that all brackets `{` have matching closing brackets `}`
- The `for` loop should be inside the `else` block
- Make sure to add the closing `}` for the global enabled check at the very end

### Auto-Approval Still Uses 80%
- Make sure you replaced the `0.8` with `threshold` in the comparison
- Check that `threshold` variable is defined (from `deptSettings`)
- Save the file after changes

### Console Shows Old Logs
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Restart dev server if running

---

## Quick Reference: Before & After

### Before (Hardcoded 80%)
```javascript
// Auto-approve departments at 80% fill
const savedFields = currentFields;
...
if (total > 0 && filled / total >= 0.8) {
  console.log(`[Auto-Approve] ${dept} reached 80% threshold, auto-approving...`);
```

### After (Configurable)
```javascript
// Auto-approve departments based on configurable threshold
if (!autoApprovalSettings?.enabled) {
  console.log('[Auto-Approve] Auto-approval is globally disabled');
} else {
  const savedFields = currentFields;
  ...
  const threshold = deptSettings.threshold || autoApprovalSettings?.threshold || 80;
  ...
  if (total > 0 && fillPercentage >= threshold) {
    console.log(`[Auto-Approve] ${dept} reached ${threshold}% threshold, auto-approving...`);
  ...
} // END of global enabled check
```

---

## Need Help?

1. Check browser console for error messages
2. Review `AUTO-APPROVAL-CONFIGURATION-GUIDE.md` for detailed explanation
3. Compare your code against the Before & After examples above
4. Ensure `autoApprovalSettings` state variable exists (it should, we added it earlier)

---

**Estimated Time**: 10-15 minutes  
**Difficulty**: Medium  
**File**: `src/components/DepartmentPanelExcel.js`  
**Lines**: Approximately 426-565
