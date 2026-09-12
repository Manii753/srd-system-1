import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ReportGroup from '@/models/ReportGroup';

export async function GET() {
  await dbConnect();
  const groups = await ReportGroup.find().populate('assignedUsers', 'name email role').sort({ name: 1 });
  return NextResponse.json({ success: true, data: groups });
}

export async function POST(request) {
  await dbConnect();
  const body = await request.json();
  const group = await ReportGroup.create({
    name: body.name,
    brands: body.brands || [],
    assignedUsers: body.assignedUsers || [],
    representatives: body.representatives || [],
    color: body.color || '#2d6a2d',
  });
  return NextResponse.json({ success: true, data: group });
}
