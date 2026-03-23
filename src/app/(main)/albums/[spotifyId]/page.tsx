import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSpotifyAlbum, getSpotifyArtist } from '@/lib/spotify'
import { formatDuration } from '@/lib/utils'
import { LikeButton } from '@/components/LikeButton'
import { RatingChart } from '@/components/RatingChart'
import { StarRating } from '@/components/StarRating'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, ExternalLink } from 'lucide-react'

interface AlbumPageProps {
  params: Promise<{ spotifyId: string }>
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { spotifyId } = await params

  const [album, supabase] = await Promise.all([
    getSpotifyAlbum(spotifyId).catch(() => null),
    createClient(),
  ])

  if (!album) notFound()

  // Fetch artist genres (don't fail if this fails)
  const artist = await getSpotifyArtist(album.artists[0].id).catch(() => null)

  // Compute album duration
  const albumDurationMs = album.tracks.items.reduce((sum, t) => sum + t.duration_ms, 0)

  const { data: { user } } = await supabase.auth.getUser()

  let isLiked = false
  if (user) {
    const { data: likeRow } = await supabase
      .from('likes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('spotify_id', spotifyId)
      .single()
    isLiked = !!likeRow
  }

  // Fetch album logs and track ratings in parallel
  const trackIds = album.tracks.items.map((t) => t.id)

  const [{ data: logs }, { data: trackLogs }] = await Promise.all([
    supabase
      .from('logs')
      .select('*, profiles!logs_user_id_fkey(username, display_name, avatar_url)')
      .eq('spotify_id', spotifyId)
      .eq('media_type', 'album')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('logs')
      .select('spotify_id, rating')
      .in('spotify_id', trackIds)
      .eq('media_type', 'track')
      .not('rating', 'is', null),
  ])

  // Compute avg rating per track
  const trackRatings = new Map<string, { sum: number; count: number }>()
  for (const log of trackLogs ?? []) {
    const entry = trackRatings.get(log.spotify_id) ?? { sum: 0, count: 0 }
    entry.sum += log.rating!
    entry.count += 1
    trackRatings.set(log.spotify_id, entry)
  }

  const allLogs = logs ?? []
  const logsWithRating = allLogs.filter((l) => l.rating)
  const avgRating =
    logsWithRating.length > 0
      ? logsWithRating.reduce((sum, l) => sum + (l.rating ?? 0), 0) / logsWithRating.length
      : null

  const ratingCounts = new Map<number, number>()
  for (let r = 0.5; r <= 5; r += 0.5) ratingCounts.set(r, 0)
  for (const log of logsWithRating) {
    ratingCounts.set(log.rating!, (ratingCounts.get(log.rating!) ?? 0) + 1)
  }

  const releaseYear = album.release_date?.split('-')[0]
  const artworkUrl = album.images[0]?.url

  return (
    <div>
      {/* Album header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {artworkUrl ? (
          <Image
            src={artworkUrl}
            alt={album.name}
            width={160}
            height={160}
            className="rounded object-cover w-32 h-32 sm:w-40 sm:h-40 shrink-0"
          />
        ) : (
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded bg-muted shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="mb-2">Album</Badge>
          <h1 className="text-2xl font-bold tracking-tight leading-tight">{album.name}</h1>
          <p className="text-muted-foreground mt-1">
            {album.artists.map((a) => a.name).join(', ')}
            {releaseYear && <span> · {releaseYear}</span>}
            <span> · {formatDuration(albumDurationMs)}</span>
          </p>

          {artist?.genres && artist.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {artist.genres.slice(0, 5).map((genre) => (
                <Badge key={genre} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          {avgRating !== null && (
            <div className="flex items-center gap-2 mt-3">
              <StarRating value={Math.round(avgRating * 2) / 2} readonly size="sm" />
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} · {logsWithRating.length} rating{logsWithRating.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button asChild>
              <Link href={`/log/new?spotifyId=${spotifyId}&type=album`}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Review this album
              </Link>
            </Button>
            <Button asChild variant="secondary" size="icon">
              <a href={`https://open.spotify.com/album/${spotifyId}`} target="_blank" rel="noopener noreferrer" aria-label="Open in Spotify">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            {user && (
              <LikeButton
                spotifyId={spotifyId}
                mediaType="album"
                currentUserId={user.id}
                initialIsLiked={isLiked}
                title={album.name}
                artist={album.artists.map((a) => a.name).join(', ')}
                artworkUrl={album.images[0]?.url ?? null}
              />
            )}
          </div>
        </div>
      </div>

      {/* Rating distribution */}
      {logsWithRating.length > 0 && (
        <div className="mb-8">
          <RatingChart ratingCounts={ratingCounts} />
        </div>
      )}

      {/* Tracklist */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Tracklist</h2>
        <div>
          {album.tracks.items.map((track) => {
            const rating = trackRatings.get(track.id)
            const avg = rating ? (rating.sum / rating.count).toFixed(1) : null

            return (
              <div key={track.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-b-0">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                  {track.track_number}
                </span>
                <Link
                  href={`/tracks/${track.id}`}
                  className="flex-1 text-sm hover:underline truncate"
                >
                  {track.name}
                </Link>
                {avg && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    ★ {avg}
                  </span>
                )}
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDuration(track.duration_ms)}
                </span>
                <a
                  href={`https://open.spotify.com/track/${track.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground/50 hover:text-foreground transition-colors shrink-0 p-2"
                  aria-label={`Open ${track.name} in Spotify`}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )
          })}
        </div>
      </div>

      {/* Community reviews */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Community reviews{' '}
          <span className="text-muted-foreground font-normal text-sm">({allLogs.length})</span>
        </h2>

        {allLogs.length > 0 ? (
          <div>
            {allLogs.map((log) => {
              const profile = log.profiles as {
                username: string
                display_name: string | null
                avatar_url: string | null
              } | null
              if (!profile) return null

              const initials = (profile.display_name ?? profile.username)
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)

              return (
                <article key={log.id} className="py-4 border-b last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/users/${profile.username}`} className="flex items-center gap-2 hover:underline">
                      <Avatar src={profile.avatar_url} name={profile.display_name ?? profile.username} className="h-5 w-5 text-[10px]" />
                      <span className="text-sm font-medium">{profile.display_name ?? profile.username}</span>
                    </Link>
                    {log.rating && <StarRating value={log.rating} readonly size="sm" />}
                  </div>
                  {log.review && (
                    <p className="text-sm text-muted-foreground border-l-2 border-primary pl-2 mt-2">
                      {log.review}
                    </p>
                  )}
                  {log.created_at && (
                    <span className="text-xs text-muted-foreground/60 block mt-2">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No one has reviewed this album yet.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href={`/log/new?spotifyId=${spotifyId}&type=album`}>Be the first</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
