'use client';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SRD from '@/models/SRD';
import pusher from '@/lib/pusher-server';

export async function PATCH(request, context) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();
    const { department, comment, author, role } = body;

    if (!department || !comment || !author || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const srd = await SRD.findById(id);

    if (!srd) {
      return NextResponse.json({ success: false, error: 'SRD not found' }, { status: 404 });
    }

    if (srd.status && !Array.isArray(srd.status)) {
      const flatStatus = srd.status;
      srd.status = Object.entries(flatStatus).map(([d, v]) => ({ department: d, value: String(v), updatedAt: new Date() }));
    }
    if (!srd.status) srd.status = [];
    const flagEntry = srd.status.find(s => s.department === department);
    if (flagEntry) {
      flagEntry.value = 'flagged';
      flagEntry.updatedAt = new Date();
    } else {
      srd.status.push({ department, value: 'flagged', updatedAt: new Date() });
    }
    srd.markModified('status');
    srd.comments.push({
      department,
      author,
      role,
      text: comment,
      date: new Date(),
    });

    srd.audit.push({
      department,
      author,
      action: 'flagged',
      comment,
      date: new Date(),
    });

    const updatedSRD = await srd.save();

    await pusher.trigger(`srd-${id}`, 'srd:flag', {
      department,
      status: 'flagged',
      comment: { text: comment, author, role },
    });

    return NextResponse.json({
      success: true,
      data: updatedSRD,
      message: `${department.toUpperCase()} department flagged successfully`,
    });
  } catch (error) {
    console.error('Error flagging SRD:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}