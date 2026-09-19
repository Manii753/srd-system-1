// Shared filter definitions used across every sample/SRD list in the app.
// Wherever filters show up, the Brand + Sample Type + Stage options are offered.

export const STAGE_FILTER_OPTIONS = [
  { value: 'incomplete',  label: 'Incomplete' },
  { value: 'cad',         label: 'CAD' },
  { value: 'sewing',      label: 'Sewing' },
  { value: 'finishing',   label: 'Finishing' },
  { value: 'dispatched',  label: 'Dispatched' },
  { value: 'approved',    label: 'Approved' },
  { value: 'rejected',    label: 'Rejected' },
];

export const STAGE_FILTER_VALUES = STAGE_FILTER_OPTIONS.map(o => o.value);

// Field name normalization used to match dynamic fields case/punctuation-insensitively
function norm(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findDynamicField(srd, matchers) {
  return (srd?.dynamicFields || []).find(f =>
    f?.value != null && f.value !== '' && matchers(f)
  );
}

export function getBrand(srd) {
  const f = findDynamicField(srd, f =>
    norm(f.slug) === 'brand' ||
    norm(f.name) === 'brand' ||
    norm(f.name) === 'buyer'
  );
  return f ? String(f.value) : '';
}

export function getSampleType(srd) {
  const f = findDynamicField(srd, f =>
    norm(f.slug) === 'sample-type' ||
    norm(f.name) === 'sampletype'
  );
  return f ? String(f.value) : '';
}

// Resolve the lifecycle stage bucket for an SRD. Mirrors the server-side
// /api/srd `stage` filter so client-side pages match the SRD list behaviour.
export function resolveStage(srd) {
  if (srd?.BuyerApproved) return 'approved';
  if ((srd?.internalRejectedReasons || []).length > 0 ||
      (srd?.BuyerRejectedReasons || []).length > 0) return 'rejected';
  if (srd?.sampleDispatchedToBuyer) return 'dispatched';

  const sp = srd?.sampleProcess || [];
  const history = srd?.productionHistory || [];
  const activeSp = sp.find(s => s.status === 'in-progress' || s.status === 'received');
  const activeHist = [...history].reverse().find(h => h.status === 'in-progress');
  const current = activeSp
    ? String(activeSp.stage || '').toLowerCase()
    : activeHist
      ? String(activeHist.stageName || activeHist.stageDisplayName || '').toLowerCase()
      : '';

  if (current === 'cad' || current === 'sewing' || current === 'finishing') return current;
  return 'incomplete';
}

export function matchesStage(srd, value) {
  return resolveStage(srd) === value;
}

export function getStageEntry(srd, stageSlug) {
  return (srd?.sampleProcess || []).find(
    s => String(s.stage || '').toLowerCase() === String(stageSlug).toLowerCase()
  ) || null;
}

export function getDescription(srd) {
  const f = findDynamicField(srd, f => norm(f.name) === 'description');
  return String(f?.value ?? '') || srd?.title || srd?.description || '';
}

// Classify an SRD for a specific stage worker:
//   'incoming' — previous stage marked Ready, this stage not received yet (coming to me soon)
//   'my-work'  — received at this stage, not marked Ready yet (my pending work)
//   null       — not relevant to this stage right now
// When `first` is true (e.g. CAD, the leading stage) there is no receive step —
// the whole un-completed queue belongs to the worker.
export function classifyForStage(srd, stageEntry, prevEntry, { first = false } = {}) {
  if (stageEntry?.status === 'completed' || stageEntry?.completedDate) return null;
  if (first) return 'my-work';
  const received =
    !!stageEntry &&
    (stageEntry.status === 'received' ||
      stageEntry.status === 'in-progress' ||
      !!stageEntry.receivedDate);
  if (received) return 'my-work';
  const prevReady =
    !!prevEntry && (prevEntry.status === 'completed' || !!prevEntry.completedDate);
  if (prevReady) return 'incoming';
  return null;
}