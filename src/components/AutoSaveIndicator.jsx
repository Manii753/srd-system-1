'use client';

import { useEffect, useState } from 'react';
import { Check, Cloud } from 'lucide-react';

export default function AutoSaveIndicator({ isSaving }) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!isSaving && showSaved === false) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaving, showSaved]);

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Cloud className="h-4 w-4 animate-pulse" />
        <span>Saving...</span>
      </div>
    );
  }

  if (showSaved) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <Check className="h-4 w-4" />
        <span>Saved</span>
      </div>
    );
  }

  return null;
}
