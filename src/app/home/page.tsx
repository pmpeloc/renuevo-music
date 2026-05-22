'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import {
  Service,
  ServiceType,
  ServiceMember,
  ServiceSong,
  SERVICE_LABELS,
} from '@/types';
import {
  getDateRange,
  hasServices,
  isSameDay,
  formatMonth,
  formatDayName,
  formatDate,
  getMondayOfWeek,
  addDays,
} from '@/lib/utils';
import Avatar from '@/components/Avatar';
import AppShell from '@/components/AppShell';
import { ChevronRight, Music2, Users } from 'lucide-react';
import { useLoading } from '@/context/LoadingContext';

interface ServiceWithStatus {
  service: Service;
  members: ServiceMember[];
  songs: ServiceSong[];
}

export default function HomePage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useActiveProfile();
  const { withLoader, showLoader } = useLoading();

  // Registrar suscripción push cuando el perfil está cargado
  usePushSubscription(profile?.id);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dates = getDateRange(today);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [visibleMonth, setVisibleMonth] = useState<Date>(today);
  const [servicesForDay, setServicesForDay] = useState<ServiceWithStatus[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);

  const ensureWeeklyServices = useCallback(async (date: Date) => {
    const monday = getMondayOfWeek(date);
    const monday2 = addDays(monday, 7);
    await supabase.rpc('generate_weekly_services', {
      week_start: monday.toISOString().split('T')[0],
    });
    await supabase.rpc('generate_weekly_services', {
      week_start: monday2.toISOString().split('T')[0],
    });
  }, []);

  const loadServicesForDay = useCallback(
    async (date: Date) => {
      await withLoader(async () => {
        setLoadingServices(true);
        const dateStr = date.toISOString().split('T')[0];

        const { data: services } = await supabase
          .from('services')
          .select('*')
          .eq('date', dateStr)
          .order('type');

        if (!services || services.length === 0) {
          setServicesForDay([]);
          setLoadingServices(false);
          return;
        }

        const serviceIds = services.map((s: Service) => s.id);

        const [membersRes, songsRes] = await Promise.all([
          supabase
            .from('service_members')
            .select('*, profile:profiles(*)')
            .in('service_id', serviceIds),
          supabase
            .from('service_songs')
            .select('*, song:songs(*), profile:profiles(*)')
            .in('service_id', serviceIds)
            .order('order_index'),
        ]);

        const members: ServiceMember[] = membersRes.data ?? [];
        const songs: ServiceSong[] = songsRes.data ?? [];

        const result: ServiceWithStatus[] = services.map(
          (service: Service) => ({
            service,
            members: members.filter((m) => m.service_id === service.id),
            songs: songs.filter((s) => s.service_id === service.id),
          }),
        );

        setServicesForDay(result);
        setLoadingServices(false);
      });
    },
    [withLoader],
  );

  useEffect(() => {
    ensureWeeklyServices(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasServices(selectedDate)) {
      loadServicesForDay(selectedDate);
      ensureWeeklyServices(selectedDate);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServicesForDay([]);
    }
  }, [selectedDate, loadServicesForDay, ensureWeeklyServices]);

  useEffect(() => {
    if (profileLoading || !stripRef.current) return;
    const todayIndex = dates.findIndex((d) => isSameDay(d, today));
    const itemWidth = 52;
    const containerWidth = stripRef.current.clientWidth;
    const scrollTo =
      todayIndex * itemWidth - containerWidth / 2 + itemWidth / 2;
    stripRef.current.scrollLeft = Math.max(0, scrollTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoading]);

  function handleStripScroll() {
    if (!stripRef.current) return;
    const el = stripRef.current;
    const itemWidth = 52;
    const centerIndex = Math.round(
      (el.scrollLeft + el.clientWidth / 2) / itemWidth,
    );
    const centerDate = dates[Math.min(centerIndex, dates.length - 1)];
    if (centerDate) setVisibleMonth(centerDate);
  }

  function getServiceStatus(
    sw: ServiceWithStatus,
  ): 'complete' | 'no_songs' | 'no_director' | 'empty' {
    const hasDirector = sw.members.some(
      (m) =>
        m.role === 'director_alabanzas' || m.role === 'director_adoraciones',
    );
    const hasSongs = sw.songs.length > 0;
    if (!hasDirector) return 'no_director';
    if (!hasSongs) return 'no_songs';
    return 'complete';
  }

  const STATUS_CONFIG = {
    complete: {
      label: 'Completo',
      color: 'var(--purple-800)',
      bg: 'var(--purple-50)',
    },
    no_songs: { label: 'Sin canciones', color: '#92400e', bg: '#fef3c7' },
    no_director: { label: 'Sin director', color: '#991b1b', bg: '#fee2e2' },
    empty: { label: '', color: '', bg: '' },
  };

  if (profileLoading) {
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

  if (!profile) return null;

  const firstNameShort = profile.name.split(' ')[0];

  return (
    <AppShell>
      <div className='flex flex-col h-full'>
        {/* ── HEADER ── */}
        <div style={{ background: 'var(--purple-900)' }}>
          <div className='px-5 pt-5 pb-2 lg:pt-5 lg:pb-2 flex items-center justify-between'>
            <div>
              <p className='text-lg font-semibold text-white'>
                Hola, {firstNameShort} 👋
              </p>
              <p
                className='text-sm font-semibold capitalize mt-0.5'
                style={{ color: 'var(--orange-600)' }}>
                {formatMonth(visibleMonth)}
              </p>
            </div>
            {/* Avatar → navega a /perfil */}
            <button
              onClick={() => router.push('/perfil')}
              className='shrink-0'
              title='Mi perfil'>
              <Avatar profile={profile} size='md' />
            </button>
          </div>

          {/* Strip de fechas */}
          <div
            ref={stripRef}
            onScroll={handleStripScroll}
            className='flex gap-1 px-4 pt-1 pb-3 no-scrollbar overflow-x-auto'>
            {dates.map((date, i) => {
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selectedDate);
              const hasEv = hasServices(date);
              const dayName = formatDayName(date);
              const dayNum = date.getDate();

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className='flex flex-col items-center py-2 px-2 rounded-xl transition-colors shrink-0 w-12'
                  style={
                    isSelected
                      ? { background: 'var(--purple-600)', color: '#fff' }
                      : isToday
                        ? { color: '#fff' }
                        : { color: 'rgba(255,255,255,0.45)' }
                  }>
                  <span className='text-[10px] font-medium capitalize'>
                    {dayName.replace('.', '')}
                  </span>
                  <span
                    className='text-base font-semibold mt-0.5'
                    style={
                      isToday && !isSelected
                        ? { color: 'var(--orange-600)' }
                        : undefined
                    }>
                    {dayNum}
                  </span>
                  {hasEv && (
                    <div
                      className='w-1 h-1 rounded-full mt-1'
                      style={{
                        background: isSelected
                          ? 'rgba(255,255,255,0.6)'
                          : isToday
                            ? 'var(--orange-600)'
                            : 'var(--purple-200)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── CONTENIDO ── */}
        <div
          className='flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-5'
          style={{ background: '#F8F7FF' }}>
          {!hasServices(selectedDate) ? (
            <div className='flex flex-col items-center justify-center py-20 text-center'>
              <div
                className='w-16 h-16 rounded-2xl flex items-center justify-center mb-4'
                style={{ background: 'var(--purple-50)' }}>
                <Music2 size={28} style={{ color: 'var(--purple-200)' }} />
              </div>
              <p className='font-medium text-gray-500'>
                Sin servicios este día
              </p>
              <p className='text-sm text-gray-400 mt-1'>
                Seleccioná un día marcado con •
              </p>
            </div>
          ) : loadingServices ? (
            <div className='flex justify-center py-12'>
              <div
                className='w-5 h-5 border-2 rounded-full animate-spin'
                style={{
                  borderColor: 'var(--purple-100)',
                  borderTopColor: 'var(--purple-600)',
                }}
              />
            </div>
          ) : (
            <div className='fade-in space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0'>
              {servicesForDay.map(({ service, members, songs }) => {
                const status = getServiceStatus({ service, members, songs });
                const cfg = STATUS_CONFIG[status];
                const directors = members.filter(
                  (m) =>
                    m.role === 'director_alabanzas' ||
                    m.role === 'director_adoraciones',
                );
                const coro = members.filter((m) => m.role === 'coro');
                const label = SERVICE_LABELS[service.type as ServiceType];

                return (
                  <button
                    key={service.id}
                    onClick={() => {
                      showLoader();
                      router.push(`/service/${service.id}`);
                    }}
                    className='w-full text-left bg-white rounded-2xl shadow-sm hover:shadow-md active:scale-[0.99] transition-all overflow-hidden'>
                    {/* Franja superior de color */}
                    <div
                      className='h-1.5 w-full'
                      style={{ background: 'var(--purple-600)' }}
                    />

                    <div className='p-4'>
                      {/* Header */}
                      <div className='flex items-start justify-between mb-3'>
                        <div>
                          <p className='font-semibold text-gray-900 text-base'>
                            {label}
                          </p>
                          <p className='text-xs text-gray-400 mt-0.5 capitalize'>
                            {formatDate(selectedDate)}
                          </p>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          {status !== 'empty' && cfg.label && (
                            <span
                              className='text-xs font-semibold px-2.5 py-1 rounded-full'
                              style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.label}
                            </span>
                          )}
                          <ChevronRight size={16} className='text-gray-300' />
                        </div>
                      </div>

                      {/* Equipo */}
                      {directors.length > 0 || coro.length > 0 ? (
                        <div className='flex items-center gap-3 flex-wrap'>
                          {directors.map((m) => (
                            <div key={m.id} className='flex items-center gap-2'>
                              {m.profile && (
                                <Avatar profile={m.profile} size='sm' />
                              )}
                              <span className='text-xs font-medium text-gray-600'>
                                {m.profile?.name.split(' ')[0]}
                              </span>
                            </div>
                          ))}
                          {coro.length > 0 && (
                            <>
                              <div className='w-px h-4 bg-gray-200' />
                              <div className='flex -space-x-1.5'>
                                {coro.map((m) =>
                                  m.profile ? (
                                    <Avatar
                                      key={m.id}
                                      profile={m.profile}
                                      size='sm'
                                    />
                                  ) : null,
                                )}
                              </div>
                              <span className='text-xs text-gray-400 flex items-center gap-1'>
                                <Users size={11} />
                                Coro
                              </span>
                            </>
                          )}
                        </div>
                      ) : (
                        <p className='text-xs text-gray-300 italic'>
                          Sin equipo asignado
                        </p>
                      )}

                      {/* Canciones */}
                      <div
                        className='flex items-center gap-1.5 mt-3 pt-3'
                        style={{ borderTop: '1px solid #F3F4F6' }}>
                        <Music2
                          size={12}
                          style={{ color: 'var(--purple-200)' }}
                        />
                        <span className='text-xs text-gray-400'>
                          {songs.length === 0
                            ? 'Sin canciones cargadas'
                            : `${songs.length} canción${songs.length !== 1 ? 'es' : ''} cargada${songs.length !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
