import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';

// MIME type mapping
const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
};

// Helper function to get the upload directory
async function getUploadDir() {
  try {
    await dbConnect();
    const settings = await Settings.getUploadSettings();
    
    let uploadsDir;
    if (settings.uploadPathType === 'network') {
      uploadsDir = settings.uploadPath;
    } else {
      uploadsDir = path.resolve(process.cwd(), settings.uploadPath);
    }
    
    return uploadsDir;
  } catch (error) {
    console.error('Error getting upload settings, using default:', error);
    return path.join(process.cwd(), 'public', 'uploads');
  }
}

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams.filename;
    
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }
    
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    
    const uploadsDir = await getUploadDir();
    const filePath = path.join(uploadsDir, sanitizedFilename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Try fallback to public/uploads
      const fallbackPath = path.join(process.cwd(), 'public', 'uploads', sanitizedFilename);
      if (fs.existsSync(fallbackPath)) {
        return serveFile(fallbackPath, sanitizedFilename);
      }
      
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
    
    return serveFile(filePath, sanitizedFilename);
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function serveFile(filePath, filename) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Content-Length', fileBuffer.length.toString());
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  
  // For images, allow inline display
  if (contentType.startsWith('image/')) {
    headers.set('Content-Disposition', `inline; filename="${filename}"`);
  } else {
    // For other files, suggest download
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  }
  
  return new NextResponse(fileBuffer, {
    status: 200,
    headers,
  });
}

// DELETE - Delete a file (admin only)
export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams.filename;
    
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }
    
    const sanitizedFilename = path.basename(filename);
    const uploadsDir = await getUploadDir();
    const filePath = path.join(uploadsDir, sanitizedFilename);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
    
    fs.unlinkSync(filePath);
    
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
