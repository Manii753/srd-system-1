'use client';

import { useState, useEffect } from 'react';

export function useSRD(refNo) {
  const [srd, setSrd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!refNo) {
      setError('No SRD reference provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/mobile/srd?refNo=${encodeURIComponent(refNo)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSrd(data.data);
        } else {
          setError(data.error || 'SRD not found');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [refNo]);

  return { srd, loading, error };
}
