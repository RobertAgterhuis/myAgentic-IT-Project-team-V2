import { useState } from 'react';

const STORAGE_PREFIX = 'hero-fold:';

/**
 * Persists the fold/unfold state of a hero section in localStorage.
 * Default is unfolded (false) on first visit.
 */
export function useHeroFold(id: string): [boolean, () => void] {
  const key = `${STORAGE_PREFIX}${id}`;
  const [folded, setFolded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? false : stored === 'true';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setFolded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // localStorage not available (e.g. privacy mode); state still updates in memory
      }
      return next;
    });
  };

  return [folded, toggle];
}
