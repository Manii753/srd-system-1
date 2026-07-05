'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for loading and saving costing data for a given SRD _id.
 * @param {string|null} srdId - MongoDB _id of the SRD
 */
export function useCosting(srdId) {
  const [costing, setCosting]   = useState(null);
  const [srd, setSrd]           = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    if (!srdId) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/costing/${srdId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load costing');
      setCosting(json.data);
      setSrd(json.srd);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [srdId]);

  useEffect(() => { load(); }, [load]);

  /**
   * Save / submit / approve a costing side.
   * @param {'pre'|'post'} type
   * @param {'save'|'submit'|'approve'|'reject'} action
   * @param {object} data  - cost data (for 'save' action)
   * @param {string} author
   */
  const mutate = useCallback(async (type, action, data, author) => {
    if (!srdId) return { success: false };
    setSaving(true);
    try {
      const res  = await fetch(`/api/costing/${srdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, action, data, author }),
      });
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
