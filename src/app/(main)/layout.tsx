import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NavUser } from '@/components/NavUser'
import { SearchCommand } from '@/components/SearchCommand'
import { AppIcon } from '@/components/AppIcon'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/feed" className="font-bold text-[15px] tracking-[3px] uppercase text-primary flex items-center gap-2">
            <AppIcon className="h-5 w-5" />
            needledrop
          </Link>

          <div className="flex items-center gap-2">
            <SearchCommand />

            {profile && (
              <NavUser
                username={profile.username}
                displayName={profile.display_name}
                avatarUrl={profile.avatar_url}
              />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
