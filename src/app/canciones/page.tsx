'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Song, ServiceSong, Service } from '@/types';
import AppShell from '@/components/AppShell';
import { Search, Video, Music2, Clock, Hash } from 'lucide-react';
import { useLoading } from '@/context/LoadingContext';

interface SongWithStats extends Song {
  uses: number;
  lastUsed: string | null;
  topKey: string | null;
}

export default function CancionesPage() {
  const { withLoader } = useLoading();
  const [songs, setSongs] = useState<Song[]>([]);
  const [serviceSongs, setServiceSongs] = useState<
    (ServiceSong & { service?: Service })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    withLoader(async () => {
      setLoading(true);
      const [songsRes, ssRes] = await Promise.all([
        supabase.from('songs').select('*').order('title'),
        supabase
          .from('service_songs')
          .select('*, service:services(date)')
          .order('created_at', { ascending: false }),
      ]);
      setSongs(songsRes.data ?? []);
      setServiceSongs(ssRes.data ?? []);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const songsWithStats = useMemo<SongWithStats[]>(() => {
    return songs.map((song) => {
      const usages = serviceSongs.filter((ss) => ss.song_id === song.id);
      const uses = usages.length;

      // Última vez usada
      const dates = usages
        .map((ss) => ss.service?.date)
        .filter(Boolean)
        .sort()
        .reverse();
      const lastUsed = dates[0] ?? null;

      // Tono más común
      const keyCounts: Record<string, number> = {};
      usages.forEach((ss) => {
        if (ss.key) keyCounts[ss.key] = (keyCounts[ss.key] ?? 0) + 1;
      });
      const topKey =
        Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      return { ...song, uses, lastUsed, topKey };
    });
  }, [songs, serviceSongs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return songsWithStats;
    const q = search.toLowerCase();
    return songsWithStats.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.artist ?? '').toLowerCase().includes(q),
    );
  }, [songsWithStats, search]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => b.uses - a.uses || a.title.localeCompare(b.title),
      ),
    [filtered],
  );

  function formatLastUsed(dateStr: string | null) {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <AppShell>
      <div className='flex flex-col h-full'>
        {/* Header */}
        <div
          style={{ background: 'var(--purple-900)' }}
          className='px-5 pt-5 pb-4 lg:pt-5'>
          <h1 className='text-xl font-bold text-white mb-0.5'>Canciones</h1>
          <p className='text-sm' style={{ color: 'var(--purple-200)' }}>
            {songs.length} canciones en el catálogo
          </p>
        </div>

        {/* Search */}
        <div style={{ background: 'var(--purple-900)' }} className='px-4 pb-4'>
          <div className='relative'>
            <Search
              size={16}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
            />
            <input
              type='text'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Buscar por título o artista...'
              className='w-full pl-9 pr-4 py-2.5 rounded-xl text-sm input-ring'
              style={{
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
              }}
            />
          </div>
        </div>

        {/* Lista */}
        <div
          className='flex-1 overflow-y-auto px-4 py-4 lg:px-6'
          style={{ background: '#F8F7FF' }}>
          {loading ? (
            <div className='flex justify-center py-16'>
              <div
                className='w-6 h-6 border-2 rounded-full animate-spin'
                style={{
                  borderColor: 'var(--purple-100)',
                  borderTopColor: 'var(--purple-600)',
                }}
              />
            </div>
          ) : sorted.length === 0 ? (
            <div className='text-center py-16'>
              <Music2
                size={32}
                className='mx-auto mb-3'
                style={{ color: 'var(--purple-200)' }}
              />
              <p className='text-gray-500 font-medium'>
                {search
                  ? 'Sin resultados para tu búsqueda'
                  : 'El catálogo está vacío'}
              </p>
            </div>
          ) : (
            <div className='space-y-2 fade-in'>
              {sorted.map((song, idx) => (
                <div
                  key={song.id}
                  className='bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3'>
                  {/* Ranking número */}
                  <span
                    className='text-sm font-bold w-6 text-center shrink-0'
                    style={{
                      color:
                        idx < 3 ? 'var(--orange-600)' : 'var(--purple-200)',
                    }}>
                    {idx + 1}
                  </span>

                  {/* Info */}
                  <div className='flex-1 min-w-0'>
                    <p className='font-semibold text-sm text-gray-900 truncate'>
                      {song.title}
                    </p>
                    {song.artist && (
                      <p className='text-xs text-gray-400 truncate'>
                        {song.artist}
                      </p>
                    )}
                    <div className='flex items-center gap-3 mt-1.5 flex-wrap'>
                      {/* Veces usada */}
                      <span className='flex items-center gap-1 text-xs text-gray-500'>
                        <Hash size={11} />
                        {song.uses === 0
                          ? 'Nunca usada'
                          : `${song.uses} ${song.uses !== 1 ? 'veces' : 'vez'}`}
                      </span>
                      {/* Última vez */}
                      {song.lastUsed && (
                        <span className='flex items-center gap-1 text-xs text-gray-400'>
                          <Clock size={11} />
                          {formatLastUsed(song.lastUsed)}
                        </span>
                      )}
                      {/* Tono más común */}
                      {song.topKey && (
                        <span
                          className='text-xs font-bold px-2 py-0.5 rounded-full'
                          style={{
                            background: 'var(--orange-50)',
                            color: 'var(--orange-600)',
                          }}>
                          {song.topKey}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* YouTube */}
                  {song.youtube_url && (
                    <a
                      href={song.youtube_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='w-8 h-8 rounded-xl flex items-center justify-center shrink-0'
                      style={{ background: '#FEE2E2' }}
                      title='Ver en YouTube'>
                      <Video size={14} style={{ color: '#DC2626' }} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className='h-4' />
        </div>
      </div>
    </AppShell>
  );
}
