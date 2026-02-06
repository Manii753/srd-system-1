import connectDB from '@/lib/db';
import PrintTemplate from '@/models/PrintTemplate';

export async function GET() {
  await connectDB();

  try {
    // Fetch only the active template directly from DB
    const activeTemplate = await PrintTemplate.findOne({ isActive: true })
      .populate('cells.fieldId');
    
    if (!activeTemplate) {
      return Response.json(
        { error: 'No active template found' }, 
        { status: 404 }
      );
    }
    
    return Response.json(activeTemplate);
  } catch (error) {
    console.error('Error fetching active template:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
