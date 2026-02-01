import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';

// Helper function to get the upload directory
async function getUploadDir() {
  try {
    await dbConnect();
    const settings = await Settings.getUploadSettings();
    
    let uploadsDir;
    if (settings.uploadPathType === 'network') {
      // Network path - use as-is
      uploadsDir = settings.uploadPath;
    } else {
      // Local path - resolve relative to project root
      uploadsDir = path.resolve(process.cwd(), settings.uploadPath);
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    return {
      uploadsDir,
      isCustomPath: settings.uploadPath !== './public/uploads' && settings.uploadPath !== 'public/uploads',
      pathType: settings.uploadPathType
    };
  } catch (error) {
    console.error('Error getting upload settings, using default:', error);
    // Fallback to default public/uploads
    const defaultDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    return {
      uploadsDir: defaultDir,
      isCustomPath: false,
      pathType: 'local'
    };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { fileName, fileData } = body;

    if (!fileName || !fileData) {
      return NextResponse.json({ success: false, error: 'Missing fileName or fileData' }, { status: 400 });
    }

    const { uploadsDir, isCustomPath } = await getUploadDir();

    // handle data URL or raw base64
    const matches = fileData.match(/^data:(.+);base64,(.+)$/);
    let base64Data = fileData;
    if (matches) {
      base64Data = matches[2];
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
    const uniqueName = `${Date.now()}-${safeName}`;
    const filePath = path.join(uploadsDir, uniqueName);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    // If using custom path, return API URL for serving
    // If using default public/uploads, return direct URL
    let url;
    if (isCustomPath) {
      // Use API endpoint to serve files from custom path
      url = `/api/uploads/serve/${uniqueName}`;
    } else {
      // Direct URL for public folder
      url = `/uploads/${uniqueName}`;
    }

    return NextResponse.json({ success: true, url, fileName: uniqueName });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET - List uploaded files (optional, for admin)
export async function GET(request) {
  try {
    const { uploadsDir } = await getUploadDir();
    
    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ success: true, files: [] });
    }
    
    const files = fs.readdirSync(uploadsDir)
      .filter(file => !file.startsWith('.'))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return NextResponse.json({ success: true, files, count: files.length });
  } catch (error) {
    console.error('Error listing uploads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
