# Amber Glow Theme + Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retheme needledrop to the "Amber Glow" dark aesthetic and add a public landing page with auth-gated redirect.

**Architecture:** Replace CSS variables in globals.css with the Amber Glow palette (dark stone + amber accent), switch body font to Geist Mono, tighten border radius. Move the authenticated feed from `/` to `/feed`, then create a new public landing page at `/` that redirects authenticated users to `/feed`.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, shadcn/ui, Supabase Auth, Geist Mono font

**Spec:** `docs/superpowers/specs/2026-03-22-amber-glow-theme-landing-page-design.md`

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `src/app/globals.css` | Modify | Theme variables — Amber Glow palette, font, radius |
| `src/app/layout.tsx` | Modify | Add `dark` class to `<html>` |
| `src/app/page.tsx` | Create | Public landing page (auth check → redirect if logged in) |
| `src/app/(main)/page.tsx` | Delete | Old feed route at `/` — replaced by `/feed` |
| `src/app/(main)/feed/page.tsx` | Create | Feed page at `/feed` (same content as old `(main)/page.tsx`) |
| `src/app/(main)/layout.tsx` | Modify | Amber-styled header, logo links to `/feed` |
| `src/app/(auth)/login/page.tsx` | Modify | Redirect target `/` → `/feed` |
| `src/app/(auth)/signup/page.tsx` | Modify | Redirect target `/` → `/feed` |
| `src/components/LogCard.tsx` | Modify | Amber left border on review text |

---

### Task 1: Apply Amber Glow theme to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace theme variables**

Replace the entire `:root { ... }` block and **delete the entire `.dark { ... }` block** in `globals.css`. Since we're dark-mode-only, we put the Amber Glow values directly in `:root`. If the `.dark` block is left in place, it will override `:root` with the old default dark theme. The `dark` class on `<html>` is still needed for shadcn's `@custom-variant dark` to work.

Also keep sidebar and chart variables (set to theme-consistent values) to avoid undefined variable issues.

The oklch conversions for the Amber Glow hex values:

```css
:root {
  --radius: 0.25rem;
  --background: oklch(0.145 0.005 49.25);
  --foreground: oklch(0.985 0.002 106.42);
  --card: oklch(0.216 0.006 56.04);
  --card-foreground: oklch(0.985 0.002 106.42);
  --popover: oklch(0.216 0.006 56.04);
  --popover-foreground: oklch(0.985 0.002 106.42);
  --primary: oklch(0.82 0.17 86.85);
  --primary-foreground: oklch(0.145 0.005 49.25);
  --secondary: oklch(0.292 0.006 56.04);
  --secondary-foreground: oklch(0.869 0.005 56.37);
  --muted: oklch(0.216 0.006 56.04);
  --muted-foreground: oklch(0.709 0.01 56.26);
  --accent: oklch(0.292 0.006 56.04);
  --accent-foreground: oklch(0.985 0.002 106.42);
  --destructive: oklch(0.637 0.237 25.33);
  --border: oklch(0.292 0.006 56.04);
  --input: oklch(0.292 0.006 56.04);
  --ring: oklch(0.82 0.17 86.85);
  --chart-1: oklch(0.82 0.17 86.85);
  --chart-2: oklch(0.709 0.01 56.26);
  --chart-3: oklch(0.637 0.237 25.33);
  --chart-4: oklch(0.869 0.005 56.37);
  --chart-5: oklch(0.292 0.006 56.04);
  --sidebar: oklch(0.216 0.006 56.04);
  --sidebar-foreground: oklch(0.985 0.002 106.42);
  --sidebar-primary: oklch(0.82 0.17 86.85);
  --sidebar-primary-foreground: oklch(0.145 0.005 49.25);
  --sidebar-accent: oklch(0.292 0.006 56.04);
  --sidebar-accent-foreground: oklch(0.985 0.002 106.42);
  --sidebar-border: oklch(0.292 0.006 56.04);
  --sidebar-ring: oklch(0.82 0.17 86.85);
}
```

Change in `@theme inline`:
```
--font-sans: var(--font-geist-mono);
```

Remove the redundant `font-mono` class from the landing page root div (since `font-sans` now resolves to Geist Mono).

- [ ] **Step 2: Verify the app still builds**

