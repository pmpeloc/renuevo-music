'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Song, SongKeyHistory, MusicalKey, ServiceSong } from '@/types';
import { extractYoutubeId, getYoutubeThumbnail } from '@/lib/utils';
import KeySelector from './KeySelector';
import { X, Search, Video, Info } from 'lucide-react';
import YouTubeSearchModal from './YouTubeSearchModal';
import Image from 'next/image';

interface AddSongModalProps {
  serviceId: string;
  profileId: string;
  onClose: () => void;
  onSaved: (ss: ServiceSong) => void;
  editingSong?: ServiceSong | null;
}

export default function AddSongModal({
  serviceId,
  profileId,
  onClose,
  onSaved,
  editingSong,
}: AddSongModalProps) {
  // Búsqueda en catálogo
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searching, setSearching] = useState(false);

  // Campos de nueva canción
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newYoutube, setNewYoutube] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  // YouTube de canción existente (catálogo o edición)
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Campos editables de título/artista en modo edición
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');

  // Tono
  const [selectedKey, setSelectedKey] = useState<MusicalKey | null>(null);
  const [startsIn, setStartsIn] = useState<MusicalKey | null>(null);
  const [notes, setNotes] = useState('');
  const [keyHistory, setKeyHistory] = useState<SongKeyHistory | null>(null);

  const [saving, setSaving] = useState(false);
  const [showYoutubeSearch, setShowYoutubeSearch] = useState(false);

  // Inicializar si estamos editando
  useEffect(() => {
    if (editingSong) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedKey(editingSong.key);
      setStartsIn(editingSong.starts_in);
      setNotes(editingSong.notes ?? '');
      if (editingSong.song) {
        setSelectedSong(editingSong.song);
        setYoutubeUrl(editingSong.song.youtube_url ?? '');
        setEditTitle(editingSong.song.title ?? '');
        setEditArtist(editingSong.song.artist ?? '');
      }
    }
  }, [editingSong]);

  // Buscar en catálogo
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCatalogResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from('songs')
        .select('*')
        .ilike('title', `%${searchQuery}%`)
        .limit(8);
      setCatalogResults(data ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cargar historial de tono cuando se selecciona una canción
  useEffect(() => {
    if (!selectedSong) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKeyHistory(null);
      return;
    }
    supabase
      .from('song_key_history')
      .select('*')
      .eq('profile_id', profileId)
      .eq('song_id', selectedSong.id)
      .maybeSingle()
      .then(({ data }) => {
        setKeyHistory(data);
        // Pre-setear tono del historial si no hay ya un valor
        if (data && !editingSong) {
          setSelectedKey(data.key);
          setStartsIn(data.starts_in);
        }
      });
  }, [selectedSong, profileId, editingSong]);

  function selectFromCatalog(song: Song) {
    setSelectedSong(song);
    setYoutubeUrl(song.youtube_url ?? '');
    setSearchQuery('');
    setCatalogResults([]);
    setShowNewForm(false);
  }

  async function saveNewSong(): Promise<Song | null> {
    if (!newTitle.trim()) return null;
    const ytId = extractYoutubeId(newYoutube);
    const { data, error } = await supabase
      .from('songs')
      .insert({
        title: newTitle.trim(),
        artist: newArtist.trim() || null,
        youtube_url: newYoutube.trim() || null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return data;
    void ytId; // usado externamente si se necesita
  }

  async function handleSave() {
    setSaving(true);
    let song = selectedSong;

    if (!song && showNewForm) {
      song = await saveNewSong();
      if (!song) {
        setSaving(false);
        return;
      }
      setSelectedSong(song);
    }

    if (!song) {
      setSaving(false);
      return;
    }

    // Actualizar campos del catálogo si cambiaron (título, artista, youtube)
    const cleanUrl = youtubeUrl.trim() || null;
    const cleanTitle = editingSong ? editTitle.trim() : song.title;
    const cleanArtist = editingSong ? (editArtist.trim() || null) : (song.artist ?? null);
    const needsCatalogUpdate =
      cleanUrl !== (song.youtube_url ?? null) ||
      (editingSong && (cleanTitle !== song.title || cleanArtist !== (song.artist ?? null)));
    if (needsCatalogUpdate) {
      const updatePayload: Record<string, string | null> = { youtube_url: cleanUrl };
      if (editingSong) {
        updatePayload.title = cleanTitle || song.title;
        updatePayload.artist = cleanArtist;
      }
      await supabase
        .from('songs')
        .update(updatePayload)
        .eq('id', song.id);
    }

    let result;
    if (editingSong) {
      const { data } = await supabase
        .from('service_songs')
        .update({ key: selectedKey, starts_in: startsIn, notes: notes || null })
        .eq('id', editingSong.id)
        .select('*, song:songs(*), profile:profiles(*)')
        .single();
      result = data;
    } else {
      // Obtener el próximo order_index
      const { data: existing } = await supabase
        .from('service_songs')
        .select('order_index')
        .eq('service_id', serviceId)
        .eq('profile_id', profileId)
        .order('order_index', { ascending: false })
        .limit(1);
      const nextIndex =
        existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

      const { data } = await supabase
        .from('service_songs')
        .insert({
          service_id: serviceId,
          profile_id: profileId,
          song_id: song.id,
          order_index: nextIndex,
          key: selectedKey,
          starts_in: startsIn,
          notes: notes || null,
        })
        .select('*, song:songs(*), profile:profiles(*)')
        .single();
      result = data;
    }

    if (result) onSaved(result);
    setSaving(false);
    onClose();
  }

  const ytId = youtubeUrl
    ? extractYoutubeId(youtubeUrl)
    : selectedSong?.youtube_url
      ? extractYoutubeId(selectedSong.youtube_url)
      : null;
  const canSave = !!(selectedSong || (showNewForm && newTitle.trim()));

  // Título para la búsqueda de YouTube
  const youtubeSearchQuery = selectedSong?.title ?? newTitle;

  return (
    <>
      <div
        className='fixed inset-0 z-50 flex flex-col justify-end'
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}>
        <div className='bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto slide-up'>
          {/* Handle + header */}
          <div className='sticky top-0 bg-white pt-4 px-5 pb-3 border-b border-gray-50 z-10'>
            <div className='w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4' />
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold'>
                {editingSong ? 'Editar canción' : 'Agregar canción'}
              </h2>
              <button
                onClick={onClose}
                className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center'>
                <X size={16} className='text-gray-500' />
              </button>
            </div>
          </div>

          <div className='px-5 py-4 space-y-5'>
            {/* ── BUSCAR EN CATÁLOGO ── */}
            {!editingSong && (
              <div>
                <label className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block'>
                  Buscar en el catálogo
                </label>
                <div className='relative'>
                  <Search
                    size={16}
                    className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
                  />
                  <input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Buscar canción...'
                    className='w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none input-ring'
                  />
                  {searching && (
                    <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                      <div
                        className='w-4 h-4 border-2 rounded-full animate-spin'
                        style={{
                          borderColor: 'var(--purple-100)',
                          borderTopColor: 'var(--purple-600)',
                        }}
                      />
                    </div>
                  )}
                </div>
                {catalogResults.length > 0 && (
                  <div className='mt-2 border border-gray-100 rounded-xl overflow-hidden'>
                    {catalogResults.map((song) => (
                      <button
                        key={song.id}
                        onClick={() => selectFromCatalog(song)}
                        className='w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center gap-3'>
                        <div>
                          <p className='font-medium text-sm text-gray-900'>
                            {song.title}
                          </p>
                          {song.artist && (
                            <p className='text-xs text-gray-400'>
                              {song.artist}
                            </p>
                          )}
                        </div>
                        {song.youtube_url && (
                          <Video
                            size={14}
                            className='text-red-400 ml-auto shrink-0'
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {!showNewForm && (
                  <button
                    onClick={() => {
                      setShowNewForm(true);
                      setSearchQuery('');
                      setCatalogResults([]);
                    }}
                    className='mt-2 text-sm font-medium w-full text-center py-2'
                    style={{ color: 'var(--purple-600)' }}>
                    + Crear canción nueva
                  </button>
                )}
              </div>
            )}

            {/* ── CANCIÓN SELECCIONADA ── */}
            {selectedSong && (
              <div className='space-y-3'>
                <div
                  className='flex items-center gap-3 p-3 rounded-xl'
                  style={{ background: 'var(--purple-50)' }}>
                  {ytId && (
                    <Image
                      src={getYoutubeThumbnail(ytId)}
                      alt={selectedSong.title}
                      width={56}
                      height={40}
                      className='rounded-lg object-cover shrink-0'
                      style={{ width: 56, height: 40 }}
                    />
                  )}
                  <div className='flex-1 min-w-0'>
                    {editingSong ? (
                      <div className='space-y-1'>
                        <input
                          type='text'
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder='Título de la canción'
                          className='w-full px-2 py-1 rounded-lg border border-gray-200 text-sm font-semibold focus:outline-none input-ring'
                          style={{ color: 'var(--purple-800)' }}
                        />
                        <input
                          type='text'
                          value={editArtist}
                          onChange={(e) => setEditArtist(e.target.value)}
                          placeholder='Artista (opcional)'
                          className='w-full px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none input-ring'
                          style={{ color: 'var(--purple-600)' }}
                        />
                      </div>
                    ) : (
                      <>
                        <p
                          className='font-semibold text-sm'
                          style={{ color: 'var(--purple-800)' }}>
                          {selectedSong.title}
                        </p>
                        {selectedSong.artist && (
                          <p
                            className='text-xs'
                            style={{ color: 'var(--purple-600)' }}>
                            {selectedSong.artist}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {!editingSong && (
                    <button
                      onClick={() => {
                        setSelectedSong(null);
                        setYoutubeUrl('');
                      }}
                      className='shrink-0'>
                      <X size={16} style={{ color: 'var(--purple-600)' }} />
                    </button>
                  )}
                </div>

                {/* Campo YouTube para canción del catálogo */}
                <div>
                  <label className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block'>
                    Link YouTube (referencia)
                  </label>
                  <div className='flex gap-2'>
                    <input
                      type='url'
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder='https://youtube.com/watch?v=...'
                      className='flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none input-ring'
                    />
                    <button
                      type='button'
                      onClick={() => setShowYoutubeSearch(true)}
                      className='flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-white text-xs font-medium shrink-0'
                      style={{ background: '#FF0000' }}
                      title='Buscar en YouTube'>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>
                    </button>
                  </div>
                  {youtubeUrl && extractYoutubeId(youtubeUrl) && (
                    <div className='mt-2 flex items-center gap-2'>
                      <Image
                        src={getYoutubeThumbnail(extractYoutubeId(youtubeUrl)!)}
                        alt='preview'
                        width={80}
                        height={56}
                        className='rounded-lg object-cover'
                        style={{ width: 80, height: 56 }}
                      />
                      <p className='text-xs text-gray-500'>Vista previa ✓</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── FORM NUEVA CANCIÓN ── */}
            {showNewForm && !selectedSong && (
              <div className='space-y-3 p-4 bg-gray-50 rounded-2xl'>
                <p className='text-sm font-medium text-gray-700'>
                  Nueva canción
                </p>
                <div>
                  <label className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block'>
                    Título *
                  </label>
                  <input
                    type='text'
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder='Nombre de la canción'
                    className='w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none input-ring'
                  />
                </div>
                <div>
                  <label className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block'>
                    Artista
                  </label>
                  <input
                    type='text'
                    value={newArtist}
                    onChange={(e) => setNewArtist(e.target.value)}
                    placeholder='Ej: Elevation Worship'
                    className='w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none input-ring'
                  />
                </div>
                <div>
                  <label className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block'>
                    Link YouTube
                  </label>
                  <div className='flex gap-2'>
                    <input
                      type='url'
                      value={newYoutube}
                      onChange={(e) => setNewYoutube(e.target.value)}
                      placeholder='https://youtube.com/watch?v=...'
                      className='flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none input-ring'
                    />
                    <button
                      type='button'
                      onClick={() => setShowYoutubeSearch(true)}
                      className='flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-white text-xs font-medium shrink-0'
                      style={{ background: '#FF0000' }}
                      title='Buscar en YouTube'>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>
                    </button>
                  </div>
                  {newYoutube && extractYoutubeId(newYoutube) && (
                    <div className='mt-2 flex items-center gap-2'>
                      <Image
                        src={getYoutubeThumbnail(extractYoutubeId(newYoutube)!)}
                        alt='preview'
                        width={80}
                        height={56}
                        className='rounded-lg object-cover'
                        style={{ width: 80, height: 56 }}
                      />
                      <p className='text-xs text-gray-500'>
                        Vista previa detectada ✓
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowNewForm(false)}
                  className='text-xs text-gray-400 underline'>
                  Cancelar
                </button>
              </div>
            )}

            {/* ── TONO ── */}
            {(selectedSong || (showNewForm && newTitle)) && (
              <div className='space-y-3'>
                {keyHistory && (
                  <div className='flex items-start gap-2 p-3 bg-blue-50 rounded-xl'>
                    <Info size={14} className='text-blue-500 shrink-0 mt-0.5' />
                    <p className='text-xs text-blue-700'>
                      La última vez usaste{' '}
                      <strong>{keyHistory.key ?? 'sin tono'}</strong>
                      {keyHistory.starts_in
                        ? ` (comienza en ${keyHistory.starts_in})`
                        : ''}{' '}
                      para esta canción.
                    </p>
                  </div>
                )}
                <KeySelector
                  label='Tono (opcional)'
                  value={selectedKey}
                  onChange={setSelectedKey}
                />
                <KeySelector
                  label='Comienza en (opcional)'
                  value={startsIn}
                  onChange={setStartsIn}
                  hint='Si la intro comienza en un tono diferente'
                />
                <div>
                  <label className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block'>
                    Notas adicionales
                  </label>
                  <input
                    type='text'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder='Ej: tempo lento, a cappella al inicio...'
                    className='w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none input-ring'
                  />
                </div>
              </div>
            )}

            {/* ── GUARDAR ── */}
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              className='w-full py-4 rounded-2xl text-white font-semibold text-base transition-opacity disabled:opacity-40 mb-4'
              style={{ background: 'var(--purple-600)' }}>
              {saving
                ? 'Guardando...'
                : editingSong
                  ? 'Guardar cambios'
                  : 'Agregar a la lista'}
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL BÚSQUEDA YOUTUBE ── */}
      {showYoutubeSearch && (
        <YouTubeSearchModal
          initialQuery={youtubeSearchQuery}
          onSelect={(url) => {
            if (selectedSong) setYoutubeUrl(url);
            else setNewYoutube(url);
          }}
          onClose={() => setShowYoutubeSearch(false)}
        />
      )}
    </>
  );
}
