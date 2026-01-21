import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Department from '@/models/Department';
import { notifySRDUpdate } from '@/lib/emailService';

export async function GET(request, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const srd = await SRD.findById(id);
    if (!srd) {
      return NextResponse.json(
        { success: false, error: 'SRD not found' },
        { status: 404 }
      );
    }

    // Get all departments
    const allDepartments = await Department.find({});
    const excludedRoles = ['admin', 'production-manager'];
    const validDepartments = allDepartments.filter(d => !excludedRoles.includes(d.slug));

    // Diagnostic information
    const diagnostic = {
      srdId: srd._id,
      refNo: srd.refNo,
      title: srd.title,
      
      // Current status
      currentStatus: {
        progress: srd.progress,
        readyForProduction: srd.readyForProduction,
        inProduction: srd.inProduction,
        statusMap: srd.status || {}
      },

      // Department analysis
      departments: {
        total: validDepartments.length,
        inStatus: srd.status ? Object.keys(srd.status).length : 0,
        list: validDepartments.map(d => ({
          slug: d.slug,
          name: d.name,
          inStatus: srd.status ? d.slug in srd.status : false,
          status: srd.status && d.slug in srd.status ? srd.status[d.slug] : 'missing',
          approved: srd.status ? srd.status[d.slug] === 'approved' : false
        }))
      },

      // Issues found
      issues: [],
      
      // Recommendations
      recommendations: []
    };

    // Check for issues
    
    // Issue 1: Admin or production-manager in status
    if (srd.status) {
      if ('admin' in srd.status) {
        diagnostic.issues.push({
          type: 'invalid_role_in_status',
          role: 'admin',
          message: 'Admin should not be in approval workflow'
        });
        diagnostic.recommendations.push('Remove admin from status');
      }
      if ('production-manager' in srd.status) {
        diagnostic.issues.push({
          type: 'invalid_role_in_status',
          role: 'production-manager',
          message: 'Production Manager should not be in approval workflow'
        });
        diagnostic.recommendations.push('Remove production-manager from status');
      }
    }

    // Issue 2: Missing departments in status
    const missingDepts = validDepartments.filter(d => 
      !srd.status || !(d.slug in srd.status)
    );
    if (missingDepts.length > 0) {
      diagnostic.issues.push({
        type: 'missing_departments',
        departments: missingDepts.map(d => d.slug),
        message: `${missingDepts.length} departments missing from status`
      });
      diagnostic.recommendations.push('Add missing departments to status');
    }

    // Issue 3: Check if should be ready for production
    const approvedDepts = validDepartments.filter(d => 
      srd.status && srd.status[d.slug] === 'approved'
    );
    const shouldBeReady = approvedDepts.length === validDepartments.length;
    
    if (shouldBeReady && !srd.readyForProduction) {
      diagnostic.issues.push({
        type: 'incorrect_ready_flag',
        message: 'All departments approved but readyForProduction is false'
      });
      diagnostic.recommendations.push('Recalculate readyForProduction flag');
    }

    // Issue 4: Progress calculation
    const expectedProgress = validDepartments.length > 0 
      ? Math.round((approvedDepts.length / validDepartments.length) * 100)
      : 0;
    
    if (expectedProgress !== srd.progress) {
      diagnostic.issues.push({
        type: 'incorrect_progress',
        current: srd.progress,
        expected: expectedProgress,
        message: `Progress should be ${expectedProgress}% but is ${srd.progress}%`
      });
      diagnostic.recommendations.push('Recalculate progress');
    }

    // Summary
    diagnostic.summary = {
      hasIssues: diagnostic.issues.length > 0,
      issueCount: diagnostic.issues.length,
      canAutoFix: true,
      approvedCount: approvedDepts.length,
      totalDepartments: validDepartments.length,
      shouldBeReady: shouldBeReady
    };

    return NextResponse.json({
      success: true,
      data: diagnostic
    });
  } catch (error) {
    console.error('Error diagnosing SRD:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Auto-fix endpoint
export async function POST(request, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const srd = await SRD.findById(id);
    if (!srd) {
      return NextResponse.json(
        { success: false, error: 'SRD not found' },
        { status: 404 }
      );
    }

    const changes = [];
    const excludedRoles = ['admin', 'production-manager'];

    // Fix 1: Remove admin and production-manager from status
    if (srd.status) {
      for (const role of excludedRoles) {
        if (role in srd.status) {
          delete srd.status[role];
          changes.push(`Removed ${role} from status`);
        }
      }
    }

    // Fix 2: Add missing departments
    const allDepartments = await Department.find({});
    const validDepartments = allDepartments.filter(d => !excludedRoles.includes(d.slug));
    
    for (const dept of validDepartments) {
      if (!srd.status || !(dept.slug in srd.status)) {
        if (!srd.status) {
          srd.status = {};
        }
        srd.status[dept.slug] = 'pending';
        changes.push(`Added ${dept.slug} to status as pending`);
      }
    }
    
    // Mark status as modified for Mongoose
    srd.markModified('status');

    // Save (this triggers pre-save hook to recalculate)
    if (changes.length > 0) {
      await srd.save();
      changes.push('Recalculated progress and readyForProduction');
      
      // Notify users about auto-fix
      try {
        const updateDetails = {
          action: 'System Auto-Fix',
          details: changes
        };
        await notifySRDUpdate(srd, updateDetails);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: changes.length > 0 ? 'SRD fixed successfully' : 'No changes needed',
      data: {
        changes: changes,
        srd: {
          refNo: srd.refNo,
          progress: srd.progress,
          readyForProduction: srd.readyForProduction,
          status: srd.status || {}
        }
      }
    });
  } catch (error) {
    console.error('Error fixing SRD:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
