'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * SRD search box.  Calls onSelect(srd) with the matched SRD.
 */
export default function SRDSearch({ onSelect }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res  = await fetch(`/api/srd?search=${encodeURIComponent(q)}&populate=true`);
      const json = await res.json();
      if (json.success) {
        setResults(json.data || []);
      } else {
        setError('Search failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') search();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setSearched(false); }}
          onKeyDown={handleKeyDown}
          placeholder="Enter SRD reference no. (e.g. SRD-1001)…"
          className="h-9 text-sm"
        />
        <Button onClick={search} disabled={loading} size="sm" className="h-9 px-4">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          <span className="ml-1.5">Search</span>
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {searched && results.length === 0 && !loading && (
        <p className="text-xs text-gray-400 italic">No SRDs found for "{query}"</p>
      )}

      {results.length > 0 && (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
          {results.map(srd => (
            <li key={srd._id}>
              <button
                onClick={() => { onSelect(srd); setResults([]); setQuery(srd.refNo); }}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 text-left transition-colors"
              >
                <div>
                  <span className="font-semibold text-sm text-gray-900">{srd.refNo}</span>
                  {srd.title && (
                    <span className="ml-2 text-xs text-gray-500">{srd.title}</span>
                  )}
                </div>
                {srd.BuyerDetails?.name && (
                  <span className="text-xs text-gray-400">{srd.BuyerDetails.name}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
