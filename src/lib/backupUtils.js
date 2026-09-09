import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { EJSON } from 'bson';
import { getProjectRoot } from './serverAssetUtils.js';

export const BACKUP_FORMAT_ZIP = 'zip-v2';
export const BACKUP_FORMAT_JSON = 'json-v1';
export const AUTO_BACKUP_ID = 'auto-backup-latest';
export const AUTO_BACKUP_FILE_NAME = `${AUTO_BACKUP_ID}.zip`;
export const BACKUP_MIME_TYPES = {
  [BACKUP_FORMAT_ZIP]: 'application/zip',
  [BACKUP_FORMAT_JSON]: 'application/json',
};

const ZIP_MANIFEST_ENTRY = 'manifest.json';
const ZIP_DATABASE_ENTRY = 'database.ejson';
const ZIP_UPLOADS_PREFIX = 'uploads/';
const DEFAULT_EXCLUDED_COLLECTIONS = new Set(['backups', 'backup_schedule']);
const BULK_RESTORE_CHUNK_SIZE = 500;

export function getBackupsDirectory() {
  return path.join(getProjectRoot(), 'backups');
}

export function getUploadsDirectory() {
  return path.join(getProjectRoot(), 'uploads');
}

export function getAutomaticBackupPath() {
  return path.join(getBackupsDirectory(), AUTO_BACKUP_FILE_NAME);
}

export async function ensureDirectoryExists(directoryPath) {
  await fs.promises.mkdir(directoryPath, { recursive: true });
  return directoryPath;
}

export function createBackupTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function createBackupId(prefix = 'backup', date = new Date()) {
  return `${prefix}-${createBackupTimestamp(date)}`;
}

