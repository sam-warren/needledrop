-- Create avatars storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Allow authenticated users to upload their own avatar
create policy "Users can upload own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] is null
  and starts_with(name, auth.uid()::text)
);

-- Allow authenticated users to update (overwrite) their own avatar
create policy "Users can update own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and starts_with(name, auth.uid()::text)
);

-- Allow public read access to all avatars
create policy "Public avatar access"
on storage.objects for select
to public
using (bucket_id = 'avatars');
