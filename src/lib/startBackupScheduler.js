import { backupScheduler } from './backupScheduler.js';

// Run the backup scheduler as a dedicated worker process.
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_BACKUP_SCHEDULER === 'true') {
  backupScheduler.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down backup scheduler...');
    backupScheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down backup scheduler...');
    backupScheduler.stop();
    process.exit(0);
  });
}

export { backupScheduler };
