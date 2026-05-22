'use client';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

// ─── Context ─────────────────────────────────────────────────────────────────

interface LoadingContextType {
  showLoader: () => void;
  hideLoader: () => void;
  /** Wraps an async fn: shows loader before, hides after (even on error) */
  withLoader: <T>(fn: () => Promise<T>) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType>({
  showLoader: () => {},
  hideLoader: () => {},
  withLoader: (fn) => fn(),
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LoadingProvider({ children }: { children: ReactNode }) {
  // Use a counter so nested withLoader calls work correctly
  const countRef   = useRef(0);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mounted,  setMounted]  = useState(false); // in DOM
  const [visible,  setVisible]  = useState(false); // opacity 1

  // Hide loader when the route changes (navigation completed)
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      // Force-hide on navigation regardless of counter
      countRef.current = 0;
      setVisible(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setMounted(false), 250);
    }
  }, [pathname]);

  const showLoader = useCallback(() => {
    countRef.current += 1;
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setMounted(true);
    // One rAF to let the DOM paint, then fade in
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, []);

  const hideLoader = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current > 0) return;
    setVisible(false);
    hideTimer.current = setTimeout(() => setMounted(false), 250);
  }, []);

  const withLoader = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      showLoader();
      try {
        return await fn();
      } finally {
        hideLoader();
      }
    },
    [showLoader, hideLoader],
  );

  return (
    <LoadingContext.Provider value={{ showLoader, hideLoader, withLoader }}>
      {children}

      {/* ── Overlay ── */}
      {mounted && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(248,247,255,0.72)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: visible ? 1 : 0,
            transition: 'opacity 200ms ease',
            pointerEvents: visible ? 'all' : 'none',
          }}>
          {/* Spinner ring */}
          <div
            className='animate-spin'
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '3px solid var(--purple-100)',
              borderTopColor: 'var(--purple-600)',
            }}
          />
        </div>
      )}
    </LoadingContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLoading() {
  return useContext(LoadingContext);
}
