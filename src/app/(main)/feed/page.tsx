import { createClient } from '@/lib/supabase/server'
import { LogCard } from '@/components/LogCard'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch IDs of users the current user follows
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (following ?? []).map((f) => f.following_id)
  const feedUserIds = [user.id, ...followingIds]

  const { data: logs } = await supabase
    .from('logs')
    .select('*, profiles!logs_user_id_fkey(username, display_name, avatar_url)')
    .in('user_id', feedUserIds)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 className="sr-only">Feed</h1>

      {logs && logs.length > 0 ? (
        <div>
          {logs.map((log) => {
            const profile = log.profiles as {
              username: string
              display_name: string | null
              avatar_url: string | null
            } | null

            if (!profile) return null

            return (
              <LogCard
                key={log.id}
                log={log}
                profile={profile}
                showUser={true}
                currentUserId={user.id}
              />
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium mb-2">Nothing here yet</p>
          <p className="text-sm">
            Use ⌘K to search for music and start reviewing, or find people to follow.
          </p>
        </div>
      )}
    </div>
  )
}
