// Default header fields for new cost sheets / templates, mirroring the
// standard pre-costing form so custom sheets start with the familiar look.
export const DEFAULT_HEADER_FIELDS = [
  { key: 'date', label: 'Date', type: 'text', options: [''] },
  { key: 'brand', label: 'Brand', type: 'text', options: [''] },
  { key: 'fitSpecsCode', label: 'Fit Code', type: 'text', options: [''] },
  { key: 'fit', label: 'Fit', type: 'text', options: [''] },
  { key: 'description', label: 'Description', type: 'text', options: [''] },
  { key: 'fabricType', label: 'Fabric Type', type: 'text', options: [''] },
  { key: 'embellishmentYesNo', label: 'Embellishment', type: 'select', options: ['No', 'Yes'] },
  { key: 'costingBase', label: 'Costing Base', type: 'select', options: ['Image', 'CAD'] },
  { key: 'sampleSize', label: 'Sample Size', type: 'text', options: [''] },
];