Run: `pnpm build 2>&1 | tail -5`
Expected: Build succeeds (CSS changes only)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: apply Amber Glow theme to CSS variables"
```

---

### Task 2: Add dark class to root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add `dark` class to `<html>` element**

Change:
```tsx
<html lang="en">
```
To:
```tsx
<html lang="en" className="dark">
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "style: enable dark mode on html element"
```

---

### Task 3: Move feed from `/` to `/feed`

**Files:**
- Delete: `src/app/(main)/page.tsx`
- Create: `src/app/(main)/feed/page.tsx`

- [ ] **Step 1: Create the feed directory and move the file**

```bash
mkdir -p src/app/\(main\)/feed
cp src/app/\(main\)/page.tsx src/app/\(main\)/feed/page.tsx
rm src/app/\(main\)/page.tsx
```

The feed page content is identical — no code changes needed. It still uses the `(main)` layout (which has the auth guard).

- [ ] **Step 2: Update links pointing to `/` that should now point to `/feed`**

In `src/app/(main)/layout.tsx`, change the logo link:
```tsx
// Change:
<Link href="/" className="font-bold text-lg tracking-tight flex items-center gap-2">
// To:
<Link href="/feed" className="font-bold text-lg tracking-tight flex items-center gap-2">
```

- [ ] **Step 3: Update auth page redirects**

In `src/app/(auth)/login/page.tsx`, change:
```tsx
router.push('/')
```
To:
```tsx
router.push('/feed')
```

In `src/app/(auth)/signup/page.tsx`, change:
```tsx
router.push('/')
```
To:
```tsx
router.push('/feed')
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(main\)/feed/page.tsx src/app/\(main\)/layout.tsx src/app/\(auth\)/login/page.tsx src/app/\(auth\)/signup/page.tsx
git rm src/app/\(main\)/page.tsx
git commit -m "refactor: move feed from / to /feed route"
```

---

### Task 4: Create public landing page

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: Create the landing page**

Create `src/app/page.tsx` — a Server Component that checks auth and redirects authenticated users:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/feed')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="w-full border-b border-border">
        <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-[15px] tracking-[3px] uppercase text-primary">
            needledrop
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
        <p className="text-[11px] tracking-[4px] uppercase text-muted-foreground mb-4">
          Your music. Your log.
        </p>
        <h1 className="text-4xl font-bold text-foreground tracking-wide mb-4">
          needledrop
        </h1>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
          Rate albums and tracks. Write reviews. Follow friends and see what
          they&apos;re listening to.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mx-auto max-w-4xl px-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground/40">♫</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Ghost preview */}
      <div className="mx-auto max-w-4xl px-4 py-8 opacity-40">
        {[
          { title: 'OK Computer', artist: 'Radiohead', rating: '★★★★½' },
          { title: 'Blonde', artist: 'Frank Ocean', rating: '★★★★★' },
          { title: 'Vespertine', artist: 'Björk', rating: '★★★★' },
        ].map((entry) => (
          <div
            key={entry.title}
            className="flex gap-3 py-3 border-b border-border/50 last:border-b-0"
          >
            <div className="w-12 h-12 rounded bg-card border border-border shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">{entry.title}</p>
              <p className="text-xs text-muted-foreground/60">
                {entry.artist} · <span className="text-primary">{entry.rating}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify landing page renders**

Run: `pnpm dev`
Visit `http://localhost:3000` while logged out — should see the landing page.
Visit while logged in — should redirect to `/feed`.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add public landing page with auth redirect"
```

---

### Task 5: Style the main layout header

**Files:**
- Modify: `src/app/(main)/layout.tsx`

- [ ] **Step 1: Update header to Amber Glow style**

Update the logo in `src/app/(main)/layout.tsx`:

Change:
```tsx
<Link href="/feed" className="font-bold text-lg tracking-tight flex items-center gap-2">
  <Music className="h-5 w-5" />
  needledrop
</Link>
```
To:
```tsx
<Link href="/feed" className="font-bold text-[15px] tracking-[3px] uppercase text-primary">
  needledrop
</Link>
```

Update the lucide-react import — remove `Music` (no longer used):
```tsx
// Change:
import { Search, Music } from 'lucide-react'
// To:
import { Search } from 'lucide-react'
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(main\)/layout.tsx
git commit -m "style: update main header to Amber Glow branding"
```

---

### Task 6: Add amber border to LogCard reviews

**Files:**
- Modify: `src/components/LogCard.tsx`

- [ ] **Step 1: Add left border to review text**

In `src/components/LogCard.tsx`, change the review paragraph:

```tsx
// Change:
{log.review && (
  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{log.review}</p>
)}
// To:
{log.review && (
  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 border-l-2 border-primary pl-2">{log.review}</p>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LogCard.tsx
git commit -m "style: add amber left border to log reviews"
```

---

### Task 7: Verify everything works end-to-end

- [ ] **Step 1: Run the test suite**

Run: `pnpm test`
Expected: All 39 existing tests pass (theme changes are CSS-only, route move doesn't affect test mocks)

- [ ] **Step 2: Run the dev server and manually verify**

Run: `pnpm dev`

Check:
1. `http://localhost:3000` — landing page shows (logged out), redirects to `/feed` (logged in)
2. `/feed` — authenticated feed with dark theme, amber accents, monospace font
3. `/login` and `/signup` — dark themed auth pages
4. `/search` — search page with dark theme
5. `/users/[username]` — profile page with dark theme
6. Star ratings still amber, review text has amber left border

- [ ] **Step 3: Run the build**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Final commit if any fixes were needed**
