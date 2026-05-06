-- ============================================================
-- RENUEVO MUSIC APP — Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (sin auth, selección simple)
-- ============================================================
create table public.profiles (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  photo_url   text,
  initials    text not null,
  color       text not null default 'purple', -- purple | teal | coral | blue | pink | amber
  created_at  timestamptz default now()
);

-- Insertar perfil inicial de Misael
insert into public.profiles (name, initials, color)
values ('Misael Peloc', 'MP', 'purple');

-- ============================================================
-- SERVICES (servicios semanales)
-- Tipos: jueves | sabado_adolescentes | sabado_jovenes | domingo_ninos | domingo_general
-- ============================================================
create table public.services (
  id          uuid primary key default uuid_generate_v4(),
  date        date not null,
  type        text not null check (type in (
                'jueves',
                'sabado_adolescentes',
                'sabado_jovenes',
                'domingo_ninos',
                'domingo_general'
              )),
  created_at  timestamptz default now(),
  unique (date, type)
);

-- ============================================================
-- SERVICE_MEMBERS (asignaciones de roles por servicio)
-- Roles: director_alabanzas | director_adoraciones | coro
-- ============================================================
create table public.service_members (
  id          uuid primary key default uuid_generate_v4(),
  service_id  uuid not null references public.services(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('director_alabanzas', 'director_adoraciones', 'coro')),
  created_at  timestamptz default now(),
  unique (service_id, profile_id, role)
);

-- ============================================================
-- SONGS (catálogo global de canciones)
-- ============================================================
create table public.songs (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  artist      text,
  youtube_url text,
  created_at  timestamptz default now()
);

-- Índice para búsqueda por título
create index songs_title_idx on public.songs using gin(to_tsvector('spanish', title));

-- ============================================================
-- SONG_KEY_HISTORY (historial de tono por persona por canción)
-- Guarda el último tono y "comienza en" que usó cada persona
-- ============================================================
create table public.song_key_history (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  song_id     uuid not null references public.songs(id) on delete cascade,
  key         text,        -- tono principal (ej: 'A', 'Bm', 'C#', 'Ebm')
  starts_in   text,        -- tono de inicio si difiere (ej: 'G')
  updated_at  timestamptz default now(),
  unique (profile_id, song_id)
);

-- ============================================================
-- SERVICE_SONGS (lista de canciones por servicio y director)
-- ============================================================
create table public.service_songs (
  id          uuid primary key default uuid_generate_v4(),
  service_id  uuid not null references public.services(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  song_id     uuid not null references public.songs(id) on delete cascade,
  order_index integer not null default 0,
  key         text,        -- tono para este servicio en particular
  starts_in   text,        -- "comienza en" para este servicio
  notes       text,        -- notas adicionales (tempo, instrucciones)
  created_at  timestamptz default now()
);

-- Índice para queries por servicio
create index service_songs_service_idx on public.service_songs(service_id, profile_id, order_index);

-- ============================================================
-- PUSH_SUBSCRIPTIONS (para notificaciones push PWA)
-- ============================================================
create table public.push_subscriptions (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz default now()
);

-- ============================================================
-- TRIGGER: actualizar song_key_history al guardar service_song
-- Cuando alguien agrega/edita una canción con tono, se guarda
-- en su historial para presetear la próxima vez
-- ============================================================
create or replace function public.update_song_key_history()
returns trigger as $$
begin
  if new.key is not null or new.starts_in is not null then
    insert into public.song_key_history (profile_id, song_id, key, starts_in, updated_at)
    values (new.profile_id, new.song_id, new.key, new.starts_in, now())
    on conflict (profile_id, song_id)
    do update set
      key        = excluded.key,
      starts_in  = excluded.starts_in,
      updated_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_update_key_history
after insert or update on public.service_songs
for each row execute function public.update_song_key_history();

-- ============================================================
-- FUNCIÓN: generar servicios de una semana dada
-- Recibe el lunes de la semana como parámetro
-- ============================================================
create or replace function public.generate_weekly_services(week_start date)
returns void as $$
declare
  thursday  date := week_start + interval '3 days';
  saturday  date := week_start + interval '5 days';
  sunday    date := week_start + interval '6 days';
begin
  -- Jueves
  insert into public.services (date, type) values (thursday, 'jueves')
  on conflict (date, type) do nothing;
  -- Sábado adolescentes
  insert into public.services (date, type) values (saturday, 'sabado_adolescentes')
  on conflict (date, type) do nothing;
  -- Sábado jóvenes
  insert into public.services (date, type) values (saturday, 'sabado_jovenes')
  on conflict (date, type) do nothing;
  -- Domingo niños
  insert into public.services (date, type) values (sunday, 'domingo_ninos')
  on conflict (date, type) do nothing;
  -- Domingo general
  insert into public.services (date, type) values (sunday, 'domingo_general')
  on conflict (date, type) do nothing;
end;
$$ language plpgsql;

-- Generar las próximas 8 semanas desde hoy
do $$
declare
  i int;
  monday date;
begin
  for i in 0..7 loop
    monday := date_trunc('week', current_date)::date + (i * 7);
    perform public.generate_weekly_services(monday);
  end loop;
end;
$$;

-- ============================================================
-- RLS (Row Level Security) — todo público para esta app
-- ya que el control de acceso es por selección de perfil
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.services          enable row level security;
alter table public.service_members   enable row level security;
alter table public.songs             enable row level security;
alter table public.song_key_history  enable row level security;
alter table public.service_songs     enable row level security;
alter table public.push_subscriptions enable row level security;

-- Políticas: acceso total anon (la app maneja la sesión por perfil)
create policy "allow_all" on public.profiles          for all using (true) with check (true);
create policy "allow_all" on public.services          for all using (true) with check (true);
create policy "allow_all" on public.service_members   for all using (true) with check (true);
create policy "allow_all" on public.songs             for all using (true) with check (true);
create policy "allow_all" on public.song_key_history  for all using (true) with check (true);
create policy "allow_all" on public.service_songs     for all using (true) with check (true);
create policy "allow_all" on public.push_subscriptions for all using (true) with check (true);

-- ============================================================
-- Habilitar Realtime en las tablas que necesitan sync en vivo
-- ============================================================
alter publication supabase_realtime add table public.service_members;
alter publication supabase_realtime add table public.service_songs;
alter publication supabase_realtime add table public.services;