export function sanitizeBackupFileName(fileName) {
  const baseName = path.basename(fileName || 'backup');
  return baseName.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

export function normalizeBackupFormat(backup = {}) {
  if (backup.format === BACKUP_FORMAT_ZIP || backup.format === BACKUP_FORMAT_JSON) {
    return backup.format;
  }

  const targetName = backup.name || backup.path || '';
  return targetName.toLowerCase().endsWith('.zip') ? BACKUP_FORMAT_ZIP : BACKUP_FORMAT_JSON;
}

export function getBackupMimeType(backup = {}) {
  return BACKUP_MIME_TYPES[normalizeBackupFormat(backup)] || 'application/octet-stream';
}

export function getBackupSortDate(backup = {}) {
  return backup.lastRunAt || backup.updatedAt || backup.createdAt || null;
}

export async function deleteLocalBackupFileIfExists(backup = {}) {
  if (backup.location !== 'local' || !backup.path) {
    return false;
  }

  if (!fs.existsSync(backup.path)) {
    return false;
  }

  await fs.promises.unlink(backup.path);
  return true;
}

export async function createZipBackup({
  db,
  backupId,
  type = 'manual',
  location = 'local',
  createdAt = new Date(),
  includeUploads = true,
  excludedCollections = DEFAULT_EXCLUDED_COLLECTIONS,
  backupPath: customBackupPath,
  backupName,
}) {
  await ensureDirectoryExists(getBackupsDirectory());

  const backupPath = customBackupPath || path.join(getBackupsDirectory(), `${backupId}.zip`);
  const resolvedBackupName = backupName || path.basename(backupPath);
  const { databaseData, collectionSummaries, totalDocuments } = await exportDatabaseCollections(db, {
    excludedCollections,
  });
  const uploadsDirectory = getUploadsDirectory();
  const uploadsExist = includeUploads && fs.existsSync(uploadsDirectory);
  const manifest = {
    format: BACKUP_FORMAT_ZIP,
    version: 2,
    backupId,
    backupType: type,
    location,
    createdAt: createdAt.toISOString(),
    includesUploads: uploadsExist,
    collections: collectionSummaries,
    collectionCount: collectionSummaries.length,
    totalDocuments,
    excludedCollections: Array.from(excludedCollections),
  };

  await writeBackupArchive({
    backupPath,
    manifest,
    databaseData,
    uploadsDirectory: uploadsExist ? uploadsDirectory : null,
  });

  const stats = await fs.promises.stat(backupPath);
  const backupRecord = {
    id: backupId,
    name: resolvedBackupName,
    location,
    size: stats.size,
    createdAt,
    status: 'completed',
    path: backupPath,
    type,
    format: BACKUP_FORMAT_ZIP,
    includesUploads: uploadsExist,
    collectionCount: collectionSummaries.length,
    totalDocuments,
  };

  return { backupRecord, manifest, backupPath };
}

export async function replaceFileAtomically(sourcePath, destinationPath) {
  await ensureDirectoryExists(path.dirname(destinationPath));

  const existingBackupPath = `${destinationPath}.previous-${crypto.randomUUID()}`;
  const destinationExists = fs.existsSync(destinationPath);

  try {
    if (destinationExists) {
      await fs.promises.rename(destinationPath, existingBackupPath);
    }

    await fs.promises.rename(sourcePath, destinationPath);

    if (destinationExists && fs.existsSync(existingBackupPath)) {
      await fs.promises.rm(existingBackupPath, { force: true });
    }
  } catch (error) {
    if (!fs.existsSync(destinationPath) && destinationExists && fs.existsSync(existingBackupPath)) {
      await fs.promises.rename(existingBackupPath, destinationPath).catch(() => {});
    }

    throw error;
  } finally {
    if (fs.existsSync(sourcePath)) {
      await fs.promises.rm(sourcePath, { force: true });
    }

    if (fs.existsSync(existingBackupPath)) {
      await fs.promises.rm(existingBackupPath, { force: true });
    }
  }
}

export async function exportDatabaseCollections(db, { excludedCollections = DEFAULT_EXCLUDED_COLLECTIONS } = {}) {
  const collections = await db.listCollections().toArray();
  const databaseData = {};
  const collectionSummaries = [];
  let totalDocuments = 0;

  for (const collection of collections) {
    const collectionName = collection.name;
    if (shouldSkipCollection(collectionName, excludedCollections)) {
      continue;
    }

    const documents = await db.collection(collectionName).find({}).toArray();
    databaseData[collectionName] = documents;
    collectionSummaries.push({ name: collectionName, count: documents.length });
    totalDocuments += documents.length;
  }

  return { databaseData, collectionSummaries, totalDocuments };
}

async function writeBackupArchive({ backupPath, manifest, databaseData, uploadsDirectory }) {
  await ensureDirectoryExists(path.dirname(backupPath));

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.append(JSON.stringify(manifest, null, 2), { name: ZIP_MANIFEST_ENTRY });
    archive.append(EJSON.stringify(databaseData, null, 2, { relaxed: false }), {
      name: ZIP_DATABASE_ENTRY,
    });

    if (uploadsDirectory) {
      archive.directory(uploadsDirectory, 'uploads');
    }

    Promise.resolve(archive.finalize()).catch(reject);
  }).catch(async (error) => {
    if (fs.existsSync(backupPath)) {
      await fs.promises.rm(backupPath, { force: true });
    }

    throw error;
  });
}

export async function loadBackupFile(filePath, formatHint) {
  const format = formatHint || normalizeBackupFormat({ path: filePath });

  if (format === BACKUP_FORMAT_ZIP) {
    return loadZipBackup(filePath);
  }

  return loadLegacyJsonBackup(filePath);
}

export async function loadZipBackup(filePath) {
  const zip = new AdmZip(filePath);
  const manifestEntry = zip.getEntry(ZIP_MANIFEST_ENTRY);
  const databaseEntry = zip.getEntry(ZIP_DATABASE_ENTRY);

  if (!manifestEntry || !databaseEntry) {
    throw new Error('Invalid ZIP backup. Required files are missing.');
  }

  const manifest = JSON.parse(zip.readAsText(manifestEntry));
  const databaseData = EJSON.parse(zip.readAsText(databaseEntry), { relaxed: false });
  const uploadEntries = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && getSafeUploadRelativePath(entry.entryName));

  return {
    format: BACKUP_FORMAT_ZIP,
    metadata: manifest,
    databaseData,
    includesUploads: uploadEntries.length > 0,
    uploadEntryCount: uploadEntries.length,
    zip,
  };
}

