import { formatFieldValueForDisplay, normalizeAssetEntries } from '@/lib/assetUtils';

export const REPORT_TEMPLATE_COMPUTED_KEYS = {
  CURRENT_PRODUCTION_STAGE: 'currentProductionStage',
  CURRENT_PRODUCTION_STAGE_START_DATE: 'currentProductionStageStartDate',
  PRODUCTION_STAGE_START_DATE: 'productionStageStartDate',
  PRODUCTION_STAGE_END_DATE: 'productionStageEndDate',
};

export const REPORT_TEMPLATE_COMPUTED_KEY_VALUES = Object.values(REPORT_TEMPLATE_COMPUTED_KEYS);
export const DEFAULT_REPORT_TABLE_HEADERS = ['Item Name', 'Code', 'Finish', 'Size'];
export const REPORT_TEMPLATE_TABLE_ROW_MODES = [
  { value: 'fixed', label: 'Fixed row' },
  { value: 'first', label: 'First filled row' },
  { value: 'last', label: 'Last filled row' },
  { value: 'all', label: 'All filled rows' },
];
export const REPORT_TEMPLATE_TABLE_PREDEFINED_COLUMNS = [
  { value: 'purchaseType', label: 'Purchase / Stock' },
  { value: 'opd', label: 'OPD' },
  { value: 'etd', label: 'IHD' },
];

function normalizeText(value) {
  return String(value || '').trim();
}

function matchesText(left, right) {
  return normalizeText(left).toLowerCase() === normalizeText(right).toLowerCase();
}

function isMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some((item) => isMeaningfulValue(item));
  if (typeof value === 'object') return Object.values(value).some((item) => isMeaningfulValue(item));
  return false;
}

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

export function getFieldTableHeaders(field) {
  const headers = Array.isArray(field?.tableHeaders)
    ? field.tableHeaders.map((header) => normalizeText(header)).filter(Boolean)
    : [];

  return headers.length > 0 ? headers : [...DEFAULT_REPORT_TABLE_HEADERS];
}

export function buildDefaultTableSelection(field) {
  const headers = getFieldTableHeaders(field);

  return {
    rowMode: 'fixed',
    rowIndex: 0,
    columnSource: 'header',
    columnKey: headers[0] || DEFAULT_REPORT_TABLE_HEADERS[0],
    columnIndex: 0,
  };
}

export function normalizeReportTemplateTableSelection(selection, field) {
  if (field?.type !== 'table') {
    return null;
  }

  const headers = getFieldTableHeaders(field);
  const rowMode = REPORT_TEMPLATE_TABLE_ROW_MODES.some((mode) => mode.value === selection?.rowMode)
    ? selection.rowMode
    : 'fixed';
  const parsedRowIndex = Number.parseInt(selection?.rowIndex, 10);
  const rowIndex = Number.isNaN(parsedRowIndex) ? 0 : Math.max(0, parsedRowIndex);
  const columnSource = selection?.columnSource === 'predefined' ? 'predefined' : 'header';
  const parsedColumnIndex = Number.parseInt(selection?.columnIndex, 10);
  const fallbackColumnIndex = Number.isNaN(parsedColumnIndex) ? 0 : Math.max(0, parsedColumnIndex);

  if (columnSource === 'predefined') {
    const columnKey = REPORT_TEMPLATE_TABLE_PREDEFINED_COLUMNS.some((item) => item.value === selection?.columnKey)
      ? selection.columnKey
      : REPORT_TEMPLATE_TABLE_PREDEFINED_COLUMNS[0].value;

    return {
      rowMode,
      rowIndex,
      columnSource,
      columnKey,
      columnIndex: null,
    };
  }

  const matchedHeaderIndex = headers.findIndex((header) => matchesText(header, selection?.columnKey));
  const resolvedColumnIndex = matchedHeaderIndex >= 0
    ? matchedHeaderIndex
    : Math.min(fallbackColumnIndex, Math.max(headers.length - 1, 0));
  const columnKey = normalizeText(selection?.columnKey) || headers[resolvedColumnIndex] || headers[0] || '';

  return {
    rowMode,
    rowIndex,
    columnSource,
    columnKey,
    columnIndex: resolvedColumnIndex,
  };
}

