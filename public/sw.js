// ============================================================
// SERVICE WORKER — Renuevo Music App
// Estrategia: network-first + auto-reload al actualizar
// ============================================================

const CACHE_NAME = 'renuevo-v3';
const OFFLINE_URL = '/offline';

// Instalación: activar inmediatamente sin esperar tabs cerradas
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/offline']))
  );
  // Forzar activación inmediata del nuevo SW sin esperar
  self.skipWaiting();
});

// Activación: limpiar caches viejos y tomar control de todos los clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())  // tomar control inmediato
      .then(() => {
        // Avisar a todas las pestañas abiertas que hay una versión nueva → recargan
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      })
  );
});

// Fetch: network-first para el mismo origen, dejar pasar lo externo
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Dejar pasar Supabase, YouTube, APIs externas sin tocar
  if (url.origin !== self.location.origin) return;

  // Para navegación (HTML), siempre red primero — offline muestra página vacante
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Guardar en caché solo respuestas válidas de mismo origen
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Renuevo', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Renuevo', options)
  );
});

// Click en notificación: abrir la app en la URL correcta
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
