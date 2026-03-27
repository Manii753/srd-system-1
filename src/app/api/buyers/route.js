import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Buyer from '@/models/Buyer';

export async function GET() {
  try {
    await dbConnect();
    const buyers = await Buyer.find().sort({ name: 1 });
    return NextResponse.json({ success: true, data: buyers });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const buyer = await Buyer.create({
      name: body.name,
      email: body.email || [],
      phone: body.phone || [],
      address: body.address || '',
    });
    return NextResponse.json({ success: true, data: buyer });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
