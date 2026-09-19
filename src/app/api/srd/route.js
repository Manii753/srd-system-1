import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Company from '@/models/Company';
import User from '@/models/User';
import Notification from '@/models/Notification';
import Field from '@/models/Field';
import ProductionStage from '@/models/ProductionStage';
import Department from '@/models/Department';
import Buyer from '@/models/Buyer';
import Dispatch from '@/models/Dispatch';
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

// Work-queue gating helper: true when any compulsory field belonging to this
// department (or global) is still unfilled on the SRD
function hasUnfilledCompulsoryFields(srd, dept) {
  const fields = Array.isArray(srd?.dynamicFields) ? srd.dynamicFields : [];
  return fields.some(f =>
    f?.requirementLevel === 'compulsory' &&
    (f.department === dept || f.department === 'global') &&
    !hasMeaningfulFieldValue(f.value, f.type)
  );
}

export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const brandsParam = searchParams.get('brands');
    const brandParam = searchParams.get('brand');
    const sampleTypeParam = searchParams.get('sampleType');
    const stageParam = searchParams.get('stage');
    const listBrandsParam = searchParams.get('listBrands') === 'true';
    const readyForProduction = searchParams.get('readyForProduction');
    const inProduction = searchParams.get('inProduction');
    const currentProductionStage = searchParams.get('currentProductionStage');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const completionStatus = searchParams.get('completionStatus'); // 'active', 'completed', 'in-production', 'pre-production'
    const shouldPopulate = searchParams.get('populate') === 'true';
    const selectFields = searchParams.get('select'); // comma-separated field list
    const useLean = searchParams.get('lean') !== 'false'; // lean by default

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

    // Brand + Sample Type + Stage filters are built as explicit $and conditions
    // so multiple dynamic-field filters (and search's top-level $or) compose.
    const andFilters = [];

    // Escape a literal string for use inside a RegExp.
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Filter by brand (single) or brand group (comma-separated list). Matches the
    // same dynamic field (slug 'brand' or name 'brand'/'buyer') shown in the SRD
    // Brand column.
    const brandsToMatch = [];
    if (brandParam) brandsToMatch.push(brandParam);
    if (brandsParam) brandsParam.split(',').map(b => b.trim()).forEach(b => { if (b) brandsToMatch.push(b); });
    if (brandsToMatch.length > 0) {
      andFilters.push({
        'dynamicFields': {
          $elemMatch: {
            value: { $in: brandsToMatch.map(b => new RegExp(`^${escapeRegex(b)}$`, 'i')) },
            $or: [
              { slug: 'brand' },
              { name: { $regex: '^brand$', $options: 'i' } },
              { name: { $regex: '^buyer$', $options: 'i' } },
            ],
          },
        },
      });
    }

    // Filter by sample type (dynamic field slug 'sample-type' or name 'sample type').
    if (sampleTypeParam) {
      andFilters.push({
        'dynamicFields': {
          $elemMatch: {
            value: new RegExp(`^${escapeRegex(sampleTypeParam)}$`, 'i'),
            $or: [
              { slug: 'sample-type' },
              { name: { $regex: '^sample\\s*type$', $options: 'i' } },
            ],
          },
        },
      });
    }

    // Filter by lifecycle stage. Values match STAGE_FILTER_OPTIONS in
    // src/lib/sampleFilters.js.
    if (stageParam && stageParam !== 'all') {
      const stageLower = stageParam.toLowerCase();
      if (stageLower === 'incomplete') {
        andFilters.push({ isComplete: { $ne: true } });
      } else if (stageLower === 'dispatched') {
        andFilters.push({ sampleDispatchedToBuyer: true });
      } else if (stageLower === 'approved') {
        andFilters.push({ BuyerApproved: true });
      } else if (stageLower === 'rejected') {
        andFilters.push({
          $expr: {
            $gt: [
              {
                $add: [
                  { $size: { $ifNull: ['$internalRejectedReasons', []] } },
                  { $size: { $ifNull: ['$BuyerRejectedReasons', []] } },
                ],
              },
              0,
            ],
          },
        });
      } else if (stageLower === 'cad' || stageLower === 'sewing' || stageLower === 'finishing') {
        const stageNameRegex = new RegExp(`^${escapeRegex(stageLower)}$`, 'i');
        const displayNameRegex = new RegExp(`^${escapeRegex(stageLower)}$`, 'i');
        const stageDocs = await ProductionStage.find({
          $or: [{ name: stageNameRegex }, { displayName: displayNameRegex }],
        }).select('_id').lean();
        const stageIds = stageDocs.map(s => s._id);

        const stageMatches = [];
        if (stageIds.length > 0) {
          stageMatches.push(
            { currentProductionStage: { $in: stageIds } },
            {
              'productionHistory': {
                $elemMatch: { stage: { $in: stageIds }, status: 'in-progress' },
              },
            },
          );
        }
        stageMatches.push({
          'sampleProcess': {
            $elemMatch: { stage: stageNameRegex, status: { $in: ['in-progress', 'received'] } },
          },
        });
        // CAD is also handled as a department approval (pre-production CAD sign-off).
        if (stageLower === 'cad') {
          stageMatches.push({
            'status': { $elemMatch: { department: 'cad', value: 'approved' } },
          });
        }
        andFilters.push({
          $and: [
            { $or: stageMatches },
          ],
        });
      }
    }

    if (andFilters.length > 0) {
      if (query.$and) query.$and.push(...andFilters);
      else query.$and = andFilters;
    }

    // listBrands=true returns the distinct brand values across all SRDs so the
    // brand-group manager can populate its picker without loading every row.
    if (listBrandsParam) {
      const agg = await SRD.aggregate([
        { $match: {} },
        { $unwind: '$dynamicFields' },
        {
          $match: {
            'dynamicFields.value': { $type: 'string', $ne: '' },
            $or: [
              { 'dynamicFields.slug': 'brand' },
              { 'dynamicFields.name': { $regex: '^brand$', $options: 'i' } },
              { 'dynamicFields.name': { $regex: '^buyer$', $options: 'i' } },
            ],
          },
        },
        { $project: { v: { $trim: { input: '$dynamicFields.value' } } } },
        { $group: { _id: { $toLower: '$v' }, value: { $first: '$v' } } },
        { $sort: { value: 1 } },
        { $limit: 500 },
      ]);
      return NextResponse.json({
        success: true,
        data: agg.map(x => x.value).filter(Boolean),
        isBrandList: true,
      });
    }

    // listSampleTypes=true returns distinct sample-type values across all SRDs
    const listSampleTypesParam = searchParams.get('listSampleTypes') === 'true';
    if (listSampleTypesParam) {
      const agg = await SRD.aggregate([
        { $unwind: '$dynamicFields' },
        {
          $match: {
            'dynamicFields.value': { $type: 'string', $ne: '' },
            $or: [
              { 'dynamicFields.slug': 'sample-type' },
              { 'dynamicFields.name': { $regex: '^sample\\s*type$', $options: 'i' } },
            ],
          },
        },
        { $project: { v: { $trim: { input: '$dynamicFields.value' } } } },
        { $group: { _id: { $toLower: '$v' }, value: { $first: '$v' } } },
        { $sort: { value: 1 } },
        { $limit: 200 },
      ]);
      return NextResponse.json({
        success: true,
        data: agg.map(x => x.value).filter(Boolean),
      });
    }

    // listFieldValues=<slug or name> returns distinct existing values for any
    // single dynamic field — the backing data for select-dynamic comboboxes
    // (e.g. "brand", "sample-type", or any custom field name).
    const listFieldValuesParam = searchParams.get('listFieldValues');
    if (listFieldValuesParam) {
      const fieldTerm = listFieldValuesParam.trim().slice(0, 100);
      const slugTerm = fieldTerm.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
      const agg = await SRD.aggregate([
        { $unwind: '$dynamicFields' },
        {
          $match: {
            'dynamicFields.value': { $type: 'string', $ne: '' },
            $or: [
              { 'dynamicFields.slug': { $regex: `^${escapeRegex(fieldTerm)}$`, $options: 'i' } },
              { 'dynamicFields.slug': { $regex: `^${escapeRegex(slugTerm)}$`, $options: 'i' } },
              { 'dynamicFields.name': { $regex: `^${escapeRegex(fieldTerm)}$`, $options: 'i' } },
            ],
          },
        },
        { $project: { v: { $trim: { input: '$dynamicFields.value' } } } },
        { $group: { _id: { $toLower: '$v' }, value: { $first: '$v' } } },
        { $sort: { value: 1 } },
        { $limit: 200 },
      ]);
      return NextResponse.json({
        success: true,
        data: agg.map(x => x.value).filter(Boolean),
        isFieldValues: true,
      });
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
      if (completionStatus === 'active') {
        query.isComplete = { $ne: true };
      } else if (completionStatus === 'completed') {
        query.isComplete = true;
      } else if (completionStatus === 'in-production') {
        query.inProduction = true;
        query.isComplete = { $ne: true };
      } else if (completionStatus === 'pre-production') {
        query.inProduction = false;
        query.isComplete = { $ne: true };
      }
    }

    // ── Server-side pagination ──
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    // Default limit is high (500) so callers that don't pass a limit keep working,
    // while paginated consumers (SRDTable) pass explicit small page sizes.
    // Max is 1000: the sample-process module intentionally requests a near-full list.
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit')) || 500));
    const skip = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1;
    const needsWorkQueueGating = department && ['vmd', 'cad', 'commercial', 'mmc'].includes(department.toLowerCase());

    // Count total documents matching the query (before gating)
    const totalCount = await SRD.countDocuments(query);

    let queryExec = SRD.find(query).sort({ [sortBy]: sortDir }).skip(skip).limit(limit);

    if (selectFields) {
      const fieldsList = selectFields
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);

      // Work-queue gating needs dynamicFields + status for compulsory-field checks.
      // If the caller only wants specific fields, force-include these so gating
      // works correctly when a department filter is applied.
      if (needsWorkQueueGating && fieldsList.length > 0 && !fieldsList.includes('dynamicFields')) {
        fieldsList.push('dynamicFields');
      }
      if (needsWorkQueueGating && fieldsList.length > 0 && !fieldsList.includes('status')) {
        fieldsList.push('status');
      }

      const fields = fieldsList.join(' ');
      if (fields) queryExec = queryExec.select(fields);
    }

    if (shouldPopulate) {
      queryExec = queryExec
        .populate('dynamicFields.field')
        .populate('currentProductionStage')
        .populate('productionHistory.stage');
    }

    const shouldPopulateBuyer = searchParams.get('populateBuyer') === 'true';
    if (shouldPopulateBuyer) {
      queryExec = queryExec.populate('BuyerDetails', 'name email contactPerson');
    }

    if (useLean) {
      queryExec = queryExec.lean();
    }

    const srds = await queryExec;

    // ── Work-queue gating (dept-wise) ──
    let responseData = srds;
    if (needsWorkQueueGating) {
      const deptLower = department.toLowerCase();
      responseData = srds.filter(srd => {
        const deptStatus = (Array.isArray(srd.status) ? srd.status : [])
          .find(s => s.department === deptLower)?.value || 'pending';
        if (deptStatus !== 'pending') return true;
        return !hasUnfilledCompulsoryFields(srd, deptLower);
      });
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      count: responseData.length,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + limit < totalCount,
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
          requirementLevel: fieldDef.requirementLevel || 'none',
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
      const allDepartments = await Department.find({});
      const excludedRoles = ['admin', 'production-manager'];
      body.status = allDepartments
        .filter(dept => !excludedRoles.includes(dept.slug))
        .map(dept => ({ department: dept.slug.toLowerCase(), value: 'pending', updatedAt: new Date() }));
    }

    // --- Generate sequential refNo from Company counter with duplicate handling ---
    if (!body.refNo || !String(body.refNo).trim()) {
      let refNoGenerated = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!refNoGenerated && attempts < maxAttempts) {
        attempts++;
        try {
          const company = await Company.findOneAndUpdate(
            {},
            { $inc: { currentSRDNumber: 1 } },
            { new: false, upsert: true, setDefaultsOnInsert: true }
          );
          const prefix = company?.CurrentSRDPrefix ?? 'SRD-';
          const number = company?.currentSRDNumber ?? 1000;
          body.refNo = `${prefix}${number}`;
          refNoGenerated = true;
        } catch (counterError) {
          console.error('Error generating refNo:', counterError);
          if (attempts >= maxAttempts) throw counterError;
        }
      }
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

    // --- Create SRD with duplicate key retry ---
    let newSRD;
    let createAttempts = 0;
    const maxCreateAttempts = 5;

    while (!newSRD && createAttempts < maxCreateAttempts) {
      createAttempts++;
      try {
        newSRD = await SRD.create(body);
      } catch (createError) {
        // Check if it's a duplicate key error (E11000)
        if (createError.code === 11000 && createError.keyPattern?.refNo) {
          console.warn(`Duplicate refNo ${body.refNo}, retrying... (attempt ${createAttempts})`);
          // Generate a new refNo and retry
          const company = await Company.findOneAndUpdate(
            {},
            { $inc: { currentSRDNumber: 1 } },
            { new: false, upsert: true, setDefaultsOnInsert: true }
          );
          const prefix = company?.CurrentSRDPrefix ?? 'SRD-';
          const number = company?.currentSRDNumber ?? 1000;
          body.refNo = `${prefix}${number}`;
          
          // Also update refNo in dynamicFields
          if (body.dynamicFields && Array.isArray(body.dynamicFields)) {
            body.dynamicFields = body.dynamicFields.map(f => {
              if (f.type === 'refNo') {
                return { ...f, value: body.refNo };
              }
              return f;
            });
          }
          
          if (createAttempts >= maxCreateAttempts) throw createError;
        } else {
          throw createError;
        }
      }
    }

    // --- Create notifications for all users (batch insertMany for speed) ---
    // 1. Get the departments
    const departments = await Department.find({ type: 'support' });

    // 2. Extract the slugs into a flat array: ['slug1', 'slug2', ...]
    const departmentSlugs = departments.map(d => d.slug);

    // 3. Find users where their department field matches any slug in that array
    const users = await User.find({ department: { $in: departmentSlugs } }, '_id');
    const notificationDocs = users.map(user => ({
      user: user._id,
      srd: newSRD._id,
      message: `New SRD created: ${newSRD.refNo} `,
    }));
    await Notification.insertMany(notificationDocs);

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
