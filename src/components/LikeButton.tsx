'use client'

import { useState, useEffect, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface LikeButtonProps {
  spotifyId: string
  mediaType: 'album' | 'track'
  currentUserId: string
  initialIsLiked: boolean
  title: string
  artist: string
  artworkUrl: string | null
  showLabel?: boolean
}

export function LikeButton({
  spotifyId,
  mediaType,
  currentUserId,
  initialIsLiked,
  title,
  artist,
  artworkUrl,
  showLabel = false,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [isPending, startTransition] = useTransition()

  // Sync with prop when it changes (e.g. async fetch on log page)
  useEffect(() => {
    setIsLiked(initialIsLiked)
  }, [initialIsLiked])

  async function toggle() {
    const supabase = createClient()

    startTransition(async () => {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('spotify_id', spotifyId)
        if (!error) setIsLiked(false)
      } else {
        const { error } = await supabase.from('likes').insert({
          user_id: currentUserId,
          spotify_id: spotifyId,
          media_type: mediaType,
          title,
          artist,
          artwork_url: artworkUrl,
        })
        if (!error) setIsLiked(true)
      }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      aria-label={isLiked ? 'Unlike' : 'Like'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded p-2 transition-colors',
        'hover:bg-accent disabled:opacity-50',
        isLiked ? 'text-red-500' : 'text-muted-foreground'
      )}
    >
      <Heart className={cn('h-5 w-5', isLiked && 'fill-current')} />
      {showLabel && (
        <span className="text-sm">{isLiked ? 'Liked' : 'Like'}</span>
      )}
    </button>
  )
}
