alter table public.song_key_history
  add column if not exists notes text;

create or replace function public.update_song_key_history()
returns trigger as $$
begin
  insert into public.song_key_history (profile_id, song_id, key, starts_in, notes, updated_at)
  values (new.profile_id, new.song_id, new.key, new.starts_in, new.notes, now())
  on conflict (profile_id, song_id)
  do update set
    key = excluded.key,
    starts_in = excluded.starts_in,
    notes = excluded.notes,
    updated_at = now();
  return new;
end;
$$ language plpgsql;
