'use client';
import { useEffect } from 'react';

export function usePushSubscription(profileId: string | undefined) {
  useEffect(() => {
    if (!profileId || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          // Ya suscripto — asegurarse de que está registrado en Supabase
          await registerSubscription(existing, profileId!);
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        });

        await registerSubscription(sub, profileId!);
      } catch (err) {
        console.warn('Push subscription error:', err);
      }
    }

    subscribe();
  }, [profileId]);
}

async function registerSubscription(sub: PushSubscription, profileId: string) {
  await fetch('/api/push', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, subscription: sub.toJSON() }),
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
