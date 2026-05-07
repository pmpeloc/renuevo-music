'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import {
  Service,
  ServiceMember,
  ServiceSong,
  Profile,
  MemberRole,
  ServiceType,
  SERVICE_LABELS,
  ROLE_LABELS,
} from '@/types';
import { formatDate } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import AddSongModal from '@/components/AddSongModal';
import {
  ChevronLeft,
  Plus,
  UserPlus,
  Trash2,
  Video,
  Music2,
  Pencil,
} from 'lucide-react';
import { extractYoutubeId } from '@/lib/utils';

// ============================================================
// TIPOS LOCALES
// ============================================================
type DirectorSection = {
  role: 'director_alabanzas' | 'director_adoraciones';
  member: ServiceMember;
  songs: ServiceSong[];
};

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, loading: profileLoading } = useActiveProfile();

  const [service, setService] = useState<Service | null>(null);
  const [members, setMembers] = useState<ServiceMember[]>([]);
  const [songs, setSongs] = useState<ServiceSong[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddSong, setShowAddSong] = useState(false);
  const [editingSong, setEditingSong] = useState<ServiceSong | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningRole, setAssigningRole] = useState<MemberRole>('coro');

  // ── Cargar datos ──
  const loadData = useCallback(async () => {
    setLoading(true);
    const [svcRes, membersRes, songsRes, profilesRes] = await Promise.all([
      supabase.from('services').select('*').eq('id', id).single(),
      supabase
        .from('service_members')
        .select('*, profile:profiles(*)')
        .eq('service_id', id),
      supabase
        .from('service_songs')
        .select('*, song:songs(*), profile:profiles(*)')
        .eq('service_id', id)
        .order('order_index'),
      supabase.from('profiles').select('*').order('name'),
    ]);
    setService(svcRes.data);
    setMembers(membersRes.data ?? []);
    setSongs(songsRes.data ?? []);
    setAllProfiles(profilesRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // ── Supabase Realtime ──
  useEffect(() => {
    const channel = supabase
      .channel(`service-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_members',
          filter: `service_id=eq.${id}`,
        },
        () => loadData(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_songs',
          filter: `service_id=eq.${id}`,
        },
        () => loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadData]);

  // ── Asignar miembro ──
  async function assignMember(profileId: string, role: MemberRole) {
    await supabase
      .from('service_members')
      .insert({ service_id: id, profile_id: profileId, role })
      .select();
    setShowAssignModal(false);
    loadData();
    // Notificar
    await notifyTeam(`${profile?.name} asignó un miembro al servicio`);
  }

  async function removeMember(memberId: string) {
    await supabase.from('service_members').delete().eq('id', memberId);
    loadData();
  }

  // ── Eliminar canción ──
  async function removeSong(songId: string) {
    await supabase.from('service_songs').delete().eq('id', songId);
    loadData();
    await notifyTeam(`${profile?.name} actualizó la lista de canciones`);
  }

  // ── Push notification helper ──
  async function notifyTeam(message: string) {
    try {
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Renuevo — Actualización',
          body: message,
          url: `/service/${id}`,
          excludeProfileId: profile?.id,
        }),
      });
    } catch {
      /* silencioso */
    }
  }

  // ── Secciones de directores ──
  const directors = members.filter(
    (m) => m.role === 'director_alabanzas' || m.role === 'director_adoraciones',
  ) as (ServiceMember & {
    role: 'director_alabanzas' | 'director_adoraciones';
  })[];

  const coro = members.filter((m) => m.role === 'coro');

  const directorSections: DirectorSection[] = directors.map((m) => ({
    role: m.role,
    member: m,
    songs: songs.filter((s) => s.profile_id === m.profile_id),
  }));

  // Si el usuario activo es director, mostrar SU sección primero
  const sortedSections = [...directorSections].sort((a, b) => {
    if (a.member.profile_id === profile?.id) return -1;
    if (b.member.profile_id === profile?.id) return 1;
    return 0;
  });

  // ── Perfis aún no asignados ──
  function getAvailableProfiles(role: MemberRole) {
    const assignedIds = members
      .filter((m) => m.role === role)
      .map((m) => m.profile_id);
    return allProfiles.filter((p) => !assignedIds.includes(p.id));
  }

  if (profileLoading || loading) {
    return (
      <div className='h-full flex items-center justify-center'>
        <div
          className='w-6 h-6 border-2 rounded-full animate-spin'
          style={{
            borderColor: 'var(--purple-100)',
            borderTopColor: 'var(--purple-600)',
          }}
        />
      </div>
    );
  }

  if (!service || !profile) return null;

  const serviceDate = new Date(service.date + 'T12:00:00');
  const dateFormatted = formatDate(serviceDate);
  const label = SERVICE_LABELS[service.type as ServiceType];

  return (
    <div className='flex flex-col h-full bg-white'>
      {/* ── HEADER OSCURO ── */}
      <div
        className='px-4 pt-12 pb-5'
        style={{ background: 'var(--purple-900)' }}>
        <button
          onClick={() => router.back()}
          className='flex items-center gap-1 mb-3'
          style={{ color: 'var(--purple-200)' }}>
          <ChevronLeft size={18} />
          <span className='text-sm capitalize'>{dateFormatted}</span>
        </button>
        <h1 className='text-2xl font-semibold text-white'>{label}</h1>
      </div>

      {/* ── CONTENIDO SCROLLEABLE ── */}
      <div className='flex-1 overflow-y-auto bg-gray-50'>
        {/* ── SECCIÓN EQUIPO ── */}
        <div className='bg-white mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm'>
          <div className='px-4 py-3 border-b border-gray-50 flex items-center justify-between'>
            <p className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>
              Equipo
            </p>
            <button
              onClick={() => {
                setAssigningRole('director_alabanzas');
                setShowAssignModal(true);
              }}
              className='flex items-center gap-1 text-xs font-medium'
              style={{ color: 'var(--purple-600)' }}>
              <UserPlus size={13} /> Asignar
            </button>
          </div>

          {/* Directores */}
          {directors.length === 0 ? (
            <div className='px-4 py-4'>
              <p className='text-sm text-gray-300 italic'>
                Sin directores asignados
              </p>
            </div>
          ) : (
            <div className='divide-y divide-gray-50'>
              {directors.map((m) => (
                <div key={m.id} className='px-4 py-3 flex items-center gap-3'>
                  {m.profile && <Avatar profile={m.profile} size='md' />}
                  <div className='flex-1 min-w-0'>
                    <p className='font-medium text-sm text-gray-900'>
                      {m.profile?.name}
                    </p>
                    <span
                      className='text-xs font-medium px-2 py-0.5 rounded-full'
                      style={{
                        background: 'var(--purple-50)',
                        color: 'var(--purple-800)',
                      }}>
                      {ROLE_LABELS[m.role]}
                    </span>
                  </div>
                  <button
                    onClick={() => removeMember(m.id)}
                    className='w-7 h-7 rounded-full bg-red-50 flex items-center justify-center'>
                    <Trash2 size={13} className='text-red-400' />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Coro */}
          {coro.length > 0 && (
            <div className='px-4 py-3 border-t border-gray-50 flex items-center gap-2 flex-wrap'>
              <p className='text-xs text-gray-400 mr-1'>Coro:</p>
              {coro.map((m) =>
                m.profile ? (
                  <div key={m.id} className='flex items-center gap-1'>
                    <Avatar profile={m.profile} size='sm' />
                    <button onClick={() => removeMember(m.id)}>
                      <X size={12} className='text-gray-300' />
                    </button>
                  </div>
                ) : null,
              )}
              <button
                onClick={() => {
                  setAssigningRole('coro');
                  setShowAssignModal(true);
                }}
                className='w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center'>
                <Plus size={13} className='text-gray-400' />
              </button>
            </div>
          )}
          {coro.length === 0 && (
            <div className='px-4 py-2 border-t border-gray-50 flex items-center gap-2'>
              <p className='text-xs text-gray-300 italic flex-1'>
                Sin coro asignado
              </p>
              <button
                onClick={() => {
                  setAssigningRole('coro');
                  setShowAssignModal(true);
                }}
                className='text-xs font-medium'
                style={{ color: 'var(--purple-600)' }}>
                + Agregar
              </button>
            </div>
          )}
        </div>

        {/* ── SECCIONES DE CANCIONES ── */}
        {sortedSections.map(({ role, member, songs: sectionSongs }) => {
          const isMe = member.profile_id === profile.id;
          const roleLabel = ROLE_LABELS[role];
          const directorName = member.profile?.name?.split(' ')[0] ?? '';

          return (
            <div
              key={member.id}
              className='bg-white mx-4 mt-3 rounded-2xl overflow-hidden shadow-sm'>
              <div className='px-4 py-3 border-b border-gray-50 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  {member.profile && (
                    <Avatar profile={member.profile} size='sm' />
                  )}
                  <div>
                    <p className='text-sm font-semibold text-gray-900'>
                      {directorName}
                      {isMe ? ' (vos)' : ''}
                    </p>
                    <p className='text-xs text-gray-400'>{roleLabel}</p>
                  </div>
                </div>
                {isMe && (
                  <button
                    onClick={() => setShowAddSong(true)}
                    className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-medium'
                    style={{ background: 'var(--purple-600)' }}>
                    <Plus size={13} /> Agregar
                  </button>
                )}
              </div>

              {sectionSongs.length === 0 ? (
                <div className='px-4 py-6 text-center'>
                  <Music2 size={24} className='text-gray-200 mx-auto mb-2' />
                  <p className='text-sm text-gray-300'>
                    {isMe ? 'Aún no cargaste canciones' : 'Sin canciones aún'}
                  </p>
                </div>
              ) : (
                <div className='divide-y divide-gray-50'>
                  {sectionSongs.map((ss, idx) => {
                    const ytId = ss.song?.youtube_url
                      ? extractYoutubeId(ss.song.youtube_url)
                      : null;
                    return (
                      <div
                        key={ss.id}
                        className='px-4 py-3 flex items-center gap-3'>
                        {/* Orden */}
                        <span className='text-sm font-medium text-gray-300 w-5 text-center shrink-0'>
                          {idx + 1}
                        </span>
                        {/* Info */}
                        <div className='flex-1 min-w-0'>
                          <p className='font-medium text-sm text-gray-900 truncate'>
                            {ss.song?.title}
                          </p>
                          {ss.song?.artist && (
                            <p className='text-xs text-gray-400 truncate'>
                              {ss.song.artist}
                            </p>
                          )}
                          {/* Tono */}
                          {(ss.key || ss.starts_in) && (
                            <div className='flex items-center gap-2 mt-1'>
                              {ss.key && (
                                <span
                                  className='text-xs font-semibold px-2 py-0.5 rounded-full'
                                  style={{
                                    background: 'var(--purple-50)',
                                    color: 'var(--purple-800)',
                                  }}>
                                  {ss.key}
                                </span>
                              )}
                              {ss.starts_in && (
                                <span className='text-xs text-gray-400'>
                                  Comienza en {ss.starts_in}
                                </span>
                              )}
                            </div>
                          )}
                          {ss.notes && (
                            <p className='text-xs text-gray-400 italic mt-0.5'>
                              {ss.notes}
                            </p>
                          )}
                        </div>
                        {/* Acciones */}
                        <div className='flex items-center gap-1 shrink-0'>
                          {ytId && (
                            <a
                              href={ss.song?.youtube_url ?? '#'}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center'>
                              <Video size={14} className='text-red-500' />
                            </a>
                          )}
                          {isMe && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingSong(ss);
                                  setShowAddSong(true);
                                }}
                                className='w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center'>
                                <Pencil size={13} className='text-gray-400' />
                              </button>
                              <button
                                onClick={() => removeSong(ss.id)}
                                className='w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center'>
                                <Trash2 size={13} className='text-red-400' />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className='h-10' />
      </div>

      {/* ── MODAL ASIGNAR ── */}
      {showAssignModal && (
        <div
          className='fixed inset-0 z-50 flex flex-col justify-end'
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAssignModal(false);
          }}>
          <div className='bg-white rounded-t-3xl p-5 slide-up max-h-[75vh] overflow-y-auto'>
            <div className='w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4' />
            <h3 className='font-semibold text-base mb-4'>
              Asignar al servicio
            </h3>

            {/* Selección de rol */}
            <div className='flex gap-2 mb-4'>
              {(
                [
                  'director_alabanzas',
                  'director_adoraciones',
                  'coro',
                ] as MemberRole[]
              ).map((r) => (
                <button
                  key={r}
                  onClick={() => setAssigningRole(r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    assigningRole === r
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                  style={
                    assigningRole === r
                      ? { background: 'var(--purple-600)' }
                      : undefined
                  }>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>

            <div className='space-y-2'>
              {getAvailableProfiles(assigningRole).map((p) => (
                <button
                  key={p.id}
                  onClick={() => assignMember(p.id, assigningRole)}
                  className='w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors'>
                  <Avatar profile={p} size='md' />
                  <p className='font-medium text-sm text-gray-900'>{p.name}</p>
                </button>
              ))}
              {getAvailableProfiles(assigningRole).length === 0 && (
                <p className='text-sm text-gray-400 text-center py-4'>
                  Todos los perfiles ya están asignados en este rol
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AGREGAR CANCIÓN ── */}
      {showAddSong && profile && (
        <AddSongModal
          serviceId={id}
          profileId={profile.id}
          editingSong={editingSong}
          onClose={() => {
            setShowAddSong(false);
            setEditingSong(null);
          }}
          onSaved={(ss) => {
            setSongs((prev) =>
              editingSong
                ? prev.map((s) => (s.id === ss.id ? ss : s))
                : [...prev, ss],
            );
            notifyTeam(`${profile.name} actualizó su lista de canciones`);
          }}
        />
      )}
    </div>
  );
}

// Fix: X needs to be imported
function X({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 16 16'
      fill='none'
      className={className}>
      <line
        x1='3'
        y1='3'
        x2='13'
        y2='13'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <line
        x1='13'
        y1='3'
        x2='3'
        y2='13'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  );
}
