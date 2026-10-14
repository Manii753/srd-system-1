'use client';

import { useMemo, useState } from 'react';
import { Search, Unlink, Check } from 'lucide-react';
import { COSTING_SOURCES, MAPPABLE_FIELD_TYPES } from '@/lib/costingSources';

const TYPE_BADGE = {
  text: 'text', number: 'number', date: 'date', boolean: 'yes/no', textarea: 'long text',
  'select-dynamic': 'dropdown', table: 'table', createdAt: 'date', refNo: 'ref no',
  'old-refNo': 'ref no',
};

const isMappable = (field) => MAPPABLE_FIELD_TYPES.has(field.type);

/**
 * FieldMappingEditor — defines "what goes where": each SR form field (which
 * comes from the Field collection) is pointed at one value on the costing sheet.
 *
 * The editor is deliberately field-centric: an SR field can receive at most one
 * costing value, which is the constraint the raise-SR endpoint enforces too.
 */
export default function FieldMappingEditor({
  fields = [],
  mapping = {},
  onChange,
  readOnly = false,
}) {
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');

  // Reverse lookup: fieldId -> sourceKey, so the SR field rows can show
  // whether a value is already spoken for.
  const sourceByField = useMemo(() => {
    const m = new Map();
    Object.entries(mapping).forEach(([key, fieldId]) => {
      if (fieldId) m.set(String(fieldId), key);
    });
    return m;
  }, [mapping]);

  const usedSourceKeys = useMemo(
    () => new Set(Object.entries(mapping).filter(([, v]) => v).map(([k]) => k)),
    [mapping],
  );

  const departments = useMemo(() => {
    const set = new Set(fields.filter(isMappable).map(f => f.department || 'global'));
    return ['all', ...[...set].sort()];
  }, [fields]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fields
      .filter(isMappable)
      .filter(f => dept === 'all' || (f.department || 'global') === dept)
      .filter(f => !q || f.name?.toLowerCase().includes(q) || f.slug?.toLowerCase().includes(q))
      .sort((a, b) =>
        (a.department || 'global').localeCompare(b.department || 'global') ||
        (a.order ?? 0) - (b.order ?? 0) ||
        String(a.name).localeCompare(String(b.name))
      );
  }, [fields, search, dept]);

  const setFieldSource = (fieldId, sourceKey) => {
    if (!onChange) return;
    const next = { ...mapping };
    // Free the previous source that pointed at this field.
    Object.keys(next).forEach(k => { if (next[k] === fieldId) delete next[k]; });
    if (sourceKey) next[sourceKey] = fieldId;
    onChange(next);
  };

  const clearSource = (sourceKey) => {
    if (!onChange) return;
    const next = { ...mapping };
    delete next[sourceKey];
    onChange(next);
  };

  // ── Summary ──
  const mappedFieldIds = new Set(Object.values(mapping).filter(Boolean).map(String));
  const mappedCount = rows.filter(f => mappedFieldIds.has(String(f._id))).length;
  const unusedSources = COSTING_SOURCES.filter(s => !usedSourceKeys.has(s.key));

  return (
    <div className="space-y-4">
      {/* ── Filters + summary ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search SR fields…"
            className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <select
          value={dept}
          onChange={e => setDept(e.target.value)}
          className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white outline-none"
        >
          {departments.map(d => (
            <option key={d} value={d}>{d === 'all' ? 'All departments' : d}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
        <span>
          <strong className="text-gray-800">{mappedCount}</strong> of{' '}
          <strong className="text-gray-800">{rows.length}</strong> SR fields connected
        </span>
        <span>
          <strong className="text-gray-800">{usedSourceKeys.size}</strong> of{' '}
          <strong className="text-gray-800">{COSTING_SOURCES.length}</strong> costing values in use
        </span>
      </div>

      {/* ── SR fields ── */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_18rem] gap-3 items-center bg-gray-50 border-b border-gray-200 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            SR form field <span className="font-normal normal-case">(from the Field collection)</span>
          </span>
          <span className="w-16" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            ← Filled from costing
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-gray-400">
            No active SR fields match. Create fields in Settings → SR Fields first.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map(field => {
              const fieldId = String(field._id);
              const sourceKey = sourceByField.get(fieldId) || '';

              return (
                <li key={field._id} className="grid grid-cols-[1fr_auto_18rem] gap-3 items-center px-3 py-2 hover:bg-gray-50/70">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-800 truncate">{field.name}</span>
                      <span className="text-[9px] uppercase tracking-wide px-1.5 py-px rounded bg-gray-100 text-gray-500">
                        {TYPE_BADGE[field.type] || field.type}
                      </span>
                      {sourceKey && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wide px-1.5 py-px rounded bg-green-50 text-green-600">
                          <Check size={9} /> connected
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {field.department || 'global'}
                      {field.slug ? ` · ${field.slug}` : ''}
                    </span>
                  </div>

                  <span className="w-16 text-center text-[10px] text-gray-300">gets</span>

                  <div className="flex items-center gap-1">
                    <select
                      value={sourceKey}
                      disabled={readOnly}
                      onChange={e => setFieldSource(fieldId, e.target.value)}
                      className={`flex-1 h-7 min-w-0 px-2 text-xs rounded-lg border outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 ${
                        sourceKey
                          ? 'border-green-300 bg-green-50/50 text-green-800'
                          : 'border-gray-200 bg-white text-gray-400'
                      }`}
                    >
                      <option value="">— not connected —</option>
                      {COSTING_SOURCES.reduce((acc, src) => {
                        const last = acc[acc.length - 1];
                        if (last?.group === src.group) last.options.push(src);
                        else acc.push({ group: src.group, options: [src] });
                        return acc;
                      }, []).map(grp => (
                        <optgroup key={grp.group} label={grp.group}>
                          {grp.options.map(src => {
                            const taken = !!mapping[src.key] && String(mapping[src.key]) !== fieldId;
                            return (
                              <option
                                key={src.key}
                                value={src.key}
                                disabled={taken}
                              >
                                {src.label}{taken ? ' — already used' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      ))}
                    </select>
                    {sourceKey && !readOnly && (
                      <button
                        onClick={() => clearSource(sourceKey)}
                        title="Disconnect"
                        className="shrink-0 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Unlink size={12} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Costing values with no SR destination ── */}
      {unusedSources.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3">
          <p className="text-[11px] font-semibold text-amber-800 mb-1.5">
            Costing values not sent to the SR ({unusedSources.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {unusedSources.map(src => (
              <span
                key={src.key}
                title={src.group}
                className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-amber-200 text-amber-700"
              >
                {src.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}