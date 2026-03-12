import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { deleteLocalBackupFileIfExists } from '@/lib/backupUtils';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Get backup settings
    const settings = await mongoose.connection.db
      .collection('backup_settings')
      .findOne({ type: 'global' });

    const retentionDays = settings?.retentionDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Find old backups
    const oldBackups = await mongoose.connection.db
      .collection('backups')
      .find({ 
        createdAt: { $lt: cutoffDate },
        type: { $ne: 'pre-restore' } // Keep pre-restore backups longer
      })
      .toArray();

    let deletedCount = 0;
    let errors = [];

    // Delete old backups
    for (const backup of oldBackups) {
      try {
        // Delete local file if it exists
        if (backup.location === 'local' && backup.path) {
          await deleteLocalBackupFileIfExists(backup);
        }

        // Remove from database
        await mongoose.connection.db
          .collection('backups')
          .deleteOne({ id: backup.id });

        deletedCount++;
      } catch (error) {
        console.error(`Error deleting backup ${backup.id}:`, error);
        errors.push(`Failed to delete ${backup.name}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedCount} old backups.`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Backup cleanup error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to cleanup old backups',
      error: error.message
    }, { status: 500 });
  }
}
