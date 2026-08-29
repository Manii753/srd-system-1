import mongoose from 'mongoose';
import fs from 'fs';
import {
  AUTO_BACKUP_FILE_NAME,
  AUTO_BACKUP_ID,
  createZipBackup,
  deleteLocalBackupFileIfExists,
  getAutomaticBackupPath,
  getBackupsDirectory,
  replaceFileAtomically,
} from './backupUtils.js';
import path from 'path';

export class BackupScheduler {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Backup scheduler started');

    await this.checkScheduledBackups();
    
    // Check for scheduled backups every hour
    this.interval = setInterval(async () => {
      await this.checkScheduledBackups();
    }, 60 * 60 * 1000); // 1 hour
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('Backup scheduler stopped');
  }

  async checkScheduledBackups() {
    try {
      // Connect to database
      if (!mongoose.connection.readyState) {
        await mongoose.connect(process.env.MONGODB_URI);
      }

      // Get backup settings
      const settings = await mongoose.connection.db
        .collection('backup_settings')
        .findOne({ type: 'global' });

      if (!settings || !settings.autoBackup) {
        return; // Auto backup disabled
      }

      // Check if backup is due
      const schedule = await mongoose.connection.db
        .collection('backup_schedule')
        .findOne({ type: 'next_backup' });

      const automaticBackup = await mongoose.connection.db
        .collection('backups')
        .findOne({ id: AUTO_BACKUP_ID });
      const automaticBackupMissing =
        !automaticBackup ||
        !automaticBackup.path ||
        !fs.existsSync(automaticBackup.path);

      if (!schedule) {
        if (automaticBackupMissing) {
          console.log('No automatic backup schedule found. Creating initial rolling backup.');
          await this.createAutomaticBackup(settings);
        }

        await this.scheduleNextBackup(settings.backupFrequency);
        return;
      }

      if (automaticBackupMissing) {
        console.log('Rolling automatic backup is missing. Recreating it now.');
        await this.createAutomaticBackup(settings);
        await this.scheduleNextBackup(settings.backupFrequency);
        return;
      }

      if (new Date() < new Date(schedule.scheduledFor)) {
        return; // Not time yet
      }

      console.log('Creating scheduled backup...');
      await this.createAutomaticBackup(settings);

      // Schedule next backup
      await this.scheduleNextBackup(settings.backupFrequency);

    } catch (error) {
      console.error('Error in backup scheduler:', error);
    }
  }

  async createAutomaticBackup(settings) {
    try {
      const now = new Date();
      const existingAutomaticBackup = await mongoose.connection.db
        .collection('backups')
        .findOne({ id: AUTO_BACKUP_ID });
      const finalBackupPath = getAutomaticBackupPath();
      const tempBackupPath = path.join(
        getBackupsDirectory(),
        `${AUTO_BACKUP_ID}.tmp-${now.toISOString().replace(/[:.]/g, '-')}.zip`
      );
      const { backupRecord, manifest } = await createZipBackup({
        db: mongoose.connection.db,
        backupId: AUTO_BACKUP_ID,
        type: 'automatic',
        location: 'local',
        createdAt: existingAutomaticBackup?.createdAt || now,
        backupPath: tempBackupPath,
        backupName: AUTO_BACKUP_FILE_NAME,
      });

      await replaceFileAtomically(tempBackupPath, finalBackupPath);

      const automaticBackupRecord = {
        ...backupRecord,
        id: AUTO_BACKUP_ID,
        name: AUTO_BACKUP_FILE_NAME,
        path: finalBackupPath,
        createdAt: existingAutomaticBackup?.createdAt || backupRecord.createdAt,
        updatedAt: now,
        lastRunAt: now,
        schedulerMode: 'rolling',
      };

      await mongoose.connection.db.collection('backups').updateOne(
        { id: AUTO_BACKUP_ID },
        {
          $set: automaticBackupRecord,
          $setOnInsert: {
            type: 'automatic',
          },
        },
        { upsert: true }
      );

      await this.cleanupLegacyAutomaticBackups();

      console.log(
        `Rolling automatic ZIP backup updated: ${AUTO_BACKUP_ID} (${manifest.collectionCount} collections, ${manifest.totalDocuments} documents)`
      );

      // Cleanup old backups if needed
      await this.cleanupOldBackups(settings.retentionDays || 30);

    } catch (error) {
      console.error('Error creating automatic backup:', error);
    }
  }

  async cleanupLegacyAutomaticBackups() {
    const legacyAutomaticBackups = await mongoose.connection.db
      .collection('backups')
      .find({
        type: 'automatic',
        id: { $ne: AUTO_BACKUP_ID },
      })
      .toArray();

    for (const backup of legacyAutomaticBackups) {
      try {
        await deleteLocalBackupFileIfExists(backup);
        await mongoose.connection.db.collection('backups').deleteOne({ _id: backup._id });
        console.log(`Deleted legacy automatic backup: ${backup.name}`);
      } catch (error) {
        console.error(`Error deleting legacy automatic backup ${backup.id}:`, error);
      }
    }
  }

  async scheduleNextBackup(frequency) {
    const nextBackupTime = this.calculateNextBackupTime(frequency);
    
    await mongoose.connection.db
      .collection('backup_schedule')
      .updateOne(
        { type: 'next_backup' },
        { 
          $set: { 
            scheduledFor: nextBackupTime,
            frequency: frequency,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

    console.log(`Next backup scheduled for: ${nextBackupTime}`);
  }

  calculateNextBackupTime(frequency) {
    const now = new Date();
    
    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to daily
    }
  }

  async cleanupOldBackups(retentionDays) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Find old automatic backups
      const oldBackups = await mongoose.connection.db
        .collection('backups')
        .find({ 
          createdAt: { $lt: cutoffDate },
          type: { $nin: ['automatic', 'pre-restore'] }
        })
        .toArray();

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

          console.log(`Deleted old backup: ${backup.name}`);
        } catch (error) {
          console.error(`Error deleting backup ${backup.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }
}

// Export singleton instance
export const backupScheduler = new BackupScheduler();
