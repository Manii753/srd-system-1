'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateFormula, isFiniteNumber } from '@/lib/costSheetFormula';
import { Trash2, Plus } from 'lucide-react';

const fmt = (v) =>
  isFiniteNumber(v)
    ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

export default function CostSheetGrid({
  columns,
  rows,
  onRowsChange,
  editable = true,
  onAddRow,
  onRemoveRow,
  emptyRow = () => ({}),
  showRowNumbers = true,
}) {
  const inputRefs = useRef(new Map());
  const [pendingFocus, setPendingFocus] = useState(null);

  const cols = useMemo(() => columns || [], [columns]);
  const formulaCols = useMemo(() => cols.filter(c => c.type === 'formula' && c.formula), [cols]);

  // Live formula evaluation. Returns a map keyed `${colKey}:${rowIdx}`.
  // Formulas can reference other formula cells (Excel-style chaining). Cycle
  // detection treats circular references as 0; errors are stored as null so
  // the cell renders as #ERR!.
  const formulaValues = useMemo(() => {
    const map = {};
    if (formulaCols.length === 0) return map;

    const getRaw = (colKey, rowNum) => (rows[rowNum - 1]?.[colKey] ?? 0);
    const colByKey = new Map(cols.map(c => [c.key, c]));
    const inProgress = new Set();

    const compute = (colKey, rowNum) => {
      if (rowNum < 1 || rowNum > rows.length) return 0;
      const colDef = colByKey.get(colKey);
      if (!colDef) return 0;
      const key = `${colKey}:${rowNum}`;
      if (key in map) return map[key];

      if (colDef.type !== 'formula' || !colDef.formula) {
        const v = Number(getRaw(colKey, rowNum));
        const r = isFiniteNumber(v) ? v : 0;
        map[key] = r;
        return r;
      }

      if (inProgress.has(key)) return 0; // circular reference
      inProgress.add(key);
      const val = evaluateFormula(colDef.formula, {
        rowIndex: rowNum,
        getCell: (ck, rn) => compute(ck, rn),
      });
      inProgress.delete(key);
      const r = val === null ? null : isFiniteNumber(val) ? Number(val) : 0;
      map[key] = r;
      return r;
    };

    rows.forEach((row, idx) => {
      formulaCols.forEach(col => compute(col.key, idx + 1));
    });
    return map;
  }, [rows, cols, formulaCols]);

  // Focus the pending cell once it is rendered (handles newly created rows).
  useEffect(() => {
    if (!pendingFocus) return;
    const { colKey, rowIdx } = pendingFocus;
    const el = inputRefs.current.get(`${colKey}:${rowIdx}`);
    if (el) {
      el.focus();
      el.select?.();
      setPendingFocus(null);
    }
  }, [pendingFocus, rows]);

  const isFormula = (col) => col.type === 'formula';

  const handleCellKeyDown = (e, colKey, rowIdx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        if (rowIdx > 0) setPendingFocus({ colKey, rowIdx: rowIdx - 1 });
        return;
      }
      const nextIdx = rowIdx + 1;
      if (nextIdx >= rows.length) {
        if (!editable) return;
        const next = [...rows];
        next.push(emptyRow());
        onRowsChange(next);
      }
      setPendingFocus({ colKey, rowIdx: nextIdx });
    } else if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault();
      const next = [...rows];
      next[rowIdx] = { ...rows[rowIdx] };
      cols.forEach(c => { next[rowIdx][c.key] = ''; });
      onRowsChange(next);
    }
  };

  const updateCell = (rowIdx, colKey, value) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: value } : r));
    onRowsChange(next);
  };

  const handleAddRow = () => {
    const next = [...rows];
    next.push(emptyRow());
    onRowsChange(next);
    setPendingFocus({ colKey: cols[0]?.key || '', rowIdx: next.length - 1 });
  };

  if (!cols.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
        Add at least one column to start building the sheet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {showRowNumbers && <col style={{ width: 44 }} />}
            {cols.map(c => (
              <col key={c.key} style={{ width: c.width || 120 }} />
            ))}
          </colgroup>

          <thead>
            <tr className="bg-gray-800 text-white">
              {showRowNumbers && <th className="p-0 w-11" />}
              {cols.map(c => (
                <th
                  key={c.key}
                  className={`px-2 py-1.5 text-left font-semibold uppercase tracking-wide align-bottom ${
                    isFormula(c) ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-300' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 font-mono border border-gray-600 rounded px-1 bg-gray-900">
                      {c.key}
                    </span>
                    <span className="truncate">{c.label || 'Unnamed'}</span>
                  </div>
                  {isFormula(c) && (
                    <div className="text-[10px] font-mono normal-case tracking-normal text-indigo-500 mt-0.5 truncate">
                      ={c.formula}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="group border-b border-gray-100 hover:bg-gray-50/60">
                {showRowNumbers && (
                  <td className="py-1 px-1 text-center text-[10px] text-gray-400 border-r border-gray-100 select-none relative">
                    {rowIdx + 1}
                    {editable && onRemoveRow && rows.length > 1 && (
                      <button
                        onClick={() => onRemoveRow(rowIdx)}
                        title="Delete row"
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </td>
                )}
                {cols.map(c => {
                  const key = `${c.key}:${rowIdx}`;
                  if (isFormula(c)) {
                    const val = formulaValues[key];
                    const noFocus = !editable;
                    return (
                      <td key={c.key} className="border-r border-gray-100" style={{ background: '#f5f5ff' }}>
                        <div
                          tabIndex={editable ? 0 : -1}
                          ref={el => { inputRefs.current.set(key, el); }}
                          onKeyDown={e => !noFocus && handleCellKeyDown(e, c.key, rowIdx)}
                          className="w-full h-full px-2 py-1 text-right font-semibold text-indigo-700 outline-none focus:bg-indigo-100 cursor-default"
                        >
                          {val === null ? <span className="text-red-400 font-bold">#ERR!</span> : fmt(val)}
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={c.key} className="border-r border-gray-100">
                      <input
                        type="text"
                        ref={el => { inputRefs.current.set(key, el); }}
                        value={row[c.key] ?? ''}
                        onChange={e => updateCell(rowIdx, c.key, e.target.value)}
                        onKeyDown={e => editable && handleCellKeyDown(e, c.key, rowIdx)}
                        disabled={!editable}
                        placeholder={c.type === 'number' ? '0' : ''}
                        className={`w-full h-full px-2 py-1 bg-transparent outline-none focus:bg-blue-50 transition-colors ${
                          c.type === 'number' ? 'text-right' : 'text-left'
                        } disabled:bg-gray-50 disabled:cursor-default`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editable && onAddRow && (
        <div className="px-3 py-1.5 border-t border-gray-100">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors"
          >
            <Plus size={11} /> Add row
          </button>
        </div>
      )}
    </div>
  );
}