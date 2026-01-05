import dbConnect from "@/lib/db";
import Field from "@/models/Field";
import { NextResponse } from 'next/server';

// POST - reorder fields
export async function POST(request) {
    try {
        const { fieldOrders, department } = await request.json();
        
        if (!Array.isArray(fieldOrders)) {
            return NextResponse.json({ error: 'fieldOrders must be an array' }, { status: 400 });
        }

        await dbConnect();

        // Update each field's order
        const updatePromises = fieldOrders.map(({ id, order, parentHeading }) => 
            Field.findByIdAndUpdate(id, { 
                order, 
                parentHeading: parentHeading || null 
            }, { new: true })
        );

        const updatedFields = await Promise.all(updatePromises);
        
        return NextResponse.json({ 
            success: true, 
            updatedFields,
            message: 'Field order updated successfully' 
        });
    } catch (error) {
        console.error('POST /api/newField/reorder error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}