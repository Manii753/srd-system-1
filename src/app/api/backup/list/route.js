import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { AUTO_BACKUP_ID, getBackupSortDate, normalizeBackupFormat } from '@/lib/backupUtils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Get backup records from database
    const backupDocuments = await mongoose.connection.db
      .collection('backups')
      .find({})
      .toArray();

    const automaticBackups = backupDocuments.filter((backup) => backup.type === 'automatic');
    const preferredAutomaticBackup = automaticBackups.find((backup) => backup.id === AUTO_BACKUP_ID)
      || automaticBackups.sort((left, right) => {
        return new Date(getBackupSortDate(right) || 0) - new Date(getBackupSortDate(left) || 0);
      })[0];

    const backups = backupDocuments
      .filter((backup) => backup.type !== 'automatic')
      .concat(preferredAutomaticBackup ? [preferredAutomaticBackup] : [])
      .sort((left, right) => {
        return new Date(getBackupSortDate(right) || 0) - new Date(getBackupSortDate(left) || 0);
      });

    return NextResponse.json({
      success: true,
      backups: backups.map(backup => ({
        id: backup.id,
        name: backup.name,
        location: backup.location,
        size: backup.size,
        createdAt: backup.createdAt,
        updatedAt: backup.updatedAt || null,
        lastRunAt: backup.lastRunAt || null,
        status: backup.status,
        type: backup.type,
        format: normalizeBackupFormat(backup),
        includesUploads: typeof backup.includesUploads === 'boolean'
          ? backup.includesUploads
          : normalizeBackupFormat(backup) === 'zip-v2',
        collectionCount: backup.collectionCount || 0,
        totalDocuments: backup.totalDocuments || 0,
      }))
    });

  } catch (error) {
    console.error('Error fetching backups:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch backups',
      error: error.message
    }, { status: 500 });
  }
}
