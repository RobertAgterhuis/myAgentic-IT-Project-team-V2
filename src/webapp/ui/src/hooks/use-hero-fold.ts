import { useState } from 'react';

const STORAGE_PREFIX = 'hero-fold:';

/**
 * Persists the fold/unfold state of a hero section in localStorage.
 * Default is folded (true) on first visit so critical controls stay above the fold.
 */
export function useHeroFold(id: string): [boolean, () => void] {
  const key = `${STORAGE_PREFIX}${id}`;
  const [folded, setFolded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
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
