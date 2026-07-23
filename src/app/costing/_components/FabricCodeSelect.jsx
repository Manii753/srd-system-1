'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';

/**
 * FabricCodeSelect — A combobox that allows typing a fabric code or selecting from saved codes.
 * When a new code is typed and selected, it's saved to the database for future reuse.
 */
export default function FabricCodeSelect({ value, onChange, disabled, placeholder = 'Type or select code' }) {
  const [codes, setCodes] = useState([]);
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Load saved codes on mount
  useEffect(() => {
    fetch('/api/fabric-codes')
      .then(r => r.json())
      .then(json => { if (json.success) setCodes(json.data || []); })
      .catch(() => {});
  }, []);

  // Sync when value prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = codes.filter(c =>
    c.code?.toLowerCase().includes(inputValue.toLowerCase()) ||
    c.description?.toLowerCase().includes(inputValue.toLowerCase())
  );

  const highlightMatch = (text) => {
    if (!inputValue || !text) return text;
    const idx = text.toLowerCase().indexOf(inputValue.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-bold text-blue-600">{text.slice(idx, idx + inputValue.length)}</span>
        {text.slice(idx + inputValue.length)}
      </>
    );
  };

  const handleSelect = (code) => {
    setInputValue(code);
    onChange?.(code);
    setIsOpen(false);
    setHighlightIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && filtered[highlightIdx]) {
        handleSelect(filtered[highlightIdx].code);
      } else if (inputValue.trim()) {
        handleSave(inputValue.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSave = async (code) => {
    if (!code) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/fabric-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (json.success) {
        // Add to local list if new
        if (!codes.find(c => c.code === code)) {
          setCodes(prev => [...prev, json.data].sort((a, b) => a.code.localeCompare(b.code)));
        }
        setInputValue(code);
        onChange?.(code);
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to save fabric code:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value);
            onChange?.(e.target.value);
            setIsOpen(true);
            setHighlightIdx(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full text-xs bg-transparent outline-none text-gray-800 focus:bg-blue-50 transition-colors px-1 py-1 min-w-0"
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="shrink-0 px-1 text-gray-400 hover:text-gray-600"
          >
            <ChevronDown size={12} />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
          {filtered.length > 0 ? (
            filtered.map((c, idx) => (
              <button
                key={c._id || c.code}
                type="button"
                onClick={() => handleSelect(c.code)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2 ${
                  idx === highlightIdx ? 'bg-blue-50' : ''
                }`}
              >
                <span className="font-mono font-medium text-gray-800">{highlightMatch(c.code)}</span>
                {c.description && (
                  <span className="text-gray-400 truncate">— {c.description}</span>
                )}
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={() => handleSave(inputValue.trim())}
              disabled={!inputValue.trim() || isSaving}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2 text-blue-600 disabled:opacity-50"
            >
              <Plus size={12} />
              {isSaving ? 'Saving...' : `Save "${inputValue}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
