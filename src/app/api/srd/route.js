import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Company from '@/models/Company';
import User from '@/models/User';
import Notification from '@/models/Notification';
import Field from '@/models/Field';
import ProductionStage from '@/models/ProductionStage';
import pusher from '@/lib/pusher-server';
import mongoose from 'mongoose';

function hasMeaningfulFieldValue(value, type) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'string') return value.trim() !== '';

  if (Array.isArray(value)) {
    return value.some(item => hasMeaningfulFieldValue(item, type));
  }

  if (typeof value === 'object') {
    if (type === 'table') {
      const rows = Array.isArray(value.rows) ? value.rows : [];
      const predefinedData = Array.isArray(value.predefinedData) ? value.predefinedData : [];

      const hasRowContent = rows.some(row =>
        Array.isArray(row) && row.some(cell => typeof cell === 'string' ? cell.trim() !== '' : !!cell)
      );

      const hasPredefinedContent = predefinedData.some(item =>
        (typeof item?.opd === 'string' && item.opd.trim() !== '') ||
        (typeof item?.etd === 'string' && item.etd.trim() !== '') ||
        item?.purchaseType === 'instock'
      );

      return hasRowContent || hasPredefinedContent;
    }

    return Object.values(value).some(item => hasMeaningfulFieldValue(item, type));
  }

  return false;
}

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const readyForProduction = searchParams.get('readyForProduction');
    const inProduction = searchParams.get('inProduction');
    const currentProductionStage = searchParams.get('currentProductionStage');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const completionStatus = searchParams.get('completionStatus'); // 'completed', 'in-production', 'pre-production'
    const shouldPopulate = searchParams.get('populate') === 'true';

    let query = {};

    // Filter by department status
    if (department === 'dispatch') {
      query['inDispatch'] = true;
    } else if (department && department !== 'all') {
      const deptLower = department.toLowerCase();
      if (status && status !== 'all') {
        query['status'] = { $elemMatch: { department: deptLower, value: status } };
      } else {
        query['status'] = { $elemMatch: { department: deptLower } };
      }
    } else if (status && status !== 'all') {
      query['status'] = { $elemMatch: { value: status } };
    }

    // Filter by readyForProduction
    if (readyForProduction === 'true') {
      query['readyForProduction'] = true;
    } else if (readyForProduction === 'false') {
      query['readyForProduction'] = false;
    }

    // Filter by inProduction
    if (inProduction === 'true') {
      query['inProduction'] = true;
    } else if (inProduction === 'false') {
      query['inProduction'] = false;
    }

    // Filter by currentProductionStage
    if (currentProductionStage) {
      // Convert string to ObjectId if it's a valid MongoDB ObjectId
      if (mongoose.Types.ObjectId.isValid(currentProductionStage)) {
        query['currentProductionStage'] = new mongoose.Types.ObjectId(currentProductionStage);
      } else {
        query['currentProductionStage'] = currentProductionStage;
      }
    }

    // Search by refNo or title
    if (search) {
      query['$or'] = [
        { refNo: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }



    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        // Ensure start date covers the full day (00:00:00)
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        // Ensure end date covers the full day (23:59:59)
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Filter by completion status
    if (completionStatus) {
      if (completionStatus === 'completed') {
        query.isComplete = true;
      } else if (completionStatus === 'in-production') {
        query.inProduction = true;
        query.isComplete = { $ne: true };
      } else if (completionStatus === 'pre-production') {
        query.inProduction = false;
        query.isComplete = { $ne: true };
      }
    }

    let queryExec = SRD.find(query).sort({ createdAt: -1 });

    if (shouldPopulate) {
      // Populate field and production-stage references used by dynamic report templates.
      queryExec = queryExec
        .populate('dynamicFields.field')
        .populate('currentProductionStage')
        .populate('productionHistory.stage');
    }

    // Optionally populate BuyerDetails (used by merge email picker)
    const shouldPopulateBuyer = searchParams.get('populateBuyer') === 'true';
    if (shouldPopulateBuyer) {
      queryExec = queryExec.populate('BuyerDetails', 'name email contactPerson');
    }

    const srds = await queryExec;
    const count = await SRD.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: srds,
      count,
    });
  } catch (error) {
    console.error('Error in GET /api/srd:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    console.log('POST /api/srd body:', body);
    console.log('POST /api/srd body:', JSON.stringify(body).slice(0, 1000));

    // `srd.images` is legacy-only. New assets live in dynamicFields.value.
    delete body.images;

    // Ensure dynamicFields is properly formatted as an array of objects
    if (body.dynamicFields && typeof body.dynamicFields === 'string') {
      body.dynamicFields = JSON.parse(body.dynamicFields);
    }
    if (!Array.isArray(body.dynamicFields)) {
      body.dynamicFields = [];
    }
    body.dynamicFields = body.dynamicFields.map(field => {
      const isOptional = !!field.isOptional;
      const hasExplicitOptionalState = typeof field.isOptionalEnabled === 'boolean';

      return {
        ...field,
        isOptional,
        isOptionalEnabled: isOptional
          ? (hasExplicitOptionalState ? field.isOptionalEnabled : hasMeaningfulFieldValue(field.value, field.type))
          : true,
      };
    });
    console.log('Sanitized dynamicFields:', JSON.stringify(body.dynamicFields));

    // --- Populate missing dynamic fields ---
    // Fetch all active fields to ensure the SRD has a complete set of dynamic fields
    // even if the frontend didn't send them all.
    const allActiveFields = await Field.find({ active: true }).lean();

    // Create a map of existing fields in the body for quick lookup
    const existingFieldIds = new Set(
      body.dynamicFields
        .filter(f => f.field) // Ensure field property exists
        .map(f => f.field.toString())
    );

    // Iterate through all active fields definition
    for (const fieldDef of allActiveFields) {
      // If this active field is NOT in the incoming body, add it with null value
      if (!existingFieldIds.has(fieldDef._id.toString())) {
        body.dynamicFields.push({
          field: fieldDef._id,
          department: fieldDef.department,
          name: fieldDef.name,
          slug: fieldDef.slug,
          type: fieldDef.type,
          value: null, // Initialize with null
          isRequired: fieldDef.isRequired,
          isOptional: !!fieldDef.isOptional,
          isOptionalEnabled: fieldDef.isOptional ? false : true,
          placeholder: fieldDef.placeholder,
          order: fieldDef.order,
          // For parentHeading, we might need to fetch the parent field name if it's populated in FieldSchema
          // But based on SRD schema it stores heading name string. 
          // If FieldDef doesn't have the heading name populated, we might leave it or fetch it.
          // For now, let's leave it undefined if not easily available, or rely on frontend to send it if critical.
          // However, the requirement is just to populate the field.
          parentHeading: fieldDef.parentHeading ? undefined : undefined,
          // Note: If parentHeading in SRD is a string name, we can't easily get it here without populating.
          // The prompt asked for "populate those fields before hand so we have their null or empty values".

          fieldVersion: new Date(),
          originalFieldId: fieldDef._id.toString()
        });
      }
    }

    // Use the status from the request body if it exists, otherwise initialize for all departments
    if (!body.status || (Array.isArray(body.status) && body.status.length === 0)) {
      const Department = require('@/models/Department').default;
      const allDepartments = await Department.find({});
      const excludedRoles = ['admin', 'production-manager'];
      body.status = allDepartments
        .filter(dept => !excludedRoles.includes(dept.slug))
        .map(dept => ({ department: dept.slug.toLowerCase(), value: 'pending', updatedAt: new Date() }));
    }

    // --- Generate sequential refNo from Company counter ---
    if (!body.refNo || !String(body.refNo).trim()) {
      // Atomically claim the current number and increment for the next SRD
      const company = await Company.findOneAndUpdate(
        {},
        { $inc: { currentSRDNumber: 1 } },
        { new: false } // return pre-increment value so we use the current number
      );
      const prefix = company?.CurrentSRDPrefix ?? 'SRD-';
      const number = company?.currentSRDNumber ?? 1000;
      body.refNo = `${prefix}${number}`;
    }

    // Auto-populate refNo-typed dynamic fields with the SRD's refNo
    if (body.dynamicFields && Array.isArray(body.dynamicFields)) {
      body.dynamicFields = body.dynamicFields.map(f => {
        if (f.type === 'refNo') {
          return { ...f, value: body.refNo };
        }
        return f;
      });
    }
    // -- IN Future If user wants to add the productionstages through body he can do it --
    // --- Populate production stages ---
    if (!body.productionStages || body.productionStages.length === 0) {
      const activeStages = await ProductionStage.find({ isActive: true }).sort({ order: 1 }).lean();
      body.productionStages = activeStages.map(stage => stage._id);
    }

    // --- Create SRD ---
    const newSRD = await SRD.create(body);

    // --- Create notifications for all users ---
    const users = await User.find({});
    const notificationPromises = users.map((user) =>
      Notification.create({
        user: user._id,
        srd: newSRD._id,
        message: `New SRD created: ${newSRD.refNo} `,
      })
    );
    await Promise.all(notificationPromises);

    // --- Trigger Pusher event (non-blocking, optional) ---
    try {
      if (process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET) {
        await pusher.trigger('srd-events', 'srd:new', newSRD);
        console.log('Pusher event triggered: srd:new', newSRD.refNo);
      }
    } catch (pusherError) {
      console.warn('Pusher trigger failed (non-blocking):', pusherError.message);
    }

    return NextResponse.json({
      success: true,
      data: newSRD,
      message: 'SRD created successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/srd:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
