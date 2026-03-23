'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Disc3, Music } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Avatar } from '@/components/Avatar'
import type { SpotifySearchResult } from '@/lib/spotify'

interface UserResult {
  username: string
  display_name: string | null
  avatar_url: string | null
}

export function SearchCommand() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifySearchResult[]>([])
  const [users, setUsers] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setResults([])
      setUsers([])
      setSearched(false)
      return
    }

    setLoading(true)
    try {
      const [albumRes, trackRes, userRes] = await Promise.all([
        fetch(`/api/spotify/search?q=${encodeURIComponent(trimmed)}&type=album`),
        fetch(`/api/spotify/search?q=${encodeURIComponent(trimmed)}&type=track`),
        fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`),
      ])
      const albums: SpotifySearchResult[] = albumRes.ok ? await albumRes.json() : []
      const tracks: SpotifySearchResult[] = trackRes.ok ? await trackRes.json() : []
      const foundUsers: UserResult[] = userRes.ok ? await userRes.json() : []
      setResults([...albums.slice(0, 5), ...tracks.slice(0, 5)])
      setUsers(foundUsers)
    } catch {
      setResults([])
      setUsers([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    if (!open) return
    if (query.trim().length >= 2) setLoading(true)
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, open, search])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setUsers([])
      setSearched(false)
    }
  }, [open])

  function handleSelect(result: SpotifySearchResult) {
    const path = result.type === 'album' ? 'albums' : 'tracks'
    setOpen(false)
    router.push(`/${path}/${result.id}`)
  }

  function handleUserSelect(user: UserResult) {
    setOpen(false)
    router.push(`/users/${user.username}`)
  }

  const albums = results.filter((r) => r.type === 'album')
  const tracks = results.filter((r) => r.type === 'track')
  const hasResults = albums.length > 0 || tracks.length > 0 || users.length > 0

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors p-2.5 rounded-md hover:bg-accent"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground ml-2">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search music or people..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading
              ? 'Searching...'
              : !searched
                ? 'Type to search...'
                : 'No results found.'}
          </CommandEmpty>

          {users.length > 0 && (
            <CommandGroup heading="People">
              {users.map((user) => (
                <CommandItem
                  key={user.username}
                  value={`${user.username} ${user.display_name ?? ''} person`}
                  onSelect={() => handleUserSelect(user)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Avatar
                    src={user.avatar_url}
                    name={user.display_name ?? user.username}
                    className="h-9 w-9"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.display_name ?? user.username}
                    </p>
                    {user.display_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {tracks.length > 0 && (
            <CommandGroup heading="Tracks">
              {tracks.map((result) => (
                <CommandItem
                  key={result.id}
                  value={`${result.title} ${result.artist} track`}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {result.artwork_url ? (
                    <Image
                      src={result.artwork_url}
                      alt={result.title}
                      width={36}
                      height={36}
                      className="rounded object-cover w-9 h-9 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded bg-muted flex items-center justify-center shrink-0">
                      <Music className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {result.artist}
                      {result.extra && <span> · {result.extra}</span>}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {albums.length > 0 && (
            <CommandGroup heading="Albums">
              {albums.map((result) => (
                <CommandItem
                  key={result.id}
                  value={`${result.title} ${result.artist} album`}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {result.artwork_url ? (
                    <Image
                      src={result.artwork_url}
                      alt={result.title}
                      width={36}
                      height={36}
                      className="rounded object-cover w-9 h-9 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded bg-muted flex items-center justify-center shrink-0">
                      <Disc3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {result.artist}
                      {result.extra && <span> · {result.extra}</span>}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
