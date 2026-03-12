const ASSET_URL_KEYS = ['url', 'src', 'path', 'location'];

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getFileNameFromPath(input) {
  const trimmed = toTrimmedString(input);
  if (!trimmed) return '';

  const withoutQuery = trimmed.split('?')[0].split('#')[0];
  const segments = withoutQuery.split(/[\\/]/);
  return segments[segments.length - 1] || '';
}

function looksLikeAssetUrl(value) {
  const trimmed = toTrimmedString(value);
  return (
    trimmed.startsWith('/') ||
    trimmed.startsWith('uploads/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  );
}

export function toPublicAssetUrl(relativePath) {
  const trimmed = toTrimmedString(relativePath).replace(/\\/g, '/').replace(/^\/+/, '');
  return trimmed ? `/${trimmed}` : '';
}

export function sanitizePathSegment(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'unknown';
}

export function sanitizeFileName(fileName) {
  const name = getFileNameFromPath(fileName) || 'asset';
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

export function getAssetDirectoryName(fieldType) {
  if (fieldType === 'image') return 'images';
  if (fieldType === 'file') return 'excel';
  return null;
}

export function isAssetObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  if (toTrimmedString(value.relativePath)) {
    return true;
  }

  return ASSET_URL_KEYS.some((key) => toTrimmedString(value[key]));
}

export function getAssetUrl(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    const trimmed = toTrimmedString(value);
    return looksLikeAssetUrl(trimmed) ? trimmed : '';
  }

  if (!isAssetObject(value)) {
    return '';
  }

  for (const key of ASSET_URL_KEYS) {
    const candidate = toTrimmedString(value[key]);
    if (candidate) {
      return candidate;
    }
  }

  const relativePath = toTrimmedString(value.relativePath);
  return relativePath ? toPublicAssetUrl(relativePath) : '';
}

export function getAssetKey(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    return toTrimmedString(value);
  }

  const url = getAssetUrl(value);
  const relativePath = toTrimmedString(value.relativePath);
  const fileName = toTrimmedString(value.fileName);

  return relativePath || url || fileName;
}

export function sameAsset(left, right) {
  const leftKey = getAssetKey(left);
  const rightKey = getAssetKey(right);
  return !!leftKey && leftKey === rightKey;
}

export function normalizeAssetEntry(value, fallback = {}) {
  if (!value) return null;

  if (typeof value === 'string') {
    const url = toTrimmedString(value);
    if (!url || !looksLikeAssetUrl(url)) return null;

    const fileName = getFileNameFromPath(url);
    return {
      ...fallback,
      url,
      relativePath: url.startsWith('/') ? url.slice(1) : '',
      fileName,
      originalName: fileName,
    };
  }

  if (!isAssetObject(value)) {
    return null;
  }

  const url = getAssetUrl(value);
  if (!url) return null;

  const relativePath = toTrimmedString(value.relativePath) || (url.startsWith('/') ? url.slice(1) : '');
  const fileName = toTrimmedString(value.fileName) || getFileNameFromPath(url);
  const originalName = toTrimmedString(value.originalName) || fileName;

  return {
    ...fallback,
    ...value,
    url,
    relativePath,
    fileName,
    originalName,
  };
}

export function dedupeAssetEntries(entries) {
  const seen = new Set();
  const result = [];

  for (const entry of entries) {
    const key = getAssetKey(entry);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(entry);
  }

  return result;
}

export function normalizeAssetEntries(value, fallback = {}) {
  const items = Array.isArray(value) ? value : (value ? [value] : []);
  return dedupeAssetEntries(
    items
      .map((item) => normalizeAssetEntry(item, fallback))
      .filter(Boolean)
  );
}

export function normalizeAssetUrls(value, fallback = {}) {
  return normalizeAssetEntries(value, fallback)
    .map((entry) => entry.url)
    .filter(Boolean);
}

export function getPrimaryAsset(value, fallback = {}) {
  return normalizeAssetEntries(value, fallback)[0] || null;
}

export function getAssetLabel(value, fallback = 'Attached file') {
  const asset = normalizeAssetEntry(value);
  if (!asset) {
    const rawString = toTrimmedString(value);
    return rawString || fallback;
  }

  return asset.originalName || asset.fileName || getFileNameFromPath(asset.url) || fallback;
}

export function formatFieldValueForDisplay(value, fieldType) {
  if (value === null || value === undefined) return '';

  if (fieldType === 'image') {
    const count = normalizeAssetEntries(value, { kind: 'image' }).length;
    if (!count) return '';
    return `${count} image${count === 1 ? '' : 's'}`;
  }

  if (fieldType === 'file') {
    return getAssetLabel(value, 'Attached file');
  }

  if (fieldType === 'table') {
    return 'Table data';
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (isAssetObject(item)) {
          return getAssetLabel(item, '');
        }

        if (item === null || item === undefined) {
          return '';
        }

        return String(item);
      })
      .filter(Boolean)
      .join(', ');
  }

  if (isAssetObject(value)) {
    return getAssetLabel(value, 'Attached file');
  }

  if (typeof value === 'object') {
    return Object.values(value)
      .map((item) => (item === null || item === undefined ? '' : String(item)))
      .filter(Boolean)
      .join(', ');
  }

  return String(value);
}

export function getImageAssetsFromDynamicFields(dynamicFields, options = {}) {
  const department = options.department || null;
  const fields = Array.isArray(dynamicFields) ? dynamicFields : [];

  return dedupeAssetEntries(
    fields.flatMap((field) => {
      const effectiveType = field?.type || field?.field?.type;
      if (effectiveType !== 'image') {
        return [];
      }

      if (department && field?.department !== department) {
        return [];
      }

      return normalizeAssetEntries(field?.value, { kind: 'image' });
    })
  );
}

export function getFirstImageUrlFromDynamicFields(dynamicFields, options = {}) {
  const firstAsset = getImageAssetsFromDynamicFields(dynamicFields, options)[0];
  return firstAsset?.url || '';
}
