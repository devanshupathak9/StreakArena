---
name: streakarena-sidebar
description: Design, build or restyle StreakArena's sidebar / app navigation (Dashboard, Groups, Global, Profile, About), including the collapsed rail and the mobile tab bar. Use for any change to navigation, nav items, icons, active states, or the app shell layout. Works alongside streakarena-ui, whose colour roles and type rules still apply.
---

# StreakArena sidebar

The sidebar has three jobs, in this order:
1. Show whether today's streak is safe, without opening the dashboard.
2. Move between pages.
3. Get into your groups quickly, like folders in a file explorer.

It is quiet chrome. The page content is the star; the sidebar only speaks up about the streak.

## Structure

```
┌──────────────────────────┐
│ StreakArena          [«] │  wordmark + collapse toggle
│                          │
│ 🔥 23   2 of 3 done      │  today block (the memorable element)
│ ▓▓▓▓▓▓▓░░░               │  today's progress
│                          │
│ ▸ Dashboard              │
│ ▾ Groups                 │  expandable, like a folder
│     CSE 2027      #3     │    each group + your rank
│     KGP Coders    #1     │
│     + Join or create     │
│ ▸ Global                 │
│                          │
│ ───────────────────────  │
│ (DS) Devanshu        ⋯   │  account row → Profile, Settings, About, Log out
└──────────────────────────┘
```

- **Primary nav:** Dashboard, Groups, Global. Three items, nothing more.
- **Profile** moves to the account row at the bottom (avatar + name), where users expect it.
- **About** moves into the account menu or the footer. It's visited once; it doesn't earn a nav slot.
- **Groups** expands to list the user's groups with their current rank. This is the file-explorer part: groups are the folders people open daily. Remember expanded state per user.
- Cap visible groups at 5; show "View all groups" after that.

## The today block

This is the one place the sidebar is allowed to be loud.
- Flame + current best live streak in condensed display type, flame orange.
- "2 of 3 done" in plain text, plus a thin progress bar in verdict green.
- When today is incomplete after the user's evening (e.g. after 8pm in their timezone), the text switches to amber: "1 task left. Streak ends at midnight."
- When everything is done: "All done today" and the bar is full. No confetti.
- Clicking it goes to the Dashboard.
- Collapsed rail: show just the flame + number; tooltip gives the rest.

## Icons

- Replace the Unicode glyphs (▦ ◈ ◎ ◔ ◇). They render inconsistently across fonts and read as placeholder.
- Use one icon set with one stroke width (lucide-react, 1.75px, 18px): `LayoutDashboard`, `Users`, `Trophy`, `Flame` for the today block.
- Icons are neutral grey; only the active item's icon takes the ink colour. Never colour icons decoratively.

## States

| State | Treatment |
|---|---|
| Default | Muted text, no background |
| Hover | Subtle neutral background; no movement, no shadow |
| Active (current page) | Ink text, medium weight, a 2px interactive-blue bar on the left edge, faint blue-tinted background |
| Focus (keyboard) | Visible 2px focus ring in interactive blue, offset 2px |
| Group with unfinished task today | Small amber dot after the name |

- One active item at a time. When on a group page, the group row is active, not "Groups".
- Mark the active link with `aria-current="page"`.

## Sizes and spacing

- Expanded width 248px; collapsed rail 64px. Toggle with the « button or `[` key; remember the choice.
- Nav rows 36px tall, 8px horizontal padding, 2px gap between rows; group sub-rows indented 28px.
- Section spacing (today block → nav → account row) comes from whitespace, 24px. Use one divider only, above the account row.
- Sidebar background is one step off the page background, separated by a 1px border. No shadow, no blur, no gradient.

## Responsive

- ≥1024px: expanded sidebar by default.
- 768–1023px: collapsed rail by default, with tooltips on hover and focus.
- <768px: no sidebar. Use a bottom tab bar with Dashboard, Groups, Global, Profile (icon + short label, 56px tall + safe-area inset). The today block becomes a compact streak chip in the top bar.

## Motion

- Collapse/expand: width transition, 180ms ease-out; labels fade, they don't slide.
- Group folder open/close: chevron rotates, list height animates, 150ms.
- The streak number ticks up when a task is completed anywhere in the app. That's the only celebratory motion.
- Everything is instant under `prefers-reduced-motion`.

## Copy

- Nav labels are plain nouns: Dashboard, Groups, Global.
- Group rows show the name and "#3", not "Rank: 3".
- Account menu actions say what they do: "Edit profile", "Log out".

## Avoid

- Unicode or emoji icons, or mixing icon sets
- A gradient or brand-coloured sidebar background
- Pill-shaped active states with shadows
- Icons in circles or coloured squares
- Section labels in ALL CAPS ("MENU", "NAVIGATION")
- Upgrade banners, tips or promo cards in the sidebar
- Hover animations that shift or scale items

## Build notes

- Components: `Sidebar`, `TodayBlock`, `NavItem`, `GroupTree`, `AccountRow`, `MobileTabBar`, all in `frontend/src/components/nav/`.
- Today block and group ranks come from data the app already loads (`/api/dashboard`, `/api/groups`). Don't add requests just for the sidebar; share the state.
- Use `NavLink` from react-router for active state; group rows are `NavLink`s to `/groups/:id`.
- All colours, sizes and durations are tokens in `styles.css`; no hard-coded values in components.
- Check: keyboard-only navigation works end to end, tooltips appear on focus in the rail, AA contrast in every state, and nothing overflows at 360px.
