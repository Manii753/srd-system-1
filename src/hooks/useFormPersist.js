import { useEffect, useRef } from 'react';

/**
 * Hook to persist form data to localStorage and restore it on page reload
 * @param {string} key - Unique key for localStorage
 * @param {object} formData - Current form data to persist
 * @param {function} setFormData - Function to update form data
 * @param {number} debounceMs - Debounce time in milliseconds (default: 1000)
 */
export function useFormPersist(key, formData, setFormData, debounceMs = 1000) {
  const timeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  // Restore data on mount
  useEffect(() => {
    if (isInitialMount.current) {
      try {
        const savedData = localStorage.getItem(key);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setFormData(parsed);
          console.log(`[FormPersist] Restored data for key: ${key}`);
        }
      } catch (error) {
        console.error('[FormPersist] Error restoring data:', error);
      }
      isInitialMount.current = false;
    }
  }, [key, setFormData]);

  // Save data on change (debounced)
  useEffect(() => {
    if (isInitialMount.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(formData));
        console.log(`[FormPersist] Saved data for key: ${key}`);
      } catch (error) {
        console.error('[FormPersist] Error saving data:', error);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, formData, debounceMs]);

  // Clear saved data
  const clearPersistedData = () => {
    try {
      localStorage.removeItem(key);
      console.log(`[FormPersist] Cleared data for key: ${key}`);
    } catch (error) {
      console.error('[FormPersist] Error clearing data:', error);
    }
  };

  return { clearPersistedData };
}
