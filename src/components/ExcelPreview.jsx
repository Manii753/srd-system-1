'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Handsontable from 'handsontable';
import { registerAllModules } from 'handsontable/registry';
import ExcelJS from 'exceljs';
import {
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  Maximize2,
  Minimize2,
  Save,
  Download,
  X,
} from 'lucide-react';
import { useToast } from '@/lib/use-toast';
import {
  excelStyleToCss,
  excelColWidthToPx,
  excelRowHeightToPx,
  pxToExcelColWidth,
  pxToExcelRowHeight,
  parseMergeRange,
  getCellDisplayValue,
  detectExcelFormat,
} from '@/lib/excelStyleUtils';
import {
  readSheetJsWorkbook,
  sheetJsWorksheetToHotConfig,
  syncHotToSheetJsWorksheet,
  writeSheetJsWorkbook,
  sheetJsMimeType,
  legacyBookType,
} from '@/lib/sheetJsWorkbook';

import 'handsontable/dist/themes/main.min.js';
import '@/styles/handsontable.css';

let handsontableReady = false;

function ensureHandsontableReady() {
  if (typeof window === 'undefined' || handsontableReady) return;
  registerAllModules();

  try {
    Handsontable.renderers.registerRenderer(
      'excelStyled',
      function excelStyledRenderer(instance, td, row, col, prop, value, cellProperties) {
        Handsontable.renderers.TextRenderer.apply(this, arguments);
        const style = cellProperties.excelStyle;
        if (style) {
          Object.assign(td.style, style);
        }
      }
    );
  } catch {
    /* renderer already registered */
  }

  handsontableReady = true;
}

function getExcelJsSheetSize(worksheet) {
  const dim = worksheet.dimensions;
  if (dim?.bottom >= 1 && dim?.right >= 1) {
    return { rows: dim.bottom, cols: dim.right };
  }

  let maxRow = 0;
  let maxCol = 0;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    maxRow = Math.max(maxRow, rowNumber);
    row.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
      maxCol = Math.max(maxCol, colNumber);
    });
  });

  return { rows: Math.max(maxRow, 1), cols: Math.max(maxCol, 1) };
}

function sheetToHotConfig(worksheet) {
  const { rows: rowCount, cols: colCount } = getExcelJsSheetSize(worksheet);

  const data = [];
  const styleMap = {};

  for (let r = 1; r <= rowCount; r++) {
    const rowData = [];
    for (let c = 1; c <= colCount; c++) {
      const cell = worksheet.getCell(r, c);
      rowData.push(getCellDisplayValue(cell));

      const style = excelStyleToCss(cell.style);
      if (Object.keys(style).length > 0) {
        styleMap[`${r - 1}-${c - 1}`] = style;
      }
    }
    data.push(rowData);
  }

  const colWidths = [];
  for (let c = 1; c <= colCount; c++) {
    const col = worksheet.getColumn(c);
    colWidths.push(excelColWidthToPx(col.width));
  }

  const rowHeights = [];
  for (let r = 1; r <= rowCount; r++) {
    const row = worksheet.getRow(r);
    rowHeights.push(excelRowHeightToPx(row.height));
  }

  const mergeCells = (worksheet.model?.merges || [])
    .map(parseMergeRange)
    .filter(Boolean);

  return {
    data,
    styleMap,
    colWidths,
    rowHeights,
    mergeCells,
    rowCount,
    colCount,
  };
}

