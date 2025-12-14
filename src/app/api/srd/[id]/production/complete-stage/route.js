import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import ProductionStage from '@/models/ProductionStage';

export async function POST(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { stageName, stageId, completedBy, notes } = body;

    const srd = await SRD.findById(id);
    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    if (!srd.inProduction) {
      return NextResponse.json({ success: false, error: 'SRD is not in production' }, { status: 400 });
    }

    console.log('Complete stage request:', {
      srdId: id,
      currentProductionStage: srd.currentProductionStage,
      stageName: stageName,
      stageId: stageId,
      inProduction: srd.inProduction
    });

    // Get current stage
    if (!srd.currentProductionStage) {
      return NextResponse.json({ 
        success: false, 
        error: 'SRD does not have a current production stage set' 
      }, { status: 400 });
    }

    const currentStage = await ProductionStage.findById(srd.currentProductionStage);
    if (!currentStage) {
      console.error('Stage not found:', {
        stageId: srd.currentProductionStage,
        stageName: stageName
      });
      return NextResponse.json({ 
        success: false, 
        error: `Current production stage not found. Stage ID: ${srd.currentProductionStage}` 
      }, { status: 400 });
    }

    console.log('Current stage found:', {
      _id: currentStage._id,
      name: currentStage.name,
      displayName: currentStage.displayName,
      order: currentStage.order
    });

    // Validate stage - check by ID first (more reliable), then by name
    if (stageId && String(currentStage._id) !== String(stageId)) {
      return NextResponse.json({ 
        success: false, 
        error: `Stage ID mismatch. Current: ${currentStage._id}, Requested: ${stageId}` 
      }, { status: 400 });
    }

    // Check if stage name matches (case-insensitive)
    const stageNameMatches = currentStage.name?.toLowerCase() === stageName?.toLowerCase() ||
                            currentStage.displayName?.toLowerCase() === stageName?.toLowerCase();
    
    if (!stageNameMatches) {
      return NextResponse.json({ 
        success: false, 
        error: `SRD is not in this stage. Current stage: "${currentStage.name || currentStage.displayName}", Requested: "${stageName}". SRD currentProductionStage: ${srd.currentProductionStage}` 
      }, { status: 400 });
    }

    // Update current stage in production history
    const currentHistoryIndex = srd.productionHistory.length - 1;
    if (currentHistoryIndex >= 0) {
      srd.productionHistory[currentHistoryIndex].endDate = new Date();
      srd.productionHistory[currentHistoryIndex].completedBy = completedBy || 'Unknown';
      srd.productionHistory[currentHistoryIndex].notes = notes || '';
      srd.productionHistory[currentHistoryIndex].status = 'completed';
      // Ensure displayName is set
      if (!srd.productionHistory[currentHistoryIndex].stageDisplayName) {
        srd.productionHistory[currentHistoryIndex].stageDisplayName = currentStage.displayName || currentStage.name;
      }
    } else {
      // If no history entry exists, create one
      srd.productionHistory.push({
        stage: currentStage._id,
        stageName: currentStage.name,
        stageDisplayName: currentStage.displayName || currentStage.name,
        startDate: srd.productionStartDate || new Date(),
        endDate: new Date(),
        completedBy: completedBy || 'Unknown',
        notes: notes || '',
        status: 'completed'
      });
    }

    // Get next stage
    const nextStage = await ProductionStage.findOne({ 
      order: currentStage.order + 1,
      isActive: true 
    }).sort({ order: 1 });

    // Get total number of active stages for progress calculation
    const totalStages = await ProductionStage.countDocuments({ isActive: true });

    if (nextStage) {
      // Move to next stage
      srd.currentProductionStage = nextStage._id;
      
      // Add new stage to history
      srd.productionHistory.push({
        stage: nextStage._id,
        stageName: nextStage.name,
        stageDisplayName: nextStage.displayName || nextStage.name,
        startDate: new Date(),
        status: 'in-progress'
      });
      
      // Calculate progress based on completed stages
      const completedStages = srd.productionHistory.filter(h => h.status === 'completed').length;
      srd.productionProgress = totalStages > 0 
        ? Math.round((completedStages / totalStages) * 100)
        : 0;
    } else {
      // All stages complete
      srd.inProduction = false;
      srd.productionEndDate = new Date();
      srd.productionProgress = 100;
      srd.currentProductionStage = null;
    }

    if (stageName) {
      srd.status[stageName] = 'completed';
      srd.markModified('status');
    }

    srd.updatedAt = new Date();
    await srd.save();

    return NextResponse.json({
      success: true,
      data: srd,
      message: nextStage 
        ? `Moved to ${nextStage.displayName || nextStage.name}` 
        : 'Production completed'
    });
  } catch (error) {
    console.error('Error completing stage:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
