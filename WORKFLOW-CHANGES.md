# Production Workflow Changes

## Summary of Changes

### 1. Reduced Approval Requirements
**Before**: Required all 4 departments (VMD, CAD, Commercial, MMC) to approve before production
**After**: Only VMD and CAD approval required

### 2. Manual First Stage Receiving
**Before**: SRD automatically assigned to first stage (Sewing) when production starts
**After**: First stage must manually scan and receive the SRD

## Detailed Changes

### Change 1: Approval Requirements (MMC & Commercial Optional)

**File**: `src/models/SRD.js`
- Changed `REQUIRED_DEPTS` from `['vmd', 'cad', 'commercial', 'mmc']` to `['vmd', 'cad']`
- SRD is now marked as `readyForProduction` when only VMD and CAD approve
- Commercial and MMC can still update their sections, but their approval is not blocking

**File**: `src/app/api/srd/[id]/department/[dept]/route.js`
- Updated auto-start production logic to only check VMD and CAD approval
- Production starts automatically when VMD and CAD both approve

### Change 2: Manual First Stage Receiving

**File**: `src/app/api/srd/[id]/production/route.js`
- When production starts, `currentProductionStage` is set to `null` (not assigned)
- `productionHistory` starts empty
- Message changed to "Production started. First stage must now receive the SRD."

**File**: `src/app/api/srd/[id]/department/[dept]/route.js`
- Auto-start production no longer assigns to first stage
- No production history entry created on start

**File**: `src/app/dashboard/production-manager/page.jsx`
- Removed automatic assignment to first stage
- Alert message updated to indicate first stage must scan

**File**: `src/app/api/srd/[id]/sample-process/route.js`
- Already supports first stage receiving (stageIndex === 0)
- No validation check for previous stage when receiving at first stage

## New Workflow

### Step-by-Step Process

1. **SRD Created** → Status: Pending across all departments

2. **VMD Approves** → Still pending

3. **CAD Approves** → SRD automatically becomes:
   - `readyForProduction: true`
   - `inProduction: true`
   - `currentProductionStage: null` (not assigned yet)
   
4. **First Stage (Sewing) Scans SRD Code** at `/dashboard/stage`:
   - Enters SRD ref number (e.g., "SRD-1042")
   - Clicks "Receive"
   - SRD appears in their work queue
   - `currentProductionStage` updated to Sewing
   - Production history created

5. **Sewing Completes** → Marks as complete on mobile or desktop

6. **Washing Scans to Receive** → Enters SRD ref number

7. **Process Continues** through remaining stages

### Benefits

✅ **Flexible Approval** - Production not blocked by Commercial/MMC
✅ **Better Tracking** - First stage explicitly receives (no auto-assignment)
✅ **Accountability** - Clear record of who received at each stage
✅ **Workflow Control** - Production stages control their own work queue

## Testing

1. **Test Approval Flow**:
   - Create new SRD
   - Have VMD approve → Should NOT be ready
   - Have CAD approve → Should be ready and in production
   - Commercial/MMC approval optional

2. **Test First Stage Receiving**:
   - Start production for an SRD
   - Go to Sewing dashboard at `/dashboard/stage`
   - Scan SRD ref number
   - Should receive successfully
   - Check it appears in work queue

3. **Test Subsequent Stages**:
   - Complete at Sewing
   - Go to Washing dashboard
   - Scan same SRD
   - Should receive successfully

## Files Modified

- `src/models/SRD.js` - Approval requirements
- `src/app/api/srd/[id]/production/route.js` - Production start logic
- `src/app/api/srd/[id]/department/[dept]/route.js` - Auto-start production
- `src/app/dashboard/production-manager/page.jsx` - Start production UI
- `src/app/api/srd/[id]/sample-process/route.js` - (Already supported first stage)
