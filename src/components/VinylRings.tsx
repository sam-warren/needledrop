'use client'

const RINGS = [120, 180, 240, 300, 360, 420, 500, 580, 660, 750]

export function VinylRings() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div className="relative animate-[spin_40s_linear_infinite]">
        {RINGS.map((size) => (
          <div
            key={size}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/[0.04]"
            style={{ width: size, height: size }}
          />
        ))}
      </div>
    </div>
  )
}
