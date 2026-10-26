import { useEffect, useRef } from 'react';

/**
 * Hook to detect clicks outside of a specified element.
 * Automatically closes dropdowns/modals when user clicks anywhere else on the page.
 */
export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  handler: () => void,
  enabled: boolean = true
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!ref.current) return;
      const target = event.target as Node | null;
      if (target && !ref.current.contains(target)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handler, enabled]);

  return ref;
}
