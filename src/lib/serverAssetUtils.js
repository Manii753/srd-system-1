import path from 'path';
import {
  getAssetDirectoryName,
  sanitizeFileName,
  sanitizePathSegment,
  toPublicAssetUrl,
} from './assetUtils.js';

export function getPublicDir(projectRoot = process.cwd()) {
  return path.join(projectRoot, 'public');
}

export function getUploadsRootDir(projectRoot = process.cwd()) {
  return path.join(getPublicDir(projectRoot), 'uploads');
}

export function toAbsolutePublicPath(relativePath, projectRoot = process.cwd()) {
  const normalized = String(relativePath ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\//g, path.sep);

  return path.join(getPublicDir(projectRoot), normalized);
}

export function buildAssetStorageInfo({
  projectRoot = process.cwd(),
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
