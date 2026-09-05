import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { deleteLocalBackupFileIfExists } from '@/lib/backupUtils';

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Delete local file if it exists
    if (backup.location === 'local' && backup.path) {
      try {
        await deleteLocalBackupFileIfExists(backup);
      } catch (error) {
        console.error('Error deleting local backup file:', error);
      }
    }

    // TODO: Delete from Google Drive if needed
    if (backup.location === 'google') {
      // Implement Google Drive deletion
      console.log('Google Drive deletion not implemented yet');
    }

    // Remove backup record from database
    await mongoose.connection.db
      .collection('backups')
      .deleteOne({ id });

    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting backup:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete backup',
      error: error.message
    }, { status: 500 });
  }
}
