# Features V2: Duration, Genres, Likes, Rating Chart, Diary

## Summary

Add five features to needledrop: Spotify duration and genre metadata on detail pages, an independent like/unlike system, a rating distribution bar chart on profiles, a diary tab on profiles, and media type indicators in log entries.

## 1. Duration & Genres

### Data layer

Update existing Spotify interfaces in `src/lib/spotify.ts` to include the fields the API returns but we weren't typing:

```typescript
// Update artist type used in SpotifyAlbum and SpotifyTrack:
// Change { name: string } to { id: string; name: string }

export interface SpotifyAlbum {
  id: string
  type: 'album'
  name: string
  artists: { id: string; name: string }[]
  images: { url: string; width: number; height: number }[]
  release_date: string
  total_tracks: number
  tracks: {
    items: { duration_ms: number }[]
  }
}

export interface SpotifyTrack {
  id: string
  type: 'track'
  name: string
  artists: { id: string; name: string }[]
  album: {
    name: string
    images: { url: string; width: number; height: number }[]
  }
  duration_ms: number
}
```

Add `SpotifyArtist` interface and `getSpotifyArtist` function:

```typescript
export interface SpotifyArtist {
  id: string
  name: string
  genres: string[]
  images: { url: string; width: number; height: number }[]
}

export async function getSpotifyArtist(artistId: string): Promise<SpotifyArtist> {
  const token = await getSpotifyToken()
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Spotify artist fetch failed: ${res.statusText}`)
  return res.json()
}
```

Note on album duration: The Spotify API paginates album tracks (max 50 per page). For albums with >50 tracks, the first page is sufficient — this is an edge case (boxed sets) and approximate duration is acceptable.

### Duration formatting

Add a `formatDuration` utility to `src/lib/utils.ts`:
- Takes `durationMs: number`
- If >= 3600000 (60 minutes): returns `"Xh Ym"` (e.g., `"1h 12m"`)
- Otherwise: returns `"Xm Ys"` (e.g., `"6m 23s"`)

### Album detail page (`/albums/[spotifyId]`)

- Fetch the first artist's data via `getSpotifyArtist(album.artists[0].id)` alongside the existing album fetch (use `Promise.all`)
- Compute album duration by summing `duration_ms` across `album.tracks.items`
- Display duration after the release year in the metadata line (e.g., `"Radiohead · 1997 · 53m 21s"`)
- Display artist genres as `Badge variant="secondary"` components below the metadata line

### Track detail page (`/tracks/[spotifyId]`)

- Fetch the first artist's data via `getSpotifyArtist(track.artists[0].id)` alongside the existing track fetch
- Display `track.duration_ms` formatted after the album name in the metadata line
- Display artist genres as `Badge variant="secondary"` components below the metadata line

## 2. Likes

### Database

New migration `supabase/migrations/0003_likes.sql`:

```sql
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
```

The `title`, `artist`, and `artwork_url` columns store metadata at like-time (same pattern as `logs`), avoiding N Spotify API calls when rendering the likes tab on profiles.

### LikeButton component

New file: `src/components/LikeButton.tsx`

Client component following the same pattern as `FollowButton`:
- Props: `spotifyId`, `mediaType`, `currentUserId`, `initialIsLiked`, `title`, `artist`, `artworkUrl`
- Heart icon from lucide-react: filled red when liked, outline when not
- Click inserts (with metadata) or deletes from the `likes` table
- Uses `useTransition` for pending state

### Where it appears and data flow

Album/track detail pages check liked status server-side and pass `initialIsLiked` to the client component:

```typescript
// In the server component (album or track page):
const { data: likeRow } = await supabase
  .from('likes')
  .select('user_id')
  .eq('user_id', user.id)
  .eq('spotify_id', spotifyId)
  .single()
const isLiked = !!likeRow

// Then render:
<LikeButton
  spotifyId={spotifyId}
  mediaType="album"
  currentUserId={user.id}
  initialIsLiked={isLiked}
  title={album.name}
  artist={album.artists.map(a => a.name).join(', ')}
  artworkUrl={album.images[0]?.url ?? null}
/>
```

Appears next to the "Log this album/track" button on detail pages.

## 3. Media type indicator in LogCard

Modify `src/components/LogCard.tsx`:

Add a small uppercase label showing the media type next to the artist text. Use muted styling to keep it subtle:

```tsx
<p className="text-sm text-muted-foreground truncate">
  {log.artist}
  <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground/50">
    {log.media_type}
  </span>
