'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface FollowButtonProps {
  targetUserId: string
  currentUserId: string
  initialIsFollowing: boolean
}

export function FollowButton({ targetUserId, currentUserId, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isPending, startTransition] = useTransition()

  async function toggle() {
    const supabase = createClient()

    startTransition(async () => {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId)
        if (!error) setIsFollowing(false)
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        })
        if (!error) setIsFollowing(true)
      }
    })
  }

  return (
    <Button
      onClick={toggle}
      disabled={isPending}
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
    >
      {isFollowing ? 'Unfollow' : 'Follow'}
    </Button>
  )
}
