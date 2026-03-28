import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Buyer from '@/models/Buyer';

export async function PATCH(request, context) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();

    const buyer = await Buyer.findByIdAndUpdate(
      id,
      {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        contactPerson: body.contactPerson,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    );

    if (!buyer) {
      return NextResponse.json({ success: false, error: 'Buyer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: buyer });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