export async function loadLegacyJsonBackup(filePath) {
  const rawContent = await fs.promises.readFile(filePath, 'utf8');
  const parsedContent = JSON.parse(rawContent);
  const databaseData =
    parsedContent && parsedContent.data && typeof parsedContent.data === 'object'
      ? parsedContent.data
      : parsedContent;

  if (!databaseData || typeof databaseData !== 'object') {
    throw new Error('Invalid JSON backup. Database payload is missing.');
  }

  const collectionNames = Object.keys(databaseData).filter(
    (collectionName) => !collectionName.startsWith('system.')
  );
  const totalDocuments = collectionNames.reduce((sum, collectionName) => {
    const documents = Array.isArray(databaseData[collectionName]) ? databaseData[collectionName] : [];
    return sum + documents.length;
  }, 0);

  return {
    format: BACKUP_FORMAT_JSON,
    metadata: parsedContent?.metadata || {
      format: BACKUP_FORMAT_JSON,
      createdAt: null,
      collections: collectionNames.map((name) => ({
        name,
        count: Array.isArray(databaseData[name]) ? databaseData[name].length : 0,
      })),
      collectionCount: collectionNames.length,
      totalDocuments,
      includesUploads: false,
    },
    databaseData,
    includesUploads: false,
    uploadEntryCount: 0,
    zip: null,
  };
}

export async function restoreDatabaseCollections(db, databaseData, { excludedCollections = DEFAULT_EXCLUDED_COLLECTIONS } = {}) {
  const summary = {
    collectionsProcessed: 0,
    collectionsSkipped: [],
    documentsInserted: 0,
    documentsReplaced: 0,
    documentsInsertedWithoutId: 0,
    collections: [],
  };

  for (const [collectionName, rawDocuments] of Object.entries(databaseData || {})) {
    if (shouldSkipCollection(collectionName, excludedCollections)) {
      summary.collectionsSkipped.push(collectionName);
      continue;
    }

    const documents = Array.isArray(rawDocuments) ? rawDocuments : [];
    const collection = db.collection(collectionName);
    const documentsWithId = [];
    const documentsWithoutId = [];

    for (const document of documents) {
      if (!document || typeof document !== 'object') {
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(document, '_id')) {
        documentsWithId.push(document);
      } else {
        documentsWithoutId.push(document);
      }
    }

    let inserted = 0;
    let replaced = 0;
    let insertedWithoutId = 0;

    for (const chunk of chunkArray(documentsWithId, BULK_RESTORE_CHUNK_SIZE)) {
      if (chunk.length === 0) {
        continue;
      }

      const operations = chunk.map((document) => ({
        replaceOne: {
          filter: { _id: document._id },
          replacement: document,
          upsert: true,
        },
      }));

      const result = await collection.bulkWrite(operations, { ordered: false });
      inserted += result.upsertedCount || 0;
      replaced += result.matchedCount || 0;
    }

    for (const chunk of chunkArray(documentsWithoutId, BULK_RESTORE_CHUNK_SIZE)) {
      if (chunk.length === 0) {
        continue;
      }

      const result = await collection.insertMany(chunk, { ordered: false });
      insertedWithoutId += Object.keys(result.insertedIds || {}).length;
    }

    summary.collectionsProcessed += 1;
    summary.documentsInserted += inserted;
    summary.documentsReplaced += replaced;
    summary.documentsInsertedWithoutId += insertedWithoutId;
    summary.collections.push({
      name: collectionName,
      documentCount: documents.length,
      inserted,
      replaced,
      insertedWithoutId,
    });
  }

  return summary;
}

