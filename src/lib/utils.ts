import { ServiceType } from '@/types';

// ============================================================
// DATE UTILS
// ============================================================

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(date: Date, locale = 'es-AR'): string {
  return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatMonth(date: Date, locale = 'es-AR'): string {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function formatDayNum(date: Date): string {
  return date.getDate().toString();
}

export function formatDayName(date: Date, locale = 'es-AR'): string {
  return date.toLocaleDateString(locale, { weekday: 'short' });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Devuelve el rango de fechas a mostrar: 4 semanas atrás → 8 semanas adelante
export function getDateRange(today: Date): Date[] {
  const monday = getMondayOfWeek(today);
  const start = addDays(monday, -28); // 4 semanas atrás
  const end = addDays(monday, 56);    // 8 semanas adelante
  const dates: Date[] = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }
  return dates;
}

// ============================================================
// SERVICE TYPE HELPERS
// ============================================================

export function getServiceTypesForDate(date: Date): ServiceType[] {
  const day = date.getDay(); // 0=dom, 4=jue, 6=sáb
  if (day === 4) return ['jueves'];
  if (day === 6) return ['sabado_adolescentes', 'sabado_jovenes'];
  if (day === 0) return ['domingo_ninos', 'domingo_general'];
  return [];
}

export function hasServices(date: Date): boolean {
  return getServiceTypesForDate(date).length > 0;
}

// ============================================================
// YOUTUBE UTILS
// ============================================================

export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// ============================================================
// INITIALS / AVATAR
// ============================================================

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// ============================================================
// LOCAL STORAGE — sesión de perfil activo
// ============================================================

const PROFILE_KEY = 'renuevo_active_profile_id';

export function getActiveProfileId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PROFILE_KEY);
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(PROFILE_KEY, id);
}

export function clearActiveProfileId(): void {
  localStorage.removeItem(PROFILE_KEY);
}
