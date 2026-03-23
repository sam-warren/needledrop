'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { StarRating } from '@/components/StarRating'
import { LikeButton } from '@/components/LikeButton'
import { DatePicker } from '@/components/DatePicker'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'

interface LogData {
  id: string
  title: string
  artist: string
  artwork_url: string | null
  rating: number | null
  review: string | null
  listened_at: string
  media_type: string
  spotify_id: string
  user_id: string
}

export default function EditLogPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const logId = params.id

  const [log, setLog] = useState<LogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [listenedAt, setListenedAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    async function fetchLog() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('logs')
        .select('*')
        .eq('id', logId)
        .single()

      if (!data || data.user_id !== user.id) {
        router.push('/feed')
        return
      }

      setLog(data)
      setRating(data.rating)
      setReview(data.review ?? '')
      setListenedAt(data.listened_at)
      setUserId(user.id)

      const { data: likeRow } = await supabase
        .from('likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('spotify_id', data.spotify_id)
        .single()
      setIsLiked(!!likeRow)

      setLoading(false)
    }

    fetchLog()
  }, [logId, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) {
      setError('Please select a rating.')
      return
    }

    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('logs')
      .update({
        rating,
        review: review.trim() || null,
        listened_at: listenedAt,
      })
      .eq('id', logId)

    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
      router.push(profile ? `/users/${profile.username}` : '/feed')
    } else {
      router.push('/feed')
    }
    router.refresh()
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <Skeleton className="h-5 w-32 mb-6" />
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-20 w-20 rounded-md" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    )
  }

  if (!log) return null

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-6">Edit review</h1>

      <div className="flex gap-4 mb-6 p-4 rounded-lg border bg-card items-center">
        {log.artwork_url && (
          <Image
            src={log.artwork_url}
            alt={log.title}
            width={80}
            height={80}
            className="rounded-md object-cover w-20 h-20 shrink-0"
          />
        )}
        <div className="min-w-0">
          <p className="font-semibold leading-tight truncate">{log.title}</p>
          <p className="text-sm text-muted-foreground truncate">{log.artist}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Rating <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center justify-between">
            <StarRating value={rating} onChange={setRating} size="lg" />
            {userId && log && (
              <LikeButton
                spotifyId={log.spotify_id}
                mediaType={log.media_type as 'album' | 'track'}
                currentUserId={userId}
                initialIsLiked={isLiked}
                title={log.title}
                artist={log.artist}
                artworkUrl={log.artwork_url}
                showLabel
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="listened_at" className="text-sm font-medium">
            Date listened
          </label>
          <DatePicker value={listenedAt} onChange={setListenedAt} />
        </div>

        <div className="space-y-2">
          <label htmlFor="review" className="text-sm font-medium">
            Review <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            id="review"
            placeholder="What did you think?"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={6}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </div>
  )
}
