import * as XLSX from 'xlsx';
import {
  sheetJsStyleToCss,
  excelColWidthToPx,
  excelRowHeightToPx,
  getSheetJsCellValue,
} from './excelStyleUtils';

/** Find used cell bounds even when !ref is missing or wrong (common in .xls) */
export function getWorksheetRange(worksheet) {
  if (worksheet['!ref']) {
    try {
      return XLSX.utils.decode_range(worksheet['!ref']);
    } catch {
      /* fall through to scan */
    }
  }

  let minR = Infinity;
  let minC = Infinity;
  let maxR = 0;
  let maxC = 0;

  for (const key of Object.keys(worksheet)) {
    if (key.charAt(0) === '!') continue;
    try {
      const { r, c } = XLSX.utils.decode_cell(key);
      minR = Math.min(minR, r);
      minC = Math.min(minC, c);
      maxR = Math.max(maxR, r);
      maxC = Math.max(maxC, c);
    } catch {
      /* skip invalid keys */
    }
  }

  if (minR === Infinity) return null;
  return { s: { r: minR, c: minC }, e: { r: maxR, c: maxC } };
}

/** Build Handsontable config from a SheetJS worksheet (used for .xls / legacy files) */
export function sheetJsWorksheetToHotConfig(worksheet) {
  const empty = {
    data: [['']],
    styleMap: {},
    colWidths: [100],
    rowHeights: [23],
    mergeCells: [],
  };

  // Primary: sheet_to_json (most reliable for legacy .xls)
  let jsonRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (!jsonRows.length) {
    const range = getWorksheetRange(worksheet);
    if (!range) return empty;
    jsonRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      range,
    });
  }

  if (!jsonRows.length) {
    const range = getWorksheetRange(worksheet);
    if (!range) return empty;

    const rowCount = range.e.r - range.s.r + 1;
    const colCount = range.e.c - range.s.c + 1;
    const data = [];
    const styleMap = {};

    for (let r = 0; r < rowCount; r++) {
      const rowData = [];
      for (let c = 0; c < colCount; c++) {
        const addr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + c });
        const cell = worksheet[addr];
        rowData.push(getSheetJsCellValue(cell));
        const style = sheetJsStyleToCss(cell?.s);
        if (Object.keys(style).length > 0) styleMap[`${r}-${c}`] = style;
      }
      data.push(rowData);
    }

    const colWidths = Array(colCount).fill(80);
    const rowHeights = Array(rowCount).fill(23);
    const mergeCells =
      worksheet['!merges']?.map((m) => ({
        row: m.s.r - range.s.r,
        col: m.s.c - range.s.c,
        rowspan: m.e.r - m.s.r + 1,
        colspan: m.e.c - m.s.c + 1,
      })) || [];

    return { data, styleMap, colWidths, rowHeights, mergeCells };
  }

  const range =
    getWorksheetRange(worksheet) || {
      s: { r: 0, c: 0 },
      e: { r: jsonRows.length - 1, c: Math.max(...jsonRows.map((row) => row.length), 1) - 1 },
    };

  const rowCount = jsonRows.length;
  const colCount = Math.max(...jsonRows.map((row) => row.length), 1);

  const data = [];
  for (let r = 0; r < rowCount; r++) {
    const srcRow = jsonRows[r] || [];
    const rowData = [];
    for (let c = 0; c < colCount; c++) {
      const raw = srcRow[c];
      if (raw !== '' && raw != null && String(raw).trim() !== '') {
        rowData.push(String(raw));
        continue;
      }
      const addr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + c });
      rowData.push(getSheetJsCellValue(worksheet[addr]));
    }
    data.push(rowData);
  }

  const styleMap = {};
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + c });
      const cell = worksheet[addr];
      const style = sheetJsStyleToCss(cell?.s);
      if (Object.keys(style).length > 0) {
        styleMap[`${r}-${c}`] = style;
      }
    }
  }

  const colWidths = [];
  for (let c = 0; c < colCount; c++) {
    const meta = worksheet['!cols']?.[range.s.c + c];
    colWidths.push(excelColWidthToPx(meta?.wch || meta?.width || 10));
  }

  const rowHeights = [];
  for (let r = 0; r < rowCount; r++) {
    const meta = worksheet['!rows']?.[range.s.r + r];
    rowHeights.push(excelRowHeightToPx(meta?.hpt || meta?.hpx || 15));
  }

  const mergeCells =
    worksheet['!merges']?.map((m) => ({
      row: m.s.r - range.s.r,
      col: m.s.c - range.s.c,
      rowspan: m.e.r - m.s.r + 1,
      colspan: m.e.c - m.s.c + 1,
    })) || [];

  return { data, styleMap, colWidths, rowHeights, mergeCells };
}

export function readSheetJsWorkbook(arrayBuffer) {
  return XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellFormula: true,
    codepage: 1252,
  });
}

export function syncHotToSheetJsWorksheet(hotInstance, worksheet) {
  const data = hotInstance.getData();
  const rowCount = data.length;
  const colCount = data[0]?.length || 0;
  if (!rowCount || !colCount) return;

  const range = getWorksheetRange(worksheet) || { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r: range.s.r + r, c: range.s.c + c });
      const value = data[r][c];
      if (value === '' || value == null) {
        delete worksheet[addr];
      } else {
        const existing = worksheet[addr] || {};
        worksheet[addr] = { ...existing, v: value, w: String(value), t: 's' };
      }
    }
  }

  const colWidths = [];
  for (let c = 0; c < colCount; c++) {
    const px = hotInstance.getColWidth(c);
    colWidths.push({ wch: Math.max(1, Math.round((px - 12) / 7)) });
  }
  worksheet['!cols'] = colWidths;

  const rowHeights = [];
  for (let r = 0; r < rowCount; r++) {
    const px = hotInstance.getRowHeight(r);
    rowHeights.push({ hpt: Math.max(15, Math.round((px * 72) / 96)) });
  }
  worksheet['!rows'] = rowHeights;

  worksheet['!ref'] = XLSX.utils.encode_range({
    s: { r: range.s.r, c: range.s.c },
    e: { r: range.s.r + rowCount - 1, c: range.s.c + colCount - 1 },
  });
}

export function writeSheetJsWorkbook(workbook, bookType = 'xlsx') {
  const out = XLSX.write(workbook, {
    bookType,
    type: 'array',
  });
  return new Uint8Array(out);
}

export function sheetJsMimeType(bookType) {
  if (bookType === 'xls' || bookType === 'biff8') {
    return 'application/vnd.ms-excel';
  }
  return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

export function legacyBookType(fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'xls') return 'biff8';
  if (ext === 'xlsb') return 'xlsb';
  return 'xlsx';
}
