import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createBackupId, createZipBackup } from './backupUtils.js';

// Load environment variables
dotenv.config();

async function createManualBackup() {
  try {
    console.log('Creating manual backup...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    const backupId = createBackupId('manual-backup');
    const { backupRecord, manifest, backupPath } = await createZipBackup({
      db: mongoose.connection.db,
      backupId,
      type: 'manual',
      location: 'local',
    });

    console.log(`Backed up ${manifest.collectionCount} collections and ${manifest.totalDocuments} documents`);
    console.log(`Uploads included: ${manifest.includesUploads ? 'yes' : 'no'}`);
    console.log(`Backup created: ${backupPath} (${(backupRecord.size / 1024 / 1024).toFixed(2)} MB)`);

    await mongoose.connection.db.collection('backups').insertOne(backupRecord);
    console.log('Backup record saved to database');

    console.log('Manual backup completed successfully!');
    
  } catch (error) {
    console.error('Error creating manual backup:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run the backup
createManualBackup();
