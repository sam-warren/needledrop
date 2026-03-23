import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { LogCard } from '@/components/LogCard'
import { Avatar } from '@/components/Avatar'
import { AvatarUpload } from '@/components/AvatarUpload'
import { FollowButton } from '@/components/FollowButton'
import { RatingChart } from '@/components/RatingChart'
import { StarRating } from '@/components/StarRating'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { Heart } from 'lucide-react'
import { format } from 'date-fns'

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const [
    { data: logs },
    { count: followersCount },
    { count: followingCount },
    { data: userLikes },
  ] = await Promise.all([
    supabase
      .from('logs')
      .select('*')
      .eq('user_id', profile.id)
      .order('listened_at', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
    supabase
      .from('likes')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false }),
  ])

  const allLogs = logs ?? []
  const allLikes = userLikes ?? []
  const likedSpotifyIds = new Set(allLikes.map((l) => l.spotify_id))

  // Fix: only average logs that have a rating
  const ratedLogs = allLogs.filter((l) => l.rating)
  const avgRating =
    ratedLogs.length > 0
      ? (ratedLogs.reduce((sum, l) => sum + (l.rating ?? 0), 0) / ratedLogs.length).toFixed(1)
      : null

  // Rating distribution
  const ratingCounts = new Map<number, number>()
  for (let r = 0.5; r <= 5; r += 0.5) {
    ratingCounts.set(r, 0)
  }
  for (const log of allLogs) {
    if (log.rating) {
      ratingCounts.set(log.rating, (ratingCounts.get(log.rating) ?? 0) + 1)
    }
  }

  // Diary: group logs by month
  const logsByMonth = new Map<string, typeof allLogs>()
  for (const log of allLogs) {
    const month = log.listened_at.slice(0, 7)
    if (!logsByMonth.has(month)) logsByMonth.set(month, [])
    logsByMonth.get(month)!.push(log)
  }

  let isFollowing = false
  if (currentUser && currentUser.id !== profile.id) {
    const { data: followRow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', profile.id)
      .single()
    isFollowing = !!followRow
  }

  const isOwn = currentUser?.id === profile.id

  const profileForCard = {
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
  }

  return (
    <div>
      {/* Profile header */}
      <div className="flex items-start gap-4 mb-6">
        {isOwn && currentUser ? (
          <AvatarUpload
            userId={currentUser.id}
            currentAvatarUrl={profile.avatar_url}
            name={profile.display_name ?? profile.username}
          />
        ) : (
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name ?? profile.username}
            className="h-16 w-16 text-lg"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs text-muted-foreground">@{profile.username}</span>
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {profile.display_name ?? profile.username}
              </h1>
            </div>
            {!isOwn && currentUser && (
              <FollowButton
                targetUserId={profile.id}
                currentUserId={currentUser.id}
                initialIsFollowing={isFollowing}
              />
            )}
          </div>

          {profile.bio && (
            <p className="mt-1 text-sm text-muted-foreground">{profile.bio}</p>
          )}

        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 text-sm">
        <div className="text-center py-3 rounded border border-border">
          <strong className="block">{allLogs.length}</strong>
          <span className="text-muted-foreground text-xs">review{allLogs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="text-center py-3 rounded border border-border">
          <strong className="block">{avgRating ?? '—'}</strong>
          <span className="text-muted-foreground text-xs">avg rating</span>
        </div>
        <div className="text-center py-3 rounded border border-border">
          <strong className="block">{followersCount ?? 0}</strong>
          <span className="text-muted-foreground text-xs">followers</span>
        </div>
        <div className="text-center py-3 rounded border border-border">
          <strong className="block">{followingCount ?? 0}</strong>
          <span className="text-muted-foreground text-xs">following</span>
        </div>
      </div>

      {/* Rating distribution */}
      {ratedLogs.length > 0 && (
        <div className="mb-6">
          <RatingChart ratingCounts={ratingCounts} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="reviews">
        <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="diary">Diary</TabsTrigger>
          <TabsTrigger value="likes">Likes</TabsTrigger>
        </TabsList>

        {/* Reviews tab (all logs — reviews are distinguished by amber border) */}
        <TabsContent value="reviews">
          {allLogs.length > 0 ? (
            <div>
              {allLogs.map((log) => (
                <LogCard
                  key={log.id}
                  log={log}
                  profile={profileForCard}
                  showUser={false}
                  currentUserId={currentUser?.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-12 text-center">No reviews yet.</p>
          )}
        </TabsContent>

        {/* Diary tab */}
        <TabsContent value="diary">
          {allLogs.length > 0 ? (
            <div className="space-y-8">
              {[...logsByMonth.entries()].map(([monthKey, monthLogs]) => (
                <div key={monthKey}>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    {format(new Date(monthKey + '-01'), 'MMMM yyyy')}
                  </h3>
                  <div className="space-y-0">
                    {monthLogs.map((log) => {
                      const day = log.listened_at.slice(8, 10).replace(/^0/, '')
                      const mediaPath = log.media_type === 'album' ? 'albums' : 'tracks'
                      return (
                        <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                          <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                            {day}
                          </span>
                          {log.artwork_url ? (
                            <Image
                              src={log.artwork_url}
                              alt={log.title}
                              width={40}
                              height={40}
                              className="rounded object-cover aspect-square shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <a href={`/${mediaPath}/${log.spotify_id}`} className="text-sm font-medium hover:underline truncate block">
                              {log.title}
                            </a>
                            <p className="text-xs text-muted-foreground truncate">
                              {log.artist}
                              <span className="ml-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/50">
                                {log.media_type}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {log.rating && (
                              <StarRating value={log.rating} readonly size="sm" />
                            )}
                            {likedSpotifyIds.has(log.spotify_id) && (
                              <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-12 text-center">No entries yet.</p>
          )}
        </TabsContent>


        {/* Likes tab */}
        <TabsContent value="likes">
          {allLikes.length > 0 ? (
            <div>
              {allLikes.map((like) => {
                const mediaPath = like.media_type === 'album' ? 'albums' : 'tracks'
                return (
                  <article key={`${like.user_id}-${like.spotify_id}`} className="flex gap-4 py-4 border-b last:border-b-0">
                    <a href={`/${mediaPath}/${like.spotify_id}`} className="shrink-0">
                      {like.artwork_url ? (
                        <Image
                          src={like.artwork_url}
                          alt={like.title}
                          width={72}
                          height={72}
                          className="rounded object-cover aspect-square"
                        />
                      ) : (
                        <div className="w-[72px] h-[72px] rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                          No art
                        </div>
                      )}
                    </a>
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/${mediaPath}/${like.spotify_id}`}
                        className="font-semibold leading-tight hover:underline truncate block"
                      >
                        {like.title}
                      </a>
                      <p className="text-sm text-muted-foreground truncate">
                        {like.artist}
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground/50">
                          {like.media_type}
                        </span>
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                        <span className="text-xs text-muted-foreground">Liked</span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="text-muted-foreground py-12 text-center">No likes yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
