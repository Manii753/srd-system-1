'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateFormula, isFiniteNumber } from '@/lib/costSheetFormula';
import { Trash2, Plus, PanelTop, GripVertical } from 'lucide-react';

const fmt = (v) =>
  isFiniteNumber(v)
    ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

const SECTION_COLOR = 'rgb(241, 245, 249)';

function isSection(row) { return row?.type === 'section'; }
function isData(row)    { return !row || row.type !== 'section'; }

export default function CostSheetGrid({
  columns,
  rows,
  onRowsChange,
  editable = true,
  onAddRow,
  onRemoveRow,
  emptyRow = () => ({ type: 'data' }),
  showRowNumbers = true,
}) {
  const inputRefs = useRef(new Map());
  const [pendingFocus, setPendingFocus] = useState(null);

  const cols = useMemo(() => columns || [], [columns]);
  const formulaCols = useMemo(() => cols.filter(c => c.type === 'formula' && c.formula), [cols]);

  // Map array-index -> data row number (1-based).  Section rows get index 0.
  const dataRowMap = useMemo(() => {
    const map = [];
    let n = 0;
    rows.forEach((r) => {
      if (isData(r)) { n += 1; map.push(n); } else { map.push(0); }
    });
    return map;
  }, [rows]);

  const totalDataRows = useMemo(() => rows.filter(isData).length, [rows]);

  // Live formula evaluation — returns a map keyed `${colKey}:${arrayIndex}`.
  const formulaValues = useMemo(() => {
    const map = {};
    if (formulaCols.length === 0) return map;
    const colByKey = new Map(cols.map(c => [c.key, c]));
    const inProgress = new Set();

    const compute = (colKey, dataRowNum) => {
      if (dataRowNum < 1 || dataRowNum > totalDataRows) return 0;
      const colDef = colByKey.get(colKey);
      if (!colDef) return 0;

      // find the array index of the N-th data row
      let arrayIdx = -1;
      let count = 0;
      for (let i = 0; i < rows.length; i += 1) {
        if (isData(rows[i])) {
          count += 1;
          if (count === dataRowNum) { arrayIdx = i; break; }
        }
      }
      if (arrayIdx < 0) return 0;

      const key = `${colKey}:${arrayIdx}`;
      if (key in map) return map[key];

      if (colDef.type !== 'formula' || !colDef.formula) {
        const v = Number(rows[arrayIdx]?.[colKey] ?? 0);
        const r = isFiniteNumber(v) ? v : 0;
        map[key] = r;
        return r;
      }

      if (inProgress.has(key)) return 0;
      inProgress.add(key);
      const val = evaluateFormula(colDef.formula, {
        rowIndex: dataRowNum,
        getCell: (ck, rn) => compute(ck, rn),
      });
      inProgress.delete(key);
      const r = val === null ? null : isFiniteNumber(val) ? Number(val) : 0;
      map[key] = r;
      return r;
    };

    rows.forEach((row, idx) => {
      if (!isData(row)) return;
      const dn = dataRowMap[idx];
      if (!dn) return;
      formulaCols.forEach(col => compute(col.key, dn));
    });
    return map;
  }, [rows, cols, formulaCols, dataRowMap, totalDataRows]);

  // ── Focus ──
  useEffect(() => {
    if (!pendingFocus) return;
    const { colKey, rowIdx } = pendingFocus;
    const el = inputRefs.current.get(`${colKey}:${rowIdx}`);
    if (el) { el.focus(); el.select?.(); setPendingFocus(null); }
  }, [pendingFocus, rows]);

  // ── Handlers ──
  const isFormula = (col) => col.type === 'formula';

  const handleCellKeyDown = (e, colKey, rowIdx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        // Move up — skip section rows
        for (let i = rowIdx - 1; i >= 0; i -= 1) {
          if (isData(rows[i])) { setPendingFocus({ colKey, rowIdx: i }); return; }
        }
        return;
      }
      // Move down — find next data row
      for (let i = rowIdx + 1; i < rows.length; i += 1) {
        if (isData(rows[i])) { setPendingFocus({ colKey, rowIdx: i }); return; }
      }
      // No data row below (may still be sections below) — insert right here
      if (!editable) return;
      const next = [...rows];
      next.splice(rowIdx + 1, 0, emptyRow());
      onRowsChange(next);
      setPendingFocus({ colKey, rowIdx: rowIdx + 1 });
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

  const updateSectionTitle = (rowIdx, title) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, title } : r));
    onRowsChange(next);
  };

  const handleSectionTitleKeyDown = (e, rowIdx) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const colKey = cols[0]?.key || '';
    if (e.shiftKey) {
      for (let i = rowIdx - 1; i >= 0; i -= 1) {
        if (isData(rows[i])) { setPendingFocus({ colKey, rowIdx: i }); return; }
      }
      return;
    }
    for (let i = rowIdx + 1; i < rows.length; i += 1) {
      if (isData(rows[i])) { setPendingFocus({ colKey, rowIdx: i }); return; }
    }
    if (!editable) return;
    const next = [...rows];
    next.splice(rowIdx + 1, 0, emptyRow());
    onRowsChange(next);
    setPendingFocus({ colKey, rowIdx: rowIdx + 1 });
  };

  const handleAddRow = () => {
    const next = [...rows];
    next.push(emptyRow());
    onRowsChange(next);
    setPendingFocus({ colKey: cols[0]?.key || '', rowIdx: next.length - 1 });
  };

  const handleAddSection = (afterRowIdx) => {
    const next = [...rows];
    const insertIdx = afterRowIdx != null ? afterRowIdx + 1 : next.length;
    next.splice(insertIdx, 0, { type: 'section', title: '' });
    onRowsChange(next);
    setPendingFocus({ colKey: '_section_title', rowIdx: insertIdx });
  };

  const handleRemoveRow = (rowIdx) => {
    onRemoveRow(rowIdx);
  };

  const addRowBtn = editable && onAddRow && (
    <div className="flex items-center gap-3 px-3 py-1.5 border-t border-gray-100">
      <button
        onClick={handleAddRow}
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors"
      >
        <Plus size={11} /> Add row
      </button>
      <button
        onClick={() => handleAddSection()}
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
      >
        <PanelTop size={11} /> Add section
      </button>
    </div>
  );

  if (!cols.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
        <p>Add at least one column to start building the sheet.</p>
        {editable && (
          <button
            onClick={() => handleAddSection()}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <PanelTop size={12} /> Insert first section
          </button>
        )}
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
            {rows.map((row, rowIdx) => {
              // ── Section row ──
              if (isSection(row)) {
                return (
                  <tr key={rowIdx} className="group border-y border-gray-200" style={{ background: SECTION_COLOR }}>
                    {showRowNumbers && (
                      <td className="py-1 px-1 text-center select-none relative" style={{ background: SECTION_COLOR }}>
                        <GripVertical size={11} className="text-gray-300 mx-auto" />
                        {editable && (
                          <button
                            onClick={() => handleRemoveRow(rowIdx)}
                            title="Delete section"
                            className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </td>
                    )}
                    <td colSpan={cols.length} className="px-3 py-0 border-l border-gray-200" style={{ background: SECTION_COLOR }}>
                      <div className="flex items-center gap-2 h-7">
                        <PanelTop size={12} className="text-gray-500 shrink-0" />
                        {editable ? (
                          <input
                            type="text"
                            ref={el => {
                              if (el) inputRefs.current.set(`_section_title:${rowIdx}`, el);
                            }}
                            value={row.title || ''}
                            onChange={e => updateSectionTitle(rowIdx, e.target.value)}
                            onKeyDown={e => editable && handleSectionTitleKeyDown(e, rowIdx)}
                            placeholder="Section heading…"
                            className="flex-1 bg-transparent text-[11px] font-bold text-gray-800 uppercase tracking-widest outline-none placeholder:text-gray-400 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal focus:bg-white focus:rounded px-1"
                          />
                        ) : (
                          <span className="flex-1 text-[11px] font-bold text-gray-800 uppercase tracking-widest">
                            {row.title || ''}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-mono shrink-0">
                          §{rows.slice(0, rowIdx + 1).filter(isSection).length}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              }

              // ── Data row ──
              const dn = dataRowMap[rowIdx];
              return (
                <tr key={rowIdx} className="group border-b border-gray-100 hover:bg-gray-50/60">
                  {showRowNumbers && (
                    <td className="py-1 px-1 text-center text-[10px] text-gray-400 border-r border-gray-100 select-none relative">
                      {dn}
                      {editable && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleAddSection(rowIdx)}
                            title="Insert section below this row"
                            className="p-0.5 text-gray-300 hover:text-gray-600"
                          >
                            <PanelTop size={9} />
                          </button>
                          {onRemoveRow && (
                            <button
                              onClick={() => handleRemoveRow(rowIdx)}
                              title="Delete row"
                              className="p-0.5 text-gray-300 hover:text-red-400"
                            >
                              <Trash2 size={9} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                  {cols.map(c => {
                    const key = `${c.key}:${rowIdx}`;
                    if (isFormula(c)) {
                      const val = formulaValues[key];
                      return (
                        <td key={c.key} className="border-r border-gray-100" style={{ background: '#f5f5ff' }}>
                          <div
                            tabIndex={editable ? 0 : -1}
                            ref={el => { inputRefs.current.set(key, el); }}
                            onKeyDown={e => editable && handleCellKeyDown(e, c.key, rowIdx)}
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
              );
            })}
          </tbody>
        </table>
      </div>

      {addRowBtn}
    </div>
  );
}