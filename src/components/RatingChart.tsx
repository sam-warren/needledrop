interface RatingChartProps {
  ratingCounts: Map<number, number>
}

export function RatingChart({ ratingCounts }: RatingChartProps) {
  const maxCount = Math.max(...ratingCounts.values(), 1)

  return (
    <div className="flex items-end gap-1 h-16">
      {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((rating) => {
        const count = ratingCounts.get(rating) ?? 0
        const heightPercent = count > 0 ? Math.max((count / maxCount) * 100, 8) : 0

        return (
          <div
            key={rating}
            className="flex-1 bg-primary rounded-sm transition-all"
            style={{ height: count > 0 ? `${heightPercent}%` : '2px' }}
            title={`${rating} stars: ${count}`}
          />
        )
      })}
    </div>
  )
}
