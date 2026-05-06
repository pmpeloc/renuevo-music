export default function OfflinePage() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M4 14C4 14 7 8 14 8s10 6 10 6" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="14" cy="20" r="2.5" fill="#9ca3af"/>
          <line x1="4" y1="4" x2="24" y2="24" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-gray-700 mb-2">Sin conexión</h1>
      <p className="text-sm text-gray-400">
        No hay conexión a internet. Revisá tu red e intentá de nuevo.
      </p>
    </div>
  );
}
