'use client';
import { useEffect, useState } from 'react';

type InstallState = 'unavailable' | 'ready' | 'installed' | 'ios';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [installState, setInstallState] = useState<InstallState>('unavailable');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detectar iOS Safari (no soporta beforeinstallprompt)
    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window as unknown as Record<string, unknown>).MSStream;
    const isInStandaloneMode =
      ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isInStandaloneMode) {
      setInstallState('installed');
      return;
    }

    if (isIOS) {
      setInstallState('ios');
      return;
    }

    // Android Chrome: capturar el evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallState('ready');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Si ya está instalada
    window.addEventListener('appinstalled', () => {
      setInstallState('installed');
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function triggerInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstallState('installed');
    setDeferredPrompt(null);
  }

  return { installState, triggerInstall };
}
