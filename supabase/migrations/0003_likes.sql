create table likes (
  user_id uuid references profiles(id) on delete cascade,
  spotify_id text not null,
  media_type text not null check (media_type in ('album', 'track')),
  title text not null,
  artist text not null,
  artwork_url text,
  created_at timestamptz default now(),
  primary key (user_id, spotify_id)
);

alter table likes enable row level security;

create policy "Public likes" on likes for select using (true);
create policy "Insert like" on likes for insert with check (auth.uid() = user_id);
create policy "Delete like" on likes for delete using (auth.uid() = user_id);
