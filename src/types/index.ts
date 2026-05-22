// ============================================================
// TIPOS GLOBALES — Renuevo Music App
// ============================================================

export type ServiceType =
  | 'jueves'
  | 'sabado_adolescentes'
  | 'sabado_jovenes'
  | 'domingo_ninos'
  | 'domingo_general';

export type MemberRole =
  | 'director_alabanzas'
  | 'director_adoraciones'
  | 'coro';

export type AvatarColor =
  | 'purple' | 'teal' | 'coral' | 'blue' | 'pink' | 'amber';

export const INSTRUMENTS = [
  'Voz',
  'Piano / Teclado',
  'Guitarra',
  'Bajo',
  'Batería',
  'Violín',
  'Saxofón',
  'Trompeta',
  'Otro',
] as const;

export type Instrument = typeof INSTRUMENTS[number];

// Tonos musicales (mayores y menores)
export const MUSICAL_KEYS = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'Abm', 'Am', 'Bbm', 'Bm',
] as const;

export type MusicalKey = typeof MUSICAL_KEYS[number];

// ============================================================
// DB ROW TYPES
// ============================================================

export interface Profile {
  id: string;
  name: string;
  photo_url: string | null;
  initials: string;
  color: AvatarColor;
  instrument: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  date: string;
  type: ServiceType;
  created_at: string;
}

export interface ServiceMember {
  id: string;
  service_id: string;
  profile_id: string;
  role: MemberRole;
  created_at: string;
  profile?: Profile;
}

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  youtube_url: string | null;
  created_at: string;
}

export interface SongKeyHistory {
  id: string;
  profile_id: string;
  song_id: string;
  key: MusicalKey | null;
  starts_in: MusicalKey | null;
  updated_at: string;
}

export interface ServiceSong {
  id: string;
  service_id: string;
  profile_id: string;
  song_id: string;
  order_index: number;
  key: MusicalKey | null;
  starts_in: MusicalKey | null;
  notes: string | null;
  created_at: string;
  song?: Song;
  profile?: Profile;
}

export interface PushSubscription {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

// ============================================================
// HELPERS / DISPLAY
// ============================================================

export const SERVICE_LABELS: Record<ServiceType, string> = {
  jueves:               'Reunión general',
  sabado_adolescentes:  'Adolescentes',
  sabado_jovenes:       'Jóvenes',
  domingo_ninos:        'Niños',
  domingo_general:      'Reunión general',
};

export const SERVICE_DAY: Record<ServiceType, string> = {
  jueves:               'Jueves',
  sabado_adolescentes:  'Sábado',
  sabado_jovenes:       'Sábado',
  domingo_ninos:        'Domingo',
  domingo_general:      'Domingo',
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  director_alabanzas:   'Alabanzas',
  director_adoraciones: 'Adoraciones',
  coro:                 'Coro',
};

export const AVATAR_COLORS: Record<AvatarColor, { bg: string; text: string }> = {
  purple: { bg: 'bg-purple-100', text: 'text-purple-900' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-800'   },
  coral:  { bg: 'bg-orange-100', text: 'text-orange-800' },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-800'   },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-800'   },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-800'  },
};

export const AVATAR_COLOR_LIST: AvatarColor[] = ['purple', 'teal', 'coral', 'blue', 'pink', 'amber'];

export const SERVICE_WEEKDAYS = [3, 5, 6];
