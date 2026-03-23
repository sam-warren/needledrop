import Image from 'next/image'
import Link from 'next/link'
import { StarRating } from './StarRating'
import { LogActions } from './LogActions'
import { Avatar } from '@/components/Avatar'
import { formatDistanceToNow } from 'date-fns'

interface LogCardProps {
  log: {
    id: string
    title: string
    artist: string
    artwork_url: string | null
    rating: number | null
    review: string | null
    listened_at: string
    created_at: string | null
    media_type: string
    spotify_id: string
    user_id: string
  }
  profile: {
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  showUser?: boolean
  currentUserId?: string | null
}

export function LogCard({ log, profile, showUser = true, currentUserId }: LogCardProps) {
  const isOwner = currentUserId === log.user_id
  const mediaPath = log.media_type === 'album' ? 'albums' : 'tracks'
  return (
    <article className="flex gap-3 sm:gap-4 py-3 sm:py-4 border-b last:border-b-0">
      <Link href={`/${mediaPath}/${log.spotify_id}`} className="shrink-0">
        {log.artwork_url ? (
          <Image
            src={log.artwork_url}
            alt={log.title}
            width={72}
            height={72}
            className="rounded-md object-cover w-16 h-16 sm:w-[72px] sm:h-[72px]"
          />
        ) : (
          <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">
            No art
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 block">
          {log.media_type}
        </span>
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/${mediaPath}/${log.spotify_id}`}
            className="font-semibold leading-tight hover:underline truncate"
          >
            {log.title}
          </Link>
          {isOwner && <LogActions logId={log.id} />}
        </div>
        <p className="text-xs text-muted-foreground truncate -mt-0.5 leading-tight">
          {log.artist}
        </p>

        {log.rating && (
          <div className="mt-3">
            <StarRating value={log.rating} readonly size="sm" />
          </div>
        )}

        {log.review && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 border-l-2 border-primary pl-2">{log.review}</p>
        )}

        <div className="mt-2 flex items-center gap-2">
          {showUser && (
            <Link
              href={`/users/${profile.username}`}
              className="flex items-center gap-1.5 hover:underline py-0.5"
            >
              <Avatar src={profile.avatar_url} name={profile.display_name ?? profile.username} className="h-5 w-5 text-[10px]" />
              <span className="text-xs font-medium">{profile.display_name ?? profile.username}</span>
            </Link>
          )}
          {log.created_at && (
            <span className="text-xs text-muted-foreground/60">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
