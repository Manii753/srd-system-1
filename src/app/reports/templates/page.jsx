'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Factory,
  FileSpreadsheet,
  GripVertical,
  LayoutList,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  buildAvailableComputedColumns,
  buildDefaultTableSelection,
  describeReportTableSelection,
  getFieldTableHeaders,
  getIdString,
  normalizeReportTemplateTableSelection,
  REPORT_TEMPLATE_COMPUTED_KEYS,
  REPORT_TEMPLATE_TABLE_PREDEFINED_COLUMNS,
  REPORT_TEMPLATE_TABLE_ROW_MODES,
} from '@/lib/reportTemplateUtils';

function buildFieldColumnLabel(field, tableSelection) {
  if (!field) {
    return '';
  }

  if (field.type !== 'table') {
    return field.name || '';
  }

  return `${field.name} - ${describeReportTableSelection(tableSelection, field)}`;
}

function createClientColumn(column = {}) {
  const field = column.fieldId && typeof column.fieldId === 'object' ? column.fieldId : null;
  const tableSelection = field
    ? normalizeReportTemplateTableSelection(column.tableSelection, field)
    : (column.tableSelection || null);

  return {
    clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    kind: column.kind || 'field',
    fieldId: column.fieldId ? getIdString(column.fieldId) : null,
    computedKey: column.computedKey || null,
    stageId: column.stageId ? getIdString(column.stageId) : null,
    label: column.label || buildFieldColumnLabel(field, tableSelection),
    tableSelection,
  };
}

function getColumnSelectionKey(column) {
  if (column.kind === 'field') {
    return `field:${column.fieldId || ''}`;
  }

  return `computed:${column.computedKey || ''}:${column.stageId || ''}`;
}

function createFieldColumn(field) {
  const tableSelection = field.type === 'table'
    ? buildDefaultTableSelection(field)
    : null;

  return {
    kind: 'field',
    fieldId: String(field._id),
    label: buildFieldColumnLabel(field, tableSelection),
    tableSelection,
  };
}

