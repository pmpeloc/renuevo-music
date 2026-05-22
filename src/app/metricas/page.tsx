/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Song, Service, ServiceMember, ServiceSong } from '@/types';
import AppShell from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Music2,
  Moon,
  CheckCircle2,
  Activity,
  Hash,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfileMember {
  id: string;
  name: string;
  color: string;
  photo_url?: string | null;
}

interface TeamStat {
  profile: ProfileMember;
  directedCount: number;
  coroCount: number;
  totalCount: number;
}

interface KeyStat {
  key: string;
  count: number;
}

interface MonthlyStat {
  label: string; // "May 25"
  count: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

// ─── Section header ─────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className='flex items-center gap-2 mb-3'>
      <div
        className='w-7 h-7 rounded-lg flex items-center justify-center'
        style={{ background: 'var(--purple-50)' }}>
        <Icon size={15} style={{ color: 'var(--purple-600)' }} />
      </div>
      <h2 className='font-semibold text-gray-800 text-sm'>{title}</h2>
    </div>
  );
}

// ─── Bar component ──────────────────────────────────────────────────────────

function Bar({
  value,
  max,
  color = 'var(--purple-600)',
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className='flex-1 h-2 rounded-full overflow-hidden'
      style={{ background: 'var(--purple-50)' }}>
      <div
        className='h-full rounded-full transition-all'
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MetricasPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceSongs, setServiceSongs] = useState<
    (ServiceSong & { service?: { date: string } })[]
  >([]);
  const [serviceMembers, setServiceMembers] = useState<
    (ServiceMember & { profile?: ProfileMember; service?: { date: string } })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [songsRes, servicesRes, ssRes, smRes] = await Promise.all([
        supabase.from('songs').select('*'),
        supabase
          .from('services')
          .select('*')
          .order('date', { ascending: false }),
        supabase.from('service_songs').select('*, service:services(date)'),
        supabase
          .from('service_members')
          .select('*, profile:profiles(*), service:services(date)'),
      ]);
      setSongs(songsRes.data ?? []);
      setServices(servicesRes.data ?? []);
      setServiceSongs(ssRes.data ?? []);
      setServiceMembers(smRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // ── 1. Song rankings ──────────────────────────────────────────────────────

  const songStats = useMemo(() => {
    return songs.map((song) => {
      const usages = serviceSongs.filter((ss) => ss.song_id === song.id);
      const uses = usages.length;
      const dates = usages
        .map((ss) => ss.service?.date)
        .filter(Boolean)
        .sort()
        .reverse();
      const lastUsed = dates[0] ?? null;
      return { song, uses, lastUsed };
    });
  }, [songs, serviceSongs]);

  const topSongs = useMemo(
    () => [...songStats].sort((a, b) => b.uses - a.uses).slice(0, 10),
    [songStats],
  );
  const bottomSongs = useMemo(
    () =>
      [...songStats]
        .filter((s) => s.uses > 0)
        .sort((a, b) => a.uses - b.uses)
        .slice(0, 5),
    [songStats],
  );
  const maxUses = topSongs[0]?.uses ?? 1;

  // ── 2. Dormant songs (>30 days or never used) ─────────────────────────────

  const dormantSongs = useMemo(() => {
    return songStats
      .filter((s) => !s.lastUsed || daysAgo(s.lastUsed) > 30)
      .sort((a, b) => {
        // never used first, then by days ago
        if (!a.lastUsed && !b.lastUsed)
          return a.song.title.localeCompare(b.song.title);
        if (!a.lastUsed) return -1;
        if (!b.lastUsed) return 1;
        return daysAgo(b.lastUsed!) - daysAgo(a.lastUsed!);
      })
      .slice(0, 8);
  }, [songStats]);

  // ── 3. Team stats ─────────────────────────────────────────────────────────

  const teamStats = useMemo<TeamStat[]>(() => {
    const map = new Map<string, TeamStat>();
    serviceMembers.forEach((m) => {
      if (!m.profile) return;
      const existing = map.get(m.profile.id) ?? {
        profile: m.profile,
        directedCount: 0,
        coroCount: 0,
        totalCount: 0,
      };
      if (
        m.role === 'director_alabanzas' ||
        m.role === 'director_adoraciones'
      ) {
        existing.directedCount++;
      } else if (m.role === 'coro') {
        existing.coroCount++;
      }
      existing.totalCount = existing.directedCount + existing.coroCount;
      map.set(m.profile.id, existing);
    });
    return [...map.values()].sort((a, b) => b.totalCount - a.totalCount);
  }, [serviceMembers]);

  const maxTeam = teamStats[0]?.totalCount ?? 1;

  // ── 4. Key ranking ────────────────────────────────────────────────────────

  const keyStats = useMemo<KeyStat[]>(() => {
    const counts: Record<string, number> = {};
    serviceSongs.forEach((ss) => {
      if (ss.key) counts[ss.key] = (counts[ss.key] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [serviceSongs]);

  const maxKey = keyStats[0]?.count ?? 1;

  // ── 5. % complete services ────────────────────────────────────────────────

  const completionStats = useMemo(() => {
    const total = services.length;
    if (total === 0) return { total: 0, complete: 0, pct: 0 };

    const complete = services.filter((svc) => {
      const hasDirector = serviceMembers.some(
        (m) =>
          m.service_id === svc.id &&
          (m.role === 'director_alabanzas' ||
            m.role === 'director_adoraciones'),
      );
      const hasSongs = serviceSongs.some((ss) => ss.service_id === svc.id);
      return hasDirector && hasSongs;
    }).length;

    return { total, complete, pct: Math.round((complete / total) * 100) };
  }, [services, serviceMembers, serviceSongs]);

  // ── 6. Monthly activity (last 8 months) ───────────────────────────────────

  const monthlyStats = useMemo<MonthlyStat[]>(() => {
    const now = new Date();
    const months: MonthlyStat[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-indexed
      const count = services.filter((svc) => {
        const sd = new Date(svc.date + 'T12:00:00');
        return sd.getFullYear() === year && sd.getMonth() === month;
      }).length;
      months.push({
        label: d.toLocaleDateString('es-AR', {
          month: 'short',
          year: '2-digit',
        }),
        count,
      });
    }
    return months;
  }, [services]);

  const maxMonthly = Math.max(...monthlyStats.map((m) => m.count), 1);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppShell>
        <div
          className='flex items-center justify-center h-full'
          style={{ background: '#F8F7FF' }}>
          <div
            className='w-6 h-6 border-2 rounded-full animate-spin'
            style={{
              borderColor: 'var(--purple-100)',
              borderTopColor: 'var(--purple-600)',
            }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className='flex flex-col h-full'>
        {/* ── HEADER ── */}
        <div
          style={{ background: 'var(--purple-900)' }}
          className='px-5 pt-5 pb-5 lg:pt-5'>
          <h1 className='text-xl font-bold text-white mb-0.5'>Métricas</h1>
          <p className='text-sm' style={{ color: 'var(--purple-200)' }}>
            {services.length} servicios · {songs.length} canciones
          </p>
        </div>

        {/* ── CONTENT ── */}
        <div
          className='flex-1 overflow-y-auto px-4 py-5 lg:px-6 lg:py-6 space-y-6'
          style={{ background: '#F8F7FF' }}>
          {/* 0. Summary pills */}
          <div className='grid grid-cols-3 gap-3'>
            {[
              { label: 'Servicios', value: services.length, icon: Activity },
              {
                label: 'Completos',
                value: `${completionStats.pct}%`,
                icon: CheckCircle2,
              },
              { label: 'Canciones', value: songs.length, icon: Music2 },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className='bg-white rounded-2xl p-3 shadow-sm text-center'>
                <Icon
                  size={18}
                  className='mx-auto mb-1'
                  style={{ color: 'var(--purple-600)' }}
                />
                <p className='text-lg font-bold text-gray-900'>{value}</p>
                <p className='text-xs text-gray-400'>{label}</p>
              </div>
            ))}
          </div>

          {/* 1. Top canciones más usadas */}
          <div className='bg-white rounded-2xl shadow-sm p-4'>
            <SectionHeader icon={TrendingUp} title='Canciones más usadas' />
            {topSongs.length === 0 ? (
              <p className='text-xs text-gray-400 italic'>Sin datos aún</p>
            ) : (
              <div className='space-y-2.5'>
                {topSongs.map(({ song, uses }, idx) => (
                  <div key={song.id} className='flex items-center gap-3'>
                    <span
                      className='text-xs font-bold w-5 text-right shrink-0'
                      style={{
                        color:
                          idx < 3 ? 'var(--orange-600)' : 'var(--purple-200)',
                      }}>
                      {idx + 1}
                    </span>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-gray-800 truncate'>
                        {song.title}
                      </p>
                      <div className='flex items-center gap-2 mt-1'>
                        <Bar
                          value={uses}
                          max={maxUses}
                          color={
                            idx < 3 ? 'var(--orange-600)' : 'var(--purple-600)'
                          }
                        />
                        <span className='text-xs text-gray-400 shrink-0 w-12 text-right'>
                          {uses} {uses !== 1 ? 'veces' : 'vez'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Canciones menos usadas */}
          <div className='bg-white rounded-2xl shadow-sm p-4'>
            <SectionHeader icon={TrendingDown} title='Canciones menos usadas' />
            {bottomSongs.length === 0 ? (
              <p className='text-xs text-gray-400 italic'>Sin datos aún</p>
            ) : (
              <div className='space-y-2.5'>
                {bottomSongs.map(({ song, uses }) => (
                  <div key={song.id} className='flex items-center gap-3'>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs font-semibold text-gray-800 truncate'>
                        {song.title}
                      </p>
                      <div className='flex items-center gap-2 mt-1'>
                        <Bar value={uses} max={maxUses} color='#94a3b8' />
                        <span className='text-xs text-gray-400 shrink-0 w-12 text-right'>
                          {uses} {uses !== 1 ? 'veces' : 'vez'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Canciones dormidas */}
          <div className='bg-white rounded-2xl shadow-sm p-4'>
            <SectionHeader icon={Moon} title='Canciones dormidas' />
            <p className='text-xs text-gray-400 mb-3'>
              Sin usar en más de 30 días o nunca utilizadas
            </p>
            {dormantSongs.length === 0 ? (
              <p className='text-xs text-gray-400 italic'>
                ¡Todas las canciones están activas!
              </p>
            ) : (
              <div className='space-y-2'>
                {dormantSongs.map(({ song, lastUsed }) => (
                  <div
                    key={song.id}
                    className='flex items-center justify-between py-2 border-b last:border-b-0'
                    style={{ borderColor: '#F3F4F6' }}>
                    <div className='min-w-0'>
                      <p className='text-xs font-semibold text-gray-800 truncate'>
                        {song.title}
                      </p>
                      {song.artist && (
                        <p className='text-xs text-gray-400 truncate'>
                          {song.artist}
                        </p>
                      )}
                    </div>
                    <span
                      className='text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2'
                      style={{ background: '#FEF3C7', color: '#92400E' }}>
                      {lastUsed ? `hace ${daysAgo(lastUsed)}d` : 'Nunca'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Métricas del equipo */}
          <div className='bg-white rounded-2xl shadow-sm p-4'>
            <SectionHeader icon={Users} title='Métricas del equipo' />
            {teamStats.length === 0 ? (
              <p className='text-xs text-gray-400 italic'>Sin datos aún</p>
            ) : (
              <div className='space-y-3'>
                {teamStats.map((stat) => (
                  <div
                    key={stat.profile.id}
                    className='flex items-center gap-3'>
                    <Avatar profile={stat.profile as any} size='sm' />
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between mb-1'>
                        <p className='text-xs font-semibold text-gray-800 truncate'>
                          {stat.profile.name.split(' ')[0]}
                        </p>
                        <span className='text-xs text-gray-400 shrink-0 ml-2'>
                          {stat.totalCount} serv.
                        </span>
                      </div>
                      <div className='flex items-center gap-2 mt-1'>
                        <Bar value={stat.totalCount} max={maxTeam} />
                      </div>
                      <div className='flex items-center gap-3 mt-1'>
                        <span
                          className='text-xs'
                          style={{ color: 'var(--purple-600)' }}>
                          🎤 {stat.directedCount} dirección
                          {stat.directedCount !== 1 ? 'es' : ''}
                        </span>
                        {stat.coroCount > 0 && (
                          <span className='text-xs text-gray-400'>
                            🎵 {stat.coroCount} coro
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Ranking de tonos */}
          <div className='bg-white rounded-2xl shadow-sm p-4'>
            <SectionHeader icon={Hash} title='Tonos más usados' />
            {keyStats.length === 0 ? (
              <p className='text-xs text-gray-400 italic'>Sin datos aún</p>
            ) : (
              <div className='grid grid-cols-2 gap-x-6 gap-y-2.5'>
                {keyStats.map(({ key, count }, idx) => (
                  <div key={key} className='flex items-center gap-2'>
                    <span
                      className='text-xs font-bold px-2 py-0.5 rounded-full shrink-0'
                      style={{
                        background: 'var(--orange-50)',
                        color: 'var(--orange-600)',
                        minWidth: '2rem',
                        textAlign: 'center',
                      }}>
                      {key}
                    </span>
                    <Bar
                      value={count}
                      max={maxKey}
                      color={
                        idx === 0 ? 'var(--orange-600)' : 'var(--purple-600)'
                      }
                    />
                    <span className='text-xs text-gray-400 shrink-0'>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. % Servicios completos */}
          <div className='bg-white rounded-2xl shadow-sm p-4'>
            <SectionHeader icon={CheckCircle2} title='Servicios completos' />
            <p className='text-xs text-gray-400 mb-3'>
              Servicios con director y canciones asignadas
            </p>
            <div className='flex items-center gap-4'>
              <div className='relative w-20 h-20 shrink-0'>
                <svg viewBox='0 0 36 36' className='w-20 h-20 -rotate-90'>
                  <circle
                    cx='18'
                    cy='18'
                    r='15.9'
                    fill='none'
                    stroke='var(--purple-50)'
                    strokeWidth='3'
                  />
                  <circle
                    cx='18'
                    cy='18'
                    r='15.9'
                    fill='none'
                    stroke='var(--purple-600)'
                    strokeWidth='3'
                    strokeDasharray={`${completionStats.pct} ${100 - completionStats.pct}`}
                    strokeLinecap='round'
                  />
                </svg>
                <div className='absolute inset-0 flex items-center justify-center'>
                  <span className='text-base font-bold text-gray-900'>
                    {completionStats.pct}%
                  </span>
                </div>
              </div>
              <div>
                <p className='text-sm font-semibold text-gray-800'>
                  {completionStats.complete} de {completionStats.total}
                </p>
                <p className='text-xs text-gray-400 mt-0.5'>
                  servicios completos
                </p>
                {completionStats.total - completionStats.complete > 0 && (
                  <p className='text-xs mt-1' style={{ color: '#92400E' }}>
                    {completionStats.total - completionStats.complete} necesitan
                    atención
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 7. Actividad mensual */}
          <div className='bg-white rounded-2xl shadow-sm p-4'>
            <SectionHeader icon={BarChart3} title='Actividad mensual' />
            <p className='text-xs text-gray-400 mb-4'>
              Servicios por mes (últimos 8 meses)
            </p>
            <div className='space-y-2'>
              {monthlyStats.map((m) => (
                <div key={m.label} className='flex items-center gap-3'>
                  <span className='text-xs text-gray-500 w-14 shrink-0 capitalize'>
                    {m.label}
                  </span>
                  <Bar value={m.count} max={maxMonthly} />
                  <span className='text-xs font-semibold text-gray-600 shrink-0 w-6 text-right'>
                    {m.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom padding */}
          <div className='h-2' />
        </div>
      </div>
    </AppShell>
  );
}
