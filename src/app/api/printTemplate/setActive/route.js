import connectDB from '@/lib/db';
import PrintTemplate from '@/models/PrintTemplate';

export async function POST(request) {
  await connectDB();
  const { templateId } = await request.json();

  try {
    // Deactivate all templates
    await PrintTemplate.updateMany({}, { isActive: false });
    
    // Activate the selected template
    const template = await PrintTemplate.findByIdAndUpdate(
      templateId,
      { isActive: true },
      { new: true }
    );
    
    return Response.json(template);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}