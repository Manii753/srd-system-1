import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import {
  BACKUP_FORMAT_JSON,
  BACKUP_FORMAT_ZIP,
  createBackupTimestamp,
  ensureDirectoryExists,
  getBackupsDirectory,
  loadBackupFile,
  sanitizeBackupFileName,
} from '@/lib/backupUtils';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('backup');
    
    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 });
    }

    // Connect to database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const originalFileName = sanitizeBackupFileName(file.name || 'uploaded-backup.zip');
    const extension = path.extname(originalFileName).toLowerCase();
    if (!['.zip', '.json'].includes(extension)) {
      return NextResponse.json({
        success: false,
        message: 'Only ZIP backups and legacy JSON backups are supported.',
      }, { status: 400 });
    }

    const backupDir = await ensureDirectoryExists(getBackupsDirectory());
    const fileName = `uploaded-backup-${createBackupTimestamp()}-${originalFileName}`;
    const filePath = path.join(backupDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    let parsedBackup;
    try {
      parsedBackup = await loadBackupFile(
        filePath,
        extension === '.zip' ? BACKUP_FORMAT_ZIP : BACKUP_FORMAT_JSON
      );
    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return NextResponse.json({ 
        success: false, 
        message: error.message || 'Invalid backup file format',
      }, { status: 400 });
    }

    const stats = fs.statSync(filePath);
    const metadata = parsedBackup.metadata || {};
    const collectionList = Array.isArray(metadata.collections)
      ? metadata.collections
      : Object.keys(parsedBackup.databaseData || {});
    const totalDocuments = metadata.totalDocuments || Object.values(parsedBackup.databaseData || {}).reduce(
      (sum, collectionDocuments) => sum + (Array.isArray(collectionDocuments) ? collectionDocuments.length : 0),
      0
    );

    const backupRecord = {
      id: fileName.replace(path.extname(fileName), ''),
      name: originalFileName,
      location: 'local',
      size: stats.size,
      createdAt: new Date(),
      status: 'completed',
      path: filePath,
      type: 'uploaded',
      format: parsedBackup.format,
      includesUploads: parsedBackup.includesUploads,
      collectionCount: metadata.collectionCount || collectionList.length,
      totalDocuments,
    };

    await mongoose.connection.db.collection('backups').insertOne(backupRecord);

    return NextResponse.json({
      success: true,
      message: 'Backup uploaded successfully',
      backup: backupRecord,
      summary: {
        format: parsedBackup.format,
        includesUploads: parsedBackup.includesUploads,
        collectionCount: backupRecord.collectionCount,
        totalDocuments: backupRecord.totalDocuments,
      },
    });

  } catch (error) {
    console.error('Backup upload error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to upload backup',
      error: error.message
    }, { status: 500 });
  }
}
