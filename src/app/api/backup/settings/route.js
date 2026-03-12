import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

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

    // Get backup settings
    let settings = await mongoose.connection.db
      .collection('backup_settings')
      .findOne({ type: 'global' });

    // Default settings if none exist
    if (!settings) {
      settings = {
        type: 'global',
        autoBackup: true,
        retentionDays: 30,
        backupLocation: 'local',
        googleDriveEnabled: false,
        backupFrequency: 'daily',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await mongoose.connection.db
        .collection('backup_settings')
        .insertOne(settings);
    }

    return NextResponse.json({
      success: true,
      settings: {
        autoBackup: settings.autoBackup,
        retentionDays: settings.retentionDays,
        backupLocation: 'local',
        googleDriveEnabled: false,
        backupFrequency: settings.backupFrequency
      }
    });

  } catch (error) {
    console.error('Error fetching backup settings:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch backup settings',
      error: error.message
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const newSettings = await request.json();

    // Connect to database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Update backup settings
    const updatedSettings = {
      ...newSettings,
      backupLocation: 'local',
      googleDriveEnabled: false,
      type: 'global',
      updatedAt: new Date()
    };

    await mongoose.connection.db
      .collection('backup_settings')
      .updateOne(
        { type: 'global' },
        { $set: updatedSettings },
        { upsert: true }
      );

    // If auto backup is enabled, schedule next backup
    if (newSettings.autoBackup) {
      await scheduleNextBackup(newSettings.backupFrequency);
    }

    return NextResponse.json({
      success: true,
      message: 'Backup settings updated successfully',
      settings: {
        ...newSettings,
        backupLocation: 'local',
        googleDriveEnabled: false,
      }
    });

  } catch (error) {
    console.error('Error updating backup settings:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update backup settings',
      error: error.message
    }, { status: 500 });
  }
}

async function scheduleNextBackup(frequency) {
  // This is a placeholder for backup scheduling
  // In a production environment, you would use a job scheduler like node-cron
  // or integrate with a task queue system
  
  const nextBackupTime = calculateNextBackupTime(frequency);
  
  // Store the next backup schedule
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
}

function calculateNextBackupTime(frequency) {
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
