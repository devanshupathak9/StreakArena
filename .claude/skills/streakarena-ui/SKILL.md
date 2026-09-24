---
name: streakarena-ui
description: Design and restyle StreakArena's React frontend (dashboard, tasks, groups, leaderboard, profile, streak tiles). Use for any UI, styling, layout, component, or copy change in the StreakArena frontend.
---

# StreakArena UI

**The design is specified, not open.** Read `docs/ui-spec.md` — the user's own build
spec — and `docs/images/reference.png`, the mockup it was written from. Those two
files are the source of truth for every screen. This file only records what carries over.

An earlier version of this skill described StreakArena as a bordered "contest standings
board" with no hero, no cards and no gradients. **The user replaced that direction with the
reference mockup.** Don't reintroduce the old rules — cards, the hero banner, the stat row
and the quote tiles are all deliberate.

## What the spec doesn't say, and still holds

- **Colour keeps its jobs.** Flame orange is a live streak and the XP bar. Green is a
  verified completion. Blue is clickable. Gold/silver/bronze are ranks. Everything else is
  ink. Don't borrow one role's colour for another's job.
- **A self-reported day must never look like a verified one.** Green tiles are verified;
  self-reported days are neutral grey. `Tile.verified` exists for exactly this.
- **Platform-backed tasks have no manual button** — sync is what proves them. Tasks with no
  platform keep "Mark done". That asymmetry is the product, not a bug.
- **Numbers use tabular figures** so ranks and streaks line up in columns.
- **Real data, not mocks.** The spec was written for a greenfield build and asks for
  `src/mocks/`. This app has a working backend; every screen reads it. Anything the schema
  can't answer (level, XP) is *derived* from real numbers, never invented.

## Tokens

All colour, spacing, radius and type live in `src/styles.css` `:root`. No hard-coded hex in
components. Three of the spec's values were lightened because they failed AA as small text —
each one is commented at the token with the measured ratio. Check contrast numerically when
you touch them; there is no browser in the agent session.

## Quality floor

Works at 360px wide. Visible keyboard focus. AA contrast (4.5:1 body, 3:1 large). Tiles
carry a text label for screen readers ("Sep 21: verified"). `prefers-reduced-motion`
respected.
