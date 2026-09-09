import path from 'path';
import fs from 'fs';
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

// Uploads (user images, excel files, avatars, logos) are stored outside the
// public/ directory on purpose. Next.js only serves files inside public/ if
// they exist at build/start time — files written there at runtime are not
// added to its in-memory static route table and return 404 until the server is
// restarted. By storing uploads here and serving them through the catch-all
// route handler at /uploads/[...path], newly uploaded files are available
// immediately without a restart. The URL scheme (/uploads/...) is unchanged.
export function getUploadsRootDir(projectRoot = getProjectRoot()) {
  return path.join(projectRoot, 'uploads');
}

// Legacy fallback: uploads that existed inside public/ before this change.
export function getLegacyPublicUploadsDir(projectRoot = getProjectRoot()) {
  return path.join(getPublicDir(projectRoot), 'uploads');
}

export function toAbsolutePublicPath(relativePath, projectRoot = getProjectRoot()) {
  const normalized = String(relativePath ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\//g, path.sep);

  return path.join(getPublicDir(projectRoot), normalized);
}

// Resolve a public upload URL (e.g. "/uploads/images/x/file.png" or
// "/uploads/file.png") to the absolute path on disk where the file lives,
// checking the new uploads root first, then the legacy public/uploads folder.
// Returns null if the originating path is unsafe or the file cannot be found.
export function resolveUploadAbsolutePath(url, projectRoot = getProjectRoot()) {
  const stringValue = String(url ?? '').trim();
  let relativePath = '';

  if (stringValue.startsWith('/uploads/')) {
    relativePath = stringValue.slice('/uploads/'.length);
  } else if (stringValue.startsWith('uploads/')) {
    relativePath = stringValue.slice('uploads/'.length);
  } else {
    return null;
  }

  const safeSegments = relativePath.split('/').filter((seg) => {
    return !(seg === '' || seg === '.' || seg === '..' || seg.includes('\\'));
  });
  if (!safeSegments.length) return null;

  const roots = [getUploadsRootDir(projectRoot), getLegacyPublicUploadsDir(projectRoot)];
  for (const root of roots) {
    const candidate = path.join(root, ...safeSegments);
    if (!isPathInside(root, candidate)) continue;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function isPathInside(baseDir, candidate) {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(candidate);
  return resolved === base || resolved.startsWith(base + path.sep);
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

  const uploadsRoot = getUploadsRootDir(projectRoot);

  return {
    directoryName,
    storedFileName,
    relativePath,
    absoluteDirectory: path.join(uploadsRoot, directoryName, safeSrdId),
    absolutePath: path.join(uploadsRoot, directoryName, safeSrdId, storedFileName),
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
