'use client';

import { Plus, Trash2 } from 'lucide-react';
import { columnKeyFromIndex } from '@/lib/costSheetFormula';

const nextColumnKey = (columns) => {
  for (let i = 0; i < 52; i += 1) {
    const key = columnKeyFromIndex(i);
    if (!columns.some(c => c.key === key)) return key;
  }
  return columnKeyFromIndex(columns.length);
};

export default function CostSheetColumnDesigner({
  columns,
  onChange,
  subtotalColumnKey,
  onSubtotalColumnChange,
}) {
  const update = (idx, patch) => onChange(columns.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const remove = (idx) => onChange(columns.filter((_, i) => i !== idx));
  const add = () => onChange([
    ...columns,
    { key: nextColumnKey(columns), label: '', type: 'text', formula: '', width: 120 },
  ]);

  if (!columns.length) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-400 mb-3">No columns yet. Add a column to start building your sheet.</p>
        <button
          onClick={add}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg"
        >
          <Plus size={13} /> Add Column
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {onSubtotalColumnChange && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 text-xs text-gray-600">
          <span className="font-medium text-gray-500">Subtotal column</span>
          <select
            value={subtotalColumnKey || ''}
            onChange={e => onSubtotalColumnChange(e.target.value)}
            className="border border-gray-200 rounded bg-white px-1.5 py-0.5 text-xs"
          >
            <option value="">None</option>
            {columns.filter(c => c.type === 'formula').map(c => (
              <option key={c.key} value={c.key}>{c.label || c.key}</option>
            ))}
            {columns.filter(c => c.type !== 'formula').map(c => (
              <option key={c.key} value={c.key}>{c.label || c.key} (raw)</option>
            ))}
          </select>
        </div>
      )}
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wide">
            <th className="py-2 px-3 text-left">Col</th>
            <th className="py-2 px-3 text-left w-1/4">Label</th>
            <th className="py-2 px-3 text-left">Type</th>
            <th className="py-2 px-3 text-left">Formula</th>
            <th className="py-2 px-3 text-left w-20">Width</th>
            <th className="w-20 text-right pr-3">
              <button
                onClick={add}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded"
              >
                <Plus size={11} /> Add Column
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {columns.map((c, idx) => (
            <tr key={c.key} className="border-t border-gray-100 group">
              <td className="py-1.5 px-3">
                <span className="inline-flex items-center justify-center w-7 h-6 rounded bg-gray-800 text-white text-[10px] font-mono font-bold">
                  {c.key}
                </span>
              </td>
              <td className="px-3 py-1.5">
                <input
                  value={c.label}
                  onChange={e => update(idx, { label: e.target.value })}
                  placeholder={`Field ${c.key}`}
                  className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </td>
              <td className="px-3 py-1.5">
                <select
                  value={c.type}
                  onChange={e => update(idx, { type: e.target.value })}
                  className="px-2 py-1 border border-gray-200 rounded bg-white"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="formula">Formula</option>
                </select>
              </td>
              <td className="px-3 py-1.5">
                {c.type === 'formula' ? (
                  <input
                    value={c.formula}
                    onChange={e => update(idx, { formula: e.target.value })}
                    placeholder="e.g. =B{row}*C{row}"
                    className="w-full px-2 py-1 font-mono text-[11px] border border-indigo-200 bg-indigo-50/40 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-3 py-1.5">
                <input
                  type="number"
                  min="40"
                  step="1"
                  value={c.width}
                  onChange={e => update(idx, { width: parseInt(e.target.value, 10) || 120 })}
                  className="w-full px-2 py-1 border border-gray-200 rounded"
                />
              </td>
              <td className="pr-3 text-right">
                <button
                  onClick={() => remove(idx)}
                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}