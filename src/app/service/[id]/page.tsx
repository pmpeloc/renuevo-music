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
import AppShell from '@/components/AppShell';
import {
  ChevronLeft,
  Plus,
  UserPlus,
  Trash2,
  Video,
  Music2,
  Pencil,
  Share2,
  X,
} from 'lucide-react';
import { extractYoutubeId } from '@/lib/utils';

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
  const [targetDirectorProfileId, setTargetDirectorProfileId] = useState<
    string | null
  >(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningRole, setAssigningRole] = useState<MemberRole>('coro');
  const [siblingServices, setSiblingServices] = useState<Service[]>([]);
  const [copying, setCopying] = useState(false);
  const [confirmCopyTarget, setConfirmCopyTarget] = useState<Service | null>(
    null,
  );
  const [confirmWord, setConfirmWord] = useState('');

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

    if (svcRes.data?.date) {
      const { data: siblings } = await supabase
        .from('services')
        .select('*')
        .eq('date', svcRes.data.date)
        .neq('id', id)
        .order('type');
      setSiblingServices(siblings ?? []);
    }
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
    await notifyTeam(`${profile?.name} asignó un miembro al servicio`);
  }

  async function removeMember(memberId: string) {
    await supabase.from('service_members').delete().eq('id', memberId);
    loadData();
  }

  async function removeSong(songId: string) {
    await supabase.from('service_songs').delete().eq('id', songId);
    loadData();
    await notifyTeam(`${profile?.name} actualizó la lista de canciones`);
  }

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

  const sortedSections = [...directorSections].sort((a, b) => {
    if (a.member.profile_id === profile?.id) return -1;
    if (b.member.profile_id === profile?.id) return 1;
    return 0;
  });

  function getAvailableProfiles(role: MemberRole) {
    const assignedIds = members
      .filter((m) => m.role === role)
      .map((m) => m.profile_id);
    return allProfiles.filter((p) => !assignedIds.includes(p.id));
  }

  // ── Copiar lista a servicio hermano ──
  async function copyListToService(targetServiceId: string) {
    if (songs.length === 0) return;
    setCopying(true);
    await supabase
      .from('service_songs')
      .delete()
      .eq('service_id', targetServiceId);
    const { data: targetMembers } = await supabase
      .from('service_members')
      .select('*')
      .eq('service_id', targetServiceId);
    const targetMembersByRole = (targetMembers ?? []).reduce<
      Record<string, string>
    >((acc, m) => {
      acc[m.role] = m.profile_id;
      return acc;
    }, {});
    const sourceMemberRoles = members.reduce<Record<string, string>>(
      (acc, m) => {
        acc[m.profile_id] = m.role;
        return acc;
      },
      {},
    );
    const inserts = songs.map((ss, idx) => {
      const sourceRole = sourceMemberRoles[ss.profile_id] ?? null;
      const targetProfileId =
        sourceRole && targetMembersByRole[sourceRole]
          ? targetMembersByRole[sourceRole]
          : ss.profile_id;
      return {
        service_id: targetServiceId,
        song_id: ss.song_id,
        profile_id: targetProfileId,
        key: ss.key,
        starts_in: ss.starts_in,
        notes: ss.notes,
        order_index: idx,
      };
    });
    await supabase.from('service_songs').insert(inserts);
    setCopying(false);
    await notifyTeam(
      `${profile?.name} copió la lista de canciones a otro servicio`,
    );
  }

  // ── Compartir en WhatsApp ──
  function shareToWhatsApp() {
    const lines: string[] = [];
    const titulo =
      dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
    lines.push(`*${label} — ${titulo}*`);
    lines.push('');
    directors.forEach((m) => {
      lines.push(`*${ROLE_LABELS[m.role]}:* ${m.profile?.name ?? ''}`);
    });
    if (coro.length > 0) {
      const nombres = coro.map((m) => m.profile?.name ?? '').filter(Boolean);
      const listaCoro =
        nombres.length === 1
          ? nombres[0]
          : nombres.slice(0, -1).join(', ') +
            ' y ' +
            nombres[nombres.length - 1];
      lines.push(`*Coro:* ${listaCoro}`);
    }
    lines.push('');
    let songCounter = 1;
    const youtubeLinks: string[] = [];
    sortedSections.forEach(({ member, songs: sectionSongs }) => {
      if (sortedSections.length > 1) {
        lines.push(`*Canciones — ${member.profile?.name?.split(' ')[0]}:*`);
      } else {
        lines.push(`*Canciones:*`);
      }
      if (sectionSongs.length === 0) {
        lines.push('_(sin canciones cargadas)_');
      } else {
        sectionSongs.forEach((ss) => {
          let songLine = `${songCounter}. ${ss.song?.title ?? ''}`;
          if (ss.key) songLine += ` — *${ss.key}*`;
          if (ss.starts_in) songLine += ` _(comienza en ${ss.starts_in})_`;
          if (ss.notes) songLine += `\n   _${ss.notes}_`;
          lines.push(songLine);
          if (ss.song?.youtube_url) youtubeLinks.push(ss.song.youtube_url);
          songCounter++;
        });
      }
      lines.push('');
    });
    if (youtubeLinks.length > 0) {
      lines.push('*Referencias:*');
      youtubeLinks.forEach((url, i) => lines.push(`${i + 1}. ${url}`));
      lines.push('');
    }
    const appUrl = `${window.location.origin}/service/${id}`;
    lines.push(`_Editá el listado: ${appUrl}_`);
    const text = lines.join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  if (profileLoading || loading) {
    return (
      <div
        className='h-full flex items-center justify-center'
        style={{ background: '#F8F7FF' }}>
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
    <AppShell>
      <div className='flex flex-col h-full'>
        {/* ── HEADER ── */}
        <div
          style={{ background: 'var(--purple-900)' }}
          className='px-4 pt-10 pb-5 lg:pt-5'>
          <div className='flex items-center justify-between mb-3'>
            <button
              onClick={() => router.back()}
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium'
              style={{
                color: 'var(--purple-200)',
                background: 'rgba(255,255,255,0.08)',
              }}>
              <ChevronLeft size={16} />
              <span className='capitalize'>{dateFormatted}</span>
            </button>
            <button
              onClick={shareToWhatsApp}
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold'
              style={{ background: '#25D366', color: 'white' }}
              title='Compartir en WhatsApp'>
              <Share2 size={14} />
              <span>Compartir</span>
            </button>
          </div>
          <h1 className='text-2xl font-bold text-white'>{label}</h1>
          <p className='text-sm mt-1' style={{ color: 'var(--purple-200)' }}>
            {members.length} miembro{members.length !== 1 ? 's' : ''} ·{' '}
            {songs.length} canción{songs.length !== 1 ? 'es' : ''}
          </p>
        </div>

        {/* ── CONTENIDO SCROLLEABLE ── */}
        <div
          className='flex-1 overflow-y-auto'
          style={{ background: '#F8F7FF' }}>
          <div className='px-4 py-4 space-y-4 lg:px-6 lg:py-5 lg:max-w-3xl'>
            {/* ── SECCIÓN EQUIPO ── */}
            <div className='bg-white rounded-2xl overflow-hidden shadow-sm'>
              <div
                className='px-4 py-3 flex items-center justify-between'
                style={{ borderBottom: '1px solid #F3F4F6' }}>
                <p
                  className='text-xs font-bold uppercase tracking-wider'
                  style={{ color: 'var(--purple-600)' }}>
                  Equipo
                </p>
                <button
                  onClick={() => {
                    setAssigningRole('director_alabanzas');
                    setShowAssignModal(true);
                  }}
                  className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold'
                  style={{
                    background: 'var(--purple-50)',
                    color: 'var(--purple-600)',
                  }}>
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
                <div>
                  {directors.map((m) => (
                    <div
                      key={m.id}
                      className='px-4 py-3 flex items-center gap-3'
                      style={{ borderBottom: '1px solid #F9F9F9' }}>
                      {m.profile && <Avatar profile={m.profile} size='md' />}
                      <div className='flex-1 min-w-0'>
                        <p className='font-semibold text-sm text-gray-900'>
                          {m.profile?.name}
                        </p>
                        <span
                          className='text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5'
                          style={{
                            background: 'var(--purple-50)',
                            color: 'var(--purple-800)',
                          }}>
                          {ROLE_LABELS[m.role]}
                        </span>
                      </div>
                      <button
                        onClick={() => removeMember(m.id)}
                        className='w-7 h-7 rounded-full flex items-center justify-center'
                        style={{ background: '#FEE2E2' }}>
                        <Trash2 size={13} style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Coro */}
              {coro.length > 0 && (
                <div
                  className='px-4 py-3 flex items-center gap-2 flex-wrap'
                  style={{ borderTop: '1px solid #F3F4F6' }}>
                  <p className='text-xs font-semibold text-gray-400 mr-1'>
                    Coro:
                  </p>
                  {coro.map((m) =>
                    m.profile ? (
                      <div key={m.id} className='flex items-center gap-1'>
                        <Avatar profile={m.profile} size='sm' />
                        <button
                          onClick={() => removeMember(m.id)}
                          className='w-4 h-4 flex items-center justify-center'>
                          <X size={11} className='text-gray-300' />
                        </button>
                      </div>
                    ) : null,
                  )}
                  <button
                    onClick={() => {
                      setAssigningRole('coro');
                      setShowAssignModal(true);
                    }}
                    className='w-7 h-7 rounded-full flex items-center justify-center'
                    style={{ background: 'var(--purple-50)' }}>
                    <Plus size={13} style={{ color: 'var(--purple-600)' }} />
                  </button>
                </div>
              )}
              {coro.length === 0 && (
                <div
                  className='px-4 py-2.5 flex items-center gap-2'
                  style={{ borderTop: '1px solid #F3F4F6' }}>
                  <p className='text-xs text-gray-300 italic flex-1'>
                    Sin coro asignado
                  </p>
                  <button
                    onClick={() => {
                      setAssigningRole('coro');
                      setShowAssignModal(true);
                    }}
                    className='text-xs font-semibold'
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
                  className='bg-white rounded-2xl overflow-hidden shadow-sm'>
                  {/* Header de sección */}
                  <div
                    className='px-4 py-3 flex items-center justify-between'
                    style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <div className='flex items-center gap-2.5'>
                      {member.profile && (
                        <Avatar profile={member.profile} size='sm' />
                      )}
                      <div>
                        <p className='text-sm font-bold text-gray-900'>
                          {directorName}
                          {isMe ? ' (vos)' : ''}
                        </p>
                        <p className='text-xs text-gray-400'>{roleLabel}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setTargetDirectorProfileId(member.profile_id);
                        setShowAddSong(true);
                      }}
                      className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold'
                      style={{ background: 'var(--purple-600)' }}>
                      <Plus size={13} /> Agregar
                    </button>
                  </div>

                  {sectionSongs.length === 0 ? (
                    <div className='px-4 py-8 text-center'>
                      <Music2
                        size={26}
                        className='mx-auto mb-2'
                        style={{ color: 'var(--purple-100)' }}
                      />
                      <p className='text-sm text-gray-300'>
                        {isMe
                          ? 'Aún no cargaste canciones'
                          : 'Sin canciones aún'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      {sectionSongs.map((ss, idx) => {
                        const ytId = ss.song?.youtube_url
                          ? extractYoutubeId(ss.song.youtube_url)
                          : null;
                        return (
                          <div
                            key={ss.id}
                            className='px-4 py-3 flex items-center gap-3'
                            style={{ borderBottom: '1px solid #F9F9F9' }}>
                            {/* Número */}
                            <span
                              className='text-sm font-bold w-5 text-center shrink-0'
                              style={{ color: 'var(--purple-200)' }}>
                              {idx + 1}
                            </span>

                            {/* Info */}
                            <div className='flex-1 min-w-0'>
                              <p className='font-semibold text-sm text-gray-900 truncate'>
                                {ss.song?.title}
                              </p>
                              {ss.song?.artist && (
                                <p className='text-xs text-gray-400 truncate'>
                                  {ss.song.artist}
                                </p>
                              )}
                              {/* Tono + comienza en */}
                              {(ss.key || ss.starts_in) && (
                                <div className='flex items-center gap-2 mt-1 flex-wrap'>
                                  {ss.key && (
                                    <span
                                      className='text-xs font-bold px-2.5 py-0.5 rounded-full'
                                      style={{
                                        background: 'var(--orange-50)',
                                        color: 'var(--orange-600)',
                                      }}>
                                      {ss.key}
                                    </span>
                                  )}
                                  {ss.starts_in && (
                                    <span className='text-xs text-gray-400'>
                                      Comienza en{' '}
                                      <span
                                        className='font-semibold'
                                        style={{ color: 'var(--purple-600)' }}>
                                        {ss.starts_in}
                                      </span>
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
                            <div className='flex items-center gap-1.5 shrink-0'>
                              {ytId && (
                                <a
                                  href={ss.song?.youtube_url ?? '#'}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='w-8 h-8 rounded-xl flex items-center justify-center'
                                  style={{ background: '#FEE2E2' }}
                                  title='Ver referencia en YouTube'>
                                  <Video
                                    size={14}
                                    style={{ color: '#DC2626' }}
                                  />
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setTargetDirectorProfileId(member.profile_id);
                                  setEditingSong(ss);
                                  setShowAddSong(true);
                                }}
                                className='w-8 h-8 rounded-xl flex items-center justify-center'
                                style={{ background: 'var(--purple-50)' }}
                                title='Editar canción'>
                                <Pencil
                                  size={13}
                                  style={{ color: 'var(--purple-600)' }}
                                />
                              </button>
                              <button
                                onClick={() => removeSong(ss.id)}
                                className='w-8 h-8 rounded-xl flex items-center justify-center'
                                style={{ background: '#FEE2E2' }}
                                title='Eliminar canción'>
                                <Trash2
                                  size={13}
                                  style={{ color: '#DC2626' }}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── COPIAR A SERVICIO HERMANO ── */}
            {siblingServices.length > 0 && songs.length > 0 && (
              <div className='space-y-2 pb-2'>
                {siblingServices.map((sib) => (
                  <button
                    key={sib.id}
                    onClick={() => {
                      setConfirmCopyTarget(sib);
                      setConfirmWord('');
                    }}
                    disabled={copying}
                    className='w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all disabled:opacity-50'
                    style={{
                      borderColor: 'var(--purple-200)',
                      color: 'var(--purple-600)',
                      background: 'white',
                    }}>
                    {copying ? (
                      <>
                        <div
                          className='w-4 h-4 border-2 rounded-full animate-spin'
                          style={{
                            borderColor: 'var(--purple-100)',
                            borderTopColor: 'var(--purple-600)',
                          }}
                        />
                        Copiando...
                      </>
                    ) : (
                      <>
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'>
                          <rect x='9' y='9' width='13' height='13' rx='2' />
                          <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
                        </svg>
                        Usar esta lista en{' '}
                        {SERVICE_LABELS[sib.type as ServiceType]}
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className='h-6' />
          </div>
        </div>
      </div>

      {/* ── MODAL CONFIRMAR COPIA ── */}
      {confirmCopyTarget && (
        <div
          className='fixed inset-0 z-50 flex flex-col justify-end'
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmCopyTarget(null);
              setConfirmWord('');
            }
          }}>
          <div className='bg-white rounded-t-3xl p-5 slide-up'>
            <div className='w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5' />
            <div
              className='w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center'
              style={{ background: '#FEF3C7' }}>
              <svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
                <path
                  d='M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'
                  stroke='#D97706'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </div>
            <h3 className='text-base font-bold text-gray-900 text-center mb-1'>
              Confirmar acción
            </h3>
            <p className='text-sm text-gray-500 text-center mb-4'>
              Estás a punto de reemplazar toda la lista de{' '}
              <strong className='text-gray-800'>
                {SERVICE_LABELS[confirmCopyTarget.type as ServiceType]}
              </strong>{' '}
              con las {songs.length} canciones de este servicio.{' '}
              <span style={{ color: '#DC2626' }} className='font-semibold'>
                Esta acción no se puede deshacer.
              </span>
            </p>
            <p className='text-xs text-gray-400 text-center mb-2'>
              Escribí <strong className='text-gray-700'>reemplazar</strong> para
              confirmar
            </p>
            <input
              type='text'
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value.toLowerCase())}
              placeholder='reemplazar'
              autoFocus
              className='w-full px-4 py-3 rounded-xl border text-sm text-center font-semibold input-ring mb-4'
              style={{
                borderColor:
                  confirmWord === 'reemplazar'
                    ? 'var(--purple-600)'
                    : '#E5E7EB',
                color:
                  confirmWord === 'reemplazar'
                    ? 'var(--purple-600)'
                    : '#374151',
                background:
                  confirmWord === 'reemplazar' ? 'var(--purple-50)' : 'white',
              }}
            />
            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setConfirmCopyTarget(null);
                  setConfirmWord('');
                }}
                className='flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600'>
                Cancelar
              </button>
              <button
                disabled={confirmWord !== 'reemplazar'}
                onClick={() => {
                  const targetId = confirmCopyTarget.id;
                  setConfirmCopyTarget(null);
                  setConfirmWord('');
                  copyListToService(targetId);
                }}
                className='flex-1 py-3 rounded-2xl text-white text-sm font-bold transition-opacity disabled:opacity-30'
                style={{ background: 'var(--purple-600)' }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ASIGNAR MIEMBRO ── */}
      {showAssignModal && (
        <div
          className='fixed inset-0 z-50 flex flex-col justify-end'
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAssignModal(false);
          }}>
          <div className='bg-white rounded-t-3xl p-5 slide-up max-h-[75vh] overflow-y-auto'>
            <div className='w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4' />
            <h3 className='font-bold text-base mb-4'>Asignar al servicio</h3>

            {/* Selector de rol */}
            <div
              className='flex gap-2 mb-4 p-1 rounded-2xl'
              style={{ background: 'var(--purple-50)' }}>
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
                  className='flex-1 py-2 rounded-xl text-xs font-semibold transition-all'
                  style={
                    assigningRole === r
                      ? { background: 'var(--purple-600)', color: '#fff' }
                      : { color: 'var(--purple-600)' }
                  }>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>

            <div className='space-y-1'>
              {getAvailableProfiles(assigningRole).map((p) => (
                <button
                  key={p.id}
                  onClick={() => assignMember(p.id, assigningRole)}
                  className='w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors'>
                  <Avatar profile={p} size='md' />
                  <p className='font-semibold text-sm text-gray-900'>
                    {p.name}
                  </p>
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

      {/* ── MODAL AGREGAR / EDITAR CANCIÓN ── */}
      {showAddSong && profile && (
        <AddSongModal
          serviceId={id}
          profileId={targetDirectorProfileId ?? profile.id}
          editingSong={editingSong}
          onClose={() => {
            setShowAddSong(false);
            setEditingSong(null);
            setTargetDirectorProfileId(null);
          }}
          onSaved={(ss) => {
            setSongs((prev) =>
              editingSong
                ? prev.map((s) => (s.id === ss.id ? ss : s))
                : [...prev, ss],
            );
            notifyTeam(`${profile.name} actualizó la lista de canciones`);
          }}
        />
      )}
    </AppShell>
  );
}
