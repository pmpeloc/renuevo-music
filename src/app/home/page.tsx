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
import { CalendarDays, ChevronRight, Music2, Users } from 'lucide-react';
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
  const todayRef = useRef<HTMLButtonElement>(null);

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
    const strip = stripRef.current;
    const todayButton = todayRef.current;
    if (profileLoading || !strip || !todayButton) return;

    const scrollTo =
      todayButton.offsetLeft -
      strip.clientWidth / 2 +
      todayButton.offsetWidth / 2;
    strip.scrollLeft = Math.max(0, scrollTo);
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
      color: 'var(--accent-secondary)',
      bg: 'rgba(66, 200, 183, 0.12)',
    },
    no_songs: {
      label: 'Sin canciones',
      color: 'var(--warning)',
      bg: 'rgba(231, 182, 93, 0.12)',
    },
    no_director: {
      label: 'Sin director',
      color: 'var(--danger)',
      bg: 'rgba(243, 111, 119, 0.12)',
    },
    empty: { label: '', color: '', bg: '' },
  };

  if (profileLoading) {
    return (
      <div
        className='h-full flex items-center justify-center'
        style={{ background: 'var(--app-bg)' }}>
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
      <div className='home-page flex flex-col h-full'>
        <header className='home-header'>
          <div className='home-header__inner'>
            <div className='flex items-center justify-between'>
              <div>
                <h1 className='home-header__title'>Hola, {firstNameShort}</h1>
                <p className='home-header__month'>{formatMonth(visibleMonth)}</p>
              </div>
              <button
                onClick={() => router.push('/perfil')}
                className='shrink-0 lg:hidden'
                title='Mi perfil'>
                <Avatar profile={profile} size='md' />
              </button>
            </div>

            <div
              ref={stripRef}
              onScroll={handleStripScroll}
              className='date-strip no-scrollbar'>
              {dates.map((date, i) => {
                const selected = isSameDay(date, selectedDate);
                const hasEvent = hasServices(date);
                return (
                  <button
                    key={i}
                    ref={isSameDay(date, today) ? todayRef : undefined}
                    onClick={() => setSelectedDate(date)}
                    className={`date-strip__day ${selected ? 'date-strip__day--selected' : ''}`}>
                    <span className='date-strip__name'>
                      {formatDayName(date).replace('.', '')}
                    </span>
                    <span className='date-strip__number'>{date.getDate()}</span>
                    {hasEvent && <span className='date-strip__dot' />}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <main className='home-content'>
          <div className='home-content__inner'>
            <h2 className='home-content__heading capitalize'>
              Servicios del {formatDate(selectedDate)}
            </h2>
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
            <div className='service-list fade-in'>
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
                    className='service-card active:scale-[0.995]'>
                    <div className='service-card__identity'>
                      <Users aria-hidden />
                      <span className='service-card__title'>{label}</span>
                    </div>

                    <div className='service-card__meta'>
                      <div className='service-card__meta-row capitalize'>
                        <CalendarDays size={20} aria-hidden />
                        <span>{formatDate(selectedDate)}</span>
                      </div>
                      {status !== 'empty' && cfg.label && (
                        <span
                          className='service-card__status'
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      )}
                    </div>

                    <div className='service-card__team'>
                      <p className='service-card__team-title'>Equipo</p>
                      {directors.map((member) => (
                        <div key={member.id} className='service-card__person'>
                          <span className='service-card__role'>
                            {member.role === 'director_alabanzas'
                              ? 'Alabanzas'
                              : 'Adoraciones'}
                          </span>
                          {member.profile && <Avatar profile={member.profile} size='sm' />}
                          <span>{member.profile?.name ?? 'Sin asignar'}</span>
                        </div>
                      ))}
                      {directors.length === 0 && (
                        <p className='text-sm text-gray-400'>Sin directores asignados</p>
                      )}
                      <div className='service-card__coro'>
                        <span className='service-card__role'>Coro</span>
                        {coro.length > 0 ? (
                          <div className='flex -space-x-1.5'>
                            {coro.map((member) =>
                              member.profile ? (
                                <Avatar key={member.id} profile={member.profile} size='sm' />
                              ) : null,
                            )}
                          </div>
                        ) : (
                          <span className='text-sm text-gray-400'>Sin coro asignado</span>
                        )}
                      </div>
                    </div>

                    <div className='service-card__songs'>
                      <span className='service-card__songs-icon'>
                        <Music2 size={21} aria-hidden />
                      </span>
                      <span>
                        <span className='service-card__songs-count'>{songs.length}</span>
                        <span className='service-card__songs-label block'>
                          {songs.length === 1 ? 'canción' : 'canciones'}
                        </span>
                      </span>
                      <ChevronRight size={24} className='ml-auto' aria-hidden />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          </div>
        </main>
      </div>
    </AppShell>
  );
}
