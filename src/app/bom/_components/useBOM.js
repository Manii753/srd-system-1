'use client';

import { useState, useEffect, useCallback } from 'react';

export function useBOM(srdId) {
  const [bom, setBom]       = useState(null);
  const [srd, setSrd]       = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!srdId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bom/${srdId}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load BOM');
      setBom(json.data);
      setSrd(json.srd);
      setCompany(json.company);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [srdId]);

  useEffect(() => { load(); }, [load]);

  const mutate = useCallback(async (action, data, author) => {
    if (!srdId) return { success: false, error: 'No SRD selected.' };
    setSaving(true);
    try {
      const res = await fetch(`/api/bom/${srdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data, author }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      if (json.success) setBom(json.data);
      return json;
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, [srdId]);

  const reset = useCallback(async () => {
    if (!srdId) return;
    await fetch(`/api/bom/${srdId}`, { method: 'DELETE' });
    await load();
  }, [srdId, load]);

  return { bom, srd, company, loading, error, saving, reload: load, mutate, reset };
}
