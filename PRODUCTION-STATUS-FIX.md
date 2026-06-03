# Production Status Display Fix

## Problem
The STATUS column in the SRD table was showing incorrect status (e.g., "Sewing") even when all production stages were completed. It should show "Completed" when all stages are done.

## Root Cause
The `sample-process` API (used by mobile) was only updating the `sampleProcess` array but **NOT updating** the main SRD tracking fields:
- `currentProductionStage` - which stage the SRD is currently at
- `isComplete` - whether all stages are finished

This caused a disconnect between what mobile showed and what the desktop table displayed.

## Solution

### 1. Updated `/api/srd/[id]/sample-process` API
**File**: `src/app/api/srd/[id]/sample-process/route.js`

Added logic after stage updates to:
```javascript
// Find the currently active stage (received or in-progress)
const currentActiveStage = srd.sampleProcess.find(s => 
  s.status === 'received' || s.status === 'in-progress'
);

if (currentActiveStage) {
  // Update currentProductionStage to match
  srd.currentProductionStage = matchingStage._id;
} else {
  // Check if all stages are completed
  const allCompleted = srd.sampleProcess.every(s => s.status === 'completed');
  if (allCompleted) {
    srd.isComplete = true;
    srd.currentProductionStage = null; // Clear when done
  }
}
```

### 2. Updated SRDTable Component
**File**: `src/components/SRDTable.jsx`

Modified the STATUS column rendering to check multiple sources:
```javascript
// Check completion from multiple sources
const allCompletedFromHistory = /* check productionHistory */
const allCompletedFromSampleProcess = /* check sampleProcess */
const allCompleted = srd.isComplete || allCompletedFromHistory || allCompletedFromSampleProcess;

// Show "Completed" first if all stages are done
if (allCompleted) {
  return <span>Completed</span>;
}

// Otherwise show current stage
if (srd.currentProductionStage) {
  return <span>{stageName}</span>;
}
```

## What This Fixes
✅ **Accurate Status Display** - Table now shows correct current stage name  
✅ **Completion Detection** - Shows "Completed" when all stages are done  
✅ **Multi-source Validation** - Checks `isComplete`, `productionHistory`, and `sampleProcess`  
✅ **Consistent Behavior** - Desktop and mobile now stay in sync  

## Testing
1. Complete all stages for an SRD on mobile
2. Check the SRD table on desktop
3. STATUS column should show "Completed" (green text)
4. If a stage is in progress, it should show that stage's name

## Technical Details

### Data Flow
1. User receives/completes stage via mobile → calls `/sample-process` API
2. API updates `sampleProcess` array
3. API now also updates `currentProductionStage` and `isComplete`
4. Table reads these fields to display accurate status

### Backward Compatibility
The fix maintains compatibility with:
- Old SRDs using `productionHistory`
- New SRDs using `sampleProcess`
- Hybrid SRDs using both

### Files Modified
- `src/app/api/srd/[id]/sample-process/route.js` - Added status sync logic
- `src/components/SRDTable.jsx` - Improved completion detection
