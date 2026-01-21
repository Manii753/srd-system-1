import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import User from '@/models/User';
import Notification from '@/models/Notification';
import pusher from '@/lib/pusher-server';
import mongoose from 'mongoose';
import { notifySRDCreation } from '@/lib/emailService';

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

    let query = {};

    // Filter by department status (handle both uppercase and lowercase keys)
    if (department && department !== 'all') {
      const deptUpper = department.toUpperCase();
      const deptLower = department.toLowerCase();
      query['$or'] = [
        { [`status.${deptUpper}`]: { $exists: true } },
        { [`status.${deptLower}`]: { $exists: true } }
      ];
    }

    // Filter by status (handle both uppercase and lowercase keys)
    if (status && status !== 'all') {
      if (department && department !== 'all') {
        const deptUpper = department.toUpperCase();
        const deptLower = department.toLowerCase();
        query['$or'] = [
          { [`status.${deptUpper}`]: status },
          { [`status.${deptLower}`]: status }
        ];
      } else {
        query['$or'] = [
          { 'status.vmd': status },
          { 'status.VMD': status },
          { 'status.cad': status },
          { 'status.CAD': status },
          { 'status.commercial': status },
          { 'status.COMMERCIAL': status },
          { 'status.mmc': status },
          { 'status.MMC': status },
        ];
      }
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

    const srds = await SRD.find(query).sort({ createdAt: -1 });
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

    // Normalize images array
    if (body.images && Array.isArray(body.images)) {
      body.images = body.images.flat().map((v) => String(v));
    }

    // Ensure dynamicFields is properly formatted as an array of objects
    if (body.dynamicFields && typeof body.dynamicFields === 'string') {
      body.dynamicFields = JSON.parse(body.dynamicFields);
    }
    if (!Array.isArray(body.dynamicFields)) {
      body.dynamicFields = [];
    }
    console.log('Sanitized dynamicFields:', JSON.stringify(body.dynamicFields));

    // Use the status from the request body if it exists, otherwise initialize for all departments
    if (!body.status || Object.keys(body.status).length === 0) {
      const Department = require('@/models/Department').default;
      const allDepartments = await Department.find({});
      const initialStatus = {};
      const excludedRoles = ['admin', 'production-manager'];
      allDepartments.forEach(dept => {
        if (!excludedRoles.includes(dept.slug)) {
          // Use lowercase keys to match the frontend expectations
          initialStatus[dept.slug.toLowerCase()] = 'pending';
        }
      });
      body.status = initialStatus;
    }

    // --- Generate unique refNo if not provided ---
    const generateRefNo = () => {
      const d = new Date();
      const pad = (n, l = 2) => String(n).padStart(l, '0');
      const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
        d.getMinutes()
      )}${pad(d.getSeconds())}-${d.getMilliseconds()}`;
      return `SRD${ts}-${Math.floor(Math.random() * 9000) + 1000}`;
    };

    if (!body.refNo || !String(body.refNo).trim()) {
      body.refNo = generateRefNo();
    }

    // --- Retry creation on duplicate refNo ---
    let newSRD;
    let attempts = 0;
    const maxAttempts = 5;

    while (true) {
      try {
        newSRD = await SRD.create(body);
        break;
      } catch (err) {
        const isDuplicateRef =
          err &&
          (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) &&
          err.message &&
          err.message.includes('refNo');

        if (isDuplicateRef && attempts < maxAttempts) {
          attempts++;
          body.refNo = generateRefNo();
          continue;
        }
        throw err;
      }
    }

    // --- Create notifications for all users ---
    const users = await User.find({});
    const notificationPromises = users.map((user) =>
      Notification.create({
        user: user._id,
        srd: newSRD._id,
        message: `New SRD created: ${newSRD.refNo}`,
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

    // --- Send Email Notification (non-blocking) ---
    try {
      await notifySRDCreation(newSRD);
      console.log('Email notification sent for SRD:', newSRD.refNo);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
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