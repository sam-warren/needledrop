import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSpotifyTrack, getSpotifyArtist } from '@/lib/spotify'
import { LikeButton } from '@/components/LikeButton'
import { RatingChart } from '@/components/RatingChart'
import { StarRating } from '@/components/StarRating'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusCircle, ExternalLink } from 'lucide-react'

interface TrackPageProps {
  params: Promise<{ spotifyId: string }>
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { spotifyId } = await params

  const [track, supabase] = await Promise.all([
    getSpotifyTrack(spotifyId).catch(() => null),
    createClient(),
  ])

  if (!track) notFound()

  const artist = await getSpotifyArtist(track.artists[0].id).catch(() => null)

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

  const { data: logs } = await supabase
    .from('logs')
    .select('*, profiles!logs_user_id_fkey(username, display_name, avatar_url)')
    .eq('spotify_id', spotifyId)
    .eq('media_type', 'track')
    .order('created_at', { ascending: false })
    .limit(20)

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

  const artworkUrl = track.album.images[0]?.url
  const durationMin = Math.floor(track.duration_ms / 60000)
  const durationSec = String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')

  return (
    <div>
      {/* Track header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {artworkUrl ? (
          <Image
            src={artworkUrl}
            alt={track.name}
            width={160}
            height={160}
            className="rounded object-cover w-32 h-32 sm:w-40 sm:h-40 shrink-0"
          />
        ) : (
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded bg-muted shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="mb-2">Track</Badge>
          <h1 className="text-2xl font-bold tracking-tight leading-tight">{track.name}</h1>
          <p className="text-muted-foreground mt-1">
            {track.artists.map((a) => a.name).join(', ')}
          </p>
          <p className="text-sm text-muted-foreground">
            from{' '}
            <Link href={`/albums/${track.album.id}`} className="hover:underline hover:text-foreground">
              {track.album.name}
            </Link>
            {' '}· {durationMin}:{durationSec}
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
              <Link href={`/log/new?spotifyId=${spotifyId}&type=track`}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Review this track
              </Link>
            </Button>
            <Button asChild variant="secondary" size="icon">
              <a href={`https://open.spotify.com/track/${spotifyId}`} target="_blank" rel="noopener noreferrer" aria-label="Open in Spotify">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            {user && (
              <LikeButton
                spotifyId={spotifyId}
                mediaType="track"
                currentUserId={user.id}
                initialIsLiked={isLiked}
                title={track.name}
                artist={track.artists.map((a) => a.name).join(', ')}
                artworkUrl={track.album.images[0]?.url ?? null}
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
            <p>No one has reviewed this track yet.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href={`/log/new?spotifyId=${spotifyId}&type=track`}>Be the first</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
