import { ServiceType } from '@/types';

// ============================================================
// CONSTANTES DE FECHA EN ESPAÑOL
// Hardcodeadas para evitar bugs de localización en Chrome Android
// ============================================================

export const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DAY_NAMES_LONG  = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MONTH_NAMES     = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ============================================================
// DATE UTILS
// ============================================================

export function getMondayOfWeek(date: Date): Date {
  // Normalize to local midnight to avoid timezone/DST offsets shifting getDay()
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=domingo, 1=lunes...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

// Ej: "miércoles 6 de mayo"
export function formatDate(date: Date): string {
  return `${DAY_NAMES_LONG[date.getDay()]} ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

// Ej: "mayo 2026"
export function formatMonth(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDayNum(date: Date): string {
  return date.getDate().toString();
}

// Ej: "Mié"
export function formatDayName(date: Date): string {
  return DAY_NAMES_SHORT[date.getDay()];
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
