# Desktop Stage Receiving Fix

## Problem
The desktop dashboard (`/dashboard/stage`) had overly strict validation when receiving SRDs, while the mobile interface worked fine. This caused errors like:
> "SRD 'srd-1042' is at stage 'Washing'. The next stage is 'Finishing', not 'Dispatch'."

Even though you had already completed those stages on mobile.

## Root Cause
The desktop and mobile interfaces were using **different APIs and validation logic**:

### Mobile (Working)
- **API**: `/api/srd/${srdId}/sample-process` with `action: 'receive'`
- **Validation**: Simple check if previous stage is completed
- **Flow**: Flexible, allows any user to receive if previous stage is done

### Desktop (Broken)
- **API**: `/api/srd/${srdId}/production/complete-stage`
- **Validation**: Strict sequential validation - required you to be EXACTLY the next stage in order
- **Flow**: Rigid, rejected receives if you weren't the mathematically next stage

## Solution
Changed the desktop to use the **same API endpoint and logic as mobile**:

### Changes Made in `src/app/dashboard/stage/page.jsx`
1. **Removed strict sequential validation** (lines ~103-153)
2. **Now uses `/sample-process` endpoint** (same as mobile)
3. **Simplified receive logic** - just calls `action: 'receive'` for your stage
4. **Added debug logging** for troubleshooting

### New Flow
```javascript
// Old (broken):
// 1. Find current stage
// 2. Calculate next stage mathematically
// 3. Validate you are EXACTLY the next stage
// 4. Call /production/complete-stage

// New (working):
// 1. Find your stage
// 2. Call /sample-process with action: 'receive'
// 3. Done!
```

## Benefits
✅ Desktop and mobile now work identically  
✅ No more strict sequential validation  
✅ Users can receive SRDs at any stage as long as work is progressing  
✅ Matches real-world workflow where stages might overlap or skip

## Testing
1. Go to `/dashboard/stage` on desktop
2. Scan any SRD code (e.g., "srd-1042")
3. It should now receive successfully (same as mobile)
4. Check browser console (F12) for debug logs if issues occur

## Files Modified
- `src/app/dashboard/stage/page.jsx` - Completely rewrote `handleReceive()` function
