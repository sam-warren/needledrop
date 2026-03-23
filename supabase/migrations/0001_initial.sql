-- profiles (extends auth.users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- follows
create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- logs (a user's listen entry for an album or track)
create table logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  spotify_id text not null,
  media_type text not null check (media_type in ('album', 'track')),
  title text not null,
  artist text not null,
  artwork_url text,
  rating smallint check (rating between 1 and 5),
  review text,
  listened_at date not null default current_date,
  created_at timestamptz default now()
);

-- RLS policies
alter table profiles enable row level security;
alter table follows enable row level security;
alter table logs enable row level security;

-- profiles: readable by all, editable by owner
create policy "Public profiles" on profiles for select using (true);
create policy "Owner update" on profiles for update using (auth.uid() = id);

-- follows: readable by all, insert/delete by owner
create policy "Public follows" on follows for select using (true);
create policy "Follow" on follows for insert with check (auth.uid() = follower_id);
create policy "Unfollow" on follows for delete using (auth.uid() = follower_id);

-- logs: readable by all, insert/update/delete by owner
create policy "Public logs" on logs for select using (true);
create policy "Insert log" on logs for insert with check (auth.uid() = user_id);
create policy "Update log" on logs for update using (auth.uid() = user_id);
create policy "Delete log" on logs for delete using (auth.uid() = user_id);

-- trigger: auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
