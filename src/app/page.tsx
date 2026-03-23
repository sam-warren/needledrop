import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { VinylRings } from '@/components/VinylRings'
import { AppIcon } from '@/components/AppIcon'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/feed')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      <VinylRings />

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <h1 className="text-3xl font-bold text-primary tracking-[5px] uppercase mb-3 flex items-center gap-3">
          <AppIcon className="h-8 w-8" />
          needledrop
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-8">
          Log the music you listen to with your friends.
        </p>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>

      <p className="absolute bottom-6 text-[9px] tracking-[3px] uppercase text-muted-foreground/30">
        a listening journal
      </p>
    </div>
  )
}
