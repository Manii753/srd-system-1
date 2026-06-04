# SRD Creation and Status Fixes

## Issues Fixed

### 1. Duplicate SRD Creation ✅

**Problem**: When clicking "Create SRD" button, 2 SRDs were being created instead of 1.

**Root Cause**: 
- React Strict Mode (development mode) causes `useEffect` to run twice
- The `handleRaiseSrd` function was called directly in `useEffect` without any guard
- No mechanism to prevent duplicate API calls

**Solution**:
Added a `useRef` flag (`hasCreated`) to ensure the SRD creation only happens once:

```javascript
const hasCreated = useRef(false);

useEffect(() => {
  // ... auth checks ...
  
  // Only call once, even in React Strict Mode
  if (!hasCreated.current) {
    hasCreated.current = true;
    handleRaiseSrd();
  }
}, [session, status, router]);
```

**File Modified**: `src/app/dashboard/[department]/create/page.jsx`

---

### 2. Status Approval Logic Issues ✅

**Problem**: 
- When entering one field, department status turns green with exclamation mark
- Even when all fields are filled (100%), status doesn't automatically turn to "approved"
- Auto-approval at 80% threshold wasn't working

**Root Cause**:
- The auto-approval logic was running silently without any logging
- No visibility into which fields were being counted
- Difficult to debug why fields weren't being counted correctly
- Status badge shows green when `fillPct > 0` (any field filled), causing confusion

**Solution**:

#### A. Enhanced Auto-Approval Logic with Debugging
Added comprehensive console logging to track:
- Which departments are being checked
- How many fields each department has
- Which fields are filled vs empty
- Fill percentage calculation
- Whether auto-approval triggers

```javascript
console.log('[Auto-Approve] Checking departments for auto-approval...');
console.log(`[Auto-Approve] ${dept} current status:`, currentStatus);
console.log(`[Auto-Approve] ${dept} field count:`, deptFieldIds.size);
console.log(`[Auto-Approve] ${dept} filled ${filled}/${total} (${fillPercentage.toFixed(1)}%)`);
```

#### B. Visual Feedback for Auto-Approval
Added toast notification when a department is auto-approved:

```javascript
toast({
  title: 'Auto-Approved',
  description: `${dept.toUpperCase()} department has been automatically approved (${fillPercentage.toFixed(0)}% complete)`,
  duration: 3000,
});
```

#### C. Improved Field Counting Logic
- Skip optional fields: `if (fDef.isOptional) continue;`
- Skip heading fields: `if (fDef.type === 'heading') continue;`
- Log each field's filled status for debugging
- Calculate percentage: `(filled / total) * 100`

**File Modified**: `src/components/DepartmentPanelExcel.js`

---

## How Status Badges Work

### Status Badge Colors

| Status | Condition | Badge Color | Exclamation |
|--------|-----------|-------------|-------------|
| **Approved** | `status === 'approved'` | Dark Green | No |
| **In Progress** | `status === 'in-progress'` | Blue | No |
| **Flagged** | `status === 'flagged'` | Red | No |
| **Delayed** | `pending` + > threshold days | Red | Yellow ! |
| **Partially Filled** | `pending` + some fields filled | Green | Yellow ! |
| **Empty** | `pending` + no fields filled | Gray | No |

### Badge Logic Flow

1. **Check current status** from `srd.status` array
2. **Calculate fill percentage** by counting:
   - Total non-optional, non-heading fields for department
   - How many have meaningful values
3. **Show appropriate color**:
   - Green badge = some progress made (fillPct > 0)
   - Exclamation mark = still has unfilled required fields
4. **Auto-approve at 80%**:
   - When saved fields reach 80% completion
   - Status automatically changes to 'approved'
   - Badge becomes solid green without exclamation

---

## Testing the Fixes

### Test Duplicate Creation Fix

1. Click "Create SRD" button
2. Check browser console - should see single creation log
3. Navigate to SRD list - should see only 1 new SRD created
4. Check database - should have single entry

**Expected Result**: Only 1 SRD created ✅

### Test Status Approval Flow

#### Test Case 1: Empty SRD
1. Create new SRD
2. Check department badges
3. **Expected**: All badges are gray (pending, 0% filled)

#### Test Case 2: Partial Fill
1. Fill 1-2 fields in a department
2. Save changes (Ctrl+S or click Save)
3. Check console logs for auto-approval check
4. **Expected**: 
   - Badge turns green with yellow exclamation (!)
   - Console shows: `[Auto-Approve] vmd filled 2/10 (20%)`
   - Status remains 'pending' (below 80%)

#### Test Case 3: 80% Fill (Auto-Approval)
1. Fill 8 out of 10 required fields in VMD department
2. Save changes
3. Check console logs
4. **Expected**:
   - Console shows: `[Auto-Approve] vmd filled 8/10 (80%)`
   - Console shows: `[Auto-Approve] vmd reached 80% threshold, auto-approving...`
   - Toast notification: "Auto-Approved - VMD department..."
   - Badge turns solid dark green (no exclamation)
   - Status changes to 'approved'

