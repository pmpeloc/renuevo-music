/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Song, ServiceSong, Service } from '@/types';
import AppShell from '@/components/AppShell';
import { useLoading } from '@/context/LoadingContext';
import {
  Search,
  Video,
  Music2,
  Clock,
  Hash,
  Pencil,
  X,
  Check,
  Loader2,
  ArrowUpDown,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SongWithStats extends Song {
  uses: number;
  lastUsed: string | null;
  topKey: string | null;
}

type FilterType = 'all' | 'con_video' | 'sin_video' | 'completas' | 'sin_usar';
type SortType = 'az' | 'za' | 'mas_usadas' | 'menos_usadas';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'Todas',
  con_video: 'Con video',
  sin_video: 'Sin video',
  completas: 'Datos completos',
  sin_usar: 'Sin usar',
};

const SORT_LABELS: Record<SortType, string> = {
  az: 'A → Z',
  za: 'Z → A',
  mas_usadas: 'Más usadas',
  menos_usadas: 'Menos usadas',
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditSongModal({
  song,
  onClose,
  onSaved,
}: {
  song: Song;
  onClose: () => void;
  onSaved: (updated: Song) => void;
}) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist ?? '');
  const [ytUrl, setYtUrl] = useState(song.youtube_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    setSaving(true);
    const { data, error: dbErr } = await supabase
      .from('songs')
      .update({
        title: title.trim(),
        artist: artist.trim() || null,
        youtube_url: ytUrl.trim() || null,
      })
      .eq('id', song.id)
      .select()
      .single();
    setSaving(false);
    if (dbErr) {
      setError('Error al guardar. Intentá de nuevo.');
      return;
    }
    onSaved(data as Song);
  }

  return (
    <div
      className='fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center'
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className='bg-white rounded-t-3xl lg:rounded-3xl p-5 lg:max-w-sm lg:w-full mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between mb-4'>
          <h3 className='font-semibold text-gray-900'>Editar canción</h3>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center'>
            <X size={15} className='text-gray-500' />
          </button>
        </div>

        {/* Fields */}
        <div className='space-y-3'>
          <div>
            <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1'>
              Título *
            </label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              className='w-full px-3 py-2.5 rounded-xl border text-sm input-ring'
              style={{ borderColor: '#E5E7EB' }}
              placeholder='Nombre de la canción'
            />
          </div>
          <div>
            <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1'>
              Artista / Autor
            </label>
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className='w-full px-3 py-2.5 rounded-xl border text-sm input-ring'
              style={{ borderColor: '#E5E7EB' }}
              placeholder='Ej: Elevation Worship'
            />
          </div>
          <div>
            <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1'>
              Video de referencia (YouTube)
            </label>
            <input
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              className='w-full px-3 py-2.5 rounded-xl border text-sm input-ring'
              style={{ borderColor: '#E5E7EB' }}
              placeholder='https://youtube.com/...'
              type='url'
              inputMode='url'
            />
          </div>
          {error && <p className='text-xs text-red-500'>{error}</p>}
        </div>

        {/* Actions */}
        <div className='flex gap-2 mt-5'>
          <button
            onClick={onClose}
            className='flex-1 py-3 rounded-2xl text-sm font-medium text-gray-600'
            style={{ background: '#F3F4F6' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className='flex-1 py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2'
            style={{
              background: saving ? 'var(--purple-200)' : 'var(--purple-600)',
            }}>
            {saving ? (
              <>
                <Loader2 size={15} className='animate-spin' /> Guardando...
              </>
            ) : (
              <>
                <Check size={15} /> Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CancionesPage() {
  const { withLoader } = useLoading();

  const [songs, setSongs] = useState<Song[]>([]);
  const [serviceSongs, setServiceSongs] = useState<
    (ServiceSong & { service?: Service })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeSort, setActiveSort] = useState<SortType>('az');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

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

  // ── Compute stats ──────────────────────────────────────────────────────────

  const songsWithStats = useMemo<SongWithStats[]>(() => {
    return songs.map((song) => {
      const usages = serviceSongs.filter((ss) => ss.song_id === song.id);
      const uses = usages.length;
      const dates = usages
        .map((ss) => (ss.service as any)?.date)
        .filter(Boolean)
        .sort()
        .reverse();
      const lastUsed = dates[0] ?? null;
      const keyCounts: Record<string, number> = {};
      usages.forEach((ss) => {
        if (ss.key) keyCounts[ss.key] = (keyCounts[ss.key] ?? 0) + 1;
      });
      const topKey =
        Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return { ...song, uses, lastUsed, topKey };
    });
  }, [songs, serviceSongs]);

  // ── Filter ────────────────────────────────────────────────────────────────

  const afterFilter = useMemo(() => {
    let result = songsWithStats;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.artist ?? '').toLowerCase().includes(q),
      );
    }

    // Active filter chip
    switch (activeFilter) {
      case 'con_video':
        result = result.filter((s) => !!s.youtube_url);
        break;
      case 'sin_video':
        result = result.filter((s) => !s.youtube_url);
        break;
      case 'completas':
        result = result.filter((s) => !!s.artist && !!s.youtube_url);
        break;
      case 'sin_usar':
        result = result.filter((s) => s.uses === 0);
        break;
    }

    return result;
  }, [songsWithStats, search, activeFilter]);

  // ── Sort ──────────────────────────────────────────────────────────────────

  const sorted = useMemo(() => {
    const arr = [...afterFilter];
    switch (activeSort) {
      case 'az':
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      case 'za':
        return arr.sort((a, b) => b.title.localeCompare(a.title));
      case 'mas_usadas':
        return arr.sort(
          (a, b) => b.uses - a.uses || a.title.localeCompare(b.title),
        );
      case 'menos_usadas':
        return arr.sort(
          (a, b) => a.uses - b.uses || a.title.localeCompare(b.title),
        );
    }
  }, [afterFilter, activeSort]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function formatLastUsed(dateStr: string | null) {
    if (!dateStr) return null;
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function handleSaved(updated: Song) {
    setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditingSong(null);
  }

  // ── Counts for filter badges ──────────────────────────────────────────────

  const filterCounts = useMemo<Record<FilterType, number>>(() => {
    const base = search.trim()
      ? songsWithStats.filter(
          (s) =>
            s.title.toLowerCase().includes(search.toLowerCase()) ||
            (s.artist ?? '').toLowerCase().includes(search.toLowerCase()),
        )
      : songsWithStats;
    return {
      all: base.length,
      con_video: base.filter((s) => !!s.youtube_url).length,
      sin_video: base.filter((s) => !s.youtube_url).length,
      completas: base.filter((s) => !!s.artist && !!s.youtube_url).length,
      sin_usar: base.filter((s) => s.uses === 0).length,
    };
  }, [songsWithStats, search]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className='flex flex-col h-full'>
        {/* ── HEADER ── */}
        <div
          style={{ background: 'var(--purple-900)' }}
          className='px-5 pt-5 pb-3 lg:pt-5'>
          <h1 className='text-xl font-bold text-white mb-0.5'>Canciones</h1>
          <p className='text-sm' style={{ color: 'var(--purple-200)' }}>
            {songs.length} canción{songs.length !== 1 ? 'es' : ''} en el
            catálogo
          </p>
        </div>

        {/* ── SEARCH + SORT ── */}
        <div style={{ background: 'var(--purple-900)' }} className='px-4 pb-3'>
          <div className='flex gap-2'>
            <div className='relative flex-1'>
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
            {/* Sort button */}
            <div className='relative'>
              <button
                onClick={() => setShowSortMenu((v) => !v)}
                className='h-full px-3 rounded-xl flex items-center gap-1.5'
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
                <ArrowUpDown size={14} className='text-white' />
                <span className='text-xs text-white font-medium hidden sm:inline'>
                  {SORT_LABELS[activeSort]}
                </span>
              </button>
              {/* Sort dropdown */}
              {showSortMenu && (
                <div
                  className='absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl z-30 overflow-hidden'
                  style={{ minWidth: 160 }}>
                  {(Object.keys(SORT_LABELS) as SortType[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setActiveSort(s);
                        setShowSortMenu(false);
                      }}
                      className='w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-gray-50'
                      style={{
                        color:
                          activeSort === s ? 'var(--purple-600)' : '#374151',
                      }}>
                      {activeSort === s && <Check size={13} />}
                      <span
                        className={
                          activeSort === s ? 'font-semibold ml-0' : 'ml-5'
                        }>
                        {SORT_LABELS[s]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── FILTER CHIPS ── */}
        <div style={{ background: 'var(--purple-900)' }} className='pb-3'>
          <div className='flex gap-2 px-4 overflow-x-auto no-scrollbar'>
            {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => {
              const isActive = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className='shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all'
                  style={
                    isActive
                      ? { background: 'var(--orange-600)', color: '#fff' }
                      : {
                          background: 'rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.7)',
                        }
                  }>
                  {FILTER_LABELS[f]}
                  {f !== 'all' && (
                    <span className='ml-1.5 opacity-75'>{filterCounts[f]}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── LIST ── */}
        <div
          className='flex-1 overflow-y-auto px-4 py-4 lg:px-6'
          style={{ background: '#F8F7FF' }}
          onClick={() => showSortMenu && setShowSortMenu(false)}>
          {loading ? null : sorted.length === 0 ? (
            <div className='text-center py-16'>
              <Music2
                size={32}
                className='mx-auto mb-3'
                style={{ color: 'var(--purple-200)' }}
              />
              <p className='text-gray-500 font-medium'>
                {search || activeFilter !== 'all'
                  ? 'Sin resultados para los filtros aplicados'
                  : 'El catálogo está vacío'}
              </p>
              {(search || activeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setActiveFilter('all');
                  }}
                  className='mt-3 text-sm underline'
                  style={{ color: 'var(--purple-600)' }}>
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className='space-y-2 fade-in'>
              {sorted.map((song, idx) => (
                <button
                  key={song.id}
                  onClick={() => setEditingSong(song)}
                  className='w-full bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 text-left hover:shadow-md active:scale-[0.99] transition-all'>
                  {/* Index / ranking */}
                  <span
                    className='text-xs font-bold w-6 text-center shrink-0'
                    style={{
                      color:
                        activeSort === 'mas_usadas' && idx < 3
                          ? 'var(--orange-600)'
                          : 'var(--purple-200)',
                    }}>
                    {idx + 1}
                  </span>

                  {/* Info */}
                  <div className='flex-1 min-w-0'>
                    <p className='font-semibold text-sm text-gray-900 truncate'>
                      {song.title}
                    </p>
                    {song.artist ? (
                      <p className='text-xs text-gray-400 truncate'>
                        {song.artist}
                      </p>
                    ) : (
                      <p
                        className='text-xs italic'
                        style={{ color: 'var(--purple-200)' }}>
                        Sin artista
                      </p>
                    )}
                    <div className='flex items-center gap-3 mt-1.5 flex-wrap'>
                      <span className='flex items-center gap-1 text-xs text-gray-500'>
                        <Hash size={11} />
                        {song.uses === 0
                          ? 'Nunca usada'
                          : `${song.uses} ${song.uses !== 1 ? 'veces' : 'vez'}`}
                      </span>
                      {song.lastUsed && (
                        <span className='flex items-center gap-1 text-xs text-gray-400'>
                          <Clock size={11} />
                          {formatLastUsed(song.lastUsed)}
                        </span>
                      )}
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

                  {/* Right side: YouTube + edit hint */}
                  <div className='flex items-center gap-2 shrink-0'>
                    {song.youtube_url ? (
                      <a
                        href={song.youtube_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        onClick={(e) => e.stopPropagation()}
                        className='w-8 h-8 rounded-xl flex items-center justify-center'
                        style={{ background: '#FEE2E2' }}
                        title='Ver en YouTube'>
                        <Video size={14} style={{ color: '#DC2626' }} />
                      </a>
                    ) : (
                      <div
                        className='w-8 h-8 rounded-xl flex items-center justify-center'
                        style={{ background: 'var(--purple-50)' }}
                        title='Sin video'>
                        <Video
                          size={14}
                          style={{ color: 'var(--purple-200)' }}
                        />
                      </div>
                    )}
                    <div
                      className='w-8 h-8 rounded-xl flex items-center justify-center'
                      style={{ background: 'var(--purple-50)' }}>
                      <Pencil
                        size={13}
                        style={{ color: 'var(--purple-600)' }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className='h-4' />
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      {editingSong && (
        <EditSongModal
          song={editingSong}
          onClose={() => setEditingSong(null)}
          onSaved={handleSaved}
        />
      )}
    </AppShell>
  );
}
