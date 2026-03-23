'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { Camera } from 'lucide-react'

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl: string | null
  name: string
  className?: string
}

export function AvatarUpload({ userId, currentAvatarUrl, name, className }: AvatarUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) return // 2MB max

    setUploading(true)
    const supabase = createClient()

    const ext = file.name.split('.').pop()
    const path = `${userId}.${ext}`

    // Upload to storage (upsert overwrites existing)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    // Update profile
    await supabase
      .from('profiles')
      .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
      .eq('id', userId)

    setUploading(false)
    router.refresh()
  }

  return (
    <div className="relative group">
      <Avatar
        src={currentAvatarUrl}
        name={name}
        className={cn('h-16 w-16 text-lg', className)}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-wait"
        aria-label="Change profile picture"
      >
        <Camera className="h-5 w-5 text-foreground" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  )
}