export default function ReportTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [productionStages, setProductionStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTemplateId, setCurrentTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [columns, setColumns] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const loadTemplateIntoEditor = useCallback((template) => {
    if (!template) {
      setCurrentTemplateId(null);
      setTemplateName('');
      setColumns([]);
      return;
    }

    setCurrentTemplateId(template._id || null);
    setTemplateName(template.name || '');
    setColumns((template.columns || []).map((column) => createClientColumn(column)));
  }, []);

  const fetchDesignerData = useCallback(async (preferredTemplateId = null) => {
    try {
      setLoading(true);

      const [templatesRes, fieldsRes, stagesRes] = await Promise.all([
        fetch('/api/reportTemplate'),
        fetch('/api/newField?inReport=true'),
        fetch('/api/production-stages'),
      ]);

      const templatesData = await templatesRes.json();
      const fieldsData = await fieldsRes.json();
      const stagesData = await stagesRes.json();

      if (!templatesRes.ok) {
        throw new Error(templatesData.error || 'Failed to load report templates');
      }

      if (!fieldsRes.ok) {
        throw new Error(fieldsData.error || 'Failed to load report fields');
      }

      if (!stagesRes.ok || stagesData?.success === false) {
        throw new Error(stagesData.error || 'Failed to load production stages');
      }

      const nextTemplates = Array.isArray(templatesData) ? templatesData : [];
      const nextFields = Array.isArray(fieldsData) ? fieldsData : [];
      const nextStages = Array.isArray(stagesData?.data) ? stagesData.data.filter((stage) => stage?.isActive !== false) : [];

      setTemplates(nextTemplates);
      setAvailableFields(nextFields);
      setProductionStages(nextStages);

      const templateToLoad =
        nextTemplates.find((template) => template._id === preferredTemplateId) ||
        nextTemplates.find((template) => template.isActive) ||
        nextTemplates[0] ||
        null;

      loadTemplateIntoEditor(templateToLoad);
    } catch (error) {
      console.error('Failed to fetch report template designer data', error);
      alert('Failed to load report template designer');
    } finally {
      setLoading(false);
    }
  }, [loadTemplateIntoEditor]);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    fetchDesignerData();
  }, [session, status, router, fetchDesignerData]);

  const fieldMap = new Map(availableFields.map((field) => [String(field._id), field]));
  const stageMap = new Map(productionStages.map((stage) => [String(stage._id), stage]));
  const availableComputedColumns = buildAvailableComputedColumns(productionStages);
  const selectedColumnKeys = new Set(columns.flatMap((column) => {
    if (column.kind === 'field') {
      const field = fieldMap.get(column.fieldId);
      if (field?.type === 'table') {
        return [];
      }
    }

    return [getColumnSelectionKey(column)];
  }));

  const createNewTemplate = () => {
    setCurrentTemplateId(null);
    setTemplateName('Untitled Report Template');
    setColumns([]);
  };

  const addColumn = (column) => {
    const nextColumn = createClientColumn(column);
    const selectionKey = getColumnSelectionKey(nextColumn);

    if (selectedColumnKeys.has(selectionKey)) {
      return;
    }

    setColumns((prev) => [...prev, nextColumn]);
  };

  const updateColumnLabel = (clientId, label) => {
    setColumns((prev) => prev.map((column) => (
      column.clientId === clientId ? { ...column, label } : column
    )));
  };

  const updateTableSelection = (clientId, patch) => {
    setColumns((prev) => prev.map((column) => {
      if (column.clientId !== clientId) {
        return column;
      }

      const field = fieldMap.get(column.fieldId);
      if (!field || field.type !== 'table') {
        return column;
      }

      const previousSelection = normalizeReportTemplateTableSelection(column.tableSelection, field);
      const nextSelection = normalizeReportTemplateTableSelection(
        { ...column.tableSelection, ...patch },
        field
      );
      const previousAutoLabel = buildFieldColumnLabel(field, previousSelection);
      const nextAutoLabel = buildFieldColumnLabel(field, nextSelection);
      const shouldUpdateLabel = !column.label || column.label === field.name || column.label === previousAutoLabel;

      return {
        ...column,
        label: shouldUpdateLabel ? nextAutoLabel : column.label,
        tableSelection: nextSelection,
      };
    }));
  };

  const removeColumn = (clientId) => {
    setColumns((prev) => prev.filter((column) => column.clientId !== clientId));
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: templateName.trim(),
        columns: columns.map((column) => ({
          kind: column.kind,
          fieldId: column.fieldId || null,
          computedKey: column.computedKey || null,
          stageId: column.stageId || null,
          label: column.label?.trim() || '',
          tableSelection: column.tableSelection || null,
        })),
      };

      const response = await fetch(
        currentTemplateId ? `/api/reportTemplate?id=${currentTemplateId}` : '/api/reportTemplate',
        {
          method: currentTemplateId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const savedTemplate = await response.json();

      if (!response.ok) {
        throw new Error(savedTemplate.error || 'Failed to save report template');
      }

      await fetchDesignerData(savedTemplate._id);
    } catch (error) {
      console.error('Failed to save report template', error);
      alert(error.message || 'Failed to save report template');
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (templateId) => {
    try {
      const response = await fetch('/api/reportTemplate/setActive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set active template');
      }

      await fetchDesignerData(templateId);
    } catch (error) {
      console.error('Failed to set active template', error);
      alert(error.message || 'Failed to set active template');
    }
  };

  const handleDelete = async (templateId) => {
    if (!confirm('Delete this report template?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reportTemplate?id=${templateId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete report template');
      }

      await fetchDesignerData(currentTemplateId === templateId ? null : currentTemplateId);
    } catch (error) {
      console.error('Failed to delete report template', error);
      alert(error.message || 'Failed to delete report template');
    }
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event, index) => {
    event.preventDefault();

    if (draggedIndex === null || draggedIndex === index) {
      return;
    }

    const reorderedColumns = [...columns];
    const draggedColumn = reorderedColumns.splice(draggedIndex, 1)[0];
    reorderedColumns.splice(index, 0, draggedColumn);
    setColumns(reorderedColumns);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getColumnMeta = (column) => {
    if (column.kind === 'field') {
      const field = fieldMap.get(column.fieldId);
      const isTableField = field?.type === 'table';

      return {
        title: field?.name || column.label || 'Field Column',
        badge: isTableField ? 'TABLE' : (field?.department?.toUpperCase() || 'FIELD'),
        description: isTableField
          ? `Table field • ${describeReportTableSelection(column.tableSelection, field)}`
          : (field?.type ? `${field.type} field` : 'SRD field'),
      };
    }

    const stage = stageMap.get(column.stageId);
    const currentStageColumn =
      column.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE ||
      column.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE_START_DATE ||
      column.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.CURRENT_PRODUCTION_STAGE_END_DATE;
    const stageSpecificColumn =
      column.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_START_DATE ||
      column.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_END_DATE;

    return {
      title: column.label || 'Computed Column',
      badge: currentStageColumn ? 'CURRENT' : (stageSpecificColumn ? (stage?.displayName || stage?.name || 'STAGE') : 'GLOBAL'),
      description: currentStageColumn
        ? 'Calculated from the active SRD production stage'
        : (stageSpecificColumn ? 'Calculated from production history' : 'Calculated from top-level SRD workflow data'),
    };
  };

  if (status === 'loading' || loading) {
    return <Layout><div className="p-8">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => router.push('/reports')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Dynamic Report Template Designer</h1>
            <p className="text-gray-600 mt-1">
              Build the column order for the dynamic SRD report using report fields and computed production columns.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={createNewTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <LayoutList className="h-5 w-5 text-purple-600" />
                  <h2 className="text-lg font-semibold">Saved Templates</h2>
                </div>
                <span className="text-sm text-gray-500">{templates.length} total</span>
              </div>

              <div className="space-y-3">
                {templates.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 border border-dashed rounded-lg p-4">
                    No templates yet.
                  </div>
                ) : templates.map((template) => (
                  <div
                    key={template._id}
                    className={`border rounded-lg p-3 transition-colors ${template.isActive ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {template.columns?.length || 0} column{template.columns?.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      {template.isActive && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => loadTemplateIntoEditor(template)}>
                        Edit
                      </Button>
                      {!template.isActive && (
                        <Button size="sm" variant="outline" onClick={() => handleSetActive(template._id)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Set Active
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleDelete(template._id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Report Fields</h2>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {availableFields.length === 0 ? (
                  <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                    No fields are marked for reports. Add them from SRD Fields first.
                  </div>
                ) : availableFields.map((field) => {
                  const allowsMultipleColumns = field.type === 'table';
                  const alreadySelected = !allowsMultipleColumns && selectedColumnKeys.has(`field:${field._id}`);

                  return (
                    <div key={field._id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="font-medium text-gray-900">{field.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {field.type} • {field.department?.toUpperCase() || 'GLOBAL'}
                      </div>
                      {field.type === 'table' && (
                        <div className="text-[11px] text-gray-500 mt-2">
                          Table fields can be added multiple times with different row and column selections.
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="mt-3 w-full"
                        variant={alreadySelected ? 'outline' : 'default'}
                        onClick={() => addColumn(createFieldColumn(field))}
                        disabled={alreadySelected}
                      >
                        {alreadySelected ? 'Added' : (field.type === 'table' ? 'Add Table Column' : 'Add Column')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center gap-2 mb-4">
                <Factory className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-semibold">Computed Columns</h2>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {availableComputedColumns.map((item) => {
                  const selectionKey = getColumnSelectionKey(item);
                  const alreadySelected = selectedColumnKeys.has(selectionKey);

                  return (
                    <div key={`${item.computedKey}:${item.stageId || 'none'}`} className="border rounded-lg p-3 bg-gray-50">
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                      <Button
                        size="sm"
                        className="mt-3 w-full"
                        variant={alreadySelected ? 'outline' : 'default'}
                        onClick={() => addColumn(item)}
                        disabled={alreadySelected}
                      >
                        {alreadySelected ? 'Added' : 'Add Column'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Enter template name"
                />
              </div>

              <div className="flex gap-4 text-sm text-gray-500">
                <span>{columns.length} column{columns.length === 1 ? '' : 's'}</span>
                <span>{templates.find((template) => template._id === currentTemplateId)?.isActive ? 'Active template' : 'Draft or inactive template'}</span>
              </div>
            </div>

            {columns.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                <CalendarRange className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                <h3 className="text-base font-semibold text-gray-700">No columns added yet</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Add report fields or computed columns from the left panel.
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_220px_auto] gap-0 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 px-4 py-3 border-b">
                  <div className="w-8"></div>
                  <div>Column</div>
                  <div>Header Label</div>
                  <div className="w-24 text-right">Action</div>
                </div>

                {columns.map((column, index) => {
                  const meta = getColumnMeta(column);
                  const columnField = column.kind === 'field' ? fieldMap.get(column.fieldId) : null;
                  const isTableField = columnField?.type === 'table';
                  const tableSelection = isTableField
                    ? normalizeReportTemplateTableSelection(column.tableSelection, columnField)
                    : null;
                  const tableHeaderOptions = isTableField ? getFieldTableHeaders(columnField) : [];
                  const tableColumnOptions = tableSelection?.columnSource === 'predefined'
                    ? REPORT_TEMPLATE_TABLE_PREDEFINED_COLUMNS
                    : tableHeaderOptions.map((header, headerIndex) => ({
                      value: header,
                      label: header,
                      columnIndex: headerIndex,
                    }));

                  return (
                    <div
                      key={column.clientId}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(event) => handleDragOver(event, index)}
                      onDragEnd={handleDragEnd}
                      className={`px-4 py-3 border-b last:border-b-0 ${draggedIndex === index ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_220px_auto] gap-3 items-center">
                        <div className="w-8 text-gray-400 cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{meta.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{meta.description}</div>
                          <div className="text-xs inline-flex mt-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {meta.badge}
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            className="w-full p-2 text-sm border border-gray-300 rounded"
                            value={column.label}
                            onChange={(event) => updateColumnLabel(column.clientId, event.target.value)}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => removeColumn(column.clientId)}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>

                      {isTableField && tableSelection && (
                        <div className="mt-4 ml-11 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-3">
                            Table Value Selection
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Row Mode
                              </label>
                              <select
                                className="w-full p-2 text-sm border border-gray-300 rounded bg-white"
                                value={tableSelection.rowMode}
                                onChange={(event) => updateTableSelection(column.clientId, { rowMode: event.target.value })}
                              >
                                {REPORT_TEMPLATE_TABLE_ROW_MODES.map((mode) => (
                                  <option key={mode.value} value={mode.value}>
                                    {mode.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {tableSelection.rowMode === 'fixed' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Row Number
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  className="w-full p-2 text-sm border border-gray-300 rounded bg-white"
                                  value={tableSelection.rowIndex + 1}
                                  onChange={(event) => updateTableSelection(column.clientId, {
                                    rowIndex: Math.max(0, (parseInt(event.target.value, 10) || 1) - 1),
                                  })}
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Column Type
                              </label>
                              <select
                                className="w-full p-2 text-sm border border-gray-300 rounded bg-white"
                                value={tableSelection.columnSource}
                                onChange={(event) => updateTableSelection(column.clientId, {
                                  columnSource: event.target.value,
                                })}
                              >
                                <option value="header">Table Header</option>
                                <option value="predefined">Predefined Column</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Column
                              </label>
                              <select
                                className="w-full p-2 text-sm border border-gray-300 rounded bg-white"
                                value={tableSelection.columnKey}
                                onChange={(event) => {
                                  const selectedOption = tableColumnOptions.find((option) => option.value === event.target.value);
                                  updateTableSelection(column.clientId, {
                                    columnKey: event.target.value,
                                    columnIndex: selectedOption?.columnIndex ?? tableSelection.columnIndex,
                                  });
                                }}
                              >
                                {tableColumnOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="text-xs text-blue-700 mt-3">
                            Current selection: {describeReportTableSelection(tableSelection, columnField)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
