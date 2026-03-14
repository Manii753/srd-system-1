import { formatFieldValueForDisplay, normalizeAssetEntries } from '@/lib/assetUtils';

export const REPORT_TEMPLATE_COMPUTED_KEYS = {
  CURRENT_PRODUCTION_STAGE: 'currentProductionStage',
  CURRENT_PRODUCTION_STAGE_START_DATE: 'currentProductionStageStartDate',
  PRODUCTION_STAGE_START_DATE: 'productionStageStartDate',
  PRODUCTION_STAGE_END_DATE: 'productionStageEndDate',
};

export const REPORT_TEMPLATE_COMPUTED_KEY_VALUES = Object.values(REPORT_TEMPLATE_COMPUTED_KEYS);

export function getIdString(value) {
  if (!value) return '';

  if (typeof value === 'object') {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }

  return String(value);
}

export function getFieldFromColumn(column) {
  return column?.fieldId && typeof column.fieldId === 'object' ? column.fieldId : null;
}

export function getStageFromColumn(column) {
  return column?.stageId && typeof column.stageId === 'object' ? column.stageId : null;
}

export function getFieldIdFromColumn(column) {
  return getIdString(column?.fieldId);
}

export function getStageIdFromColumn(column) {
  return getIdString(column?.stageId);
}

export function getStageDisplayName(stage) {
  if (!stage) return '';
  return stage.displayName || stage.name || '';
}

export function buildComputedColumnLabel(computedKey, stage) {
  if (computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE) {
    return 'Current Production Stage';
  }

  if (computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE_START_DATE) {
    return 'Current Stage Start Date';
  }

  const stageLabel = getStageDisplayName(stage) || 'Stage';

  if (computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_START_DATE) {
    return `${stageLabel} Start Date`;
  }

  if (computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_END_DATE) {
    return `${stageLabel} End Date`;
  }

  return 'Computed Column';
}

export function buildAvailableComputedColumns(stages) {
  const activeStages = (Array.isArray(stages) ? stages : []).filter((stage) => stage?.isActive !== false);
  const currentStageColumns = [
    {
      kind: 'computed',
      computedKey: REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE,
      label: buildComputedColumnLabel(REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE),
      description: 'Show the current production stage name',
    },
    {
      kind: 'computed',
      computedKey: REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE_START_DATE,
      label: buildComputedColumnLabel(REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE_START_DATE),
      description: 'Show the start date for the current production stage',
    },
  ];

  const stageColumns = activeStages.flatMap((stage) => [
    {
      kind: 'computed',
      computedKey: REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_START_DATE,
      stageId: getIdString(stage),
      label: buildComputedColumnLabel(REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_START_DATE, stage),
      description: `Show when ${getStageDisplayName(stage)} started`,
      stage,
    },
    {
      kind: 'computed',
      computedKey: REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_END_DATE,
      stageId: getIdString(stage),
      label: buildComputedColumnLabel(REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_END_DATE, stage),
      description: `Show when ${getStageDisplayName(stage)} ended`,
      stage,
    },
  ]);

  return [...currentStageColumns, ...stageColumns];
}

export function formatReportDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString();
}

function getDynamicFieldName(dynamicField) {
  return dynamicField?.name || dynamicField?.field?.name || '';
}

export function findDynamicFieldForColumn(srd, column) {
  const fields = Array.isArray(srd?.dynamicFields) ? srd.dynamicFields : [];
  const columnFieldId = getFieldIdFromColumn(column);
  const columnFieldName = getFieldFromColumn(column)?.name?.toLowerCase() || '';

  let matchedField = null;

  if (columnFieldId) {
    matchedField = fields.find((field) => getIdString(field?.field) === columnFieldId);
  }

  if (!matchedField && columnFieldId) {
    matchedField = fields.find((field) => getIdString(field?.originalFieldId) === columnFieldId);
  }

  if (!matchedField && columnFieldName) {
    matchedField = fields.find((field) => getDynamicFieldName(field).toLowerCase() === columnFieldName);
  }

  return matchedField || null;
}

export function getCurrentProductionStageLabel(srd) {
  if (srd?.currentProductionStage && typeof srd.currentProductionStage === 'object') {
    return getStageDisplayName(srd.currentProductionStage);
  }

  const currentEntry = getCurrentStageHistoryEntry(srd);
  return currentEntry?.stageDisplayName || currentEntry?.stageName || '';
}

export function getCurrentStageHistoryEntry(srd) {
  const history = Array.isArray(srd?.productionHistory) ? [...srd.productionHistory] : [];
  const currentStageId = getIdString(srd?.currentProductionStage);

  if (currentStageId) {
    const matchingEntry = [...history].reverse().find((entry) => getIdString(entry?.stage) === currentStageId);
    if (matchingEntry) {
      return matchingEntry;
    }
  }

  const inProgressEntry = [...history].reverse().find((entry) => entry?.status === 'in-progress');
  if (inProgressEntry) {
    return inProgressEntry;
  }

  return history.length > 0 ? history[history.length - 1] : null;
}

export function getStageHistoryEntry(srd, stageId) {
  if (!stageId) return null;

  const history = Array.isArray(srd?.productionHistory) ? srd.productionHistory : [];
  const normalizedStageId = getIdString(stageId);

  return [...history].reverse().find((entry) => getIdString(entry?.stage) === normalizedStageId) || null;
}

export function isImageColumn(column) {
  if (column?.kind !== 'field') return false;

  const field = getFieldFromColumn(column);
  return field?.type === 'image';
}

export function getImageUrlForColumn(srd, column) {
  const dynamicField = findDynamicFieldForColumn(srd, column);
  const firstAsset = normalizeAssetEntries(dynamicField?.value, { kind: 'image' })[0];
  return firstAsset?.url || '';
}

export function resolveReportColumnValue(srd, column) {
  if (!column) return '';

  if (column.kind === 'field') {
    const dynamicField = findDynamicFieldForColumn(srd, column);
    if (!dynamicField) return '';

    return formatFieldValueForDisplay(dynamicField.value, dynamicField.type || dynamicField.field?.type);
  }

  if (column.kind !== 'computed') {
    return '';
  }

  if (column.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE) {
    return getCurrentProductionStageLabel(srd);
  }

  if (column.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE_START_DATE) {
    return formatReportDate(getCurrentStageHistoryEntry(srd)?.startDate);
  }

  if (column.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_START_DATE) {
    return formatReportDate(getStageHistoryEntry(srd, getStageIdFromColumn(column))?.startDate);
  }

  if (column.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_END_DATE) {
    const stageEntry = getStageHistoryEntry(srd, getStageIdFromColumn(column));
    return stageEntry?.status === 'completed' && stageEntry?.endDate
      ? formatReportDate(stageEntry.endDate)
      : '';
  }

  return '';
}