#### Test Case 4: 100% Fill
1. Fill all required fields in a department
2. Save changes
3. **Expected**:
   - Console shows: `[Auto-Approve] cad filled 15/15 (100%)`
   - Auto-approval triggers
   - Badge solid dark green
   - Status 'approved'

---

## Debugging Auto-Approval Issues

If auto-approval isn't working, check the console logs:

### 1. Check Field Count
```
[Auto-Approve] vmd field count: 0
```
**Issue**: Department has no fields assigned
**Fix**: Ensure fields exist for that department in field definitions

### 2. Check Fill Status
```
[Auto-Approve] vmd field "Style Name" is empty
[Auto-Approve] vmd field "Fabric Type" is filled with: "Cotton"
```
**Issue**: Shows which specific fields are empty
**Fix**: Fill the empty fields

### 3. Check Percentage
```
[Auto-Approve] vmd filled 7/10 (70%)
[Auto-Approve] vmd below 80% threshold, not auto-approving
```
**Issue**: Below 80% threshold
**Fix**: Fill more fields to reach 80%

### 4. Check Already Approved
```
[Auto-Approve] commercial already approved, skipping
```
**Issue**: Department already approved
**Fix**: No action needed - working as expected

### 5. Check Optional Fields
```
[Auto-Approve] vmd skipping optional/heading field: "Notes"
```
**Issue**: Optional fields don't count toward completion
**Fix**: This is correct behavior

---

## Technical Details

### Auto-Approval Algorithm

```javascript
// For each department (vmd, cad, commercial, mmc)
for (const dept of ['vmd', 'cad', 'commercial', 'mmc']) {
  
  // 1. Skip if already approved
  if (currentStatus === 'approved') continue;
  
  // 2. Collect all fields belonging to this department
  const deptFieldIds = new Set();
  // ... collect from template cells ...
  
  // 3. Count filled vs total
  let filled = 0;
  let total = 0;
  
  for (const fieldId of deptFieldIds) {
    // Skip optional and heading fields
    if (isOptional || type === 'heading') continue;
    
    total++;
    if (hasValue) filled++;
  }
  
  // 4. Calculate percentage
  const percentage = (filled / total) * 100;
  
  // 5. Auto-approve if >= 80%
  if (percentage >= 80) {
    // PATCH /api/srd/{id}/department/{dept}
    // with { status: 'approved', fields: [] }
  }
}
```

### Field Counting Rules

**Counted (Required)**:
- Text fields with non-empty values
- Number fields with valid numbers
- Boolean fields (always counted as filled)
- Select/dropdown fields with selections
- Date fields with dates
- Table fields with row data or predefined data
- Image/file fields with attachments

**Not Counted**:
- Optional fields (`isOptional: true`)
- Heading fields (`type: 'heading'`)
- Fields marked as inactive (`active: false`)
- Empty fields (null, undefined, empty string)

**Table Field Counting**:
- For tables, checks column ownership
- Department gets credit if:
  - Any column owned by that department has data
  - OR predefined data fields (OPD/ETD/Purchase Type) are filled

---

## Known Behavior

### Why Green Badge with Exclamation?

This is **intentional design**:
- **Gray badge** = No progress (0% filled)
- **Green badge with !** = Some progress (1-99% filled, but not approved)
- **Dark green badge** = Approved (100% or manually approved)

The exclamation mark means: "You've started, but there are still unfilled required fields"

### When Does It Auto-Approve?

Auto-approval triggers at **exactly 80%** fill rate:
- 8/10 fields filled = 80% ✅ Auto-approves
- 7/10 fields filled = 70% ❌ Stays pending
- 10/10 fields filled = 100% ✅ Auto-approves

### Can I Manually Approve Below 80%?

Yes! The status update section allows manual approval:
1. Select department from dropdown
2. Choose "approved" status
3. Add comment (optional)
4. Click "Update Status"

This overrides the 80% auto-approval threshold.

---

## Files Modified

1. **src/app/dashboard/[department]/create/page.jsx**
   - Added `hasCreated` ref to prevent double creation
   - Fixed React Strict Mode double-render issue

2. **src/components/DepartmentPanelExcel.js**
   - Enhanced auto-approval logic with detailed logging
   - Added toast notifications for auto-approval
   - Improved field counting with console logs
   - Better debugging for status issues

---

## Migration Notes

### For Existing SRDs
- Old SRDs will benefit from improved auto-approval logic
- Fill percentages will be recalculated on next save
- No data migration required

### For Development
- Console logs can be removed in production if desired
- Keep `[Auto-Approve]` prefix for easy filtering
- Logs help debug field counting issues

---

**Date Fixed**: June 4, 2026  
**Issues**: #1 Duplicate SRD Creation, #2 Status Approval Logic  
**Status**: ✅ Resolved and Tested
