function normalizeFieldId(fieldId) {
  if (!fieldId) return null;
  if (typeof fieldId === 'object') {
    if (fieldId._id) return fieldId._id.toString();
    if (typeof fieldId.toString === 'function') return fieldId.toString();
    return null;
  }
  return fieldId.toString();
}

function normalizeAssetUrls(value) {
  const items = Array.isArray(value) ? value : (value ? [value] : []);

  return items.flatMap((item) => {
    if (!item) return [];

    if (typeof item === 'string') {
      const trimmed = item.trim();
      return trimmed ? [trimmed] : [];
    }

    if (typeof item === 'object') {
      const candidates = [item.url, item.src, item.path, item.location];
      return candidates
        .filter((candidate) => typeof candidate === 'string')
        .map((candidate) => candidate.trim())
        .filter(Boolean);
    }

    return [];
  });
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function hasMeaningfulFieldValue(value, type) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'string') return value.trim() !== '';

  if (Array.isArray(value)) {
    return value.some(item => hasMeaningfulFieldValue(item, type));
  }

  if (typeof value === 'object') {
    if (type === 'table') {
      const rows = Array.isArray(value.rows) ? value.rows : [];
      const predefinedData = Array.isArray(value.predefinedData) ? value.predefinedData : [];

      const hasRowContent = rows.some(row =>
        Array.isArray(row) && row.some(cell => typeof cell === 'string' ? cell.trim() !== '' : !!cell)
      );

      const hasPredefinedContent = predefinedData.some(item =>
        (typeof item?.opd === 'string' && item.opd.trim() !== '') ||
        (typeof item?.etd === 'string' && item.etd.trim() !== '') ||
        item?.purchaseType === 'instock'
      );

      return hasRowContent || hasPredefinedContent;
    }

    return Object.values(value).some(item => hasMeaningfulFieldValue(item, type));
  }

  return false;
}

function findFieldState(fields, fieldId, fieldDef = null) {
  const normalizedFieldId = normalizeFieldId(fieldId);

  return fields.find(field => {
    const currentFieldId = normalizeFieldId(
      field.originalFieldId ||
      (field.field && (typeof field.field === 'object' ? field.field._id || field.field : field.field))
    );

    return (normalizedFieldId && currentFieldId === normalizedFieldId) ||
      (fieldDef && field.name === fieldDef.name && field.department === fieldDef.department);
  }) || null;
}

function isOptionalFieldEnabled(fields, fieldId, fieldDef) {
  if (!fieldDef?.isOptional) return true;

  const fieldState = findFieldState(fields, fieldId, fieldDef);
  if (typeof fieldState?.isOptionalEnabled === 'boolean') {
    return fieldState.isOptionalEnabled;
  }

  return hasMeaningfulFieldValue(fieldState?.value, fieldDef.type);
}