export default function ExcelPreview({ fileUrl, fileName, onSave, editable = true }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  /** 'exceljs' for .xlsx, 'sheetjs' for legacy .xls */
  const [engine, setEngine] = useState(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [sheetNames, setSheetNames] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheetConfig, setSheetConfig] = useState(null);
  const hotRef = useRef(null);
  const hotInstanceRef = useRef(null);
  const gridHostRef = useRef(null);
  const styleMapRef = useRef({});
  const gridContainerRef = useRef(null);
  const [gridHeight, setGridHeight] = useState(480);
  const gridReadyRef = useRef(false);

  useEffect(() => {
    ensureHandsontableReady();
  }, []);

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const updateHeight = () => {
      const h = el.clientHeight;
      if (h > 0) setGridHeight(h);
    };

    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, isFullscreen, sheetNames.length]);

  const loadSheet = useCallback((wb, sheetIndex, eng) => {
    if (eng === 'sheetjs') {
      const sheetName = wb.SheetNames[sheetIndex];
      const ws = wb.Sheets[sheetName];
      if (!ws) return;
      setSheetConfig(sheetJsWorksheetToHotConfig(ws));
      return;
    }
    const ws = wb.worksheets[sheetIndex];
    if (!ws) return;
    setSheetConfig(sheetToHotConfig(ws));
  }, []);

  useEffect(() => {
    if (!sheetConfig || loading) return;

    let cancelled = false;
    let hot = null;

    const mountGrid = () => {
      if (cancelled) return;
      const el = gridHostRef.current;
      if (!el) {
        requestAnimationFrame(mountGrid);
        return;
      }

      ensureHandsontableReady();
      styleMapRef.current = sheetConfig.styleMap;
      gridReadyRef.current = false;

      if (hotInstanceRef.current) {
        hotInstanceRef.current.destroy();
        hotInstanceRef.current = null;
      }

      hot = new Handsontable(el, {
      data: sheetConfig.data,
      colHeaders: true,
      rowHeaders: true,
      width: '100%',
      height: gridHeight,
      stretchH: 'none',
      autoColumnSize: false,
      autoRowSize: false,
      manualColumnResize: true,
      manualRowResize: true,
      manualColumnMove: editable,
      manualRowMove: editable,
      contextMenu: editable,
      mergeCells: sheetConfig.mergeCells,
      colWidths: sheetConfig.colWidths,
      rowHeights: sheetConfig.rowHeights,
      readOnly: !editable,
      licenseKey: 'non-commercial-and-evaluation',
      themeName: 'ht-theme-main',
      cells(row, col) {
        const key = `${row}-${col}`;
        const excelStyle = styleMapRef.current[key];
        if (!excelStyle) return {};
        return { renderer: 'excelStyled', excelStyle };
      },
      afterInit() {
        requestAnimationFrame(() => {
          gridReadyRef.current = true;
          hot.render();
        });
      },
      afterChange(changes, source) {
        if (!gridReadyRef.current || source === 'loadData' || !changes) return;
        setHasChanges(true);
      },
      afterColumnResize() {
        if (gridReadyRef.current) setHasChanges(true);
      },
      afterRowResize() {
        if (gridReadyRef.current) setHasChanges(true);
      },
      afterColumnMove() {
        if (gridReadyRef.current) setHasChanges(true);
      },
      afterRowMove() {
        if (gridReadyRef.current) setHasChanges(true);
      },
      });

      hotInstanceRef.current = hot;
      hotRef.current = { hotInstance: hot };
    };

    requestAnimationFrame(mountGrid);

    return () => {
      cancelled = true;
      hotInstanceRef.current?.destroy();
      hotInstanceRef.current = null;
      hotRef.current = null;
    };
  }, [sheetConfig, gridHeight, editable, loading]);

  useEffect(() => {
    if (!fileUrl) return;

    const loadExcel = async () => {
      setLoading(true);
      setError(null);
      setHasChanges(false);
      setSheetConfig(null);

      try {
        const response = await fetch(fileUrl, { credentials: 'same-origin' });
        if (!response.ok) {
          throw new Error('Failed to fetch file');
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          throw new Error('Could not load the file from the server. Try downloading it instead.');
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!arrayBuffer.byteLength) {
          throw new Error('The file is empty or could not be read.');
        }

        const format = detectExcelFormat(fileName, arrayBuffer);

        if (format === 'legacy') {
          const wb = readSheetJsWorkbook(arrayBuffer);
          if (!wb.SheetNames?.length) {
            throw new Error('No sheets found in this file');
          }
          setEngine('sheetjs');
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          setActiveSheet(0);
          loadSheet(wb, 0, 'sheetjs');
        } else {
          const wb = new ExcelJS.Workbook();
          await wb.xlsx.load(arrayBuffer);
          setEngine('exceljs');
          setWorkbook(wb);
          const names = wb.worksheets.map((ws) => ws.name);
          setSheetNames(names);
          setActiveSheet(0);
          loadSheet(wb, 0, 'exceljs');
        }
      } catch (err) {
        console.error('Error loading Excel file:', err);
        setError(err.message || 'Failed to load Excel file');
      } finally {
        setLoading(false);
      }
    };

    loadExcel();
  }, [fileUrl, fileName, loadSheet]);

  const handleSheetChange = useCallback(
    (index) => {
      if (hasChanges) {
        if (!confirm('You have unsaved changes. Switch sheet anyway?')) {
          return;
        }
      }
      setActiveSheet(index);
      loadSheet(workbook, index, engine);
      setHasChanges(false);
    },
    [workbook, engine, hasChanges, loadSheet]
  );

  const syncHotToWorksheet = useCallback(
    (hotInstance, worksheet) => {
      const data = hotInstance.getData();
      const rowCount = data.length;
      const colCount = data[0]?.length || 0;

      for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {
          const cell = worksheet.getCell(r + 1, c + 1);
          const value = data[r][c];
          if (value === '' || value == null) {
            cell.value = null;
          } else {
            cell.value = value;
          }
        }
      }

      for (let c = 0; c < colCount; c++) {
        const px = hotInstance.getColWidth(c);
        worksheet.getColumn(c + 1).width = pxToExcelColWidth(px);
      }

      for (let r = 0; r < rowCount; r++) {
        const px = hotInstance.getRowHeight(r);
        worksheet.getRow(r + 1).height = pxToExcelRowHeight(px);
      }
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!hasChanges || !workbook || !onSave) return;

    setSaving(true);
    try {
      const hotInstance = hotRef.current?.hotInstance;
      if (!hotInstance) throw new Error('Spreadsheet not initialized');

      let blob;
      if (engine === 'sheetjs') {
        const sheetName = sheetNames[activeSheet];
        syncHotToSheetJsWorksheet(hotInstance, workbook.Sheets[sheetName]);
        const bookType = legacyBookType(fileName);
        const buffer = writeSheetJsWorkbook(workbook, bookType);
        blob = new Blob([buffer], { type: sheetJsMimeType(bookType) });
      } else {
        const worksheet = workbook.worksheets[activeSheet];
        syncHotToWorksheet(hotInstance, worksheet);
        const buffer = await workbook.xlsx.writeBuffer();
        blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }

      await onSave(blob, fileName);

      setHasChanges(false);
      toast({
        title: 'Saved',
        description: 'Excel file updated successfully',
      });
    } catch (err) {
      console.error('Error saving Excel file:', err);
      toast({
        title: 'Save failed',
        description: err.message || 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [workbook, engine, sheetNames, activeSheet, hasChanges, fileName, onSave, toast, syncHotToWorksheet]);

  const handleDownload = useCallback(async () => {
    if (!workbook) return;

    try {
      const hotInstance = hotRef.current?.hotInstance;
      let blob;
      if (engine === 'sheetjs') {
        if (hotInstance && hasChanges) {
          const sheetName = sheetNames[activeSheet];
          syncHotToSheetJsWorksheet(hotInstance, workbook.Sheets[sheetName]);
        }
        const bookType = legacyBookType(fileName);
        const buffer = writeSheetJsWorkbook(workbook, bookType);
        blob = new Blob([buffer], { type: sheetJsMimeType(bookType) });
      } else {
        if (hotInstance && hasChanges) {
          syncHotToWorksheet(hotInstance, workbook.worksheets[activeSheet]);
        }
        const buffer = await workbook.xlsx.writeBuffer();
        blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download.xlsx';
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Downloaded',
        description: 'File downloaded successfully',
      });
    } catch (err) {
      console.error('Error downloading file:', err);
      toast({
        title: 'Download failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  }, [workbook, engine, sheetNames, activeSheet, hasChanges, fileName, toast, syncHotToWorksheet]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-3 text-green-600" />
          <p className="text-sm text-gray-600">Loading Excel file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Failed to Load</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <a
            href={fileUrl}
            download={fileName}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-lg"
          >
            Download File Instead
          </a>
        </div>
      </div>
    );
  }

  if (!workbook || !sheetNames.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600">No sheets found in this file</p>
        </div>
      </div>
    );
  }

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-[100] bg-white flex flex-col'
    : 'flex flex-col h-full min-h-0';

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          {editable && hasChanges && (
            <span className="text-xs text-orange-600 font-medium">● Unsaved changes</span>
          )}
          {!editable && (
            <span className="text-xs text-gray-500 font-medium">Read-only mode</span>
          )}
          {engine === 'sheetjs' && (
            <span className="text-xs text-amber-700 font-medium">Legacy .xls format</span>
          )}
          {editable && (
            <span className="text-xs text-gray-500 hidden sm:inline">
              Drag headers to move · Drag edges to resize
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editable && onSave && (
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save
                </>
              )}
            </button>
          )}
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center justify-center h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Close Fullscreen"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {sheetNames.length > 1 && (
        <div className="flex gap-1 px-2 py-2 bg-gray-50 border-b overflow-x-auto flex-shrink-0">
          {sheetNames.map((name, idx) => (
            <button
              key={idx}
              onClick={() => handleSheetChange(idx)}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors ${
                activeSheet === idx
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div
        ref={gridContainerRef}
        className="flex-1 min-h-0 overflow-auto excel-preview-container"
        style={{ minHeight: 360 }}
      >
        {sheetConfig && (
          <div
            ref={gridHostRef}
            key={`${engine}-${activeSheet}`}
            className="ht-theme-main w-full"
            style={{ height: gridHeight, minHeight: 360 }}
          />
        )}
      </div>
    </div>
  );
}
