import dbConnect from "@/lib/db";
import Field from "@/models/Field";
import { NextResponse } from 'next/server';

// GET - list fields (optionally filter by department)
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const department = searchParams.get('department');

        const filter = {};
        if (department) filter.department = department;

        // return only active fields by default
        filter.active = true;

        // Sort by order field, then by creation date
        const fields = await Field.find(filter).sort({ order: 1, createdAt: 1 });
        return NextResponse.json(fields);
    } catch (error) {
        console.error('GET /api/newField error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - create new field
export async function POST(request) {
    try {
        const body = await request.json();
        await dbConnect();
        
        // If no order specified, set it to the highest order + 1 for the department
        if (body.order === undefined) {
            const filter = { department: body.department || 'global', active: true };
            const lastField = await Field.findOne(filter).sort({ order: -1 });
            body.order = lastField ? lastField.order + 1 : 0;
        }
        
        const newField = await Field.create(body);
        return NextResponse.json(newField, { status: 201 });
    } catch (error) {
        console.error('POST /api/newField error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH - update a field (expects ?id=... or body.id)
export async function PATCH(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const body = await request.json();
        await dbConnect();
        const fieldId = id || body.id;
        if (!fieldId) return NextResponse.json({ error: 'Missing field id' }, { status: 400 });

        const updated = await Field.findByIdAndUpdate(fieldId, body, { new: true });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('PATCH /api/newField error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - soft-delete a field by setting active=false (use ?hard=true to actually remove)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const hard = searchParams.get('hard') === 'true';
        if (!id) return NextResponse.json({ error: 'Missing field id' }, { status: 400 });

        await dbConnect();
        if (hard) {
            await Field.findByIdAndDelete(id);
            return NextResponse.json({ success: true });
        }

        const updated = await Field.findByIdAndUpdate(id, { active: false }, { new: true });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('DELETE /api/newField error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}