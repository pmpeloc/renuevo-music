'use client';
import { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, X, Share } from 'lucide-react';

export default function PWAInstallButton() {
  const { installState, triggerInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || installState === 'installed' || installState === 'unavailable') return null;

  return (
    <>
      {/* Botón en el header */}
      {installState === 'ready' && (
        <button
          onClick={triggerInstall}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-medium"
          style={{ background: 'var(--purple-600)' }}
          title="Instalar app"
        >
          <Download size={13} />
          <span>Instalar</span>
        </button>
      )}

      {installState === 'ios' && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-medium"
          style={{ background: 'var(--purple-600)' }}
          title="Instalar app"
        >
          <Download size={13} />
          <span>Instalar</span>
        </button>
      )}

      {/* Modal de instrucciones para iOS */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowIOSGuide(false); }}
        >
          <div className="bg-white rounded-t-3xl p-6 slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-base">Instalar Renuevo</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X size={15} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold mt-0.5"
                  style={{ background: 'var(--purple-600)' }}
                >
                  1
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">Tocá el botón Compartir</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Es el ícono de la flecha hacia arriba en la barra inferior de Safari
                  </p>
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl w-fit">
                    <Share size={16} className="text-blue-500" />
                    <span className="text-xs text-gray-600">Compartir</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold mt-0.5"
                  style={{ background: 'var(--purple-600)' }}
                >
                  2
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">Seleccioná &quot;Agregar a pantalla de inicio&quot;</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Scrolleá hacia abajo en el menú de opciones
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold mt-0.5"
                  style={{ background: 'var(--purple-600)' }}
                >
                  3
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">Tocá &quot;Agregar&quot;</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    La app va a aparecer en tu pantalla de inicio como cualquier app nativa
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setShowIOSGuide(false); setDismissed(true); }}
              className="w-full mt-6 py-3 rounded-2xl text-white font-semibold text-sm"
              style={{ background: 'var(--purple-600)' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
