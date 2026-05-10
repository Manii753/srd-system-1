import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Fetch sample process for an SRD
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const srd = await SRD.findById(id).select('refNo title sampleProcess');
    
    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: srd });
  } catch (error) {
    console.error('Error fetching sample process:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH - Update sample process (complete stage or receive sample)
export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, stage, notes } = body;

    const srd = await SRD.findById(id);
    
    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    const stageNames = {
      pattern: 'Pattern',
      sewing: 'Sewing',
      washing: 'Washing',
      finishing: 'Finishing',
      vmd: 'VMD'
    };

    // Initialize sample process if not exists
    if (!srd.sampleProcess || srd.sampleProcess.length === 0) {
      srd.sampleProcess = [
        { stage: 'pattern', stageDisplayName: 'Pattern', status: 'pending', order: 1 },
        { stage: 'sewing', stageDisplayName: 'Sewing', status: 'pending', order: 2 },
        { stage: 'washing', stageDisplayName: 'Washing', status: 'pending', order: 3 },
        { stage: 'finishing', stageDisplayName: 'Finishing', status: 'pending', order: 4 },
        { stage: 'vmd', stageDisplayName: 'VMD', status: 'pending', order: 5 }
      ];
    }

    const stageIndex = srd.sampleProcess.findIndex(s => s.stage === stage);
    
    if (stageIndex === -1) {
      return NextResponse.json({ success: false, error: 'Stage not found' }, { status: 404 });
    }

    if (action === 'complete') {
      // Validate user can complete this stage
      const userRole = session.user.role.toLowerCase();
      const canComplete = userRole === 'admin' || userRole === 'vmd' || userRole === stage;
      
      if (!canComplete) {
        return NextResponse.json({ 
          success: false, 
          error: 'You do not have permission to complete this stage' 
        }, { status: 403 });
      }

      // Mark stage as completed
      srd.sampleProcess[stageIndex].completedDate = new Date();
      srd.sampleProcess[stageIndex].completedBy = {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role
      };
      srd.sampleProcess[stageIndex].status = 'completed';
      if (notes) srd.sampleProcess[stageIndex].notes = notes;

      // Set next stage to in-progress
      if (stageIndex < srd.sampleProcess.length - 1) {
        srd.sampleProcess[stageIndex + 1].status = 'in-progress';
      }
    } else if (action === 'receive') {
      // Validate user can receive this stage - MUST be from the same department
      const userRole = session.user.role.toLowerCase();
      const canReceive = userRole === stage; // User MUST be from this stage's department
      
      if (!canReceive) {
        return NextResponse.json({ 
          success: false, 
          error: 'You can only receive samples for your own department' 
        }, { status: 403 });
      }

      // Validate previous stage is completed
      if (stageIndex > 0) {
        const prevStage = srd.sampleProcess[stageIndex - 1];
        if (prevStage.status !== 'completed') {
          return NextResponse.json({ 
            success: false, 
            error: 'Previous stage must be completed before receiving' 
          }, { status: 400 });
        }
      }

      // When receiving, mark current stage as received AND mark previous stage as handed over
      srd.sampleProcess[stageIndex].receivedDate = new Date();
      srd.sampleProcess[stageIndex].receivedBy = {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role
      };
      srd.sampleProcess[stageIndex].status = 'received';
      if (notes) srd.sampleProcess[stageIndex].notes = notes;

      // Mark previous stage as handed over (if not already completed)
      if (stageIndex > 0) {
        const prevStage = srd.sampleProcess[stageIndex - 1];
        if (!prevStage.completedDate) {
          prevStage.completedDate = new Date();
          prevStage.completedBy = {
            id: session.user.id,
            name: session.user.name,
            role: session.user.role
          };
          prevStage.status = 'completed';
        }
        // Record handover date
        prevStage.handoverDate = new Date();
      }
    }

    srd.updatedAt = new Date();
    await srd.save();

    return NextResponse.json({ 
      success: true, 
      message: `Sample ${action === 'complete' ? 'completed' : 'received'} successfully`,
      data: srd 
    });
  } catch (error) {
    console.error('Error updating sample process:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