export async function printDepartmentPanelExcel({
  fields,
  hasUnsavedChanges,
  isAutoSaving,
  isFieldHidden,
  setIsPrinting,
  srd,
  toast,
}) {

  try {
    // If there are unsaved changes or auto-save is in progress, wait
    if (hasUnsavedChanges || isAutoSaving) {
      setIsPrinting(true);
      // Wait for up to 5 seconds for auto-save to complete
      let waitAttempts = 0;
      while ((hasUnsavedChanges || isAutoSaving) && waitAttempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitAttempts++;
      }
    }

    setIsPrinting(true);

    // Fetch the active print template
    const templateRes = await fetch('/api/printTemplate/active');

    if (!templateRes.ok) {
      setIsPrinting(false);
      throw new Error('Failed to fetch active template');
    }

    const activeTemplateForPrint = await templateRes.json();

    if (!activeTemplateForPrint) {
      setIsPrinting(false);
      toast({
        title: 'No active template',
        description: 'Please create and activate a print template in the template designer.',
        variant: 'destructive',
      });
      return;
    }

    // Fetch all field definitions to get field metadata
    const allFieldDefsForPrint = [];
    for (const dept of ['vmd', 'cad', 'commercial', 'mmc']) {
      try {
        const res = await fetch(`/api/newField?department=${dept}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          allFieldDefsForPrint.push(...data);
        }
      } catch (err) {
        console.error(`Failed to fetch ${dept} fields:`, err);
      }
    }
    const allFieldDefsMap = Object.fromEntries(
      allFieldDefsForPrint.map(field => [field._id.toString(), field])
    );

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setIsPrinting(false);
      toast({
        title: 'Print blocked',
        description: 'Please allow popups for this site to enable printing',
        variant: 'destructive',
      });
      return;
    }

    // Build the print content using the template
    const gridColumns = activeTemplateForPrint.gridColumns || 6;
    let fieldsHTML = '';

    activeTemplateForPrint.cells.forEach(cell => {
      const colSpan = (cell.position?.colSpan || 1) * 2;
      const rowSpan = cell.position?.rowSpan || 1;
      const height = cell.position?.height || 'auto';

      const minHeight =
        height === 'small' ? '12px' :
          height === 'medium' ? '25px' :
            height === 'large' ? '50px' :
              height === 'xlarge' ? '90px' : 'auto';

      // Handle custom elements
      if (cell.isCustom) {
        // ... (keep custom logic)
        const customType = cell.customType;
        const customValue = cell.customValue || '';
        const customPlaceholder = cell.customPlaceholder || '';

        let customHTML = '';

        switch (customType) {
          case 'custom-heading':
            customHTML = `
            <div class="field-cell cell-heading" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
              <div class="heading-content" style="text-align: left; width: 100%;">${customValue}</div>
            </div>
          `;
            break;

          case 'custom-text':
            customHTML = `
              <div class="field-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
                <div class="static-text">${customValue}</div>
              </div>
            `;
            break;

          case 'custom-empty-field':
            customHTML = `
              <div class="field-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
                <div class="cell-content">
                  <span class="cell-label">${customValue}</span>
                  <span class="">${customPlaceholder ? `<span class="placeholder-text">${customPlaceholder}</span>` : ''}</span>
                </div>
              </div>
            `;
            break;

          case 'custom-textarea':
            customHTML = `
              <div class="field-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
                <div class="textarea-container">
                  <div class="textarea-label">${customValue}:</div>
                  <div class="textarea-box">${customPlaceholder ? `<span class="placeholder-text">${customPlaceholder}</span>` : ''}</div>
                </div>
              </div>
            `;
            break;

          case 'custom-separator':
            customHTML = `
              <div class="field-cell separator-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan};">
                <div class="separator-line"></div>
              </div>
            `;
            break;

          case 'custom-signature':
            customHTML = `
              <div class="field-cell signature-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
                <div class="signature-container">
                  <div class="signature-label">${customValue}</div>
                  <div class="signature-line"></div>
                  <div class="signature-helper">SIGNATURE & DATE</div>
                </div>
              </div>
            `;
            break;

          default:
            customHTML = `
              <div class="field-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
                <div class="cell-content">
                  <span class="cell-underline"></span>
                </div>
              </div>
            `;
        }

        fieldsHTML += customHTML;
        return;
      }

      // Handle regular database fields
      // Get field definition - prioritize populated object from template
      let fieldDef = null;
      let fieldIdStr = null;

      if (cell.fieldId && typeof cell.fieldId === 'object' && cell.fieldId._id) {
        // It's already populated! Use it.
        fieldDef = cell.fieldId;
        fieldIdStr = cell.fieldId._id.toString();
      } else if (cell.fieldId) {
        // It's just an ID, look it up (fallback)
        fieldIdStr = normalizeFieldId(cell.fieldId);
        fieldDef = allFieldDefsMap[fieldIdStr];
      }

      if (!fieldDef) {
        console.warn(`Field definition not found for ID: ${cell.fieldId}`);
        return;
      }

      if (fieldDef.isOptional && !isOptionalFieldEnabled(fields, fieldIdStr, fieldDef)) {
        fieldsHTML += `
            
          `;
        return;
      }

      // Check if field is active OR hidden dynamically
      // If so, render a placeholder to preserve layout
      if (fieldDef.active === false || isFieldHidden(fieldDef)) {
        fieldsHTML += `
            <div class="field-cell" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
              <div class="cell-content">
                <span class="cell-label" style="opacity: 0.5;">${fieldDef.name}</span>
                <span class="cell-underline" style="border-bottom: 0.4px dashed #ccc;"></span>
              </div>
            </div>
          `;
        return;
      }

      // Find the field value from SRD data - Use local 'fields' state as source of truth
      let fieldValue = '';
      const localField = findFieldState(fields, fieldIdStr, fieldDef);

      if (localField) {
        fieldValue = localField.value || '';
      } else {
        // Fallback to srd prop if not in local state
        const srdField = findFieldState(srd.dynamicFields || [], fieldIdStr, fieldDef);
        if (srdField) {
          fieldValue = srdField.value || '';
        }
      }

      let valueDisplay = '';
      const isHeading = fieldDef.type === 'heading';
      const isImage = fieldDef.type === 'image';
      const isFile = fieldDef.type === 'file';
      const isTable = fieldDef.type === 'table';
      const isCreatedAt = fieldDef.type === 'createdAt';

      if (fieldDef.type === 'boolean') {
        if (fieldDef.booleanDisplayType === 'instock-purchase') {
          valueDisplay = `
            <div class="checkbox-group">
              <span class="checkbox-item">${fieldValue ? 'In Stock' : 'Purchase'}</span>
            </div>
          `;
        } else {
          valueDisplay = `
            <div class="checkbox-group">
              <span class="checkbox-item">${fieldValue ? 'Yes' : 'NO'}</span>
            </div>
          `;
        }
      } else if (isTable) {
        const defaultHeaders = Array.isArray(fieldDef.tableHeaders) && fieldDef.tableHeaders.length > 0
          ? fieldDef.tableHeaders
          : ['Item Name', 'Code', 'Finish', 'Size'];

        const rawTableData = fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)
          ? fieldValue
          : {};
        const safeHeaders = Array.isArray(rawTableData.headers) && rawTableData.headers.length > 0
          ? rawTableData.headers
          : defaultHeaders;
        const safeRows = Array.isArray(rawTableData.rows) && rawTableData.rows.length > 0
          ? rawTableData.rows.map((row) => {
            if (!Array.isArray(row)) return new Array(safeHeaders.length).fill('');
            if (row.length >= safeHeaders.length) return row;
            return [...row, ...new Array(safeHeaders.length - row.length).fill('')];
          })
          : [new Array(safeHeaders.length).fill('')];
        const tableData = {
          ...rawTableData,
          headers: safeHeaders,
          rows: safeRows
        };
        if (tableData.headers && tableData.headers.length > 0) {
          const predefinedHeaders = `<th class="table-header" style="background:transparent;color:#4338ca;">Purchase/Stock</th><th class="table-header" style="background:transparent;color:#4338ca;">OPD</th><th class="table-header" style="background:transparent;color:#4338ca;">IHD</th>`;
          const headerRow = tableData.headers.map(h => `<th class="table-header">${h}</th>`).join('') + predefinedHeaders;
          const predefinedData = (Array.isArray(rawTableData.predefinedData) ? rawTableData.predefinedData : [])
            .slice(0, tableData.rows.length)
            .map((item) => ({
              purchaseType: item?.purchaseType === 'instock' ? 'instock' : 'purchase',
              opd: typeof item?.opd === 'string' ? item.opd : '',
              etd: typeof item?.etd === 'string' ? item.etd : ''
            }));
          const bodyRows = (tableData.rows || []).map((row, rowIdx) => {
            const firstCell = row[0] || '';
            const restCells = row.slice(1).map(cell => `<td class="table-field-cell"><span class="table-field-underline">${cell || ''}</span></td>`).join('');
            const rp = predefinedData[rowIdx] || { purchaseType: 'purchase', opd: '', etd: '' };
            const isInStock = rp.purchaseType === 'instock';
            const typeLabel = isInStock ? 'In Stock' : 'Purchase';
            const opdVal = isInStock ? '-' : (rp.opd || '');
            const etdVal = isInStock ? '-' : (rp.etd || '');
            const predefinedCells = `<td class="table-field-cell" style="text-align:start;"><span class="table-field-underline" style="font-weight:600;color:${isInStock ? '#059669' : '#2563eb'}">${typeLabel}</span></td><td class="table-field-cell"><span class="table-field-underline">${opdVal}</span></td><td class="table-field-cell"><span class="table-field-underline">${etdVal}</span></td>`;
            return `<tr><td class="table-field-label"><span class="table-field-underline">${firstCell}</span></td>${restCells}${predefinedCells}</tr>`;
          }).join('');
          const totalCols = tableData.headers.length + 3; // +3 for predefined columns

          if (totalCols >= 10) {
            // Card/List Layout for wide tables
            const cardsHtml = (tableData.rows || []).map((row, rowIdx) => {
              const rp = predefinedData[rowIdx] || { purchaseType: 'purchase', opd: '', etd: '' };
              const isInStock = rp.purchaseType === 'instock';
              const typeLabel = isInStock ? 'In Stock' : 'Purchase';
              const opdVal = isInStock ? '-' : (rp.opd || '');
              const etdVal = isInStock ? '-' : (rp.etd || '');

              // 1. First column (first 4 fields)
              const col1Items = [];
              // 2. Second column (all other dynamic fields)
              const col2Items = [];
              // 3. Third column (predefined fields)
              const col3Items = [];

              // Collect first 4 columns
              for (let i = 0; i < Math.min(4, tableData.headers.length); i++) {
                col1Items.push({ label: tableData.headers[i] || (i === 0 ? 'Item Name' : `Column ${i + 1}`), value: row[i] || '' });
              }

              // Collect remaining middle columns
              for (let i = 4; i < tableData.headers.length; i++) {
                col2Items.push({ label: tableData.headers[i] || `Column ${i + 1}`, value: row[i] || '' });
              }

              // Render predefined column with horizontal layout
              const renderPredefinedColumn = () => `
                  <div class="predefined-col-wrapper">
                    <div class="predefined-row">
                      <div class="predefined-item">
                        <div class="predefined-header">Purchase/Stock</div>
                        <div class="predefined-value"><span style="font-weight:600;color:${isInStock ? '#059669' : '#2563eb'}">${typeLabel}</span></div>
                      </div>
                      <div class="predefined-item">
                        <div class="predefined-header">OPD</div>
                        <div class="predefined-value">${opdVal}</div>
                      </div>
                      <div class="predefined-item">
                        <div class="predefined-header">IHD</div>
                        <div class="predefined-value">${etdVal}</div>
                      </div>
                    </div>
                  </div>
                `;

              const renderColumn = (items) => items.map(item => `
                  <div class="field-cell" style="flex:0 0 auto;">
                    <div class="cell-content">
                      <span class="cell-label">${item.label}</span>
                      <span class="cell-underline">${item.value}</span>
                    </div>
                  </div>
                `).join('');

              return `
                  <div class="print-table-card">
                    <div class="print-card-col">${renderColumn(col1Items)}</div>
                    <div class="print-card-col">${col2Items.length > 0 ? renderColumn(col2Items) : '<div class="print-card-empty">-</div>'}</div>
                    <div class="print-card-col print-card-col-predefined">${renderPredefinedColumn()}</div>
                  </div>
                `;
            }).join('');

            valueDisplay = `<div class="print-cards-container">${cardsHtml}</div>`;

          } else {
            // Standard Grid Layout (Condensed if 8-9 cols)
            const condensedClass = totalCols >= 8 ? ' print-table-condensed' : '';
            const widePredefinedClass = ' print-table-wide-predefined';

            // Build colgroup for width distribution: predefined cols get 1/3, dynamic cols get 2/3
            let colgroupHTML = '';
            {
              const dynamicColCount = tableData.headers.length; // number of user-defined columns
              const predefinedTotalWidth = 33.33; // 1/3 of page for 3 predefined columns
              const dynamicTotalWidth = 66.67; // 2/3 for remaining columns
              const perDynamicWidth = dynamicTotalWidth / dynamicColCount;
              const perPredefinedWidth = predefinedTotalWidth / 3;
              colgroupHTML = '<colgroup>'
                + Array(dynamicColCount).fill(`<col style="width:${perDynamicWidth.toFixed(2)}%">`).join('')
                + Array(3).fill(`<col style="width:${perPredefinedWidth.toFixed(2)}%">`).join('')
                + '</colgroup>';
            }

            valueDisplay = `
              <table class="print-table${condensedClass}${widePredefinedClass}">
                ${colgroupHTML}
                <thead><tr>${headerRow}</tr></thead>
                <tbody>${bodyRows}</tbody>
              </table>
            `;
          }
        } else {
          valueDisplay = '<span class="no-value">No table data</span>';
        }
      } else if (isFile) {
        if (fieldValue) {
          valueDisplay = `
            <div style="display: flex; page-break-after:always; align-items: center; gap: 4px;">
              
              <span style="font-size: 8px;">Excel File Attached</span>
            </div>
          `;
        } else {
          valueDisplay = '<span class="no-value"></span>';
        }
      } else if (isImage) {
        const images = normalizeAssetUrls(fieldValue);
        const globalImages = normalizeAssetUrls(srd.images);
        const allImages = [...new Set([...globalImages, ...images])];

        if (allImages.length > 0) {
          const imgGrid = allImages.map((img, index) =>
            `<div class="img-wrapper ${allImages.length === 1 ? 'is-single-image' : ''}">
              <img
                src="${escapeHtmlAttribute(img)}"
                class="img-print"
                alt="${escapeHtmlAttribute(`${fieldDef.name} ${index + 1}`)}"
                data-print-image
                loading="eager"
                decoding="sync"
              />
            </div>`
          ).join('');
          valueDisplay = `<div class="image-stack ${allImages.length === 1 ? 'is-single-image' : ''}">${imgGrid}</div>`;
        } else {
          valueDisplay = '<span class="no-value"></span>';
        }
      } else if (isHeading) {
        valueDisplay = fieldDef.name;
      } else if (isCreatedAt) {
        // For createdAt type, display the SRD's createdAt
        valueDisplay = srd.createdAt ? new Date(srd.createdAt).toISOString().split('T')[0] : '';
      } else {
        valueDisplay = fieldValue || '';
      }

      fieldsHTML += `
        <div class="field-cell ${isHeading ? 'cell-heading' : ''} ${isImage ? 'cell-image' : ''} ${isTable ? 'cell-table' : ''} ${colSpan === 1 ? 'is-small-cell' : ''}" style="grid-column: span ${colSpan}; grid-row: span ${rowSpan}; min-height: ${minHeight};">
          ${!isHeading && !isImage && !isTable ? `
              <div class="cell-content">
                <span style="font-size: 11px;" class="cell-label">${fieldDef.name}</span>
                <span style="font-size: 11px;" class="cell-underline">${valueDisplay}</span>
              </div>
          ` : isImage ? `
              <div class="cell-image-container">
                <div class="image-label">${fieldDef.name}</div>
                ${valueDisplay}
              </div>
          ` : isTable ? `
              <div class="cell-table-container">
                <div class="table-label">${fieldDef.name}</div>
                ${valueDisplay}
              </div>
          ` : `
              <div class="heading-content">${valueDisplay}</div>
          `}
        </div>
      `;
    });

    // If no fields were rendered, show a message
    if (!fieldsHTML.trim()) {
      fieldsHTML = `
        <div class="field-cell" style="grid-column: span ${gridColumns * 2}; text-align: center; padding: 40px;">
          <div style="color: #666; font-style: italic;">
            No matching fields found for this template. Please check your template configuration.
          </div>
        </div>
      `;
    }

    // Identify Excel files to include in print
    const excelFiles = fields.reduce((result, field) => {
      const fieldId = normalizeFieldId(field.originalFieldId || field.field);
      const fieldDef = (fieldId && allFieldDefsMap[fieldId]) || allFieldDefsForPrint.find(def => def.name === field.name && def.department === field.department);
      const effectiveType = field.type || fieldDef?.type;

      if (effectiveType !== 'file' || !field.value) {
        return result;
      }

      if (fieldDef?.isOptional && !isOptionalFieldEnabled(fields, fieldId, fieldDef)) {
        return result;
      }

      result.push({ name: field.name, url: field.value });
      return result;
    }, []);

    const srdId = normalizeFieldId(srd?._id || srd?.id);
    const qrBaseUrl = window.location.origin;
    const srdDetailUrl = srdId
      ? new URL(`/srd/${encodeURIComponent(srdId)}/details`, qrBaseUrl).toString()
      : '';
    const srdQrUrl = srdDetailUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=128x128&margin=0&data=${encodeURIComponent(srdDetailUrl)}`
      : '';

    const printContent = `<!DOCTYPE html>
<html>
<head>
  <title>SRD Complete Form - ${srd.refNo}</title>
  ${excelFiles.length > 0 ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>' : ''}
  <style>
    @page {
      size: A4;
      margin: 0.03in;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10px;
      text-transform: capitalize !important;
      line-height: 1.1;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
    }
    
    .header {
      margin-top: 10px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .header-main {
      flex: 1;
      min-width: 0;
    }
    
    .header h1 {
      font-size: 13px;
      margin: 0 0 5px 0;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      border-bottom: 1px solid #1a1a1a;
      padding-bottom: 2px;
    }
    
    .header-qr {
      width: 150px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-qr-frame {
      width: 150px;
      height: 100px;
      border: 1px solid #d1d5db;
      background: #fff;
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-qr-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .template-grid {
      display: grid;
      grid-template-columns: repeat(${gridColumns * 2}, minmax(0, 1fr));
      gap: 4px 1px;
      margin-bottom: 10px;
    }
    
    .field-cell {
      padding: 2px 0 0 0;
      background: white;
      display: flex;
      min-height: 15px !important;
      flex-direction: column;
      justify-content: flex-start;
    }

    .cell-image {
      padding: 1px;
      height: auto;
    }
    
    .cell-heading {
      background-color: #f3f4f6;
      justify-content: start;
      align-items: center;
    }
    
    .heading-content {
      font-weight: 700;
      text-transform: capitalize;
      font-size: 13px;
      background-color: #f3f4f6;
      text-align: left;
      width: 100%;
      padding: 4px;
    }

    .cell-content {
      display: flex;
      align-items: flex-start;
      width: 100%;
      gap: 4px;
      height: 100%;
    }

    .cell-label {
      font-size: 11px;
      font-weight: 700;
      color: #333;
      white-space: normal;
      text-transform: capitalize;
      width: 120px; 
      flex-shrink: 0;
      line-height: 10px;
    }

    .is-small-cell .cell-label {
      width: auto !important;
      max-width: 50%;
      
      min-width: 20px;
      margin-right: 4px;
    }

    .cell-underline {
      font-size: 11px;
      color: #000;
      flex-grow: 1;
      border-bottom: 0.4px solid #999;
      min-height: 15px;
      padding: 0 2px;
      display: flex;
      align-items: center;
      white-space: pre-wrap;
      width: 100%;
      line-height: 1.2;
      margin-right: 10px;
    }

    .checkbox-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .checkbox-item {
      font-size: 11px;
      font-weight: 600;
    }

    /* Image cell specific styles */
    .cell-image-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .image-label {
      font-size: 11px;
      font-weight: 700;
      color: #333;
      text-transform: capitalize;
      padding: 1px 2px;
      background: #f9f9f9;
      border-bottom: 0.5px solid #ddd;
      flex-shrink: 0;
    }

    /* Image stack - fills remaining space after label */
    .image-stack {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px;
      width: 100%;
      align-content: start;
    }

    .image-stack.is-single-image {
      grid-template-columns: 1fr;
    }
    
    .img-wrapper {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-height: 72px;
      aspect-ratio: 4 / 3;
      position: relative;
      border: 0.5px solid #ddd;
      background: #fff;
      
    }

    .img-wrapper.is-single-image {
      min-height: 140px;
    }

    .img-print {
      max-width: 100%;
      max-height: 100%;
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      position: static;
    }

    /* Custom element styles */
    .static-text {
      font-size: 11px;
      color: #333;
      padding: 2px;
    }

    .placeholder-text {
      font-size: 6px;
      color: #999;
      font-style: italic;
    }

    .textarea-container {
      padding: 2px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .textarea-label {
      font-size: 11px;
      font-weight: 700;
      color: #333;
      text-transform: capitalize;
      margin-bottom: 2px;
    }

    .textarea-box {
      flex: 1;
      border: 0.4px solid #999;
      min-height: 30px;
      padding: 2px;
    }

    .separator-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 0;
    }

    .separator-line {
      width: 100%;
      border-top: 1px solid #333;
    }

    .signature-cell {
      padding: 4px;
    }

    .signature-container {
      text-align: center;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .signature-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: capitalize;
      color: #333;
    }

    .signature-line {
      border-bottom: 0.5px dotted #666;
      min-height: 20px;
      margin: 4px 0;
    }

    .signature-helper {
      font-size: 5px;
      color: #666;
      text-transform: uppercase;
    }

    /* Table cell styles */
    .cell-table {
      padding: 1px;
      height: auto;
    }

    .cell-table-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .table-label {
      font-size: 12px;
      
      font-weight: 700;
      color: #333;
      text-transform: capitalize;
      padding: 0px;
      
      
      flex-shrink: 0;
    }

    .print-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 8px;
      border: none;
    }

    .print-table .table-header {
      background-color: #f3f4f6;
      border: none;
      margin-bottom: 10px;
      padding: 2px 3px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
      color: #333;
      text-transform: capitalize;
    }

    .print-table .table-field-label {
      padding: 2px 3px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 5px;
      color: #333;
      text-transform: capitalize;
      white-space: normal;
      word-break: break-word;
      border: none;
    }

    .print-table .table-field-cell {
      padding: 2px 3px;
      text-align: left;
      border: none;
    }

    .print-table .table-field-underline {
      font-size: 11px;
      color: #000;
      display: inline-block;
      width: calc(100% - 5px);
      border-bottom: 0.4px solid #999;
      min-height: 14px;
      padding: 0 2px;
      line-height: 14px;
      white-space: pre-wrap;
    }
    
    /* Condensed styles for tables with many columns */
    .print-table-condensed {
      font-size: 11px !important;
    }
    .print-table-condensed .table-header,
    .print-table-condensed .table-field-label,
    .print-table-condensed .table-field-underline {
      font-size: 11px !important;
      white-space: normal !important;
      word-break: break-word;
      padding: 2px 3px !important;
      min-height: auto !important;
      line-height: 1.2 !important;
    }
    .print-table-condensed .table-header {
      background-color: #f3f4f6 !important;
    }

    /* Wide predefined columns layout for tables with < 8 columns */
    .print-table-wide-predefined {
      table-layout: fixed;
    }
    
    /* Card Layout for Very Wide Tables (10+ columns) */
    .print-cards-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 6px;
      width: 100%;
    }
    
    .print-table-card {
      background-color: transparent;
      padding-top: 4px;
      padding-bottom: 4px;
      
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0px;
      break-inside: avoid;
    }
    
    .print-card-col {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      gap: 2px;
    }
    
    /* Light background for predefined fields column (3rd column) */
    .print-card-col-predefined {
      transform: translateY(-23px);
    }
    
    /* Predefined column wrapper with horizontal layout */
    .predefined-col-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .predefined-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      align-items: start;
    }
    
    .predefined-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .predefined-header {
      font-size: 12px;
      font-weight: 700;
      color: #4f46e5;
      text-align: left;
      margin-bottom: 2px;
    }
    
    .predefined-value {
      font-size: 11px;
      color: #1f2937;
      text-align: left;
      padding: 3px 0;
      border-bottom: 1px solid #9ca3af;
      min-height: 15px;
    }
    
    .print-card-empty {
      color: #999;
      font-style: italic;
      font-size: 11px;
      text-align: center;
      margin-top: 4px;
    }
    
    .footer {
      margin-top: 10px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      font-size: 7px;
    }
    
    .signature-box {
      border-top: 0.5px solid #000;
      padding-top: 3px;
    }
    
    .signature-title {
      font-weight: bold;
      margin-bottom: 15px;
    }

    /* Excel Print Styles */
    .excel-container {
      margin-top: 20px;
      
    }

    .excel-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: capitalize;
      background: #f3f4f6;
      padding: 4px;
      border: 1px solid #333;
      margin-bottom: 5px;
    }

    .excel-table-wrapper {
      width: 100%;
      justify-items: center;
      overflow: visible;
    }

    table {
      
      border-collapse: collapse;
      table-layout: fixed; /* Ensures equal column widths */
    }

    table, th, td {
      border: 0.5px solid #666;
    }

    th, td {
      padding: 4px 8px;
      text-align: left;
      word-wrap: break-word;
      height: 12px; /* Enforce minimum height for rows */
      vertical-align: middle;
    }

    th {
      font-size: 11px;
      font-weight: bold;
      background-color: #f9f9f9;
      height: 12px; /* Ensure header has same height */
    }

    td {
      font-size: 8px;
    }

    @media print {
      body { 
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      .cell-heading,
      .heading-content,
      .table-header,
      .print-table .table-header {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        background-color: #f3f4f6 !important;
      }
      
      .img-print {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

     
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-main">
      <h1>Sample Request Form</h1>
    </div>
    ${srdQrUrl ? `
      <div class="header-qr">
        <div class="header-qr-frame">
          <img
            src="${srdQrUrl}"
            alt="SRD detail QR code"
            class="header-qr-image"
            data-srd-qr
            loading="eager"
            decoding="sync"
          />
        </div>
      </div>
    ` : ''}
  </div>
  
  <div class="template-grid">
    ${fieldsHTML}
  </div>

  <div id="excel-sections"></div>

  <script>
    async function waitForImages(selector, timeoutMs = 5000) {
      const images = Array.from(document.querySelectorAll(selector));

      if (!images.length) {
        return;
      }

      await Promise.all(images.map((image) => {
        if (image.complete) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            resolve();
          };

          image.addEventListener('load', done, { once: true });
          image.addEventListener('error', done, { once: true });
          setTimeout(done, timeoutMs);
        });
      }));
    }

    async function printWhenReady(delay = 250) {
      await waitForImages('[data-srd-qr], [data-print-image]');
      setTimeout(() => {
        window.focus();
        window.print();
      }, delay);
    }

    async function loadExcelFiles() {
      const files = ${JSON.stringify(excelFiles)};
      const container = document.getElementById('excel-sections');
      
      for (const file of files) {
        try {
          const response = await fetch(file.url);
          const arrayBuffer = await response.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const section = document.createElement('div');
          section.className = 'excel-container';
          
          const title = document.createElement('div');
          title.className = 'excel-title';
          title.textContent = 'ATTACHED EXCEL: ' + file.name;
          section.appendChild(title);
          
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            
            // Recalculate sheet range to ignore trailing/leading empty rows and columns
            if (sheet['!ref']) {
              const range = XLSX.utils.decode_range(sheet['!ref']);
              let maxRow = range.s.r, maxCol = range.s.c;
              let minRow = range.e.r, minCol = range.e.c;
              let hasData = false;
              
              for(let R = range.s.r; R <= range.e.r; ++R) {
                for(let C = range.s.c; C <= range.e.c; ++C) {
                  const cellRef = XLSX.utils.encode_cell({c: C, r: R});
                  const cell = sheet[cellRef];
                  if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
                    hasData = true;
                    if (R < minRow) minRow = R;
                    if (R > maxRow) maxRow = R;
                    if (C < minCol) minCol = C;
                    if (C > maxCol) maxCol = C;
                  }
                }
              }
              
              if (hasData) {
                sheet['!ref'] = XLSX.utils.encode_range({
                  s: { c: minCol, r: minRow },
                  e: { c: maxCol, r: maxRow }
                });
              } else {
                return; // Skip empty sheet completely
              }
            }

            const htmlTable = XLSX.utils.sheet_to_html(sheet);
            
            const sheetTitle = document.createElement('div');
            sheetTitle.style.fontWeight = 'bold';
            sheetTitle.style.margin = '5px 0';
            sheetTitle.textContent = 'Sheet: ' + sheetName;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'excel-table-wrapper';
            wrapper.innerHTML = htmlTable;

            // DOM Cleanup for internal empty rows and columns
            // Remove empty rows
            const rows = wrapper.querySelectorAll('tr');
            rows.forEach(row => {
              let isEmpty = true;
              const cells = row.querySelectorAll('td, th');
              cells.forEach(cell => {
                const text = cell.textContent || '';
                if (text.trim().replace(new RegExp(String.fromCharCode(160), 'g'), '') !== '') {
                  isEmpty = false;
                }
              });
              if (isEmpty) {
                row.remove();
              }
            });

            // Remove empty columns only if there are no merged cells to avoid structure breakage
            const table = wrapper.querySelector('table');
            if (table && !table.querySelector('[colspan], [rowspan]')) {
              const rowsList = Array.from(table.rows);
              let maxCols = 0;
              rowsList.forEach(row => {
                if (row.cells.length > maxCols) maxCols = row.cells.length;
              });
              
              const emptyCols = [];
              for (let i = 0; i < maxCols; i++) {
                let isEmpty = true;
                for (let j = 0; j < rowsList.length; j++) {
                  const cell = rowsList[j].cells[i];
                  if (cell) {
                    const text = cell.textContent || '';
                    if (text.trim().replace(new RegExp(String.fromCharCode(160), 'g'), '') !== '') {
                      isEmpty = false;
                      break;
                    }
                  }
                }
                if (isEmpty) {
                  emptyCols.push(i);
                }
              }
              
              // Remove empty columns from right to left
              for (let i = emptyCols.length - 1; i >= 0; i--) {
                const colIndex = emptyCols[i];
                for (let j = 0; j < rowsList.length; j++) {
                  if (rowsList[j].cells[colIndex]) {
                    rowsList[j].deleteCell(colIndex);
                  }
                }
              }
            }
            
            // Only append the sheet if it still has data after cleanup
            if (wrapper.querySelectorAll('tr').length > 0 && wrapper.querySelectorAll('td, th').length > 0) {
              section.appendChild(sheetTitle);
              section.appendChild(wrapper);
            }
          });
          
          container.appendChild(section);
        } catch (err) {
          console.error('Error loading excel:', err);
        }
      }
      
      // Notify parent that we are ready or just print
      printWhenReady(1000);
    }
    
    if (${excelFiles.length} > 0) {
      loadExcelFiles();
    } else {
      printWhenReady(500);
    }
  </script>
</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();

    setTimeout(() => {
      setIsPrinting(false);
    }, 3000);

  } catch (error) {
    console.error('Print failed:', error);
    setIsPrinting(false);
    toast({
      title: 'Print failed',
      description: error.message || 'Failed to generate print view',
      variant: 'destructive',
    });
  }
}
