'use client';

import { useEffect, useState } from 'react';
import { PWA_ASSET_VERSION } from '@/lib/pwaIdentity';

const STORAGE_KEY = 'renuevo-pwa-identity-version';

export default function PWAIdentityUpdateNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isApple = /iPhone|iPad|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isInstalled = (navigator as Navigator & { standalone?: boolean }).standalone === true
      || window.matchMedia('(display-mode: standalone)').matches;

    if (isApple && isInstalled && localStorage.getItem(STORAGE_KEY) !== PWA_ASSET_VERSION) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  if (!visible) return null;

  return (
    <section
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border p-4 shadow-xl"
      role="status"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
        Para actualizar el ícono y la pantalla de inicio, Apple requiere eliminar este acceso y volver a agregarlo desde Safari.
      </p>
      <button
        className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-white"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, PWA_ASSET_VERSION);
          setVisible(false);
        }}
        style={{ background: 'var(--accent)' }}
        type="button"
      >
        Entendido
      </button>
    </section>
  );
}
