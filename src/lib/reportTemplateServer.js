import ReportTemplate from '@/models/ReportTemplate';
import ReportTemplateState from '@/models/ReportTemplateState';
import Field from '@/models/Field';
import ProductionStage from '@/models/ProductionStage';
import {
  REPORT_TEMPLATE_COMPUTED_KEYS,
  REPORT_TEMPLATE_COMPUTED_KEY_VALUES,
  buildComputedColumnLabel,
  getIdString,
} from '@/lib/reportTemplateUtils';

function populateTemplateQuery(query) {
  return query
    .populate('columns.fieldId', 'name type department inReport active')
    .populate('columns.stageId', 'name displayName order isActive');
}

export async function getPopulatedReportTemplateById(id) {
  if (!id) return null;
  return populateTemplateQuery(ReportTemplate.findById(id));
}

async function buildSeedColumns() {
  const fields = await Field.find({ active: true, inReport: true })
    .sort({ inReportOrder: 1, order: 1, createdAt: 1 })
    .select('name');

  return fields.map((field) => ({
    kind: 'field',
    fieldId: field._id,
    label: field.name,
  }));
}

export async function seedInitialReportTemplateIfNeeded() {
  const seedState = await ReportTemplateState.findOne({ key: 'report-template-migration' });
  if (seedState?.hasSeeded) {
    return null;
  }

  const templateCount = await ReportTemplate.countDocuments();
  if (templateCount > 0) {
    return null;
  }

  const columns = await buildSeedColumns();

  const seededTemplate = await ReportTemplate.create({
    name: 'Default Report Template',
    columns,
    isActive: true,
  });

  await ReportTemplateState.findOneAndUpdate(
    { key: 'report-template-migration' },
    { key: 'report-template-migration', hasSeeded: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return getPopulatedReportTemplateById(seededTemplate._id);
}

export async function ensureActiveReportTemplate() {
  let activeTemplate = await populateTemplateQuery(ReportTemplate.findOne({ isActive: true }));
  if (activeTemplate) {
    return activeTemplate;
  }

  const seededTemplate = await seedInitialReportTemplateIfNeeded();
  if (seededTemplate) {
    return seededTemplate;
  }

  const newestTemplate = await ReportTemplate.findOne().sort({ createdAt: -1 });
  if (!newestTemplate) {
    return null;
  }

  newestTemplate.isActive = true;
  await newestTemplate.save();

  return getPopulatedReportTemplateById(newestTemplate._id);
}

export async function getAllReportTemplatesEnsuringDefault() {
  await ensureActiveReportTemplate();
  return populateTemplateQuery(ReportTemplate.find().sort({ createdAt: -1 }));
}

export async function sanitizeReportTemplateColumns(columns) {
  const inputColumns = Array.isArray(columns) ? columns : [];
  const fieldIds = [...new Set(
    inputColumns
      .filter((column) => column?.kind === 'field' && column?.fieldId)
      .map((column) => getIdString(column.fieldId))
      .filter(Boolean)
  )];
  const stageIds = [...new Set(
    inputColumns
      .filter((column) =>
        column?.kind === 'computed' &&
        (
          column?.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_START_DATE ||
          column?.computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_END_DATE
        ) &&
        column?.stageId
      )
      .map((column) => getIdString(column.stageId))
      .filter(Boolean)
  )];

  const fields = fieldIds.length > 0
    ? await Field.find({ _id: { $in: fieldIds }, active: true, inReport: true }).select('name')
    : [];
  const stages = stageIds.length > 0
    ? await ProductionStage.find({ _id: { $in: stageIds }, isActive: true }).select('name displayName')
    : [];

  const fieldMap = new Map(fields.map((field) => [String(field._id), field]));
  const stageMap = new Map(stages.map((stage) => [String(stage._id), stage]));

  return inputColumns
    .map((column) => {
      if (column?.kind === 'field') {
        const fieldId = getIdString(column.fieldId);
        const field = fieldMap.get(fieldId);

        if (!field) {
          return null;
        }

        return {
          kind: 'field',
          fieldId,
          computedKey: null,
          stageId: null,
          label: String(column.label || field.name || '').trim() || field.name,
        };
      }

      if (column?.kind !== 'computed') {
        return null;
      }

      const computedKey = column.computedKey;
      if (!REPORT_TEMPLATE_COMPUTED_KEY_VALUES.includes(computedKey)) {
        return null;
      }

      if (
        computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_START_DATE ||
        computedKey === REPORT_TEMPLATE_COMPUTED_KEYS.PRODUCTION_STAGE_END_DATE
      ) {
        const stageId = getIdString(column.stageId);
        const stage = stageMap.get(stageId);

        if (!stage) {
          return null;
        }

        return {
          kind: 'computed',
          fieldId: null,
          computedKey,
          stageId,
          label: String(column.label || buildComputedColumnLabel(computedKey, stage)).trim() || buildComputedColumnLabel(computedKey, stage),
        };
      }

      return {
        kind: 'computed',
        fieldId: null,
        computedKey,
        stageId: null,
        label: String(column.label || buildComputedColumnLabel(computedKey)).trim() || buildComputedColumnLabel(computedKey),
      };
    })
    .filter(Boolean);
}

export async function promoteNewestReportTemplateAsActive() {
  const newestTemplate = await ReportTemplate.findOne().sort({ createdAt: -1 });
  if (!newestTemplate) {
    return null;
  }

  await ReportTemplate.updateMany({}, { isActive: false });
  newestTemplate.isActive = true;
  await newestTemplate.save();

  return getPopulatedReportTemplateById(newestTemplate._id);
}
