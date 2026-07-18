alter table public.service_songs
  drop constraint if exists service_songs_song_id_fkey,
  add constraint service_songs_song_id_fkey
    foreign key (song_id) references public.songs(id) on delete cascade;

alter table public.song_key_history
  drop constraint if exists song_key_history_song_id_fkey,
  add constraint song_key_history_song_id_fkey
    foreign key (song_id) references public.songs(id) on delete cascade;
