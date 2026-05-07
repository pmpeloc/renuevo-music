'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useActiveProfile } from '@/hooks/useActiveProfile';
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
  clearActiveProfileId,
  getMondayOfWeek,
  addDays,
} from '@/lib/utils';
import Avatar from '@/components/Avatar';
import PWAInstallButton from '@/components/PWAInstallButton';
import { LogOut, ChevronRight, Music2 } from 'lucide-react';

// ============================================================
// Tipos auxiliares para los servicios del día
// ============================================================
interface ServiceWithStatus {
  service: Service;
  members: ServiceMember[];
  songs: ServiceSong[];
}

export default function HomePage() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useActiveProfile();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dates = getDateRange(today);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [visibleMonth, setVisibleMonth] = useState<Date>(today);
  const [servicesForDay, setServicesForDay] = useState<ServiceWithStatus[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);

  // Generar servicios de la semana si no existen
  const ensureWeeklyServices = useCallback(async (date: Date) => {
    const monday = getMondayOfWeek(date);
    const monday2 = addDays(monday, 7);
    // Llamar función SQL para generar servicios
    await supabase.rpc('generate_weekly_services', {
      week_start: monday.toISOString().split('T')[0],
    });
    await supabase.rpc('generate_weekly_services', {
      week_start: monday2.toISOString().split('T')[0],
    });
  }, []);

  // Cargar servicios del día seleccionado
  const loadServicesForDay = useCallback(async (date: Date) => {
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

    const result: ServiceWithStatus[] = services.map((service: Service) => ({
      service,
      members: members.filter((m) => m.service_id === service.id),
      songs: songs.filter((s) => s.service_id === service.id),
    }));

    setServicesForDay(result);
    setLoadingServices(false);
  }, []);

  useEffect(() => {
    ensureWeeklyServices(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasServices(selectedDate)) {
      // eslint-disable-next-line
      loadServicesForDay(selectedDate);
      ensureWeeklyServices(selectedDate);
    } else {
      setServicesForDay([]);
    }
  }, [selectedDate, loadServicesForDay, ensureWeeklyServices]);

  // Scroll automático a "hoy" — corre cuando el perfil termina de cargar
  // (el strip no existe en el DOM mientras profileLoading = true)
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

  // Detectar mes visible mientras scrollea el strip
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

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
  }

  function handleLogout() {
    clearActiveProfileId();
    router.replace('/');
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
    complete: { label: 'Completo', bg: 'bg-green-100', text: 'text-green-800' },
    no_songs: {
      label: 'Sin canciones',
      bg: 'bg-amber-100',
      text: 'text-amber-800',
    },
    no_director: {
      label: 'Sin director',
      bg: 'bg-red-100',
      text: 'text-red-800',
    },
    empty: { label: '', bg: '', text: '' },
  };

  if (profileLoading) {
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

  if (!profile) return null;

  const firstNameShort = profile.name.split(' ')[0];

  return (
    <div className='flex flex-col h-full bg-white'>
      {/* ── TOP NAV ── */}
      <div className='px-4 pt-6 pb-2 flex items-center justify-between'>
        <div>
          <p className='text-xs text-gray-400'>Hola, {firstNameShort} 👋</p>
          <h1 className='text-xl font-semibold text-gray-900'>Listado</h1>
        </div>
        <div className='flex items-center gap-2'>
          <PWAInstallButton />
          <Avatar profile={profile} size='md' />
          <button
            onClick={handleLogout}
            className='w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center'
            title='Cerrar sesión'>
            <LogOut size={15} className='text-gray-500' />
          </button>
        </div>
      </div>

      {/* ── MES VISIBLE ── */}
      <div className='px-4 py-1'>
        <p
          className='text-sm font-medium capitalize'
          style={{ color: 'var(--purple-600)' }}>
          {formatMonth(visibleMonth)}
        </p>
      </div>

      {/* ── STRIP DE FECHAS ── */}
      <div
        ref={stripRef}
        onScroll={handleStripScroll}
        className='flex gap-1 px-4 py-2 no-scrollbar overflow-x-auto'>
        {dates.map((date, i) => {
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const hasEv = hasServices(date);
          const dayName = formatDayName(date);
          const dayNum = date.getDate();

          return (
            <button
              key={i}
              onClick={() => handleSelectDate(date)}
              className={`flex flex-col items-center py-2 px-2 rounded-xl transition-colors shrink-0 w-12 ${
                isSelected
                  ? 'text-white'
                  : isToday
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50'
              }`}
              style={
                isSelected ? { background: 'var(--purple-600)' } : undefined
              }>
              <span className='text-[10px] font-medium capitalize'>
                {dayName.replace('.', '')}
              </span>
              <span
                className={`text-base font-semibold mt-0.5 ${isToday && !isSelected ? 'text-purple-600' : ''}`}>
                {dayNum}
              </span>
              {hasEv && (
                <div
                  className='w-1 h-1 rounded-full mt-1'
                  style={{
                    background: isSelected
                      ? 'rgba(255,255,255,0.6)'
                      : 'var(--purple-600)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── SEPARADOR ── */}
      <div className='h-px bg-gray-100 mx-4' />

      {/* ── SERVICIOS DEL DÍA ── */}
      <div className='flex-1 overflow-y-auto px-4 py-4'>
        {!hasServices(selectedDate) ? (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <div className='w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3'>
              <Music2 size={24} className='text-gray-300' />
            </div>
            <p className='text-gray-400 text-sm'>Sin servicios este día</p>
          </div>
        ) : loadingServices ? (
          <div className='flex justify-center py-10'>
            <div
              className='w-5 h-5 border-2 rounded-full animate-spin'
              style={{
                borderColor: 'var(--purple-100)',
                borderTopColor: 'var(--purple-600)',
              }}
            />
          </div>
        ) : (
          <div className='space-y-3 fade-in'>
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
                  onClick={() => router.push(`/service/${service.id}`)}
                  className='w-full text-left bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-[0.99] transition-all'>
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
                    <div className='flex items-center gap-1'>
                      {status !== 'empty' && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      )}
                      <ChevronRight size={16} className='text-gray-300 ml-1' />
                    </div>
                  </div>

                  {/* Personas */}
                  {directors.length > 0 || coro.length > 0 ? (
                    <div className='flex items-center gap-2 flex-wrap'>
                      {directors.map((m) => (
                        <div key={m.id} className='flex items-center gap-1.5'>
                          {m.profile && (
                            <Avatar profile={m.profile} size='sm' />
                          )}
                          <span className='text-xs text-gray-500'>
                            {m.profile?.name.split(' ')[0]}
                          </span>
                        </div>
                      ))}
                      {coro.length > 0 && (
                        <>
                          <div className='w-px h-4 bg-gray-200' />
                          <div className='flex -space-x-1'>
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
                          <span className='text-xs text-gray-400'>Coro</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className='text-xs text-gray-300 italic'>
                      Sin equipo asignado
                    </p>
                  )}

                  {/* Canciones */}
                  <div className='flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50'>
                    <Music2 size={12} className='text-gray-300' />
                    <span className='text-xs text-gray-400'>
                      {songs.length === 0
                        ? 'Sin canciones cargadas'
                        : `${songs.length} canción${songs.length !== 1 ? 'es' : ''} cargada${songs.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
