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
    const template = await PrintTemplate.create(body);
    return Response.json(template);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const body = await request.json();

  try {
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