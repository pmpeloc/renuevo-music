'use client';
import { useEffect, useState, useRef } from 'react';
import { X, Search, Play } from 'lucide-react';
import Image from 'next/image';

interface YouTubeResult {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium: { url: string } };
  };
}

interface YouTubeSearchModalProps {
  initialQuery: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function YouTubeSearchModal({
  initialQuery,
  onSelect,
  onClose,
}: YouTubeSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<YouTubeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Búsqueda automática al abrir con el título de la canción
  useEffect(() => {
    inputRef.current?.focus();
    if (initialQuery.trim()) {
      doSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setResults([]);
      } else setResults(data.items ?? []);
    } catch {
      setError('Error al buscar. Revisá tu conexión.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(videoId: string) {
    onSelect(`https://www.youtube.com/watch?v=${videoId}`);
    onClose();
  }

  return (
    <div
      className='fixed inset-0 z-60 flex flex-col justify-end'
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className='bg-white rounded-t-3xl max-h-[90vh] flex flex-col slide-up'>
        {/* Header */}
        <div className='px-5 pt-4 pb-3 border-b border-gray-100'>
          <div className='w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4' />
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-base font-semibold'>Buscar en YouTube</h2>
            <button
              onClick={onClose}
              className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center'>
              <X size={15} className='text-gray-500' />
            </button>
          </div>
          {/* Campo de búsqueda */}
          <div className='flex gap-2'>
            <div className='relative flex-1'>
              <Search
                size={15}
                className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
              />
              <input
                ref={inputRef}
                type='text'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
                placeholder='Buscar video...'
                className='w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100'
              />
            </div>
            <button
              onClick={() => doSearch(query)}
              disabled={loading}
              className='px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50'
              style={{ background: 'var(--purple-600)' }}>
              {loading ? (
                <div
                  className='w-4 h-4 border-2 rounded-full animate-spin'
                  style={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                  }}
                />
              ) : (
                'Buscar'
              )}
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div className='flex-1 overflow-y-auto px-4 py-3'>
          {error && (
            <p className='text-sm text-red-500 text-center py-6'>{error}</p>
          )}
          {!loading && !error && results.length === 0 && (
            <p className='text-sm text-gray-400 text-center py-10'>
              {query ? 'Sin resultados' : 'Escribí algo para buscar'}
            </p>
          )}
          <div className='space-y-2'>
            {results.map((item) => (
              <button
                key={item.id.videoId}
                onClick={() => handleSelect(item.id.videoId)}
                className='w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-purple-50 active:bg-purple-100 transition-colors text-left'>
                {/* Miniatura */}
                <div
                  className='relative shrink-0 rounded-xl overflow-hidden'
                  style={{ width: 96, height: 54 }}>
                  <Image
                    src={item.snippet.thumbnails.medium.url}
                    alt={item.snippet.title}
                    fill
                    sizes="96px"
                    className='object-cover'
                  />
                  <div className='absolute inset-0 flex items-center justify-center bg-black/20'>
                    <div className='w-7 h-7 rounded-full bg-white/90 flex items-center justify-center'>
                      <Play
                        size={12}
                        className='text-gray-800 ml-0.5'
                        fill='currentColor'
                      />
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium text-gray-900 line-clamp-2 leading-tight'>
                    {item.snippet.title}
                  </p>
                  <p className='text-xs text-gray-400 mt-0.5 truncate'>
                    {item.snippet.channelTitle}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
