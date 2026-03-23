'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number | null
  onChange?: (value: number | null) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizePxMap = { sm: 14, md: 20, lg: 24 }

/**
 * Resolve the new rating when a star is clicked.
 * - Clicking a star sets the rating to that full star value.
 * - Clicking the rightmost filled star again toggles it to a half star.
 * - Clicking a half star (same star) clears back to the previous full star (or null if star 1).
 */
export function resolveClick(starIndex: number, currentValue: number | null): number | null {
  if (currentValue === starIndex) {
    // Full star tapped again → half star
    return starIndex - 0.5
  }
  if (currentValue === starIndex - 0.5) {
    // Half star tapped again → remove that star entirely
    return starIndex > 1 ? starIndex - 1 : null
  }
  // Any other tap → set to full star
  return starIndex
}

export function starFill(starIndex: number, displayed: number): 'full' | 'half' | 'empty' {
  if (displayed >= starIndex) return 'full'
  if (displayed >= starIndex - 0.5) return 'half'
  return 'empty'
}

function StarShape({
  fill,
  sizePx,
}: {
  fill: 'full' | 'half' | 'empty'
  sizePx: number
}) {
  return (
    <span className="relative block" style={{ width: sizePx, height: sizePx }}>
      {/* Empty base */}
      <Star
        style={{ width: sizePx, height: sizePx }}
        className="absolute inset-0 fill-none text-muted-foreground/30"
      />
      {/* Filled overlay, clipped to 50% for half or 100% for full */}
      {fill !== 'empty' && (
        <span
          className="absolute inset-0 overflow-hidden block"
          style={{ width: fill === 'half' ? '50%' : '100%' }}
        >
          <Star
            style={{ width: sizePx, height: sizePx }}
            className="fill-amber-400 text-amber-400"
          />
        </span>
      )}
    </span>
  )
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const sizePx = sizePxMap[size]
  const displayed = hovered ?? value ?? 0

  return (
    <div
      className="flex gap-0.5"
      onMouseLeave={() => !readonly && setHovered(null)}
      aria-label={value != null ? `${value} out of 5 stars` : 'Not rated'}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          role={readonly ? undefined : 'button'}
          aria-label={readonly ? undefined : `Rate ${star} stars`}
          className={cn(
            'relative block select-none',
            !readonly && 'cursor-pointer'
          )}
          style={{ width: sizePx, height: sizePx }}
          onMouseEnter={() => {
            if (readonly) return
            setHovered(star)
          }}
          onClick={() => {
            if (readonly || !onChange) return
            setHovered(null)
            onChange(resolveClick(star, value))
          }}
        >
          <StarShape fill={starFill(star, displayed)} sizePx={sizePx} />
        </span>
      ))}
    </div>
  )
}
