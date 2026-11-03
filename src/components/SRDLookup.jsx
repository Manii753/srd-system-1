'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

export default function SRDLookup({ onFound, placeholder = 'Enter SRD number...' }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      // Search by refNo
      const res = await fetch(`/api/srd?search=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      const srds = data.data || [];
      const match = srds.find(s => s.refNo?.toLowerCase() === query.trim().toLowerCase()) || srds[0];
      if (match) {
        // The list endpoint returns DispatchDetails/BuyerDetails as bare ids.
        // Fetch the full SRD so the dispatch panel and print cards can read the
        // saved details (dispatch date, AWB, images, buyer, ...).
        let fullSrd = match;
        try {
          const detailRes = await fetch(`/api/srd/${match._id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData?.success && detailData.data) fullSrd = detailData.data;
          }
        } catch (_) {
          // Fall back to the list payload if the detail request fails.
        }
        onFound(fullSrd);
      } else {
        setError(`No SRD found for "${query.trim()}"`);
      }
    } catch (err) {
      setError('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-sm">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={query}
          onChange={e => { setQuery(e.target.value); setError(''); }}
          placeholder={placeholder}
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '...' : 'Find'}
      </button>
      {error && <p className="text-red-500 text-xs mt-1 absolute">{error}</p>}
    </form>
  );
}
