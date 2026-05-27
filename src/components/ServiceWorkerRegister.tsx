'use client';
import { useEffect, useRef, useState } from 'react';

export default function ServiceWorkerRegister() {
  const [updating, setUpdating] = useState(false);
  const pendingReload = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Revisar actualizaciones cada vez que el usuario vuelve a la pestaña
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update();
            // Si había un reload pendiente (app estaba en background), ejecutarlo ahora
            if (pendingReload.current) {
              pendingReload.current = false;
              triggerReload();
            }
          }
        });
      })
      .catch((err) => console.error('SW error:', err));

    // Escuchar el mensaje SW_UPDATED que manda el SW al activarse
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'SW_UPDATED') return;

      if (document.visibilityState === 'visible') {
        triggerReload();
      } else {
        // App en background: marcar para recargar cuando el usuario la abra
        pendingReload.current = true;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  function triggerReload() {
    setUpdating(true);
    setTimeout(() => window.location.reload(), 2000);
  }

  if (!updating) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'var(--purple-900)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      Actualizando a la versión más reciente...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
