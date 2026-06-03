# Sample Process Page - Implementation Guide
## Making SR Progress Page Accessible to Production Stage Users with Mobile Support

## Overview
This guide explains how to update the sample-process page to:
1. **Use user-based permissions** (not role-based)
2. **Add mobile-responsive interface** for production stage workers
3. **Make it accessible** to cutting, sewing, washing, finishing, dispatch users

## Current State
- ✅ Page exists at `/sample-management/sample-process`
- ❌ Uses hardcoded role-based permissions
- ❌ No mobile interface
- ❌ Not in sidebar for production stage users

## Required Changes

### 1. Update Sample Process Page Permissions

**File**: `src/app/sample-management/sample-process/page.js`

**Changes Needed**:

#### A. Remove Role-Based Permissions Object (lines 18-48)
Delete the entire `ROLE_PERMISSIONS` constant

#### B. Add User State and Mobile Detection
Add these state variables after line 25:
```javascript
const [user, setUser] = useState(null);
const [isMobile, setIsMobile] = useState(false);
```

#### C. Add Mobile Detection Effect
Add after `useEffect` on line 27:
```javascript
// Detect mobile device
useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth <= 768);
  };
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

#### D. Add User Data Fetching
Replace `fetchPermissions()` function with:
```javascript
const fetchUserData = async () => {
  if (!session?.user?.email) return;
  try {
    const res = await fetch(`/api/users?email=${session.user.email}`);
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      setUser(data.data[0]);
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
};
```

And update the `useEffect` on line 27 to call `fetchUserData` instead of `fetchPermissions`:
```javascript
useEffect(() => {
  fetchSRDs();
  fetchUserData(); // Changed from fetchPermissions
}, []);
```

#### E. Update getUserPermissions Function
Replace the `getUserPermissions()` function (around line 62-77) with:
```javascript
const getUserPermissions = () => {
  if (!user) return { canViewAll: false, stages: [], canCompleteAnyStage: false };
  
  // Admin always has all permissions
  if (user.role === 'admin') {
    return {
      canViewAll: true,
      canCompleteAnyStage: true,
      stages: ['pattern', 'sewing', 'washing', 'finishing', 'vmd']
    };
  }

  // Use user-specific permissions
  return {
    canViewAll: user.permissions?.canViewAll || false,
    canCompleteAnyStage: user.permissions?.canCompleteAnyStage || false,
    stages: user.permissions?.stages || []
  };
};
```

#### F. Update Loading Check
Change line 286:
```javascript
if (loading) {
```
To:
```javascript
if (loading || !user) {
```

### 2. Add Mobile Interface

**Add Mobile Detail View** - Insert before desktop detail view (before line 296):

```javascript
  // Mobile Detail View
  if (selectedSrd && isMobile) {
    const sampleProcess = selectedSrd.sampleProcess && selectedSrd.sampleProcess.length > 0 
      ? selectedSrd.sampleProcess 
      : STAGE_CONFIG.map(config => ({
          stage: config.id,
          stageDisplayName: config.name,
          status: 'pending',
          order: config.order
        }));

    sampleProcess.sort((a, b) => {
      const aConfig = STAGE_CONFIG.find(c => c.id === a.stage);
      const bConfig = STAGE_CONFIG.find(c => c.id === b.stage);
      return (aConfig?.order || 0) - (bConfig?.order || 0);
    });

    const totalTime = calculateTotalTime(selectedSrd);

    return (
      <Layout>
        <div className="p-3 bg-gray-50 min-h-screen">
          <button 
            onClick={() => setSelectedSrd(null)}
            className="mb-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="bg-white rounded-lg shadow-sm mb-3 p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{selectedSrd.refNo}</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-600 font-medium">Date:</span>
                <span className="text-gray-900">
                  {selectedSrd.createdAt ? new Date(selectedSrd.createdAt).toLocaleDateString('en-GB') : '-'}
                </span>
              </div>
              
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-600 font-medium">Brand:</span>
                <span className="text-gray-900">
                  {selectedSrd.dynamicFields?.find(f => f.name === 'Brand' || f.name === 'Buyer')?.value || 
                   (typeof selectedSrd.BuyerDetails === 'object' ? selectedSrd.BuyerDetails?.name : '-')}
                </span>
              </div>
              
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-600 font-medium">Style:</span>
                <span className="text-gray-900">
                  {selectedSrd.dynamicFields?.find(f => f.name === 'Style No' || f.name === 'Style')?.value || '-'}
                </span>
              </div>

              {totalTime && (
                <div className="flex justify-between py-1 bg-green-50 px-2 rounded mt-2">
                  <span className="text-gray-700 font-semibold">Total Time:</span>
                  <span className="text-green-700 font-bold">{totalTime} days</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {sampleProcess.map((stage, index) => {
              const showReceive = canReceiveSample(selectedSrd, stage, index);
              const prevStage = index > 0 ? sampleProcess[index - 1] : null;
              const stageTime = calculateStageTime(stage, prevStage, selectedSrd);
              const canSeeStageDetails = permissions.canViewAll || permissions.stages.includes(stage.stage);

              return (
                <div key={stage.stage} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900">
                      {stage.stageDisplayName || stage.stage.toUpperCase()}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      stage.completedDate ? 'bg-green-100 text-green-800' :
                      stage.receivedDate ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {stage.completedDate ? 'Completed' :
                       stage.receivedDate ? 'In Progress' :
                       'Pending'}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    {stage.completedDate && (
                      <div className="text-gray-700">
                        ✓ Completed: {new Date(stage.completedDate).toLocaleDateString('en-GB')}
                        {canSeeStageDetails && stage.completedBy?.name && (
                          <span className="text-gray-500"> by {stage.completedBy.name}</span>
                        )}
                      </div>
                    )}
                    
                    {!stage.completedDate && stage.receivedDate && (
                      <div className="text-gray-700">
                        ⏳ Received: {new Date(stage.receivedDate).toLocaleDateString('en-GB')}
                      </div>
                    )}

                    {canSeeStageDetails && stage.completedDate && stageTime !== null && (
                      <div className="text-blue-600 font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {stageTime} {stageTime === 1 ? 'day' : 'days'}
                      </div>
                    )}
                  </div>

                  {showReceive && (
                    <button
                      onClick={() => handleAction(selectedSrd._id, stage.stage, 'receive')}
                      disabled={actionLoading === `${selectedSrd._id}-${stage.stage}-receive`}
                      className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 font-medium disabled:opacity-50"
                    >
                      {actionLoading === `${selectedSrd._id}-${stage.stage}-receive` ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      ) : (
                        'Receive Sample'
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Layout>
    );
  }
```

**Add Mobile List View** - Insert before desktop list view (before line 467):

```javascript
  // Mobile List View
  if (isMobile) {
    return (
      <Layout>
        <div className="p-3 bg-gray-50 min-h-screen">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-900">SR In Process</h1>
            <p className="text-xs text-gray-600 mt-1">
              {permissions.canViewAll 
                ? 'Viewing all samples' 
                : `Your ${user?.role} samples`}
            </p>
          </div>

          {filteredSrds.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center shadow-sm">
              <p className="text-gray-500 text-sm">No samples found for your department</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSrds.map((srd) => {
                const sampleProcess = srd.sampleProcess || [];
                const completedCount = sampleProcess.filter(s => s.completedDate).length;
                const totalStages = STAGE_CONFIG.length;
                const overallStatus = completedCount === totalStages ? 'Complete' : completedCount > 0 ? 'In Progress' : 'Pending';

                return (
                  <div 
                    key={srd._id}
                    onClick={() => setSelectedSrd(srd)}
                    className="bg-white rounded-lg shadow-sm p-4 active:bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-blue-600">{srd.refNo}</h3>
                        <p className="text-xs text-gray-500">
                          {srd.createdAt ? new Date(srd.createdAt).toLocaleDateString('en-GB') : '-'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        overallStatus === 'Complete' ? 'bg-green-100 text-green-800' :
                        overallStatus === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {overallStatus}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex gap-2">
                        <span className="text-gray-600 font-medium w-16">Brand:</span>
                        <span className="text-gray-900 flex-1">
                          {srd.dynamicFields?.find(f => f.name === 'Brand' || f.name === 'Buyer')?.value || 
                           (typeof srd.BuyerDetails === 'object' ? srd.BuyerDetails?.name : '-')}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-3">
                      {STAGE_CONFIG.map(config => {
                        const stage = sampleProcess.find(s => s.stage === config.id);
                        return (
                          <div 
                            key={config.id}
                            className={`h-2 flex-1 rounded ${
                              stage?.completedDate ? 'bg-green-500' :
                              stage?.receivedDate ? 'bg-yellow-400' :
                              'bg-gray-200'
                            }`}
                            title={config.name}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    );
  }
```

### 3. Update Sidebar for Production Stage Users

**File**: `src/components/layout/DynamicSidebar.js`

**Change needed** (around line 68-74):

Update the production stage user menu items:
```javascript
} else if (['cutting','sewing','washing','finishing','dispatch'].includes(userRole)) {
  const names = { cutting:'Cutting', sewing:'Sewing', washing:'Washing', finishing:'Finishing', dispatch:'Dispatch' };
  setMenuItems([
    { name: 'Home', href: '/home', icon: LayoutDashboard },
    { name: names[userRole] + ' Stage', href: '/dashboard/stage', icon: Factory },
    { name: 'SR Progress', href: '/sample-management/sample-process', icon: Package }, // ADD THIS LINE
  ]);
}
```

### 4. Configure User Permissions

For each production stage user, set these permissions via UserPermissionsModal:

#### Option A: Full Access (can see all samples)
```
permissions.canViewAll = true
```

#### Option B: Stage-Specific Access (only see their stage)
```
permissions.stages = ['cutting']  // or ['sewing'], ['washing'], ['finishing']
```

Also add to sidebar menu items:
```
sidebarMenuItems = ['sample-process']
```

## Testing Steps

### Desktop Testing
1. Log in as admin - should see all SRDs
2. Log in as VMD - should see all SRDs
3. Log in as cutting - should see only cutting stage pending SRDs
4. Click any SRD - should see detailed view
5. Try receiving a sample at your stage

### Mobile Testing
1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone or Android device
4. Navigate to `/sample-management/sample-process`
5. Should see card-based list view
6. Tap any card - should see mobile detail view
7. Test "Receive Sample" button
8. Test back button

## Permission Matrix

| User Role | canViewAll | stages | Can See |
|-----------|-----------|---------|---------|
| Admin | true | all | All SRDs |
| VMD | true | ['vmd'] | All SRDs |
| Cutting | false | ['cutting'] | Only cutting pending |
| Sewing | false | ['sewing'] | Only sewing pending |
| Washing | false | ['washing'] | Only washing pending |
| Finishing | false | ['finishing'] | Only finishing pending |

## Mobile UI Screenshots Description

### List View
- Card layout with shadow
- Large tap targets
- Status badges (colored)
- Progress bar (5 segments for 5 stages)
- Quick info: Ref No, Date, Brand

### Detail View
- Blue back button at top
- White card with SR details
- Stacked stage cards
- Status badges per stage
- Full-width "Receive Sample" button
- Time tracking visible

## API Requirements

The page expects `/api/users?email=` to return:
```json
{
  "success": true,
  "data": [{
    "_id": "...",
    "role": "cutting",
    "permissions": {
      "canViewAll": false,
      "stages": ["cutting"],
      "canCompleteAnyStage": false
    }
  }]
}
```

## Files Changed Summary

1. ✅ `src/app/sample-management/sample-process/page.js` - Permissions & Mobile UI
2. ✅ `src/components/layout/DynamicSidebar.js` - Add menu item for production stages
3. ✅ User permissions (via UserPermissionsModal) - Configure per user

## Rollback Plan

If issues occur:
```bash
git checkout HEAD -- src/app/sample-management/sample-process/page.js
git checkout HEAD -- src/components/layout/DynamicSidebar.js
```

## Next Steps After Implementation

1. Test on actual mobile devices
2. Add permission presets for quick setup
3. Consider adding stage completion from this page (currently only receive)
4. Add filtering/search for mobile list view
5. Add pull-to-refresh on mobile
6. Consider offline support with service workers
