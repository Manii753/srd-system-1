import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ReportGroup from '@/models/ReportGroup';

export async function PATCH(request, context) {
  await dbConnect();
  const { id } = await context.params;
  const body = await request.json();
  const group = await ReportGroup.findByIdAndUpdate(id, body, { new: true })
    .populate('assignedUsers', 'name email role');
  return NextResponse.json({ success: true, data: group });
}

export async function DELETE(request, context) {
  await dbConnect();
  const { id } = await context.params;
  await ReportGroup.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
