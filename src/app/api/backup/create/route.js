import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { createBackupId, createZipBackup } from '@/lib/backupUtils';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { location = 'local' } = await request.json();

    if (location !== 'local') {
      return NextResponse.json({
        success: false,
        message: 'Google Drive backup is currently disabled. Local ZIP backup is the only supported option.',
      }, { status: 400 });
    }
    
    // Connect to database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const backupId = createBackupId('backup');
    const { backupRecord, manifest } = await createZipBackup({
      db: mongoose.connection.db,
      backupId,
      type: 'manual',
      location: 'local',
    });

    await mongoose.connection.db.collection('backups').insertOne(backupRecord);

    return NextResponse.json({
      success: true,
      message: 'ZIP backup created successfully',
      backup: backupRecord,
      summary: {
        format: manifest.format,
        collectionCount: manifest.collectionCount,
        totalDocuments: manifest.totalDocuments,
        includesUploads: manifest.includesUploads,
      },
    });

  } catch (error) {
    console.error('Backup creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    }, { status: 500 });
  }
}
