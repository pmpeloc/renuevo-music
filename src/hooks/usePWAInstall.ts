'use client';
import { useEffect, useState } from 'react';

type InstallState = 'unavailable' | 'ready' | 'installed' | 'ios';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __pwaPrompt: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [installState, setInstallState] = useState<InstallState>('unavailable');
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detectar si ya está instalada (modo standalone)
    const isStandalone =
      ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) { setInstallState('installed'); return; }

    // Detectar iOS Safari (no soporta beforeinstallprompt)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !('MSStream' in window);
    if (isIOS) { setInstallState('ios'); return; }

    // El evento pudo haber llegado ANTES de que React montara —
    // lo capturamos en el script inline del layout y lo guardamos en window.__pwaPrompt
    if (window.__pwaPrompt) {
      setPrompt(window.__pwaPrompt);
      setInstallState('ready');
    }

    // También escuchar si llega después del montado
    const onReady = () => {
      if (window.__pwaPrompt) {
        setPrompt(window.__pwaPrompt);
        setInstallState('ready');
      }
    };
    const onInstalled = () => {
      setInstallState('installed');
      setPrompt(null);
    };

    window.addEventListener('pwaready', onReady);
    window.addEventListener('pwainstalled', onInstalled);
    return () => {
      window.removeEventListener('pwaready', onReady);
      window.removeEventListener('pwainstalled', onInstalled);
    };
  }, []);

  async function triggerInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setInstallState('installed');
      window.__pwaPrompt = null;
    }
    setPrompt(null);
  }

  return { installState, triggerInstall };
}
