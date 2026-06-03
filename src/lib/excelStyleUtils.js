/** Convert Excel ARGB / theme colors to CSS hex */
export function argbToCss(color) {
  if (!color) return undefined;
  
  // Handle string ARGB format
  if (typeof color === 'string') {
    const hex = color.replace(/^#/, '').toUpperCase();
    if (hex.length === 8) return `#${hex.slice(2)}`; // Remove alpha channel
    if (hex.length === 6) return `#${hex}`;
    return undefined;
  }
  
  // Handle object format { argb: 'FF000000' }
  if (color.argb) {
    const hex = String(color.argb).replace(/^#/, '').toUpperCase();
    if (hex.length === 8) return `#${hex.slice(2)}`; // Remove alpha channel
    if (hex.length === 6) return `#${hex}`;
  }
  
  // Handle RGB object format { rgb: 'FF0000' }
  if (color.rgb) {
    const hex = String(color.rgb).replace(/^#/, '').toUpperCase();
    if (hex.length === 8) return `#${hex.slice(2)}`; // Remove alpha channel  
    if (hex.length === 6) return `#${hex}`;
  }
  
  // Handle theme colors (ExcelJS uses theme indices)
  if (color.theme !== undefined) {
    // Common Excel theme colors (approximations)
    const themeColors = [
      '#000000', // Text 1
      '#FFFFFF', // Background 1
      '#1F4E78', // Text 2 (dark blue)
      '#EEECE1', // Background 2 (light gray)
      '#4472C4', // Accent 1 (blue)
      '#ED7D31', // Accent 2 (orange)
      '#A5A5A5', // Accent 3 (gray)
      '#FFC000', // Accent 4 (gold)
      '#5B9BD5', // Accent 5 (light blue)
      '#70AD47', // Accent 6 (green)
    ];
    
    if (color.theme >= 0 && color.theme < themeColors.length) {
      let themeColor = themeColors[color.theme];
      
      // Apply tint if present (-1 to 1, where negative is darker, positive is lighter)
      if (color.tint && color.tint !== 0) {
        themeColor = applyTintToColor(themeColor, color.tint);
      }
      
      return themeColor;
    }
  }
  
  return undefined;
}

/** Apply Excel tint to a hex color (-1 to 1) */
function applyTintToColor(hexColor, tint) {
  // Remove # if present
  const hex = hexColor.replace(/^#/, '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Apply tint (Excel formula for tint)
  let newR, newG, newB;
  if (tint < 0) {
    // Darker
    newR = Math.round(r * (1 + tint));
    newG = Math.round(g * (1 + tint));
    newB = Math.round(b * (1 + tint));
  } else {
    // Lighter
    newR = Math.round(r * (1 - tint) + 255 * tint);
    newG = Math.round(g * (1 - tint) + 255 * tint);
    newB = Math.round(b * (1 - tint) + 255 * tint);
  }
  
  // Clamp to 0-255
  newR = Math.max(0, Math.min(255, newR));
  newG = Math.max(0, Math.min(255, newG));
  newB = Math.max(0, Math.min(255, newB));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`.toUpperCase();
}

const BORDER_WIDTH = {
  hair: '1px',
  thin: '1px',
  medium: '3px',
  thick: '4px',
  double: '4px',
  dashed: '1px',
  dotted: '1px',
  dashDot: '1px',
  dashDotDot: '1px',
  mediumDashed: '3px',
  mediumDashDot: '3px',
  mediumDashDotDot: '3px',
  slantDashDot: '2px',
  mediumDashedAlt: '3px',
};

const BORDER_LINE = {
  dashed: 'dashed',
  dotted: 'dotted',
  dashDot: 'dashed',
  dashDotDot: 'dashed',
  mediumDashed: 'dashed',
  mediumDashDot: 'dashed',
  mediumDashDotDot: 'dashed',
  slantDashDot: 'dashed',
  double: 'double',
};

function borderSideToCss(side) {
  if (!side?.style) return undefined;
  const width = BORDER_WIDTH[side.style] || '1px';
  const line = BORDER_LINE[side.style] || 'solid';
  const color = argbToCss(side.color) || '#000000';
  return `${width} ${line} ${color}`;
}

/** Map ExcelJS cell style object to inline CSS for Handsontable cells */
export function excelStyleToCss(style) {
  if (!style) return {};

  const css = {};

  // Font styling
  if (style.font) {
    const { font } = style;
    if (font.name) css.fontFamily = font.name;
    if (font.size) css.fontSize = `${font.size}pt`;
    if (font.bold) css.fontWeight = 'bold';
    if (font.italic) css.fontStyle = 'italic';
    const decorations = [];
    if (font.underline) decorations.push('underline');
    if (font.strike) decorations.push('line-through');
    if (decorations.length) css.textDecoration = decorations.join(' ');
    const fontColor = argbToCss(font.color);
    if (fontColor) css.color = fontColor;
  }

  // Alignment
  if (style.alignment) {
    const { alignment } = style;
    if (alignment.horizontal) {
      const h = alignment.horizontal;
      if (h === 'center' || h === 'centerContinuous') css.textAlign = 'center';
      else if (h === 'right') css.textAlign = 'right';
      else if (h === 'left') css.textAlign = 'left';
      else if (h === 'justify') css.textAlign = 'justify';
    }
    if (alignment.vertical) {
      const vMap = {
        top: 'top',
        middle: 'middle',
        bottom: 'bottom',
        justify: 'middle',
        distributed: 'middle',
      };
      css.verticalAlign = vMap[alignment.vertical] || 'middle';
    }
    if (alignment.wrapText) {
      css.whiteSpace = 'pre-wrap';
      css.wordBreak = 'break-word';
    }
    if (alignment.indent && alignment.indent > 0) {
      css.paddingLeft = `${alignment.indent * 12}px`;
    }
  }

  // Fill/Background color
  if (style.fill) {
    const { fill } = style;
    if (fill.type === 'pattern') {
      // Pattern fills - most common in Excel
      if (fill.pattern && fill.pattern !== 'none') {
        // Try fgColor first (foreground color for patterns)
        const bg = argbToCss(fill.fgColor) || argbToCss(fill.bgColor);
        if (bg) {
          css.backgroundColor = bg;
        }
      }
    } else if (fill.type === 'gradient' && fill.stops?.length) {
      // Gradient fills - use first color
      const first = argbToCss(fill.stops[0]?.color);
      if (first) css.backgroundColor = first;
    }
  }

  // Borders - enhanced to capture all border styles
  if (style.border) {
    const { border } = style;
    const top = borderSideToCss(border.top);
    const right = borderSideToCss(border.right);
    const bottom = borderSideToCss(border.bottom);
    const left = borderSideToCss(border.left);
    const diagonal = borderSideToCss(border.diagonal);
    
    if (top) css.borderTop = top;
    if (right) css.borderRight = right;
    if (bottom) css.borderBottom = bottom;
    if (left) css.borderLeft = left;
    if (diagonal) {
      // Diagonal borders are rare but should be noted
      console.log('[ExcelStyle] Diagonal border detected (not fully supported in HTML tables)');
    }
  }

  return css;
}

/** Excel column width (characters) → pixels for Handsontable */
export function excelColWidthToPx(width) {
  if (!width || width <= 0) return 80;
  return Math.round(width * 7 + 12);
}

/** Excel row height (points) → pixels */
export function excelRowHeightToPx(height) {
  if (!height || height <= 0) return 23;
  return Math.round((height * 96) / 72);
}

/** Handsontable px → Excel column width */
export function pxToExcelColWidth(px) {
  return Math.max(1, Math.round((px - 12) / 7));
}

/** Handsontable px → Excel row height (points) */
export function pxToExcelRowHeight(px) {
  return Math.max(15, Math.round((px * 72) / 96));
}

export function colLettersToIndex(letters) {
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return col - 1;
}

export function parseCellAddress(addr) {
  const match = String(addr).match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  return {
    col: colLettersToIndex(match[1].toUpperCase()),
    row: parseInt(match[2], 10) - 1,
  };
}

export function parseMergeRange(range) {
  const parts = String(range).split(':');
  const start = parseCellAddress(parts[0]);
  const end = parseCellAddress(parts[1] || parts[0]);
  if (!start || !end) return null;
  return {
    row: start.row,
    col: start.col,
    rowspan: end.row - start.row + 1,
    colspan: end.col - start.col + 1,
  };
}

/** Detect legacy .xls (BIFF/OLE) vs modern .xlsx (ZIP) from name or file header */
export function detectExcelFormat(fileName, arrayBuffer) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'xls' || ext === 'xlsb') return 'legacy';
  if (ext === 'xlsx' || ext === 'xlsm' || ext === 'csv' || ext === 'ods') return 'modern';

  if (arrayBuffer?.byteLength >= 4) {
    const bytes = new Uint8Array(arrayBuffer);
    // OLE compound document (.xls)
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf) return 'legacy';
    // ZIP archive (.xlsx)
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'modern';
  }

  return 'modern';
}

function sheetJsRgbToCss(rgb) {
  if (!rgb) return undefined;
  
  // Handle string format
  if (typeof rgb === 'string') {
    const hex = rgb.replace(/^#/, '').toUpperCase();
    if (hex.length === 8) return `#${hex.slice(2)}`; // Remove alpha
    if (hex.length === 6) return `#${hex}`;
    return undefined;
  }
  
  // Handle object format
  if (rgb.rgb) {
    const hex = String(rgb.rgb).replace(/^#/, '').toUpperCase();
    if (hex.length === 8) return `#${hex.slice(2)}`;
    if (hex.length === 6) return `#${hex}`;
  }
  
  return undefined;
}

/** Map SheetJS cell.s style object to CSS (when styles are present in file) */
export function sheetJsStyleToCss(s) {
  if (!s) return {};
  const css = {};

  if (s.font) {
    if (s.font.name) css.fontFamily = s.font.name;
    if (s.font.sz) css.fontSize = `${s.font.sz}pt`;
    if (s.font.bold) css.fontWeight = 'bold';
    if (s.font.italic) css.fontStyle = 'italic';
    if (s.font.underline) css.textDecoration = 'underline';
    if (s.font.strike) css.textDecoration = 'line-through';
    const color = sheetJsRgbToCss(s.font.color?.rgb);
    if (color) css.color = color;
  }

  if (s.alignment) {
    const h = s.alignment.horizontal;
    if (h === 'center') css.textAlign = 'center';
    else if (h === 'right') css.textAlign = 'right';
    else if (h === 'left') css.textAlign = 'left';
    const v = s.alignment.vertical;
    if (v === 'top') css.verticalAlign = 'top';
    else if (v === 'bottom') css.verticalAlign = 'bottom';
    else if (v === 'center') css.verticalAlign = 'middle';
    if (s.alignment.wrapText) {
      css.whiteSpace = 'pre-wrap';
      css.wordBreak = 'break-word';
    }
  }

  if (s.fill?.patternType && s.fill.patternType !== 'none') {
    const bg = sheetJsRgbToCss(s.fill.fgColor?.rgb) || sheetJsRgbToCss(s.fill.bgColor?.rgb);
    if (bg) css.backgroundColor = bg;
  }

  if (s.border) {
    for (const side of ['top', 'right', 'bottom', 'left']) {
      const b = s.border[side];
      if (b?.style) {
        const borderCss = borderSideToCss({
          style: b.style,
          color: b.color?.rgb ? { argb: `FF${b.color.rgb}` } : undefined,
        });
        if (borderCss) css[`border${side[0].toUpperCase()}${side.slice(1)}`] = borderCss;
      }
    }
  }

  return css;
}

export function getSheetJsCellValue(cell) {
  if (!cell) return '';
  if (cell.w != null && cell.w !== '') return String(cell.w);
  if (cell.v == null) return '';
  if (cell.t === 'd' && cell.v instanceof Date) return cell.v.toLocaleString();
  return String(cell.v);
}

export function getCellDisplayValue(cell) {
  if (!cell) return '';
  if (cell.text != null && cell.text !== '') return String(cell.text);
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((rt) => rt.text).join('');
    if (v.formula != null) {
      const result = cell.result ?? v.result;
      return result != null ? String(result) : '';
    }
    if (v instanceof Date) return v.toLocaleString();
    if (v.hyperlink) return v.text || v.hyperlink;
    return String(v.result ?? v.text ?? '');
  }
  return String(v);
}