export async function restoreUploadsFromZip(zip, { restoreRoot = getUploadsDirectory(), tempPrefix = 'restore' } = {}) {
  if (!zip) {
    return {
      filesInBackup: 0,
      filesRestored: 0,
      filesSkipped: 0,
      unsafeEntriesSkipped: 0,
    };
  }

  const tempRoot = path.join(
    getBackupsDirectory(),
    `${tempPrefix}-tmp-${createBackupTimestamp()}-${crypto.randomUUID()}`
  );
  const extractedUploadsDirectory = path.join(tempRoot, 'uploads');
  let filesInBackup = 0;
  let unsafeEntriesSkipped = 0;

  await ensureDirectoryExists(extractedUploadsDirectory);

  try {
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) {
        continue;
      }

      const safeRelativePath = getSafeUploadRelativePath(entry.entryName);
      if (!safeRelativePath) {
        if (entry.entryName.replace(/\\/g, '/').startsWith(ZIP_UPLOADS_PREFIX)) {
          unsafeEntriesSkipped += 1;
        }
        continue;
      }

      const tempFilePath = resolveSafePath(extractedUploadsDirectory, safeRelativePath);
      await ensureDirectoryExists(path.dirname(tempFilePath));
      await fs.promises.writeFile(tempFilePath, entry.getData());
      filesInBackup += 1;
    }

    if (filesInBackup === 0) {
      return {
        filesInBackup,
        filesRestored: 0,
        filesSkipped: 0,
        unsafeEntriesSkipped,
      };
    }

    const copySummary = await copyDirectoryContentsSkippingExisting(extractedUploadsDirectory, restoreRoot);

    return {
      filesInBackup,
      filesRestored: copySummary.filesRestored,
      filesSkipped: copySummary.filesSkipped,
      unsafeEntriesSkipped,
    };
  } finally {
    await fs.promises.rm(tempRoot, { recursive: true, force: true });
  }
}

export function getSafeUploadRelativePath(entryName) {
  const posixName = entryName.replace(/\\/g, '/').replace(/^\/+/, '');
  const normalizedName = path.posix.normalize(posixName);

  if (!normalizedName.startsWith(ZIP_UPLOADS_PREFIX)) {
    return null;
  }

  const relativePosixPath = normalizedName.slice(ZIP_UPLOADS_PREFIX.length);
  if (!relativePosixPath || relativePosixPath === '.' || relativePosixPath.endsWith('/')) {
    return null;
  }

  const segments = relativePosixPath.split('/').filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }

  return path.join(...segments);
}

async function copyDirectoryContentsSkippingExisting(sourceDirectory, destinationDirectory) {
  await ensureDirectoryExists(destinationDirectory);

  const summary = {
    filesRestored: 0,
    filesSkipped: 0,
  };

  const entries = await fs.promises.readdir(sourceDirectory, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const destinationPath = path.join(destinationDirectory, entry.name);

    if (entry.isDirectory()) {
      const childSummary = await copyDirectoryContentsSkippingExisting(sourcePath, destinationPath);
      summary.filesRestored += childSummary.filesRestored;
      summary.filesSkipped += childSummary.filesSkipped;
      continue;
    }

    if (fs.existsSync(destinationPath)) {
      summary.filesSkipped += 1;
      continue;
    }

    await ensureDirectoryExists(path.dirname(destinationPath));
    await fs.promises.copyFile(sourcePath, destinationPath);
    summary.filesRestored += 1;
  }

  return summary;
}

function resolveSafePath(baseDirectory, relativePath) {
  const resolvedPath = path.resolve(baseDirectory, relativePath);
  const normalizedBaseDirectory = path.resolve(baseDirectory);

  if (
    resolvedPath !== normalizedBaseDirectory &&
    !resolvedPath.startsWith(`${normalizedBaseDirectory}${path.sep}`)
  ) {
    throw new Error(`Unsafe path detected during restore: ${relativePath}`);
  }

  return resolvedPath;
}

function shouldSkipCollection(collectionName, excludedCollections) {
  return collectionName.startsWith('system.') || excludedCollections.has(collectionName);
}

function chunkArray(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}