</p>
```

This uses the existing `media_type` field already stored in logs — no data changes needed.

## 4. Rating distribution bar chart

### Profile page addition

Add a rating distribution section to `src/app/(main)/users/[username]/page.tsx`, positioned between the stats row and the tabs.

### Data

Compute from the existing `allLogs` array (already fetched). Only count logs that have a rating (filter nulls):

```typescript
const ratingCounts = new Map<number, number>()
for (let r = 0.5; r <= 5; r += 0.5) {
  ratingCounts.set(r, 0)
}
for (const log of allLogs) {
  if (log.rating) {
    ratingCounts.set(log.rating, (ratingCounts.get(log.rating) ?? 0) + 1)
  }
}
const maxCount = Math.max(...ratingCounts.values(), 1)
```

Also fix the existing `avgRating` computation on the profile page — it currently divides by `allLogs.length` but should divide by only the count of logs that have a rating.

### Rendering

New component: `src/components/RatingChart.tsx`

Props: `ratingCounts: Map<number, number>`, `maxCount: number`

Horizontal bar chart with no chart library — styled divs:
- 10 rows, one per half-star increment (½ through 5)
- Left label: star value displayed as text (e.g., "½", "1", "1½", ... "5")
- Bar: div with `width` as percentage of `maxCount`, primary (amber) background color
- Right label: count number
- Compact design — each bar is ~16px tall

## 5. Diary tab + Likes tab on profile page

### Profile page tabs update

Current tabs: Logs, Reviews
New tabs: Logs, Diary, Reviews, Likes

### Diary tab

Shows logs grouped by month, newest month first.

Group the existing `allLogs` by `YYYY-MM` of `listened_at`. Since `listened_at` is a `date` type (no time component), sort within each month by `listened_at` descending, then by `created_at` descending as tiebreaker.

```typescript
const logsByMonth = new Map<string, typeof allLogs>()
for (const log of allLogs) {
  const month = log.listened_at.slice(0, 7) // "2026-03"
  if (!logsByMonth.has(month)) logsByMonth.set(month, [])
  logsByMonth.get(month)!.push(log)
}
```

Each month section:
- Header: formatted month name + year (e.g., "March 2026")
- Table-like rows, each showing:
  - Day of month (from `listened_at`, e.g., "15")
  - Album art thumbnail (40x40, using `next/image`)
  - Title + artist
  - Media type badge (ALBUM / TRACK) — small, uppercase, muted
  - Star rating (using `StarRating` component, readonly, size sm)
  - Heart icon if the item is liked (filled, small, primary color)

### Likes data for diary and likes tab

Fetch user's likes in the profile page data loading alongside existing queries:

```typescript
const { data: userLikes } = await supabase
  .from('likes')
  .select('*')
  .eq('user_id', profile.id)
  .order('created_at', { ascending: false })

const likedSpotifyIds = new Set((userLikes ?? []).map((l) => l.spotify_id))
```

Pass `likedSpotifyIds` to the diary component. Show a small filled heart icon on rows where `likedSpotifyIds.has(log.spotify_id)`.

### Likes tab

Display `userLikes` (already fetched above) as a list using the same visual pattern as `LogCard`:
- Album art thumbnail (72x72)
- Title + artist
- Media type badge
- Heart icon (always filled, since these are all liked)
- Relative timestamp ("2 days ago")

Reuse the `LogCard` layout pattern but without rating/review fields (likes don't have those). Create a simple inline rendering rather than a new component — the likes tab content is straightforward.

## Files to create or modify

| File | Action | Description |
|---|---|---|
| `src/lib/spotify.ts` | Modify | Update `SpotifyAlbum` and `SpotifyTrack` interfaces (add `artists[].id`, `album.tracks`). Add `SpotifyArtist` interface and `getSpotifyArtist` function. |
| `src/lib/utils.ts` | Modify | Add `formatDuration` utility |
| `src/app/(main)/albums/[spotifyId]/page.tsx` | Modify | Add duration, genres, like button |
| `src/app/(main)/tracks/[spotifyId]/page.tsx` | Modify | Add duration, genres, like button |
| `supabase/migrations/0003_likes.sql` | Create | Likes table with metadata columns and RLS |
| `src/components/LikeButton.tsx` | Create | Heart toggle component with metadata props |
| `src/components/LogCard.tsx` | Modify | Add media type indicator |
| `src/components/RatingChart.tsx` | Create | Horizontal bar chart component |
| `src/app/(main)/users/[username]/page.tsx` | Modify | Fix avgRating bug, add rating chart, diary tab, likes tab |
