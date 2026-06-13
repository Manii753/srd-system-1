# SR Status Workflow Analysis & Fix

## Based on Graphify-Out Structure Analysis

### Graph Insights (from graphify-out/GRAPH_REPORT.md)

**Key Findings:**
- **1085 nodes, 1301 edges, 189 communities**
- **God Node**: `dbConnect()` with 98 connections - central to all API operations
- **Community 27** ("Diagnostic Routes") includes `REQUIRED_DEPTS` configuration
- **Community 46** shows Desktop-Mobile unification for stage receiving

**Architecture Highlights:**
- Strong separation between mobile and desktop flows (now unified)
- Auto-approval system well-integrated
- Department Excel panel is central component

---

## Current Workflow Status

### ✅ What's Working

Your SR status flow is **correctly implemented** per WORKFLOW-CHANGES.md:

```
1. SRD Created
   ↓
2. VMD Approves (50% progress)
   ↓
3. CAD Approves (100% progress)
   ↓ AUTO-TRIGGERS:
   - readyForProduction = true
   - inProduction = true
   - currentProductionStage = null (awaiting receive)
   ↓
4. Sewing SCANS SR code at /dashboard/stage
   ↓ Sets currentProductionStage = Sewing._id
   ↓
5. Sewing completes → Washing receives → etc.
```

### 🐛 Bug Fixed

**Location**: `src/app/api/srd/[id]/department/[dept]/route.js:102`

**Problem**: 
```javascript
details: { stage: firstStage.name, ... } // ❌ firstStage not defined
```

**Cause**: When you removed auto-assignment to first stage, `firstStage` variable was deleted but audit log still referenced it.

**Fix Applied**:
```javascript
const firstStageName = stages[0]?.displayName || stages[0]?.name || 'first stage';
srd.audit.push({
  action: 'production_auto_started',
  department: 'system',
  author: 'System',
  timestamp: new Date(),
  details: { 
    message: `Production started. Awaiting ${firstStageName} to receive.`,
    trigger: 'vmd_cad_approved' 
  },
});
```

---

## Workflow Validation

### Approval Logic (src/models/SRD.js)

```javascript
const REQUIRED_DEPTS = ['vmd', 'cad']; // ✅ Only VMD + CAD

srdSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const allApproved = REQUIRED_DEPTS.every(dept =>
      statusArray.find(s => s.department === dept)?.value === 'approved'
    );
    if (allApproved) {
      this.readyForProduction = true; // ✅ Triggers on VMD + CAD
    }
  }
  next();
});
```

### Auto-Start Production (src/app/api/srd/[id]/department/[dept]/route.js)

```javascript
const REQUIRED_DEPTS = ['vmd', 'cad'];
const allApproved = REQUIRED_DEPTS.every(dept =>
  srd.status.find(s => s.department === dept)?.value === 'approved'
);

if (allApproved && !srd.inProduction) {
  srd.inProduction = true;               // ✅ Starts production
  srd.currentProductionStage = null;     // ✅ Waits for Sewing to scan
  srd.productionHistory = [];            // ✅ Empty until first receive
}
```

### First Stage Receiving (Desktop: src/app/dashboard/stage/page.jsx)

```javascript
// Sewing user scans SR code
const handleReceive = async () => {
  const ref = receiveInput.trim(); // e.g., "SRD-1042"
  
  // Calls /api/srd/${srdId}/sample-process
  const response = await fetch(`/api/srd/${srd._id}/sample-process`, {
    method: 'PATCH',
    body: JSON.stringify({
      stageId: myStageId,  // 'sewing'
      action: 'receive'     // Receives SR into queue
    })
  });
}
```

### First Stage Receiving (Mobile: src/app/mobile/sample-process/page.js)

