'use client';

import { Link2, Unlink } from 'lucide-react';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'PKR'];

function HeaderFieldCell({ field, value, onChange, editable }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase shrink-0">{field.label}</span>
      {field.type === 'select' ? (
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={!editable}
          className="flex-1 min-w-0 text-xs bg-transparent outline-none text-gray-800 focus:bg-gray-50 rounded px-0.5 py-0.5"
        >
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={!editable}
          className="flex-1 min-w-0 text-xs bg-transparent outline-none text-gray-800 focus:bg-gray-50 rounded px-0.5"
        />
      )}
    </div>
  );
}

export default function CostSheetFormHeader({
  title,
  onTitleChange,
  srd,
  srdRef,
  srdQuery,
  onSrdQueryChange,
  onClearSrd,
  srdResults,
  onSelectSrd,
  headerFields = [],
  headers = {},
  onChangeHeader,
  currency,
  onCurrencyChange,
  editable = true,
}) {
  const rows = [];
  for (let i = 0; i < headerFields.length; i += 3) rows.push(headerFields.slice(i, i + 3));

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm print:shadow-none">
      {/* ── Top bar: title / ref · SRD · currency ── */}
      <div className="grid grid-cols-3 divide-x divide-gray-200 bg-gray-50 border-b border-gray-200">
        <div className="px-3 py-2 col-span-2 flex items-center gap-2 flex-wrap">
          {editable ? (
            <input
              value={title || ''}
              onChange={e => onTitleChange(e.target.value)}
              placeholder="Costing Title"
              className="text-xs font-semibold font-mono text-gray-800 bg-transparent outline-none focus:bg-white rounded px-0.5 min-w-0 w-28"
            />
          ) : (
            <span className="font-mono font-bold text-blue-700">{title || ''}</span>
          )}
          <span className="font-semibold text-gray-700 text-xs">Costing Form</span>
          {srd && (
            <span className="text-[10px] font-medium text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
              <Link2 size={9} /> {srdRef || srd?.refNo}
            </span>
          )}
        </div>
        <div className="px-3 py-2">
          {editable ? (
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <input
                  value={srdQuery || ''}
                  onChange={e => onSrdQueryChange(e.target.value)}
                  placeholder="Search SRD ref…"
                  className="w-full text-[11px] bg-transparent outline-none focus:bg-gray-100 rounded px-1.5 py-1"
                />
                {srd && (
                  <button onClick={onClearSrd} title="Unlink SRD" className="text-gray-300 hover:text-red-400 shrink-0">
                    <Unlink size={12} />
                  </button>
                )}
              </div>
              {srdResults?.length > 0 && (
                <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl">
                  {srdResults.map(r => (
                    <button
                      key={r._id}
                      onClick={() => onSelectSrd(r)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-medium text-gray-800">{r.refNo}</span>
                      {r.title && <span className="text-[10px] text-gray-400 truncate">{r.title}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="block text-[11px] text-gray-400">{srdRef || srd?.refNo || ''}</span>
          )}
        </div>
        <div className="px-3 py-2 flex items-center justify-end">
          {editable ? (
            <select
              value={currency || 'USD'}
              onChange={e => onCurrencyChange(e.target.value)}
              className="border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-600 bg-white"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <span className="text-xs font-semibold text-gray-700 uppercase">{currency || 'USD'}</span>
          )}
        </div>
      </div>

      {/* ── Header fields (3 per row, costing-form style) ── */}
      {rows.map((group, gi) => (
        <div key={gi} className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-200 bg-white">
          {group.map(f => (
            <div key={f.key} className="min-w-0">
              <HeaderFieldCell
                field={f}
                value={headers[f.key] ?? ''}
                onChange={v => onChangeHeader(f.key, v)}
                editable={editable}
              />
            </div>
          ))}
          {group.length < 3 && Array.from({ length: 3 - group.length }).map((_, i) => (
            <div key={`sp-${i}`} />
          ))}
        </div>
      ))}
    </div>
  );
}