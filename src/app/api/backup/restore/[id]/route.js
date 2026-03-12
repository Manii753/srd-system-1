import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import fs from 'fs';
import {
  BACKUP_FORMAT_JSON,
  BACKUP_FORMAT_ZIP,
  createBackupId,
  createZipBackup,
  loadBackupFile,
  normalizeBackupFormat,
  restoreDatabaseCollections,
  restoreUploadsFromZip,
} from '@/lib/backupUtils';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

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

    // Only support local backups for now
    if (backup.location !== 'local') {
      return NextResponse.json({ 
        success: false, 
        message: 'Remote backup restore not implemented yet' 
      }, { status: 400 });
    }

    const filePath = backup.path;
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, message: 'Backup file not found' }, { status: 404 });
    }

    let parsedBackup;
    try {
      parsedBackup = await loadBackupFile(filePath, normalizeBackupFormat(backup));
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: error.message || 'Invalid backup file',
      }, { status: 400 });
    }

    const preRestoreBackupId = createBackupId('pre-restore');
    const { backupRecord: preRestoreBackupRecord } = await createZipBackup({
      db: mongoose.connection.db,
      backupId: preRestoreBackupId,
      type: 'pre-restore',
      location: 'local',
    });
    await mongoose.connection.db.collection('backups').insertOne(preRestoreBackupRecord);

    const databaseSummary = await restoreDatabaseCollections(
      mongoose.connection.db,
      parsedBackup.databaseData
    );
    const uploadSummary = parsedBackup.format === BACKUP_FORMAT_ZIP
      ? await restoreUploadsFromZip(parsedBackup.zip, { tempPrefix: id })
      : {
          filesInBackup: 0,
          filesRestored: 0,
          filesSkipped: 0,
          unsafeEntriesSkipped: 0,
        };

    const restoredCollections = databaseSummary.collections.map((collection) => collection.name);
    const legacyMessage =
      parsedBackup.format === BACKUP_FORMAT_JSON
        ? ' Legacy JSON backups restore database data only and do not include uploaded files.'
        : '';

    return NextResponse.json({
      success: true,
      message: `Backup restored successfully.${legacyMessage}`,
      restoredCollections,
      metadata: parsedBackup.metadata,
      summary: {
        format: parsedBackup.format,
        collectionsProcessed: databaseSummary.collectionsProcessed,
        collectionsSkipped: databaseSummary.collectionsSkipped,
        documentsInserted: databaseSummary.documentsInserted + databaseSummary.documentsInsertedWithoutId,
        documentsReplaced: databaseSummary.documentsReplaced,
        filesInBackup: uploadSummary.filesInBackup,
        filesRestored: uploadSummary.filesRestored,
        filesSkipped: uploadSummary.filesSkipped,
        unsafeEntriesSkipped: uploadSummary.unsafeEntriesSkipped,
        includesUploads: parsedBackup.includesUploads,
        preRestoreBackupId: preRestoreBackupRecord.id,
      },
    });

  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to restore backup',
      error: error.message
    }, { status: 500 });
  }
}
