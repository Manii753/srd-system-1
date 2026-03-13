import dbConnect from "@/lib/db";
import Field from "@/models/Field";
import { NextResponse } from 'next/server';

function createClientError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeFieldId(fieldId) {
    if (!fieldId) return null;

    if (typeof fieldId === 'object') {
        if (fieldId._id) return fieldId._id.toString();
        if (fieldId.id) return fieldId.id.toString();
        if (typeof fieldId.toString === 'function') return fieldId.toString();
        return null;
    }

    return fieldId.toString();
}

function normalizeConnectionPayload(body) {
    if (body?.isConnectedTo === false) {
        return {
            ...body,
            connectedFieldId: null,
            connectionType: null,
        };
    }

    return body;
}

async function validateConnectedFieldPayload(fieldPayload, currentFieldId = null) {
    if (!fieldPayload?.isConnectedTo || !fieldPayload?.connectionType) {
        return;
    }

    const connectedFieldId = normalizeFieldId(fieldPayload.connectedFieldId);
    if (!connectedFieldId) {
        throw createClientError('Connected field is required for connected fields.');
    }

    const normalizedCurrentFieldId = normalizeFieldId(currentFieldId);
    if (normalizedCurrentFieldId && connectedFieldId === normalizedCurrentFieldId) {
        throw createClientError('A field cannot be connected to itself.');
    }

    const connectedField = await Field.findById(connectedFieldId).select('type');
    if (!connectedField) {
        throw createClientError('Connected field not found.', 404);
    }

    if (connectedField.type === 'heading') {
        throw createClientError('Heading fields cannot be used as connected targets.');
    }

    if (fieldPayload.connectionType === 'is-attached' && fieldPayload.type !== 'image') {
        throw createClientError('Is Attached connections can only be used on image fields.');
    }
}

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

        // If inReport filter is requested, only return fields marked for reports
        const inReport = searchParams.get('inReport');
        if (inReport === 'true') {
            filter.inReport = true;
        }

        // Sort by inReportOrder when filtering by inReport, otherwise by order
        const sortOrder = inReport === 'true'
            ? { inReportOrder: 1, order: 1, createdAt: 1 }
            : { order: 1, createdAt: 1 };

        const fields = await Field.find(filter)
            .populate('parentHeading', 'name type')
            .populate('connectedFieldId', 'name type department')
            .sort(sortOrder);

        return NextResponse.json(fields);
    } catch (error) {
        console.error('GET /api/newField error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - create new field
export async function POST(request) {
    try {
        let body = normalizeConnectionPayload(await request.json());
        console.log('POST /api/newField body:', body);
        await dbConnect();

        // If no order specified, set it to the highest order + 1 for the department
        if (body.order === undefined) {
            const filter = { department: body.department || 'global', active: true };
            const lastField = await Field.findOne(filter).sort({ order: -1 });
            body.order = lastField ? lastField.order + 1 : 0;
        }

        await validateConnectedFieldPayload(body);

        const newField = await Field.create(body);
        const populatedField = await Field.findById(newField._id)
            .populate('parentHeading', 'name type')
            .populate('connectedFieldId', 'name type department');

        return NextResponse.json(populatedField, { status: 201 });
    } catch (error) {
        console.error('POST /api/newField error', error);
        return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
}

// PATCH - update a field (expects ?id=... or body.id)
export async function PATCH(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        let body = normalizeConnectionPayload(await request.json());
        console.log('PATCH /api/newField body:', body);
        await dbConnect();
        const fieldId = id || body.id;
        if (!fieldId) return NextResponse.json({ error: 'Missing field id' }, { status: 400 });

        const existingField = await Field.findById(fieldId);
        if (!existingField) {
            return NextResponse.json({ error: 'Field not found' }, { status: 404 });
        }

        const mergedFieldPayload = {
            ...existingField.toObject(),
            ...body,
            connectedFieldId: body.connectedFieldId !== undefined
                ? normalizeFieldId(body.connectedFieldId)
                : normalizeFieldId(existingField.connectedFieldId),
        };

        await validateConnectedFieldPayload(mergedFieldPayload, fieldId);

        const updated = await Field.findByIdAndUpdate(fieldId, body, { new: true })
            .populate('parentHeading', 'name type')
            .populate('connectedFieldId', 'name type department');

        return NextResponse.json(updated);
    } catch (error) {
        console.error('PATCH /api/newField error', error);
        return NextResponse.json({ error: error.message }, { status: error.status || 500 });
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

        // If deleting a heading, also remove it as parent from child fields
        const field = await Field.findById(id);
        if (field && field.type === 'heading') {
            await Field.updateMany(
                { parentHeading: id },
                { $unset: { parentHeading: 1 } }
            );
        }

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
