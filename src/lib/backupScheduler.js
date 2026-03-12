import mongoose from 'mongoose';
import {
  createBackupId,
  createZipBackup,
  deleteLocalBackupFileIfExists,
} from './backupUtils.js';

export class BackupScheduler {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Backup scheduler started');
    
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

      if (!schedule || new Date() < new Date(schedule.scheduledFor)) {
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
      const backupId = createBackupId('auto-backup');
      const { backupRecord, manifest } = await createZipBackup({
        db: mongoose.connection.db,
        backupId,
        type: 'automatic',
        location: 'local',
      });

      await mongoose.connection.db.collection('backups').insertOne(backupRecord);

      console.log(
        `Automatic ZIP backup created: ${backupId} (${manifest.collectionCount} collections, ${manifest.totalDocuments} documents)`
      );

      // Cleanup old backups if needed
      await this.cleanupOldBackups(settings.retentionDays || 30);

    } catch (error) {
      console.error('Error creating automatic backup:', error);
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
          type: 'automatic'
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
