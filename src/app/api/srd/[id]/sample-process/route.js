import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import ProductionStage from '@/models/ProductionStage';
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
    const { action, stage: stageParam, stageId, notes } = body;
    const stage = stageParam || stageId; // Accept both 'stage' and 'stageId'

    const srd = await SRD.findById(id);
    
    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    // Fetch production stages dynamically
    let productionStages = [];
    try {
      const stages = await ProductionStage.find({ isActive: true }).sort({ order: 1 });
      productionStages = stages.map(stage => ({
        id: stage.slug || stage.name.toLowerCase(),
        name: stage.name,
        order: stage.order
      }));
      
      if (productionStages.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'No active production stages found. Please configure production stages first.' 
        }, { status: 400 });
      }
    } catch (err) {
      console.error('Error fetching production stages:', err);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch production stages' 
      }, { status: 500 });
    }

    // Initialize sample process if not exists
    if (!srd.sampleProcess || srd.sampleProcess.length === 0) {
      // Check if we should use productionHistory instead
      const useProductionHistory = srd.productionHistory && srd.productionHistory.length > 0;
      
      if (useProductionHistory) {
        // Start with all stages as pending
        const allStages = productionStages.map(stage => ({
          stage: stage.id,
          stageDisplayName: stage.name,
          status: 'pending',
          order: stage.order
        }));
        
        // Update stages that have history
        srd.productionHistory.forEach((historyItem) => {
          const stageName = historyItem.stage?.slug || historyItem.stageName?.toLowerCase();
          const stageIndex = allStages.findIndex(s => s.stage === stageName);
          
          if (stageIndex !== -1) {
            allStages[stageIndex] = {
              ...allStages[stageIndex],
              status: historyItem.status === 'completed' ? 'completed' : 
                      historyItem.status === 'in-progress' ? 'received' : 'pending',
              receivedDate: historyItem.startDate,
              completedDate: historyItem.endDate,
              completedBy: historyItem.completedBy ? { name: historyItem.completedBy } : null,
              notes: historyItem.notes
            };
          }
        });
        
        srd.sampleProcess = allStages;
        console.log('API: Converted productionHistory to sampleProcess:', srd.sampleProcess.map(s => ({ stage: s.stage, status: s.status })));
      } else {
        // Initialize with all stages as pending
        srd.sampleProcess = productionStages.map(stage => ({
          stage: stage.id,
          stageDisplayName: stage.name,
          status: 'pending',
          order: stage.order
        }));
      }
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

      // Validate previous stage is received, in-progress, or completed
      if (stageIndex > 0) {
        const prevStage = srd.sampleProcess[stageIndex - 1];
        console.log('API Receive validation:', {
          currentStage: stage,
          stageIndex,
          prevStage: {
            stage: prevStage.stage,
            status: prevStage.status
          },
          isPending: prevStage.status === 'pending'
        });
        
        if (prevStage.status === 'pending') {
          return NextResponse.json({ 
            success: false, 
            error: 'Previous stage must be received before you can receive this stage' 
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
    
    // Update currentProductionStage to reflect the current active stage
    // Find the first stage that is 'received' or 'in-progress' (not completed)
    const currentActiveStage = srd.sampleProcess.find(s => 
      s.status === 'received' || s.status === 'in-progress'
    );
    
    if (currentActiveStage) {
      // Map stage ID back to ProductionStage ObjectId
      const matchingStage = productionStages.find(ps => ps.id === currentActiveStage.stage);
      if (matchingStage) {
        const fullStage = await ProductionStage.findOne({ 
          $or: [
            { slug: matchingStage.id },
            { name: { $regex: new RegExp('^' + matchingStage.name + '$', 'i') } }
          ]
        });
        if (fullStage) {
          srd.currentProductionStage = fullStage._id;
        }
      }
    } else {
      // Check if all stages are completed
      const allCompleted = srd.sampleProcess.every(s => s.status === 'completed');
      if (allCompleted) {
        srd.isComplete = true;
        srd.currentProductionStage = null; // Clear current stage when all are done
      }
    }
    
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
