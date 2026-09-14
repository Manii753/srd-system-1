'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateFormula, isFiniteNumber } from '@/lib/costSheetFormula';
import { Trash2, Plus, PanelTop, ListPlus, GripVertical } from 'lucide-react';

const fmt2 = (v) =>
  isFiniteNumber(v)
    ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

const SECTION_COLOR = 'rgb(249, 250, 251)';

function isSection(row) { return row?.type === 'section'; }
function isKv(row)      { return row?.type === 'kv'; }
function isData(row)    { return !row || (row.type !== 'section' && row.type !== 'kv'); }

const newEmptyData = () => ({ type: 'data' });
const newEmptyKv = () => ({ type: 'kv', label: '', value: '' });

export default function CostSheetGrid({
  columns,
  rows,
  onRowsChange,
  editable = true,
  onAddRow,
  onRemoveRow,
  emptyRow = newEmptyData,
  showRowNumbers = true,
  subtotalColumnKey,
  totalLabel = 'Total',
}) {
  const [pendingFocus, setPendingFocus] = useState(null);
  const inputRefs = useRef(new Map());

  const cols = useMemo(() => columns || [], [columns]);
  const formulaCols = useMemo(() => cols.filter(c => c.type === 'formula' && c.formula), [cols]);
  const subCol = useMemo(
    () => cols.find(c => c.key === subtotalColumnKey),
    [cols, subtotalColumnKey]
  );

  // Map array-index -> data row number (1-based). Non-data rows -> 0.
  const dataRowMap = useMemo(() => {
    const map = [];
    let n = 0;
    rows.forEach((r) => { if (isData(r)) { n += 1; map.push(n); } else { map.push(0); } });
    return map;
  }, [rows]);

  const totalDataRows = useMemo(() => rows.filter(isData).length, [rows]);

  // ── Live formula evaluation — keyed `${colKey}:${arrayIndex}` ──
  const formulaValues = useMemo(() => {
    const map = {};
    if (formulaCols.length === 0) return map;
    const colByKey = new Map(cols.map(c => [c.key, c]));
    const inProgress = new Set();
    const arrayIndexOfDataRow = (dataRowNum) => {
      let count = 0;
      for (let i = 0; i < rows.length; i += 1) {
        if (isData(rows[i])) { count += 1; if (count === dataRowNum) return i; }
      }
      return -1;
    };

    const compute = (colKey, dataRowNum) => {
      if (dataRowNum < 1 || dataRowNum > totalDataRows) return 0;
      const colDef = colByKey.get(colKey);
      if (!colDef) return 0;
      const arrayIdx = arrayIndexOfDataRow(dataRowNum);
      if (arrayIdx < 0) return 0;
      const key = `${colKey}:${arrayIdx}`;
      if (key in map) return map[key];

      if (colDef.type !== 'formula' || !colDef.formula) {
        const v = Number(rows[arrayIdx]?.[colKey] ?? 0);
        const r = isFiniteNumber(v) ? v : 0;
        map[key] = r;
        return r;
      }

      if (inProgress.has(key)) return 0; // circular reference
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

  // ── Section subtotals + grand total for the subtotal column ──
  const subtotals = useMemo(() => {
    const bySection = new Map(); // tag (section row index) -> sum
    const sectionOfRow = [];
    let tag = -1; // -1 = rows before any section
    let grand = 0;
    const isFormulaCol = subCol?.type === 'formula';

    rows.forEach((row, idx) => {
      if (isSection(row)) {
        tag = idx;
        bySection.set(tag, 0);
        sectionOfRow.push(null);
        return;
      }
      if (!isData(row)) { sectionOfRow.push(null); return; }
      sectionOfRow.push(tag);
      if (!subtotalColumnKey || !subCol) return;
      let v = 0;
      if (isFormulaCol) {
        const fv = formulaValues[`${subtotalColumnKey}:${idx}`];
        if (isFiniteNumber(fv)) v = Number(fv);
      } else {
        v = Number(row[subtotalColumnKey]) || 0;
      }
      bySection.set(tag, (bySection.get(tag) || 0) + v);
      grand += v;
    });

    return { bySection, sectionOfRow, grandTotal: grand };
  }, [rows, subCol, subtotalColumnKey, formulaValues]);

  // ── Focus ──
  useEffect(() => {
    if (!pendingFocus) return;
    const { colKey, rowIdx } = pendingFocus;
    const el = inputRefs.current.get(`${colKey}:${rowIdx}`);
    if (el) { el.focus(); el.select?.(); setPendingFocus(null); }
  }, [pendingFocus, rows]);

  // ── Helpers ──
  const isFormula = (col) => col.type === 'formula';

  const moveDownOrCreate = (colKey, rowIdx) => {
    for (let i = rowIdx + 1; i < rows.length; i += 1) {
      if (isData(rows[i])) { setPendingFocus({ colKey, rowIdx: i }); return; }
    }
    if (!editable) return;
    const next = [...rows];
    next.splice(rowIdx + 1, 0, emptyRow());
    onRowsChange(next);
    setPendingFocus({ colKey, rowIdx: rowIdx + 1 });
  };

  const handleCellKeyDown = (e, colKey, rowIdx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        for (let i = rowIdx - 1; i >= 0; i -= 1) {
          if (isData(rows[i])) { setPendingFocus({ colKey, rowIdx: i }); return; }
        }
        return;
      }
      moveDownOrCreate(colKey, rowIdx);
    } else if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault();
      const next = [...rows];
      next[rowIdx] = { ...rows[rowIdx] };
      cols.forEach(c => { next[rowIdx][c.key] = ''; });
      onRowsChange(next);
    }
  };

  const handleKvKeyDown = (e, rowIdx) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (e.shiftKey) {
      for (let i = rowIdx - 1; i >= 0; i -= 1) {
        if (isData(rows[i])) { setPendingFocus({ colKey: cols[0]?.key || '', rowIdx: i }); return; }
      }
      return;
    }
    moveDownOrCreate(cols[0]?.key || '', rowIdx);
  };

  const updateCell = (rowIdx, colKey, value) => {
    onRowsChange(rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: value } : r)));
  };

  const updateSectionTitle = (rowIdx, title) => {
    onRowsChange(rows.map((r, i) => (i === rowIdx ? { ...r, title } : r)));
  };

  const updateKv = (rowIdx, patch) => {
    onRowsChange(rows.map((r, i) => (i === rowIdx ? { ...r, ...patch } : r)));
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

  const handleAddKv = (afterRowIdx) => {
    const next = [...rows];
    const insertIdx = afterRowIdx != null ? afterRowIdx + 1 : next.length;
    next.splice(insertIdx, 0, newEmptyKv());
    onRowsChange(next);
    setPendingFocus({ colKey: '_kv_label', rowIdx: insertIdx });
  };

  const handleRemoveRow = (rowIdx) => { if (onRemoveRow) onRemoveRow(rowIdx); };

  const footerBtns = editable && (
    <div className="flex items-center gap-4 px-3 py-1.5 border-t border-gray-100 print:hidden">
      {onAddRow && (
        <button
          onClick={handleAddRow}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 transition-colors"
        >
          <Plus size={11} /> add row
        </button>
      )}
      <button
        onClick={() => handleAddSection()}
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
      >
        <PanelTop size={11} /> add section
      </button>
      <button
        onClick={() => handleAddKv()}
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ListPlus size={11} /> add value row
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

  // ── Shared gutter cell (row number / actions) ──
  const gutterCell = (row, rowIdx) => {
    if (isData(row)) {
      return (
        <td className="py-1 px-1 text-center text-[10px] text-gray-400 border-r border-gray-100 select-none relative">
          {dataRowMap[rowIdx]}
          {editable && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleAddSection(rowIdx)}
                title="Insert section below"
                className="p-0.5 text-gray-300 hover:text-gray-600"
              >
                <PanelTop size={9} />
              </button>
              <button
                onClick={() => handleAddKv(rowIdx)}
                title="Insert value row below"
                className="p-0.5 text-gray-300 hover:text-gray-600"
              >
                <ListPlus size={9} />
              </button>
              <button
                onClick={() => handleRemoveRow(rowIdx)}
                title="Delete row"
                className="p-0.5 text-gray-300 hover:text-red-400"
              >
                <Trash2 size={9} />
              </button>
            </div>
          )}
        </td>
      );
    }
    if (isSection(row)) {
      return (
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
      );
    }
    return (
      <td className="py-1 px-1 text-center select-none relative">
        {editable && (
          <button
            onClick={() => handleRemoveRow(rowIdx)}
            title="Delete value row"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-0.5 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400"
          >
            <Trash2 size={10} />
          </button>
        )}
      </td>
    );
  };

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
            <tr className="bg-gray-100/50 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
              {showRowNumbers && <th className="p-0 w-11" />}
              {cols.map(c => (
                <th
                  key={c.key}
                  className={`px-2 py-1.5 align-bottom ${
                    c.type === 'number' || isFormula(c)
                      ? 'text-right'
                      : 'text-left'
                  } ${isFormula(c) ? 'text-indigo-700' : ''}`}
                >
                  {c.label || `Col ${c.key}`}
                  {isFormula(c) && (
                    <div className="text-[9px] font-mono normal-case tracking-normal text-indigo-400 font-normal mt-0.5 truncate">
                      ={c.formula}
                    </div>
                  )}
                  {subCol && c.key === subtotalColumnKey && (
                    <div className="text-[9px] font-normal normal-case tracking-normal text-gray-400 mt-0.5">
                      subtotal
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
                const secTotal = subtotals.bySection.get(rowIdx) || 0;
                return (
                  <tr key={rowIdx} className="group border-y border-gray-200" style={{ background: SECTION_COLOR }}>
                    {showRowNumbers && gutterCell(row, rowIdx)}
                    <td colSpan={cols.length} className="px-3 py-0 border-l border-gray-200" style={{ background: SECTION_COLOR }}>
                      <div className="flex items-center gap-2 h-7">
                        <PanelTop size={12} className="text-gray-400 shrink-0" />
                        {editable ? (
                          <input
                            type="text"
                            ref={el => { if (el) inputRefs.current.set(`_section_title:${rowIdx}`, el); }}
                            value={row.title || ''}
                            onChange={e => updateSectionTitle(rowIdx, e.target.value)}
                            onKeyDown={e => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  moveDownOrCreate(cols[0]?.key || '', rowIdx);
}}
                            placeholder="Section heading…"
                            className="flex-1 bg-transparent text-[11px] font-semibold text-gray-500 uppercase tracking-widest outline-none placeholder:text-gray-300 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal focus:bg-white focus:rounded px-1 py-0.5"
                          />
                        ) : (
                          <span className="flex-1 min-w-0 truncate text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                            {row.title || ''}
                          </span>
                        )}
                        {secTotal > 0 && (
                          <span className="text-[11px] font-semibold text-gray-600 shrink-0">{fmt2(secTotal)}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }

              // ── Key-value row ──
              if (isKv(row)) {
                return (
                  <tr key={rowIdx} className="group border-b border-gray-100 hover:bg-gray-50/60">
                    {showRowNumbers && gutterCell(row, rowIdx)}
                    <td colSpan={Math.max(1, cols.length - 1)} className="border-r border-gray-100 py-0 pl-6 pr-1">
                      {cols.length === 1 ? (
                        <div className="flex items-center">
                          <input
                            type="text"
                            ref={el => { if (el) inputRefs.current.set(`_kv_label:${rowIdx}`, el); }}
                            value={row.label || ''}
                            onChange={e => updateKv(rowIdx, { label: e.target.value })}
                            onKeyDown={e => editable && handleKvKeyDown(e, rowIdx)}
                            placeholder="Field label"
                            className="w-1/2 text-xs bg-transparent outline-none focus:bg-blue-50 px-1 py-1 placeholder:text-gray-300"
                          />
                          <span className="w-1/2 text-right">
                            <input
                              type="text"
                              value={row.value ?? ''}
                              onChange={e => updateKv(rowIdx, { value: e.target.value })}
                              disabled={!editable}
                              className="w-full text-right text-xs font-semibold bg-transparent outline-none focus:bg-blue-50 px-2 py-1 disabled:cursor-default"
                            />
                          </span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          ref={el => { if (el) inputRefs.current.set(`_kv_label:${rowIdx}`, el); }}
                          value={row.label || ''}
                          onChange={e => updateKv(rowIdx, { label: e.target.value })}
                          onKeyDown={e => editable && handleKvKeyDown(e, rowIdx)}
                          placeholder="Field label"
                          className="w-full text-xs text-gray-700 bg-transparent outline-none focus:bg-blue-50 px-1 py-1 placeholder:text-gray-300"
                        />
                      )}
                    </td>
                    {cols.length > 1 && (
                      <td className="border-r border-gray-100">
                        <input
                          type="text"
                          value={row.value ?? ''}
                          onChange={e => updateKv(rowIdx, { value: e.target.value })}
                          disabled={!editable}
                          onKeyDown={e => editable && handleKvKeyDown(e, rowIdx)}
                          className="w-full text-right text-xs font-semibold text-gray-900 bg-transparent outline-none focus:bg-blue-50 px-2 py-1 disabled:cursor-default"
                        />
                      </td>
                    )}
                  </tr>
                );
              }

              // ── Data row ──
              return (
                <tr key={rowIdx} className="group border-b border-gray-100 hover:bg-gray-50/60">
                  {showRowNumbers && gutterCell(row, rowIdx)}
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
                            {val === null ? <span className="text-red-400 font-bold">#ERR!</span> : fmt2(val)}
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

          {subtotalColumnKey && subCol && totalDataRows > 0 && (
            <tfoot>
              <tr className="bg-gray-900 text-white border-t border-gray-200">
                {showRowNumbers && <td className="w-11" style={{ background: '#111827' }} />}
                <td colSpan={cols.length - 1} className="px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ background: '#111827' }}>
                  {totalLabel}
                </td>
                <td className="text-right px-3 py-2 font-bold text-xs" style={{ background: '#111827' }}>
                  {fmt2(subtotals.grandTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {footerBtns}
    </div>
  );
}