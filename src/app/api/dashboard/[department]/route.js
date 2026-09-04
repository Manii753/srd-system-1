import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import Department from '@/models/Department';
import Stage from '@/models/Stage';
import Field from '@/models/Field';

export async function GET(request, { params }) {
  await dbConnect();
  const { department } = await params;

  try {
    // Fetch department info
    const deptData = await Department.findOne({ slug: department });

    // Build SRD query filtered at the database level
    let srdQuery = {};
    if (department !== 'admin') {
      srdQuery['status.department'] = department;
    }

    // Fetch only the most recent SRDs - dashboards only need recent + stats
    const limit = 50;
    const srds = await SRD.find(srdQuery).sort({ createdAt: -1 }).limit(limit).lean();

    const departmentSRDs = srds;

    // Fetch active stages
    const stages = await Stage.find({ isActive: true }).sort({ order: 1 });

    // Fetch fields for this department
    const fields = await Field.find({
      active: true,
      $or: [
        { department: department },
        { department: 'global' }
      ]
    });

    // Calculate statistics
    const stats = {
      total: department === 'admin'
        ? await SRD.countDocuments({})
        : await SRD.countDocuments({ 'status.department': department }),
      byStage: {}
    };

    // Count by stage using aggregation instead of fetching all
    const pipeline = [
      { $match: srdQuery },
      { $unwind: '$status' },
    ];
    if (department !== 'admin') {
      pipeline.push({ $match: { 'status.department': department } });
    }
    pipeline.push({ $group: { _id: '$status.value', count: { $sum: 1 } } });

    const stageCounts = await SRD.aggregate(pipeline);

    stageCounts.forEach(item => {
      stats.byStage[item._id] = item.count;
    });

    // Additional stats for admin
    if (department === 'admin') {
      stats.completed = await SRD.countDocuments({ progress: 100 });
      stats.inProgress = await SRD.countDocuments({ progress: { $gt: 0, $lt: 100 } });
    }

    return NextResponse.json({
      success: true,
      data: {
        department: deptData,
        stats,
        stages,
        fields,
        recentSRDs: departmentSRDs.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
