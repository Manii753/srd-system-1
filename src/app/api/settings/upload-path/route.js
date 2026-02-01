import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import fs from 'fs';
import path from 'path';

// GET - Get current upload path settings
export async function GET(request) {
  try {
    await dbConnect();
    
    const settings = await Settings.getUploadSettings();
    
    // Check if the path exists and is accessible
    let pathStatus = 'unknown';
    let pathError = null;
    
    try {
      const resolvedPath = settings.uploadPathType === 'network' 
        ? settings.uploadPath 
        : path.resolve(process.cwd(), settings.uploadPath);
      
      if (fs.existsSync(resolvedPath)) {
        // Try to write a test file to check write permissions
        const testFile = path.join(resolvedPath, '.write-test');
        try {
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          pathStatus = 'accessible';
        } catch (writeErr) {
          pathStatus = 'read-only';
          pathError = 'Path exists but is not writable';
        }
      } else {
        pathStatus = 'not-found';
        pathError = 'Path does not exist';
      }
    } catch (err) {
      pathStatus = 'error';
      pathError = err.message;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        pathStatus,
        pathError,
      }
    });
  } catch (error) {
    console.error('Error fetching upload settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Update upload path settings (admin only)
export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const body = await request.json();
    const { uploadPath, uploadPathType } = body;
    
    if (!uploadPath) {
      return NextResponse.json(
        { success: false, error: 'Upload path is required' },
        { status: 400 }
      );
    }
    
    if (!['local', 'network'].includes(uploadPathType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid path type. Must be "local" or "network"' },
        { status: 400 }
      );
    }
    
    // Validate the path
    const resolvedPath = uploadPathType === 'network' 
      ? uploadPath 
      : path.resolve(process.cwd(), uploadPath);
    
    // Try to create the directory if it doesn't exist
    try {
      if (!fs.existsSync(resolvedPath)) {
        fs.mkdirSync(resolvedPath, { recursive: true });
      }
      
      // Test write permissions
      const testFile = path.join(resolvedPath, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (err) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot access or create path: ${err.message}. Please ensure the path exists and is writable.` 
        },
        { status: 400 }
      );
    }
    
    const updatedBy = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
    
    // Save settings
    await Settings.setSetting(
      Settings.KEYS.UPLOAD_PATH, 
      uploadPath, 
      updatedBy,
      'Path where uploaded files are stored'
    );
    
    await Settings.setSetting(
      Settings.KEYS.UPLOAD_PATH_TYPE, 
      uploadPathType, 
      updatedBy,
      'Type of upload path (local or network)'
    );
    
    return NextResponse.json({
      success: true,
      message: 'Upload path settings updated successfully',
      data: {
        uploadPath,
        uploadPathType,
        resolvedPath,
      }
    });
  } catch (error) {
    console.error('Error updating upload settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
