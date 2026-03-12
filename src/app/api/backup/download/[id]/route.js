import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import fs from 'fs';
import { getBackupMimeType } from '@/lib/backupUtils';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } =await params;

    // Connect to database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Find backup record
    const backup = await mongoose.connection.db
      .collection('backups')
      .findOne({ id });

    if (!backup) {
      return NextResponse.json({ success: false, message: 'Backup not found' }, { status: 404 });
    }

    // For local backups, serve the file
    if (backup.location === 'local') {
      const filePath = backup.path;
      
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ success: false, message: 'Backup file not found' }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': getBackupMimeType(backup),
          'Content-Disposition': `attachment; filename="${backup.name}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    // For Google Drive backups, redirect to the download URL
    if (backup.location === 'google') {
      return NextResponse.redirect(backup.path);
    }

    return NextResponse.json({ success: false, message: 'Invalid backup location' }, { status: 400 });

  } catch (error) {
    console.error('Error downloading backup:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to download backup',
      error: error.message
    }, { status: 500 });
  }
}
