import path from 'path';
import {
  getAssetDirectoryName,
  sanitizeFileName,
  sanitizePathSegment,
  toPublicAssetUrl,
} from './assetUtils.js';

// Resolve the application root (the folder containing next.config.js / public/).
//
// By default we fall back to process.cwd(), which is correct when the server is
// started from the project root (e.g. `npm start` / `next start`). However, if
// the app is launched from a different working directory (a Windows service,
// NSSM, a scheduled task, pm2, etc.), process.cwd() will NOT be the project
// root: uploads would be written to `<startup-dir>/public/uploads/...` while
// Next.js still serves static files from the app root's `public/` — so uploads
// would "succeed" (the DB record plus URL is saved) but never show up.
//
// Set APP_ROOT to the application folder when deploying, so uploads always land
// where Next.js serves them from, regardless of how the process is launched.
export function getProjectRoot() {
  return process.env.APP_ROOT ? path.resolve(process.env.APP_ROOT) : process.cwd();
}

export function getPublicDir(projectRoot = getProjectRoot()) {
  return path.join(projectRoot, 'public');
}

export function getUploadsRootDir(projectRoot = getProjectRoot()) {
  return path.join(getPublicDir(projectRoot), 'uploads');
}

export function toAbsolutePublicPath(relativePath, projectRoot = getProjectRoot()) {
  const normalized = String(relativePath ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\//g, path.sep);

  return path.join(getPublicDir(projectRoot), normalized);
}

export function buildAssetStorageInfo({
  projectRoot = getProjectRoot(),
  srdId,
  fieldId,
  fieldType,
  fileName,
  timestamp = Date.now(),
}) {
  const directoryName = getAssetDirectoryName(fieldType);
  if (!directoryName) {
    throw new Error(`Unsupported field type for asset storage: ${fieldType}`);
  }

  const safeSrdId = sanitizePathSegment(srdId);
  const safeFieldId = sanitizePathSegment(fieldId);
  const safeFileName = sanitizeFileName(fileName);
  const storedFileName = `srd_${safeSrdId}__field_${safeFieldId}__${timestamp}__${safeFileName}`;
  const relativePath = path.posix.join('uploads', directoryName, safeSrdId, storedFileName);

  return {
    directoryName,
    storedFileName,
    relativePath,
    absoluteDirectory: path.join(getUploadsRootDir(projectRoot), directoryName, safeSrdId),
    absolutePath: toAbsolutePublicPath(relativePath, projectRoot),
    url: toPublicAssetUrl(relativePath),
  };
}

export function buildStoredAssetRecord({
  fieldType,
  srdId,
  fieldId,
  storedFileName,
  originalName,
  relativePath,
  mimeType = '',
  size = 0,
  uploadedAt = new Date().toISOString(),
}) {
  return {
    url: toPublicAssetUrl(relativePath),
    relativePath,
    kind: fieldType,
    srdId: String(srdId),
    fieldId: String(fieldId),
    fileName: storedFileName,
    originalName,
    mimeType,
    size,
    uploadedAt,
  };
}

export function resolveManagedUploadRelativePath(value) {
  if (!value) return '';

  try {
    const parsed = new URL(String(value));
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname.slice(1);
    }
  } catch {
    // Ignore invalid URLs and fall back to path-style handling.
  }

  const stringValue = String(value).trim().replace(/\\/g, '/');
  if (stringValue.startsWith('/uploads/')) {
    return stringValue.slice(1);
  }

  if (stringValue.startsWith('uploads/')) {
    return stringValue;
  }

  return '';
}
