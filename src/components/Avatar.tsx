import {
  Avatar as ShadAvatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  className?: string
}

export function Avatar({ src, name, className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <ShadAvatar className={cn('h-8 w-8', className)}>
      <AvatarImage src={src ?? undefined} alt={name} />
      <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
    </ShadAvatar>
  )
}
