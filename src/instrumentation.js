export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.ENABLE_BACKUP_SCHEDULER === 'false') return;

  const { backupScheduler } = await import('./lib/backupScheduler.js');
  // Run in background so instrumentation doesn't block the dev/build process
  // waiting on remote MongoDB connection.
  void backupScheduler.start().catch((error) => {
    console.error('Failed to start backup scheduler:', error);
  });
}
