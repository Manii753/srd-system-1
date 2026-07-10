'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for loading and saving costing data for a given SRD _id.
 * Automatically detects and migrates old-schema documents (sections[] → fabrics[]).
 */
export function useCosting(srdId) {
  const [costing, setCosting] = useState(null);
  const [srd, setSrd]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    if (!srdId) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/costing/${srdId}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load costing');

      // Detect old schema: has sections[] instead of fabrics[]
      const isOldSchema =
        json.data?.postCost?.sections != null ||
        json.data?.preCost?.sections  != null;

      if (isOldSchema) {
        // Delete the stale doc and reload — server will recreate with new schema
        await fetch(`/api/costing/${srdId}`, { method: 'DELETE' });
        const res2  = await fetch(`/api/costing/${srdId}`);
        if (!res2.ok) throw new Error(`Server error ${res2.status}`);
        const json2 = await res2.json();
        if (json2.success) {
          setCosting(json2.data);
          setSrd(json2.srd);
        } else {
          throw new Error(json2.error || 'Failed to recreate costing');
        }
      } else {
        setCosting(json.data);
        setSrd(json.srd);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [srdId]);

  useEffect(() => { load(); }, [load]);

  const mutate = useCallback(async (type, action, data, author) => {
    if (!srdId) return { success: false, error: 'No SRD linked — select an SRD to save.' };
    setSaving(true);
    try {
      const res  = await fetch(`/api/costing/${srdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, action, data, author }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      if (json.success) setCosting(json.data);
      return json;
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, [srdId]);

  return { costing, srd, loading, error, saving, reload: load, mutate };
}
