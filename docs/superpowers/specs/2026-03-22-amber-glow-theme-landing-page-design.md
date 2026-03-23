# Amber Glow Theme + Landing Page

## Summary

Retheme needledrop from the default shadcn neutral/light palette to "Amber Glow" — a dark, monospace-driven aesthetic with near-black stone backgrounds and amber/gold accents. Add a public landing page for unauthenticated visitors with a minimal hero section.

## Theme: Amber Glow

### Color palette (dark mode only)

Apply the `dark` class to `<html>` permanently — no light mode toggle.

Colors are specified as hex with Tailwind reference names. Convert to oklch in `globals.css` to match the existing format.

| Token | Value | Usage |
|---|---|---|
| `--background` | `#0c0a09` (stone-950) | Page background |
| `--card` | `#1c1917` (stone-900) | Card surfaces |
| `--border` | `#292524` (stone-800) | Default borders |
| `--input` | `#292524` (stone-800) | Input borders |
| `--muted` | `#1c1917` (stone-900) | Muted backgrounds |
| `--muted-foreground` | `#a8a29e` (stone-400) | Secondary text |
| `--foreground` | `#fafaf9` (stone-50) | Primary text |
| `--primary` | `#fbbf24` (amber-400) | Accent — logo, stars, buttons, review borders |
| `--primary-foreground` | `#0c0a09` (stone-950) | Text on primary buttons |
| `--secondary` | `#292524` (stone-800) | Secondary button bg |
| `--secondary-foreground` | `#d6d3d1` (stone-300) | Secondary button text |
| `--accent` | `#292524` (stone-800) | Hover backgrounds |
| `--accent-foreground` | `#fafaf9` (stone-50) | Hover text |
| `--ring` | `#fbbf24` (amber-400) | Focus rings |
| `--destructive` | `#ef4444` (red-500) | Destructive actions |
| `--popover` | `#1c1917` (stone-900) | Dropdown/popover bg |
| `--popover-foreground` | `#fafaf9` (stone-50) | Dropdown text |
| `--card-foreground` | `#fafaf9` (stone-50) | Card text |

### Typography

- Switch primary body font from Geist Sans to **Geist Mono**
- In `globals.css` `@theme inline`, change `--font-sans: var(--font-geist-sans)` to `--font-sans: var(--font-geist-mono)` so all shadcn components render in monospace
- Header logo: all-caps, `letter-spacing: 3px`, primary (amber) color
- Section labels and subtitles: uppercase, wide letter-spacing, stone-500 color

### Border radius

- Reduce `--radius` from `0.625rem` to `0.25rem` (4px). Sharper corners match the aesthetic.

### Component-level changes

- **StarRating**: Uses hardcoded `fill-amber-400 text-amber-400` Tailwind classes. This is intentional and matches the theme's amber accent — no change needed.
- **LogCard reviews**: Add `border-left: 2px solid` with primary (amber) color when review text is present
- **Auth pages (login/signup)**: Dark theme is applied automatically via CSS variable changes. No additional restyling needed beyond updating redirect targets.

## Landing page

### Route structure

- New file: `src/app/page.tsx` — public landing page (no auth required)
- The root layout (`src/app/layout.tsx`) renders children without auth checks (unchanged)
- **Delete** `src/app/(main)/page.tsx` and create `src/app/(main)/feed/page.tsx` to move the authenticated feed to `/feed`. The old file must be deleted — two `page.tsx` files resolving to `/` would cause a Next.js build error.
- The `(main)` route group keeps its auth guard in `(main)/layout.tsx`

### Authenticated users visiting `/`

The landing page includes a server-side auth check: if the user is already authenticated, redirect them to `/feed`. This prevents authenticated users from seeing "Sign in / Sign up" buttons.

### Landing page layout

**Header:**
- Left: `NEEDLEDROP` logo (amber, uppercase, letter-spacing: 3px)
- Right: "Sign in" text link (stone-400, links to `/login`) + "Sign up" button (amber bg, links to `/signup`)

**Hero section:**
- Small uppercase subtitle: "YOUR MUSIC. YOUR LOG." (stone-500, letter-spacing: 4px)
- Large heading: "needledrop" (stone-50, bold)
- Description paragraph: "Rate albums and tracks. Write reviews. Follow friends and see what they're listening to." (stone-400)
- Two CTA buttons: "Get started" (amber primary, links to `/signup`) + "Sign in" (outline/secondary, links to `/login`)

**Below hero:**
- Decorative divider line with centered ♫ symbol
- Faded (opacity ~0.4) static ghost preview showing 3 sample log entries to hint at the product experience
- Sample entries are hardcoded placeholder data (not real DB queries), using simple colored `<div>`s for artwork placeholders (no external image URLs)

### Auth flow

- Unauthenticated users see the landing page at `/`
- Authenticated users visiting `/` are redirected to `/feed`
- Clicking "Get started" → `/signup`
- Clicking "Sign in" → `/login`
- After successful auth (login or signup) → redirect to `/feed`

## Files to create or modify

| File | Action | Description |
|---|---|---|
| `src/app/globals.css` | Modify | Replace `.dark` variables with Amber Glow palette (oklch format). Remove `:root` light theme (unused). Reduce `--radius` to `0.25rem`. Change `--font-sans` to `var(--font-geist-mono)`. |
| `src/app/layout.tsx` | Modify | Add `dark` class to `<html>`. |
| `src/app/page.tsx` | Create | Public landing page with auth check (redirect if authenticated), header + hero + ghost preview. |
| `src/app/(main)/page.tsx` | Delete | Remove — route moves to `/feed`. |
| `src/app/(main)/feed/page.tsx` | Create | Move feed page content here (same code as the old `(main)/page.tsx`). |
| `src/app/(main)/layout.tsx` | Modify | Update header styling (amber logo, uppercase, tracked type). Update logo link from `/` to `/feed`. |
| `src/app/(auth)/login/page.tsx` | Modify | Update redirect target from `/` to `/feed`. |
| `src/app/(auth)/signup/page.tsx` | Modify | Update redirect target from `/` to `/feed`. |
| `src/components/LogCard.tsx` | Modify | Add amber left border on review text. |
