export function slugifyProductionStageValue(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatProductionStageDisplayName(value = '') {
  return String(value)
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function normalizeProductionStagePayload(payload = {}, options = {}) {
  const { isPatch = false } = options;
  const normalized = { ...payload };

  const rawName = typeof payload.name === 'string' ? payload.name.trim() : '';
  const rawDisplayName =
    typeof payload.displayName === 'string' ? payload.displayName.trim() : '';
  const rawSlug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
  const hasIdentityFields = [rawName, rawDisplayName, rawSlug].some(Boolean);

  if (hasIdentityFields || !isPatch) {
    const slug = slugifyProductionStageValue(rawSlug || rawDisplayName || rawName);
    const displayName =
      rawDisplayName ||
      (rawName || slug ? formatProductionStageDisplayName(rawName || slug) : '');

    normalized.name = rawName || displayName;
    normalized.displayName = displayName;
    normalized.slug = slug;
  }

  if (typeof payload.description === 'string') {
    normalized.description = payload.description.trim();
  }

  if (typeof payload.icon === 'string') {
    normalized.icon = payload.icon.trim();
  }

  if ('estimatedDuration' in payload) {
    const parsedDuration = Number(payload.estimatedDuration);
    normalized.estimatedDuration =
      Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 0;
  }

  if (Array.isArray(payload.requirements)) {
    normalized.requirements = payload.requirements
      .map((requirement) =>
        typeof requirement === 'string' ? requirement.trim() : requirement
      )
      .filter(Boolean);
  }

  return normalized;
}
