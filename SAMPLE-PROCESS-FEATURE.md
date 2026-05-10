# Sample Process Management Feature

## Overview
A comprehensive sample tracking system that allows users from different departments to manage the sample workflow from Pattern → Sewing → Washing → Finishing → VMD.

## Features Implemented

### 1. Database Schema (src/models/SRD.js)
Added `sampleProcess` array to SRD model with:
- **stage**: Pattern, Sewing, Washing, Finishing, VMD
- **completedDate**: When the stage was completed
- **completedBy**: User who completed the stage
- **receivedDate**: When the next department received the sample
- **receivedBy**: User who received the sample
- **status**: pending, in-progress, completed, received
- **notes**: Optional notes for each stage

### 2. API Endpoint (src/app/api/srd/[id]/sample-process/route.js)
- **GET**: Fetch sample process for an SRD
- **PATCH**: Update sample process with two actions:
  - `complete`: Mark stage as completed (only by assigned department)
  - `receive`: Mark sample as received by next department

### 3. Sample Process Page (src/app/sample-management/sample-process/page.js)
Features:
- Lists all SRDs in dispatch or with active sample process
- Shows workflow timeline with visual status indicators
- Role-based permissions:
  - Users can only complete stages for their department
  - Users can only receive samples for their department
- Real-time status updates
- Color-coded stages:
  - Green: Completed/Received
  - Yellow: In Progress
  - Gray: Pending

### 4. Sample Process Report Component (src/components/SampleProcessReport.jsx)
Excel-style report showing:
- Summary information (SR Date, INO REF, Buyer, Sample Type)
- Stage completion table with dates and users
- Received by next department tracking
- Notes section

### 5. Navigation Integration
Updated sidebar menu to include "Sample Process" under "Samples Management"

## User Workflow

### Stage Completion Flow:
1. Pattern department completes their work → Clicks "Complete Stage"
2. Sample moves to "Completed" status
3. Sewing department sees "Receive Sample" button
4. Sewing clicks "Receive Sample" → Date recorded
5. Sewing completes their work → Clicks "Complete Stage"
6. Process repeats through Washing → Finishing → VMD

### Role Permissions:
- **Pattern**: Can complete Pattern stage, receive from previous (N/A for first stage)
- **Sewing**: Can complete Sewing stage, receive from Pattern
- **Washing**: Can complete Washing stage, receive from Sewing
- **Finishing**: Can complete Finishing stage, receive from Washing
- **VMD**: Can complete VMD stage, receive from Finishing
- **Admin**: Can perform all actions

## How to Use

### For Department Users:
1. Navigate to **Samples Management > Sample Process**
2. Find your SRD in the list
3. When previous stage is completed, click **"Receive Sample"**
4. Complete your work
5. Click **"Complete Stage"** to pass to next department

### For Reports:
1. The `SampleProcessReport` component can be integrated into any report page
2. Import and use: `<SampleProcessReport srd={srdData} />`
3. Shows complete timeline with all dates and users

## Design Highlights
- Clean, modern card-based UI
- Color-coded status indicators
- Visual workflow with arrows between stages
- Responsive design
- Real-time updates
- Excel-style report format matching your reference

## Next Steps (Optional Enhancements)
1. Add email notifications when sample is ready for next department
2. Add image upload for each stage
3. Add quality check fields
4. Add delay tracking and alerts
5. Export sample process report to PDF/Excel
