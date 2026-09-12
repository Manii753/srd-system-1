import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';

// Matches the dynamic-field entry that represents the "Sample Type" value.
const SAMPLE_TYPE_FIELD_MATCH = {
  $or: [
    { 'dynamicFields.slug': 'sample-type' },
    { 'dynamicFields.name': { $regex: '^sample\\s*type$', $options: 'i' } },
  ],
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Group all in-use sample type values case-insensitively.
// Returns rows like { canonical, count, variants: [{ value, count }] }
export async function GET() {
  await dbConnect();
  const agg = await SRD.aggregate([
    { $unwind: '$dynamicFields' },
    {
      $match: {
        $and: [
          SAMPLE_TYPE_FIELD_MATCH,
          { 'dynamicFields.value': { $type: 'string', $ne: '' } },
        ],
      },
    },
    {
      $project: {
        docId: '$_id',
        norm: {
          $trim: {
            input: {
              $toUpper: { $convert: { input: '$dynamicFields.value', to: 'string', onError: '' } },
            },
          },
        },
        raw: {
          $trim: {
            input: { $convert: { input: '$dynamicFields.value', to: 'string', onError: '' } },
          },
        },
      },
    },
    { $match: { norm: { $ne: '' } } },
    {
      $group: {
        _id: '$norm',
        docs: { $addToSet: '$docId' },
        raws: { $push: '$raw' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const data = agg.map((group) => {
    const variantMap = new Map();
    for (const raw of group.raws) {
      variantMap.set(raw, (variantMap.get(raw) || 0) + 1);
    }
    return {
      canonical: group._id,
      count: group.docs.length,
      variants: [...variantMap.entries()].map(([value, count]) => ({ value, count })),
    };
  });

  return NextResponse.json({ success: true, total: data.length, data });
}

// Rename / merge / delete sample type values across every SRD.
// Body: { values: string[], newValue: string }
//   - values: exact (or case-insensitive) sample type values to rewrite
//   - newValue: the target value; empty string deletes the value from SRDs
export async function POST(request) {
  await dbConnect();
  const body = await request.json();
  const rawValues = Array.isArray(body.values)
    ? body.values.filter((v) => typeof v === 'string' && v.trim().length > 0)
    : [];
  const target = typeof body.newValue === 'string' ? body.newValue.trim() : '';

  if (rawValues.length === 0) {
    return NextResponse.json({ success: false, error: 'Provide at least one existing sample type value' }, { status: 400 });
  }

  const upperValues = rawValues.map((v) => v.toUpperCase());
  const valueClauses = rawValues.map((v) => ({
    'dynamicFields.value': { $regex: new RegExp(`^\\s*${escapeRegex(v)}\\s*$`, 'i') },
  }));

  const updatePipeline = [
    {
      $set: {
        dynamicFields: {
          $map: {
            input: '$dynamicFields',
            as: 'f',
            in: {
              $cond: [
                {
                  $and: [
                    {
                      $or: [
                        { $eq: ['$$f.slug', 'sample-type'] },
                        {
                          $regexMatch: {
                            input: { $ifNull: ['$$f.name', ''] },
                            regex: '^sample\\s*type$',
                            options: 'i',
                          },
                        },
                      ],
                    },
                    {
                      $in: [
                        {
                          $trim: {
                            input: {
                              $toUpper: {
                                $convert: { input: { $ifNull: ['$$f.value', ''] }, to: 'string', onError: '' },
                              },
                            },
                          },
                        },
                        upperValues,
                      ],
                    },
                  ],
                },
                { $mergeObjects: ['$$f', { value: target }] },
                '$$f',
              ],
            },
          },
        },
      },
    },
    { $set: { updatedAt: new Date() } },
  ];

  const result = await SRD.updateMany({ $or: valueClauses }, updatePipeline);

  return NextResponse.json({
    success: true,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
}