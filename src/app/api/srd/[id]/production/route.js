import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import ProductionStage from '@/models/ProductionStage';

// Start production for an SRD
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

    // Check if ready for production
    if (!srd.readyForProduction) {
      return NextResponse.json(
        { success: false, error: 'SRD is not ready for production. All departments must approve first.' },
        { status: 400 }
      );
    }

    // Get first production stage
    const firstStage = await ProductionStage.findOne({ isActive: true }).sort({ order: 1 });
    if (!firstStage) {
      return NextResponse.json(
        { success: false, error: 'No production stages configured' },
        { status: 400 }
      );
    }

    // Start production
    srd.inProduction = true;
    srd.productionStartDate = new Date();
    srd.currentProductionStage = firstStage._id;
    srd.productionProgress = 0;
    srd.productionHistory = [{
      stage: firstStage._id,
      stageName: firstStage.name,
      stageDisplayName: firstStage.displayName || firstStage.name,
      startDate: new Date(),
      status: 'in-progress'
    }];

    // Add audit entry
    srd.audit.push({
      action: 'production_started',
      department: 'production',
      author: 'System',
      timestamp: new Date(),
      details: { stage: firstStage.name }
    });

    await srd.save();

    return NextResponse.json({
      success: true,
      data: srd,
      message: `Production started at stage: ${firstStage.name}`
    });
  } catch (error) {
    console.error('Error starting production:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Update production stage
export async function PATCH(request, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const body = await request.json();
    const { action, stageId, notes, completedBy } = body;

    const srd = await SRD.findById(id);
    if (!srd) {
      return NextResponse.json(
        { success: false, error: 'SRD not found' },
        { status: 404 }
      );
    }

    if (!srd.inProduction) {
      return NextResponse.json(
        { success: false, error: 'SRD is not in production' },
        { status: 400 }
      );
    }

    if (action === 'complete_stage') {
      // Complete current stage
      const currentHistoryIndex = srd.productionHistory.length - 1;
      srd.productionHistory[currentHistoryIndex].endDate = new Date();
      srd.productionHistory[currentHistoryIndex].status = 'completed';
      srd.productionHistory[currentHistoryIndex].completedBy = completedBy || 'Unknown';
      srd.productionHistory[currentHistoryIndex].notes = notes;

      // Get next stage
      const currentStage = await ProductionStage.findById(srd.currentProductionStage);
      const nextStage = await ProductionStage.findOne({
        isActive: true,
        order: { $gt: currentStage.order }
      }).sort({ order: 1 });

      if (nextStage) {
        // Move to next stage
        srd.currentProductionStage = nextStage._id;
        srd.productionHistory.push({
          stage: nextStage._id,
          stageName: nextStage.name,
          stageDisplayName: nextStage.displayName || nextStage.name,
          startDate: new Date(),
          status: 'in-progress'
        });

        // Calculate progress
        const totalStages = await ProductionStage.countDocuments({ isActive: true });
        const completedStages = srd.productionHistory.filter(h => h.status === 'completed').length;
        srd.productionProgress = Math.round((completedStages / totalStages) * 100);

        // Add audit entry
        srd.audit.push({
          action: 'production_stage_completed',
          department: 'production',
          author: completedBy || 'System',
          timestamp: new Date(),
          details: { 
            completedStage: currentStage.name,
            nextStage: nextStage.name 
          }
        });
      } else {
        // Production complete
        srd.productionProgress = 100;
        srd.productionEndDate = new Date();
        srd.currentProductionStage = null;
        srd.isComplete = true;
        srd.inDispatch = true;

        // Add audit entry
        srd.audit.push({
          action: 'production_completed',
          department: 'production',
          author: completedBy || 'System',
          timestamp: new Date(),
          details: { completedStage: currentStage.name }
        });
      }

      await srd.save();

      return NextResponse.json({
        success: true,
        data: srd,
        message: nextStage 
          ? `Stage completed. Moved to: ${nextStage.displayName || nextStage.name}` 
          : 'Sample completed!'
      });
    } else if (action === 'update_stage') {
      // Update current stage status
      const currentHistoryIndex = srd.productionHistory.length - 1;
      if (body.status) {
        srd.productionHistory[currentHistoryIndex].status = body.status;
      }
      if (notes) {
        srd.productionHistory[currentHistoryIndex].notes = notes;
      }

      await srd.save();

      return NextResponse.json({
        success: true,
        data: srd,
        message: 'Production stage updated'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating production:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Get production status
export async function GET(request, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const srd = await SRD.findById(id)
      .populate('currentProductionStage')
      .populate('productionHistory.stage');

    if (!srd) {
      return NextResponse.json(
        { success: false, error: 'SRD not found' },
        { status: 404 }
      );
    }

    // Get all production stages for reference
    const allStages = await ProductionStage.find({ isActive: true }).sort({ order: 1 });

    return NextResponse.json({
      success: true,
      data: {
        srd,
        allStages,
        inProduction: srd.inProduction,
        currentStage: srd.currentProductionStage,
        progress: srd.productionProgress,
        history: srd.productionHistory
      }
    });
  } catch (error) {
    console.error('Error fetching production status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
