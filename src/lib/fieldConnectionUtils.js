import { normalizeAssetEntries } from '@/lib/assetUtils';

export function normalizeFieldId(fieldId) {
  if (!fieldId) return null;

  if (typeof fieldId === 'object') {
    if (fieldId._id) return fieldId._id.toString();
    if (fieldId.id) return fieldId.id.toString();
    if (typeof fieldId.toString === 'function') return fieldId.toString();
    return null;
  }

  return fieldId.toString();
}

function toFieldDefinitionsArray(fieldDefs) {
  if (Array.isArray(fieldDefs)) {
    return fieldDefs.filter(Boolean);
  }

  if (fieldDefs && typeof fieldDefs === 'object') {
    return Object.values(fieldDefs).filter(Boolean);
  }

  return [];
}

export function findDynamicFieldState(dynamicFields, fieldId, fieldDef = null) {
  const normalizedFieldId = normalizeFieldId(fieldId);
  const fields = Array.isArray(dynamicFields) ? dynamicFields : [];

  return fields.find((field) => {
    const currentFieldId = normalizeFieldId(
      field.originalFieldId ||
      (field.field && (typeof field.field === 'object' ? field.field._id || field.field : field.field))
    );

    return (normalizedFieldId && currentFieldId === normalizedFieldId) ||
      (fieldDef && field.name === fieldDef.name && field.department === fieldDef.department);
  }) || null;
}

export function getAttachedFieldInfos({ targetFieldId, fieldDefs, dynamicFields }) {
  const normalizedTargetFieldId = normalizeFieldId(targetFieldId);
  if (!normalizedTargetFieldId) {
    return [];
  }

  const attachmentCandidates = [];
  const seenSourceIds = new Set();

  toFieldDefinitionsArray(fieldDefs)
    .filter((fieldDef) => fieldDef?.type === 'image' || fieldDef?.type === 'file')
    .filter((fieldDef) => fieldDef?.isConnectedTo && fieldDef?.connectionType === 'is-attached')
    .forEach((fieldDef) => {
      const sourceFieldId = normalizeFieldId(fieldDef._id || fieldDef.originalFieldId || fieldDef.field);
      const connectedFieldId = normalizeFieldId(fieldDef.connectedFieldId);

      if (!sourceFieldId || seenSourceIds.has(sourceFieldId) || connectedFieldId !== normalizedTargetFieldId) {
        return;
      }

      const sourceFieldState = findDynamicFieldState(dynamicFields, sourceFieldId, fieldDef);
      const assetKind = fieldDef.type === 'file' ? 'file' : 'image';
      const assetCount = normalizeAssetEntries(sourceFieldState?.value, { kind: assetKind }).length;

      seenSourceIds.add(sourceFieldId);
      attachmentCandidates.push({
        sourceFieldId,
        name: fieldDef.name || (assetKind === 'file' ? 'File' : 'Image'),
        type: fieldDef.type,
        assetCount,
        order: typeof fieldDef.order === 'number' ? fieldDef.order : Number.MAX_SAFE_INTEGER,
        fieldDef,
      });
    });

  return attachmentCandidates
    .sort((left, right) =>
      left.order - right.order ||
      left.name.localeCompare(right.name) ||
      left.sourceFieldId.localeCompare(right.sourceFieldId)
    );
}

export function getAttachedImageLabels({ targetFieldId, fieldDefs, dynamicFields }) {
  return getAttachedFieldInfos({ targetFieldId, fieldDefs, dynamicFields })
    .filter((info) => info.assetCount > 0)
    .map((info) => `${info.name} attached`);
}