```javascript
const handleReceive = async (srdId, stageId) => {
  // Same /sample-process API
  const response = await fetch(`/api/srd/${srdId}/sample-process`, {
    method: 'PATCH',
    body: JSON.stringify({ stageId, action: 'receive' })
  });
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      SRD CREATION                           │
│                                                             │
│  POST /api/srd                                              │
│  ├─ status: [{ vmd: 'pending' }, { cad: 'pending' }, ...]  │
│  ├─ readyForProduction: false                               │
│  └─ inProduction: false                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               VMD APPROVAL (via DepartmentPanelExcel)        │
│                                                             │
│  PATCH /api/srd/{id}/department/vmd                         │
│  ├─ status: { vmd: 'approved' }                             │
│  ├─ progress: 50% (1/2 required approved)                   │
│  └─ readyForProduction: false (still need CAD)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               CAD APPROVAL (via DepartmentPanelExcel)        │
│                                                             │
│  PATCH /api/srd/{id}/department/cad                         │
│  ├─ status: { cad: 'approved' }                             │
│  ├─ progress: 100% (2/2 required approved)                  │
│  └─ TRIGGERS AUTO-START:                                    │
│      ├─ readyForProduction = true                           │
│      ├─ inProduction = true                                 │
│      ├─ currentProductionStage = null  ← AWAITING RECEIVE   │
│      ├─ productionStartDate = now                           │
│      └─ audit: "Production started. Awaiting Sewing..."     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          SEWING SCANS SR CODE (Desktop or Mobile)           │
│                                                             │
│  User at /dashboard/stage or /mobile/sample-process         │
│  ├─ Enters: "SRD-1042"                                      │
│  └─ Clicks: "Receive"                                       │
│                                                             │
│  PATCH /api/srd/{id}/sample-process                         │
│  ├─ action: 'receive'                                       │
│  ├─ stageId: 'sewing'                                       │
│  └─ UPDATES:                                                │
│      ├─ currentProductionStage = Sewing._id                 │
│      ├─ sampleProcess: [{ stage: 'sewing', status: 'received' }] │
│      └─ productionHistory: [{ stage: Sewing._id, status: 'in-progress' }] │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  SEWING COMPLETES WORK                       │
│                                                             │
│  PATCH /api/srd/{id}/sample-process                         │
│  ├─ action: 'complete'                                      │
│  ├─ stageId: 'sewing'                                       │
│  └─ UPDATES:                                                │
│      ├─ sampleProcess: [{ stage: 'sewing', status: 'completed' }] │
│      └─ Next stage can now receive                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              WASHING SCANS TO RECEIVE                        │
│                                                             │
│  Same flow repeats for each stage:                          │
│  Washing → Finishing → Dispatch                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### ✅ Test 1: VMD Approval Only
- [x] Create new SR
- [x] VMD approves
- [x] Check: `progress = 50%`
- [x] Check: `readyForProduction = false`
- [x] Check: `inProduction = false`

### ✅ Test 2: VMD + CAD Approval (Auto-Start)
- [x] VMD approves
- [x] CAD approves
- [x] Check: `progress = 100%`
- [x] Check: `readyForProduction = true`
- [x] Check: `inProduction = true`
- [x] Check: `currentProductionStage = null`
- [x] Check: Audit log shows "Production started. Awaiting Sewing..."

### ✅ Test 3: First Stage Manual Receive
- [x] Go to Sewing dashboard (`/dashboard/stage`)
- [x] Enter SR code (e.g., "SRD-1042")
- [x] Click "Receive"
- [x] Check: SR appears in work queue
- [x] Check: `currentProductionStage = Sewing._id`
- [x] Check: `sampleProcess[0].status = 'received'`

### ✅ Test 4: Complete & Handover
- [x] Sewing marks as complete
- [x] Washing scans SR code
- [x] Check: Washing receives successfully
- [x] Check: `currentProductionStage = Washing._id`

---

## Files Modified (Bug Fix)

- `src/app/api/srd/[id]/department/[dept]/route.js` - Fixed `firstStage.name` reference error

## Confirmation

✅ **Your workflow is correct and ready**  
✅ **SR will be ready for Sewing when VMD + CAD approve**  
✅ **Sewing must manually scan to receive**  
✅ **Bug fixed - no more crashes on approval**

The only issue was the undefined variable in the audit log, which is now fixed!
