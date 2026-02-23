import connectDB from '@/lib/db';
import PrintTemplate from '@/models/PrintTemplate';

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const template = await PrintTemplate.findById(id).populate('cells.fieldId');
      return Response.json(template);
    }

    // Get all templates (no department filter)
    const templates = await PrintTemplate.find().sort({ createdAt: -1 });
    return Response.json(templates);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  const body = await request.json();

  try {
    // Validate and sanitize cells data
    const sanitizedCells = (body.cells || []).map(cell => {
      // Handle custom elements (no fieldId)
      if (cell.isCustom) {
        return {
          fieldId: null,
          isCustom: true,
          containerId: cell.containerId,
          customType: cell.customType || 'custom-text',
          customValue: cell.customValue || '',
          customPlaceholder: cell.customPlaceholder || '',
          position: {
            colSpan: cell.position?.colSpan || 1,
            rowSpan: cell.position?.rowSpan || 1,
            height: cell.position?.height || 'auto',
          },
        };
      }

      // Handle regular database field elements
      return {
        fieldId: cell.fieldId,
        isCustom: false,
        containerId: cell.containerId,
        customType: null,
        customValue: null,
        customPlaceholder: null,
        position: {
          colSpan: cell.position?.colSpan || 1,
          rowSpan: cell.position?.rowSpan || 1,
          height: cell.position?.height || 'auto',
        },
      };
    });

    const templateData = {
      ...body,
      containers: body.containers || [],
      cells: sanitizedCells,
    };

    const template = await PrintTemplate.create(templateData);
    return Response.json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const body = await request.json();

  try {
    // Sanitize cells if they're being updated
    if (body.cells) {
      body.cells = body.cells.map(cell => {
        if (cell.isCustom) {
          return {
            fieldId: null,
            isCustom: true,
            containerId: cell.containerId,
            customType: cell.customType || 'custom-text',
            customValue: cell.customValue || '',
            customPlaceholder: cell.customPlaceholder || '',
            position: {
              colSpan: cell.position?.colSpan || 1,
              rowSpan: cell.position?.rowSpan || 1,
              height: cell.position?.height || 'auto',
            },
          };
        }

        return {
          fieldId: cell.fieldId,
          isCustom: false,
          containerId: cell.containerId,
          customType: null,
          customValue: null,
          customPlaceholder: null,
          position: {
            colSpan: cell.position?.colSpan || 1,
            rowSpan: cell.position?.rowSpan || 1,
            height: cell.position?.height || 'auto',
          },
        };
      });
    }

    const template = await PrintTemplate.findByIdAndUpdate(
      id,
      body,
      { new: true }
    );
    return Response.json(template);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    await PrintTemplate.findByIdAndDelete(id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}