export function describeReportTableSelection(selection, field) {
  const normalizedSelection = normalizeReportTemplateTableSelection(selection, field);

  if (!normalizedSelection) {
    return '';
  }

  const rowLabel = normalizedSelection.rowMode === 'fixed'
    ? `Row ${normalizedSelection.rowIndex + 1}`
    : REPORT_TEMPLATE_TABLE_ROW_MODES.find((mode) => mode.value === normalizedSelection.rowMode)?.label || 'Fixed row';
  const columnLabel = normalizedSelection.columnSource === 'predefined'
    ? REPORT_TEMPLATE_TABLE_PREDEFINED_COLUMNS.find((item) => item.value === normalizedSelection.columnKey)?.label || 'Predefined'
    : normalizeText(normalizedSelection.columnKey) || `Column ${normalizedSelection.columnIndex + 1}`;

  return `${rowLabel} • ${columnLabel}`;
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

function normalizeReportTableData(dynamicField, field) {
  const defaultHeaders = getFieldTableHeaders(field);
  const rawTableData = dynamicField?.value && typeof dynamicField.value === 'object' && !Array.isArray(dynamicField.value)
    ? dynamicField.value
    : {};
  const headers = Array.isArray(rawTableData.headers) && rawTableData.headers.length > 0
    ? rawTableData.headers.map((header) => normalizeText(header))
    : defaultHeaders;
  const rows = Array.isArray(rawTableData.rows)
    ? rawTableData.rows.map((row) => {
      if (!Array.isArray(row)) {
        return new Array(headers.length).fill('');
      }

      if (row.length >= headers.length) {
        return row;
      }

      return [...row, ...new Array(headers.length - row.length).fill('')];
    })
    : [];
  const predefinedData = (Array.isArray(rawTableData.predefinedData) ? rawTableData.predefinedData : [])
    .slice(0, rows.length)
    .map((item) => ({
      purchaseType: item?.purchaseType === 'instock' ? 'instock' : 'purchase',
      opd: normalizeText(item?.opd),
      etd: normalizeText(item?.etd),
    }));

  while (predefinedData.length < rows.length) {
    predefinedData.push({ purchaseType: 'purchase', opd: '', etd: '' });
  }

  return { headers, rows, predefinedData };
}

function getTableSelectionColumnIndex(headers, tableSelection) {
  const matchedHeaderIndex = headers.findIndex((header) => matchesText(header, tableSelection?.columnKey));
  if (matchedHeaderIndex >= 0) {
    return matchedHeaderIndex;
  }

  const parsedColumnIndex = Number.parseInt(tableSelection?.columnIndex, 10);
  if (Number.isNaN(parsedColumnIndex) || parsedColumnIndex < 0) {
    return -1;
  }

  return parsedColumnIndex < headers.length ? parsedColumnIndex : -1;
}

function getPredefinedTableValue(predefinedRow, columnKey) {
  if (columnKey === 'purchaseType') {
    return predefinedRow?.purchaseType === 'instock' ? 'In Stock' : 'Purchase';
  }

  if (columnKey === 'opd') {
    return normalizeText(predefinedRow?.opd);
  }

  if (columnKey === 'etd') {
    return normalizeText(predefinedRow?.etd);
  }

  return '';
}

function rowHasMeaningfulTableContent(row, predefinedRow) {
  return (
    (Array.isArray(row) && row.some((cell) => isMeaningfulValue(cell))) ||
    normalizeText(predefinedRow?.opd) !== '' ||
    normalizeText(predefinedRow?.etd) !== '' ||
    predefinedRow?.purchaseType === 'instock'
  );
}

function getSelectedTableRowValue(tableData, tableSelection, rowIndex) {
  if (rowIndex < 0 || rowIndex >= tableData.rows.length) {
    return '';
  }

  if (tableSelection.columnSource === 'predefined') {
    return getPredefinedTableValue(tableData.predefinedData[rowIndex], tableSelection.columnKey);
  }

  const columnIndex = getTableSelectionColumnIndex(tableData.headers, tableSelection);
  if (columnIndex < 0) {
    return '';
  }

  return tableData.rows[rowIndex]?.[columnIndex] ?? '';
}

function getAutoSelectedTableRows(tableData, tableSelection) {
  return tableData.rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row, rowIndex }) => {
      const value = getSelectedTableRowValue(tableData, tableSelection, rowIndex);

      if (!isMeaningfulValue(value)) {
        return false;
      }

      if (tableSelection.columnSource === 'predefined' && tableSelection.columnKey === 'purchaseType') {
        return rowHasMeaningfulTableContent(row, tableData.predefinedData[rowIndex]);
      }

      return true;
    })
    .map(({ rowIndex }) => rowIndex);
}

function resolveReportTableColumnValue(dynamicField, column) {
  const field = getFieldFromColumn(column);
  const tableSelection = normalizeReportTemplateTableSelection(column?.tableSelection, field);

  if (!field || !tableSelection) {
    return formatFieldValueForDisplay(dynamicField?.value, dynamicField?.type || dynamicField?.field?.type);
  }

  const tableData = normalizeReportTableData(dynamicField, field);

  if (tableData.rows.length === 0) {
    return '';
  }

  if (tableSelection.rowMode === 'fixed') {
    const fixedValue = getSelectedTableRowValue(tableData, tableSelection, tableSelection.rowIndex);
    return isMeaningfulValue(fixedValue) ? String(fixedValue) : '';
  }

  const rowIndexes = getAutoSelectedTableRows(tableData, tableSelection);

  if (rowIndexes.length === 0) {
    return '';
  }

  if (tableSelection.rowMode === 'first') {
    return String(getSelectedTableRowValue(tableData, tableSelection, rowIndexes[0]));
  }

  if (tableSelection.rowMode === 'last') {
    return String(getSelectedTableRowValue(tableData, tableSelection, rowIndexes[rowIndexes.length - 1]));
  }

  if (tableSelection.rowMode === 'all') {
    return rowIndexes
      .map((rowIndex) => getSelectedTableRowValue(tableData, tableSelection, rowIndex))
      .filter((value) => isMeaningfulValue(value))
      .map((value) => String(value))
      .join(', ');
  }

  return '';
}

export function resolveReportColumnValue(srd, column) {
  if (!column) return '';

  if (column.kind === 'field') {
    const dynamicField = findDynamicFieldForColumn(srd, column);
    if (!dynamicField) return '';

    if ((dynamicField.type || dynamicField.field?.type) === 'table') {
      return resolveReportTableColumnValue(dynamicField, column);
    }

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
