'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Handsontable from 'handsontable';
import { registerAllModules } from 'handsontable/registry';
import { HyperFormula } from 'hyperformula';
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
  Bold,
  Italic,
  Underline,
  Type,
  Palette,
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

import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import '@/styles/handsontable.css';

let handsontableReady = false;

// CSS properties managed by the Excel style renderer. Handsontable reuses <td>
// DOM elements as cells scroll in/out of view, so every render must reset these
// first — otherwise a previously styled cell leaks colors/borders into a cell
// that has no Excel style (e.g. background/text colors showing on the wrong cells).
const STYLE_RESET_PROPS = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-align',
  'vertical-align',
  'white-space',
  'word-break',
  'padding-left',
  'color',
  'background-color',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
];

function ensureHandsontableReady() {
  if (typeof window === 'undefined' || handsontableReady) return;
  registerAllModules();

  try {
    Handsontable.renderers.registerRenderer(
      'excelStyled',
      function excelStyledRenderer(instance, td, row, col, prop, value, cellProperties) {
        // Call base renderer first
        Handsontable.renderers.TextRenderer.apply(this, arguments);

        // Reset any Excel styles left over from a previous render of this <td>.
        for (let i = 0; i < STYLE_RESET_PROPS.length; i++) {
          td.style.removeProperty(STYLE_RESET_PROPS[i]);
        }
        td.classList.remove('excel-styled-cell');

        // Apply Excel styling
        const style = cellProperties.excelStyle;
        if (style && Object.keys(style).length > 0) {
          // Apply each style property explicitly
          Object.entries(style).forEach(([key, val]) => {
            if (val != null && val !== '') {
              // Convert camelCase to kebab-case for CSS properties
              const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();

              // Use setProperty for better control
              td.style.setProperty(cssKey, val, 'important');
            }
          });

          // Ensure proper box-sizing for borders
          td.style.setProperty('box-sizing', 'border-box', 'important');

          // Add a class to track styled cells
          td.classList.add('excel-styled-cell');
        }
      }
    );
    console.log('[ExcelPreview] Custom renderer "excelStyled" registered successfully');
  } catch (err) {
    console.warn('[ExcelPreview] Renderer registration issue:', err.message);
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
  let styleCount = 0;
  let borderCount = 0;
  let bgColorCount = 0;
  let fontCount = 0;

  for (let r = 1; r <= rowCount; r++) {
    const rowData = [];
    for (let c = 1; c <= colCount; c++) {
      const cell = worksheet.getCell(r, c);
      rowData.push(getCellDisplayValue(cell));

      const style = excelStyleToCss(cell.style);
      
      // Debug: count style types
      if (Object.keys(style).length > 0) {
        const key = `${r - 1}-${c - 1}`;
        styleMap[key] = style;
        styleCount++;
        
        if (style.borderTop || style.borderRight || style.borderBottom || style.borderLeft) {
          borderCount++;
        }
        if (style.backgroundColor) {
          bgColorCount++;
        }
        if (style.fontWeight || style.fontSize) {
          fontCount++;
        }
      }
    }
    data.push(rowData);
  }

  console.log(`[ExcelPreview] Extracted ${styleCount} styled cells from ${rowCount}x${colCount} grid`);
  console.log(`[ExcelPreview] - Borders: ${borderCount}, BgColors: ${bgColorCount}, Fonts: ${fontCount}`);
  
  if (styleCount > 0 && styleCount < 10) {
    console.log('[ExcelPreview] All extracted styles:', styleMap);
  } else if (styleCount > 0) {
    console.log('[ExcelPreview] Sample styles:', Object.fromEntries(Object.entries(styleMap).slice(0, 5)));
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

  console.log(`[ExcelPreview] Found ${mergeCells.length} merged cell ranges`);

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
  const gridHeightRef = useRef(480);
  gridHeightRef.current = gridHeight;
  const gridReadyRef = useRef(false);
  
  // Formula bar state
  const [selectedCell, setSelectedCell] = useState('');
  const [cellFormula, setCellFormula] = useState('');
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const formulaInputRef = useRef(null);
  
  // Formatting state
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState({ top: 0, left: 0 });
  const [bgColorPickerPos, setBgColorPickerPos] = useState({ top: 0, left: 0 });
  const [activeTextColor, setActiveTextColor] = useState('#000000');
  const [activeBgColor, setActiveBgColor] = useState(null);
  const colorBtnRef = useRef(null);
  const bgColorBtnRef = useRef(null);
  const colorPickerRef = useRef(null);
  const bgColorPickerRef = useRef(null);
  const [formulaSuggestions, setFormulaSuggestions] = useState([]);
  const [showFormulaSuggestions, setShowFormulaSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  
  // Common Excel formulas for autocomplete
  const commonFormulas = [
    { name: 'SUM', description: 'Adds all numbers in a range', example: '=SUM(A1:A10)' },
    { name: 'AVERAGE', description: 'Returns the average of numbers', example: '=AVERAGE(A1:A10)' },
    { name: 'COUNT', description: 'Counts numbers in a range', example: '=COUNT(A1:A10)' },
    { name: 'MAX', description: 'Returns the maximum value', example: '=MAX(A1:A10)' },
    { name: 'MIN', description: 'Returns the minimum value', example: '=MIN(A1:A10)' },
    { name: 'IF', description: 'Returns one value if true, another if false', example: '=IF(A1>10, "Yes", "No")' },
    { name: 'VLOOKUP', description: 'Looks up a value in a table', example: '=VLOOKUP(A1, B1:C10, 2, FALSE)' },
    { name: 'CONCATENATE', description: 'Joins text strings', example: '=CONCATENATE(A1, " ", B1)' },
    { name: 'LEN', description: 'Returns the length of text', example: '=LEN(A1)' },
    { name: 'TRIM', description: 'Removes extra spaces from text', example: '=TRIM(A1)' },
    { name: 'ROUND', description: 'Rounds a number to specified digits', example: '=ROUND(A1, 2)' },
    { name: 'TODAY', description: 'Returns today\'s date', example: '=TODAY()' },
    { name: 'NOW', description: 'Returns current date and time', example: '=NOW()' },
  ];

  useEffect(() => {
    ensureHandsontableReady();
  }, []);

  // Close color pickers when clicking outside them
  useEffect(() => {
    if (!showColorPicker && !showBgColorPicker) return;
    const handleClickOutside = (e) => {
      if (
        showColorPicker &&
        colorPickerRef.current && !colorPickerRef.current.contains(e.target) &&
        colorBtnRef.current && !colorBtnRef.current.contains(e.target)
      ) {
        setShowColorPicker(false);
      }
      if (
        showBgColorPicker &&
        bgColorPickerRef.current && !bgColorPickerRef.current.contains(e.target) &&
        bgColorBtnRef.current && !bgColorBtnRef.current.contains(e.target)
      ) {
        setShowBgColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker, showBgColorPicker]);

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
      height: gridHeightRef.current,
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
      className: 'ht-theme-main',
      cells(row, col) {
        const key = `${row}-${col}`;
        const excelStyle = styleMapRef.current[key];

        // Always use the custom renderer so it can clear stale styles from
        // reused <td> elements. Without this, colors/borders bleed into cells
        // that have no Excel style.
        if (!excelStyle || Object.keys(excelStyle).length === 0) {
          return { renderer: 'excelStyled' };
        }

        return {
          renderer: 'excelStyled',
          excelStyle,
          className: 'excel-styled-cell'
        };
      },
      afterInit() {
        gridReadyRef.current = true;
        requestAnimationFrame(() => {
          if (hot && !hot.isDestroyed) {
            hot.render();
          }
        });
      },
      afterSelection(row, col, row2, col2) {
        if (!gridReadyRef.current) return;
        try {
          // Store selected range for formatting
          setSelectedRange({ row, col, row2, col2 });
          setShowFormatToolbar(true);
          
          // Safely get cell reference
          const cellRef = Handsontable.helper.spreadsheetColumnLabel(col) + (row + 1);
          setSelectedCell(cellRef);
          
          // Safely get cell data
          const cellData = hot.getDataAtCell(row, col);
          
          // Show formula if cell contains one, otherwise show value
          if (typeof cellData === 'string' && cellData.startsWith('=')) {
            setCellFormula(cellData);
          } else {
            setCellFormula(cellData != null ? String(cellData) : '');
          }
        } catch (err) {
          console.error('Selection error:', err);
          setSelectedCell('A1');
          setCellFormula('');
        }
      },
      afterChange(changes, source) {
        // Ignore the initial data load / programmatic reloads, but mark any
        // real user edit as a change. We intentionally don't gate on
        // gridReadyRef here — dropping edits during grid re-init is what made
        // the Save button stay disabled.
        if (!changes || source === 'loadData' || source === 'loadData:updateSettings') return;
        setHasChanges(true);
        // Update formula bar if current cell changed
        if (changes && changes.length > 0) {
          const [row, col, oldVal, newVal] = changes[0];
          const selection = hot.getSelected();
          if (selection && selection[0][0] === row && selection[0][1] === col) {
            if (typeof newVal === 'string' && newVal.startsWith('=')) {
              setCellFormula(newVal);
            } else {
              setCellFormula(newVal || '');
            }
          }
        }
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
      gridReadyRef.current = true;
    };

    requestAnimationFrame(mountGrid);

    return () => {
      cancelled = true;
      hotInstanceRef.current?.destroy();
      hotInstanceRef.current = null;
      hotRef.current = null;
      gridReadyRef.current = false;
    };
  }, [sheetConfig, editable, loading]);

  // Resize the grid without recreating the Handsontable instance. Recreating it
  // on every height change wiped the user's in-progress edits and reset change
  // tracking, which made the Save button unreliable.
  useEffect(() => {
    const hot = hotInstanceRef.current;
    if (hot && !hot.isDestroyed && hot.updateSettings) {
      hot.updateSettings({ height: gridHeight });
    }
  }, [gridHeight]);

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

          // Handsontable stores everything as strings, but the worksheet cell
          // still knows its original type. Coerce the edited string back to
          // that type so numbers/dates/booleans aren't saved as text (which
          // triggers "number stored as text" warnings in Excel).
          if (value === '' || value == null) {
            cell.value = null;
          } else {
            const existing = cell.value;
            if (existing && typeof existing === 'object' && existing.formula != null) {
              // Preserve the formula if the user kept "=...", otherwise the
              // cell becomes a plain value.
              cell.value =
                typeof value === 'string' && value.startsWith('=')
                  ? { formula: value.slice(1) }
                  : value;
            } else if (typeof existing === 'number') {
              cell.value = Number(value);
            } else if (existing instanceof Date) {
              const t = Date.parse(value);
              cell.value = Number.isNaN(t) ? existing : new Date(t);
            } else if (typeof existing === 'boolean') {
              cell.value = value === 'true' || value === 'TRUE' || value === true;
            } else {
              cell.value = value;
            }
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

  const handleFormulaChange = useCallback((e) => {
    const value = e.target.value;
    setCellFormula(value);
    
    // Show formula suggestions when typing =
    if (value.startsWith('=') && value.length > 1) {
      const searchTerm = value.substring(1).toUpperCase().split('(')[0];
      const suggestions = commonFormulas.filter(f => 
        f.name.startsWith(searchTerm)
      );
      setFormulaSuggestions(suggestions);
      setShowFormulaSuggestions(suggestions.length > 0);
      setSelectedSuggestionIndex(0);
    } else {
      setShowFormulaSuggestions(false);
    }
  }, [commonFormulas]);

  const handleFormulaKeyDown = useCallback((e) => {
    // Handle formula suggestions navigation
    if (showFormulaSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          Math.min(prev + 1, formulaSuggestions.length - 1)
        );
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => Math.max(prev - 1, 0));
        return;
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (formulaSuggestions[selectedSuggestionIndex]) {
          e.preventDefault();
          const formula = formulaSuggestions[selectedSuggestionIndex];
          setCellFormula(formula.example);
          setShowFormulaSuggestions(false);
          // Focus back on input to continue editing
          setTimeout(() => formulaInputRef.current?.focus(), 0);
          return;
        }
      } else if (e.key === 'Escape') {
        setShowFormulaSuggestions(false);
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const hot = hotInstanceRef.current;
      if (!hot) return;
      
      const selection = hot.getSelected();
      if (selection && selection.length > 0) {
        const [row, col] = selection[0];
        hot.setDataAtCell(row, col, cellFormula);
        setIsEditingFormula(false);
        setShowFormulaSuggestions(false);
        // Move to next cell
        hot.selectCell(Math.min(row + 1, hot.countRows() - 1), col);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingFormula(false);
      setShowFormulaSuggestions(false);
      // Restore original value
      const hot = hotInstanceRef.current;
      if (!hot) return;
      const selection = hot.getSelected();
      if (selection && selection.length > 0) {
        const [row, col] = selection[0];
        const cellData = hot.getDataAtCell(row, col);
        setCellFormula(cellData || '');
      }
    }
  }, [cellFormula, showFormulaSuggestions, formulaSuggestions, selectedSuggestionIndex]);

  const handleFormulaFocus = useCallback(() => {
    setIsEditingFormula(true);
  }, []);

  const handleFormulaBlur = useCallback(() => {
    const hot = hotInstanceRef.current;
    if (!hot || !isEditingFormula) return;
    
    const selection = hot.getSelected();
    if (selection && selection.length > 0) {
      const [row, col] = selection[0];
      hot.setDataAtCell(row, col, cellFormula);
    }
    setIsEditingFormula(false);
  }, [cellFormula, isEditingFormula]);
  
  // Formatting functions
  const applyCellStyle = useCallback((styleUpdates) => {
    if (!selectedRange || !workbook || !editable) return;
    
    const { row, col, row2, col2 } = selectedRange;
    const startRow = Math.min(row, row2);
    const endRow = Math.max(row, row2);
    const startCol = Math.min(col, col2);
    const endCol = Math.max(col, col2);
    
    if (engine === 'exceljs') {
      const worksheet = workbook.worksheets[activeSheet];
      
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const cell = worksheet.getCell(r + 1, c + 1);
          
          // Apply font styles
          if (styleUpdates.bold !== undefined) {
            cell.font = { ...cell.font, bold: styleUpdates.bold };
          }
          if (styleUpdates.italic !== undefined) {
            cell.font = { ...cell.font, italic: styleUpdates.italic };
          }
          if (styleUpdates.underline !== undefined) {
            cell.font = { ...cell.font, underline: styleUpdates.underline };
          }
          if (styleUpdates.color) {
            cell.font = { ...cell.font, color: { argb: styleUpdates.color } };
          }
          if (styleUpdates.size) {
            cell.font = { ...cell.font, size: styleUpdates.size };
          }
          
          // Apply background color
          if (styleUpdates.bgColor) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: styleUpdates.bgColor }
            };
          }
          
          // Apply borders
          if (styleUpdates.border) {
            const borderStyle = { style: 'thin', color: { argb: 'FF000000' } };
            cell.border = {
              top: borderStyle,
              left: borderStyle,
              bottom: borderStyle,
              right: borderStyle
            };
          }
          
          // Update style map for immediate visual update
          const key = `${r}-${c}`;
          const currentStyle = styleMapRef.current[key] || {};
          const newStyle = { ...currentStyle };
          
          if (styleUpdates.bold !== undefined) {
            newStyle.fontWeight = styleUpdates.bold ? 'bold' : 'normal';
          }
          if (styleUpdates.italic !== undefined) {
            newStyle.fontStyle = styleUpdates.italic ? 'italic' : 'normal';
          }
          if (styleUpdates.underline !== undefined) {
            newStyle.textDecoration = styleUpdates.underline ? 'underline' : 'none';
          }
          if (styleUpdates.color) {
            newStyle.color = '#' + styleUpdates.color.substring(2);
          }
          if (styleUpdates.size) {
            newStyle.fontSize = styleUpdates.size + 'px';
          }
          if (styleUpdates.bgColor) {
            newStyle.backgroundColor = '#' + styleUpdates.bgColor.substring(2);
          }
          if (styleUpdates.border) {
            newStyle.border = '1px solid #000';
          }
          
          styleMapRef.current[key] = newStyle;
        }
      }
    }
    
    // Trigger re-render
    const hot = hotInstanceRef.current;
    if (hot) {
      hot.render();
    }
    
    setHasChanges(true);
    toast({
      title: 'Format Applied',
      description: 'Cell formatting updated',
      duration: 2000,
    });
  }, [selectedRange, workbook, engine, activeSheet, editable, toast]);
  
  const toggleBold = useCallback(() => {
    applyCellStyle({ bold: true });
  }, [applyCellStyle]);
  
  const toggleItalic = useCallback(() => {
    applyCellStyle({ italic: true });
  }, [applyCellStyle]);
  
  const toggleUnderline = useCallback(() => {
    applyCellStyle({ underline: true });
  }, [applyCellStyle]);
  
  const applyTextColor = useCallback((color) => {
    // Convert hex to ARGB format (FF prefix for full opacity)
    const argb = 'FF' + color.substring(1);
    applyCellStyle({ color: argb });
    setActiveTextColor(color);
    setShowColorPicker(false);
  }, [applyCellStyle]);
  
  const applyBgColor = useCallback((color) => {
    if (color === null) {
      // Clear background — apply white/transparent
      applyCellStyle({ bgColor: '00000000' });
      setActiveBgColor(null);
    } else {
      // Convert hex to ARGB format
      const argb = 'FF' + color.substring(1);
      applyCellStyle({ bgColor: argb });
      setActiveBgColor(color);
    }
    setShowBgColorPicker(false);
  }, [applyCellStyle]);
  
  const applyBorder = useCallback(() => {
    applyCellStyle({ border: true });
  }, [applyCellStyle]);
  
  const applyFontSize = useCallback((size) => {
    applyCellStyle({ size: parseInt(size) });
  }, [applyCellStyle]);

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

      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
            {selectedCell || 'A1'}
          </span>
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <div className="flex-1 min-w-0 relative">
          <input
            ref={formulaInputRef}
            type="text"
            value={cellFormula}
            onChange={handleFormulaChange}
            onKeyDown={handleFormulaKeyDown}
            onFocus={handleFormulaFocus}
            onBlur={handleFormulaBlur}
            disabled={!editable || !sheetConfig}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 font-mono"
            placeholder={editable ? "Enter value or formula (e.g., =SUM(A1:A10))" : "Select a cell to view content"}
          />
          
          {/* Formula Suggestions Dropdown */}
          {showFormulaSuggestions && formulaSuggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {formulaSuggestions.map((formula, index) => (
                <div
                  key={formula.name}
                  className={`px-3 py-2 cursor-pointer ${
                    index === selectedSuggestionIndex ? 'bg-green-50 border-l-2 border-green-600' : 'hover:bg-gray-50'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setCellFormula(formula.example);
                    setShowFormulaSuggestions(false);
                    setTimeout(() => formulaInputRef.current?.focus(), 0);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-900">{formula.name}</span>
                    <span className="text-xs text-gray-500">Tab or Enter</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{formula.description}</div>
                  <div className="text-xs text-green-700 font-mono mt-1">{formula.example}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {editable && (
          <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:inline">
            Press Enter to apply
          </span>
        )}
      </div>

      {/* Formatting Toolbar */}
      {editable && showFormatToolbar && selectedRange && (
        <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b flex-shrink-0 flex-wrap">
          {/* Font Size */}
          <select
            onChange={(e) => applyFontSize(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-50"
            defaultValue="11"
          >
            <option value="8">8</option>
            <option value="9">9</option>
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
          </select>
          
          <div className="h-5 w-px bg-gray-300 mx-1" />
          
          {/* Bold, Italic, Underline */}
          <button
            onClick={toggleBold}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={toggleItalic}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={toggleUnderline}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-4 w-4 text-gray-700" />
          </button>
          
          <div className="h-5 w-px bg-gray-300 mx-1" />
          
          {/* Text Color */}
          <div className="relative">
            <button
              ref={colorBtnRef}
              onClick={() => {
                if (!showColorPicker) {
                  const rect = colorBtnRef.current.getBoundingClientRect();
                  setColorPickerPos({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                  });
                }
                setShowColorPicker(!showColorPicker);
                setShowBgColorPicker(false);
              }}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors flex flex-col items-center gap-0.5"
              title="Text Color"
            >
              <Type className="h-4 w-4 text-gray-700" />
              <div className="w-4 h-1 rounded" style={{ backgroundColor: activeTextColor }} />
            </button>
          </div>
          
          {/* Background Color */}
          <div className="relative">
            <button
              ref={bgColorBtnRef}
              onClick={() => {
                if (!showBgColorPicker) {
                  const rect = bgColorBtnRef.current.getBoundingClientRect();
                  setBgColorPickerPos({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                  });
                }
                setShowBgColorPicker(!showBgColorPicker);
                setShowColorPicker(false);
              }}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors flex flex-col items-center gap-0.5"
              title="Background Color"
            >
              <Palette className="h-4 w-4 text-gray-700" />
              <div
                className="w-4 h-1 rounded border border-gray-400"
                style={{ backgroundColor: activeBgColor ?? 'transparent' }}
              />
            </button>
          </div>
          
          <div className="h-5 w-px bg-gray-300 mx-1" />
          
          {/* Borders */}
          <button
            onClick={applyBorder}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Add Borders"
          >
            <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" strokeWidth="2" />
            </svg>
          </button>
          
          <span className="text-xs text-gray-500 ml-2">
            {selectedRange.row === selectedRange.row2 && selectedRange.col === selectedRange.col2
              ? '1 cell selected'
              : `${Math.abs(selectedRange.row2 - selectedRange.row) + 1} × ${Math.abs(selectedRange.col2 - selectedRange.col) + 1} cells selected`
            }
          </span>
        </div>
      )}

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
            className="w-full"
            style={{ height: gridHeight, minHeight: 360 }}
          />
        )}
      </div>

      {/* Text Color Picker — fixed portal so it never gets clipped by overflow */}
      {showColorPicker && (
        <div
          ref={colorPickerRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl p-3"
          style={{ top: colorPickerPos.top, left: colorPickerPos.left }}
        >
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Text Color</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, 1.5rem)' }}>
            {[
              '#000000','#434343','#666666','#999999','#B7B7B7','#CCCCCC','#D9D9D9','#EFEFEF','#F3F3F3','#FFFFFF',
              '#FF0000','#FF9900','#FFFF00','#00FF00','#00FFFF','#4A86E8','#0000FF','#9900FF','#FF00FF','#E6B8A2',
              '#CC0000','#E69138','#F1C232','#6AA84F','#45818E','#3C78D8','#3D85C8','#674EA7','#A64D79','#990000',
              '#800000','#783F04','#7F6000','#274E13','#0C343D','#1C4587','#073763','#20124D','#4C1130','#660000',
            ].map(color => (
              <button
                key={color}
                onClick={() => applyTextColor(color)}
                className="rounded hover:scale-125 transition-transform border border-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ width: '1.5rem', height: '1.5rem', backgroundColor: color, flexShrink: 0 }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Background Color Picker — fixed portal */}
      {showBgColorPicker && (
        <div
          ref={bgColorPickerRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl p-3"
          style={{ top: bgColorPickerPos.top, left: bgColorPickerPos.left }}
        >
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Background Color</p>
          {/* No Fill option */}
          <button
            onClick={() => applyBgColor(null)}
            className="mb-2 flex items-center gap-2 w-full text-xs text-gray-600 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
            title="No Fill"
          >
            <span className="inline-block w-5 h-5 rounded border-2 border-dashed border-gray-400 relative overflow-hidden">
              <span className="absolute inset-0 flex items-center justify-center text-red-400 font-bold text-[10px]">✕</span>
            </span>
            No Fill
          </button>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, 1.5rem)' }}>
            {[
              '#FFFFFF','#F8F9FA','#F1F3F4','#E8EAED','#DADCE0','#BDC1C6','#9AA0A6','#80868B','#5F6368','#3C4043',
              '#FDECEA','#FEF7E0','#E6F4EA','#E8F0FE','#FCE8E6','#FDF0E6','#E6F8F1','#F3E8FD','#FFF0F0','#F0FFF4',
              '#FF5252','#FFD740','#69F0AE','#448AFF','#E040FB','#FF6D00','#00BCD4','#9C27B0','#4CAF50','#F44336',
              '#B71C1C','#E65100','#F57F17','#1B5E20','#0D47A1','#4A148C','#006064','#880E4F','#01579B','#33691E',
            ].map(color => (
              <button
                key={color}
                onClick={() => applyBgColor(color)}
                className="rounded hover:scale-125 transition-transform border border-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ width: '1.5rem', height: '1.5rem', backgroundColor: color, flexShrink: 0 }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
