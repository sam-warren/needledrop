'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { StarRating } from '@/components/StarRating'
import { LikeButton } from '@/components/LikeButton'
import { DatePicker } from '@/components/DatePicker'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface SpotifyMeta {
  title: string
  artist: string
  artwork_url: string | null
}

export default function NewLogPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const spotifyId = searchParams.get('spotifyId')
  const type = searchParams.get('type') as 'album' | 'track' | null

  const [meta, setMeta] = useState<SpotifyMeta | null>(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)

  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [listenedAt, setListenedAt] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!spotifyId || !type) {
      setMetaLoading(false)
      return
    }

    async function fetchMeta() {
      setMetaLoading(true)
      try {
        const supabase = createClient()

        // Fetch metadata and liked status in parallel
        const [metaRes, { data: { user } }] = await Promise.all([
          fetch(`/api/spotify/metadata?id=${spotifyId}&type=${type}`),
          supabase.auth.getUser(),
        ])
        const data = await metaRes.json()

        if (type === 'album') {
          setMeta({
            title: data.name,
            artist: data.artists?.map((a: { name: string }) => a.name).join(', ') ?? '',
            artwork_url: data.images?.[0]?.url ?? null,
          })
        } else {
          setMeta({
            title: data.name,
            artist: data.artists?.map((a: { name: string }) => a.name).join(', ') ?? '',
            artwork_url: data.album?.images?.[0]?.url ?? null,
          })
        }

        if (user) {
          setUserId(user.id)
          const { data: likeRow } = await supabase
            .from('likes')
            .select('user_id')
            .eq('user_id', user.id)
            .eq('spotify_id', spotifyId!)
            .single()
          setIsLiked(!!likeRow)
        }
      } catch {
        setError('Failed to load music metadata.')
      } finally {
        setMetaLoading(false)
      }
    }

    fetchMeta()
  }, [spotifyId, type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) {
      setError('Please select a rating.')
      return
    }
    if (!spotifyId || !type || !meta) return

    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error: insertError } = await supabase.from('logs').insert({
      user_id: user.id,
      spotify_id: spotifyId,
      media_type: type,
      title: meta.title,
      artist: meta.artist,
      artwork_url: meta.artwork_url,
      rating,
      review: review.trim() || null,
      listened_at: listenedAt,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    router.push(profile ? `/users/${profile.username}` : '/')
    router.refresh()
  }

  if (!spotifyId || !type) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <p className="text-muted-foreground">No music selected.</p>
        <p className="text-sm text-muted-foreground mt-2">Use ⌘K to search for music.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-6">Review {type}</h1>

      {metaLoading ? (
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-20 w-20 rounded-md shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ) : meta ? (
        <div className="flex gap-4 mb-6 p-4 rounded-lg border bg-card items-center">
          {meta.artwork_url && (
            <Image
              src={meta.artwork_url}
              alt={meta.title}
              width={80}
              height={80}
              className="rounded-md object-cover w-20 h-20 shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight truncate">{meta.title}</p>
            <p className="text-sm text-muted-foreground truncate">{meta.artist}</p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Rating <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center justify-between">
            <StarRating value={rating} onChange={setRating} size="lg" />
            {userId && spotifyId && type && meta && (
              <LikeButton
                spotifyId={spotifyId}
                mediaType={type}
                currentUserId={userId}
                initialIsLiked={isLiked}
                title={meta.title}
                artist={meta.artist}
                artworkUrl={meta.artwork_url}
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

        <Button type="submit" className="w-full" disabled={submitting || metaLoading}>
          {submitting ? 'Saving…' : 'Save review'}
        </Button>
      </form>
    </div>
  )
}
