---
name: streakarena-sidebar
description: Design, build or restyle StreakArena's sidebar / app navigation (Dashboard, Tasks, Groups, Leaderboard, Profile), the collapsed rail, the top-right action cluster and the mobile tab bar.
---

# StreakArena navigation

The structure is fixed by `docs/ui-spec.md` (Prompt 0) and
`docs/images/reference.png`. Read those first.

- **240px sidebar**, `--nav-bg`, right border. Flame icon + "StreakArena" at the top.
- **Five items, in this order:** Dashboard (Home), Tasks (SquareCheck), Groups (Users),
  Leaderboard (BarChart3), Profile (User). 44px rows, 12px radius.
- **Active is a solid blue fill** with white text — the one place the nav uses a fill.
  Inactive rows are `--text-2` and hover to `--nav-hover`.
- **Bottom account card:** 40px avatar, name, "Level N", and a 4px flame-gradient XP bar.
  The level counts recorded days (one per fifty), so it means something. It's also the
  menu trigger for Edit profile / About / Log out.
- **Rail:** 72px, icons only, toggled with `[` and remembered in localStorage.
- **Top-right cluster** (`TopBar`): search, bell, avatar. Floats over the page content.
  Search filters what `AppDataProvider` already holds — it makes no request of its own.
- **Under 768px** the sidebar is replaced by the bottom tab bar.

The nav adds **no requests of its own**: `AppDataProvider` holds the dashboard and group
list, and both the pages and the sidebar read it.
