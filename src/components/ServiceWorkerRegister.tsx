'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Registrar SW
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Revisar actualizaciones cada vez que el usuario vuelve a la pestaña
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update();
        });
      })
      .catch((err) => console.error('SW error:', err));

    // Escuchar el mensaje SW_UPDATED que manda el SW al activarse
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        // Recargar silenciosamente para cargar la versión nueva
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  return null;
}
