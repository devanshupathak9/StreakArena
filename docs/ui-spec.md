# StreakArena UI — Claude Code Build Spec

> **How to use:** Attach the reference image (`streakarena-reference.png`) with every prompt.
> Run **Prompt 0** first, then one section prompt at a time. After each one, have Claude Code
> screenshot the result and compare it against the matching region of the reference image.

---

## PROMPT 0 — Design system + app shell (run first)

```
Reference image attached. Build the design foundation for StreakArena
(React + Vite + TypeScript + Tailwind). Do NOT build page content yet,
only tokens, shared primitives, and the app shell.

DESIGN TOKENS (put these in tailwind.config + CSS variables):
- bg-app: #0A0E17 (near-black navy, page background)
- bg-sidebar: #0D1220
- bg-card: #111827, with a 1px border #1E2638
- bg-card-hover: #161E2E
- bg-inset: #0F1522 (task rows, chips, inputs)
- primary: #3B5BFF (buttons, active nav, active tabs); primary-hover: #4A68FF
- success: #22C55E (checkmarks, "Done Today" buttons, heatmap high)
- flame: #F97316 → #FBBF24 gradient (fire icons, "wins." text, XP bar)
- gold #F5B82E, silver #C0C7D4, bronze #D97A3A (leaderboard ranks, trophy)
- text-primary: #F1F5F9; text-secondary: #94A3B8; text-muted: #64748B
- Radius: cards 16px, buttons 10px, pills/chips 999px, small tiles 4px
- Font: "Inter" (Google Fonts), weights 400/500/600/700/800
- Card shadow: 0 0 0 1px #1E2638, 0 8px 24px rgba(0,0,0,0.35)
- Spacing: 8px grid; cards have 20–24px padding; 16px gaps between cards

SHARED PRIMITIVES (src/components/ui/):
- Card, Button (primary / success / ghost / icon), PillTabs, Chip, Avatar,
  ProgressBar, IconBadge. Use lucide-react for all icons.

APP SHELL (src/components/layout/):
1. Sidebar (fixed, 240px wide, full height, bg-sidebar, right border):
   - Top: logo = orange flame icon + "StreakArena" in 20px bold white
   - Nav items (icon + label, 44px tall, 12px radius, 16px text):
     Dashboard (Home icon), Tasks (SquareCheck), Groups (Users),
     Leaderboard (BarChart3), Profile (User)
   - Active item: solid primary-blue background, white text + icon
   - Inactive: text-secondary, hover bg #161E2E
   - Bottom user card (bg-inset, 12px radius): 40px round avatar,
     "devansh" (white, 15px semibold), "Level 5" (muted, 13px),
     below it a thin 4px progress bar (~70% filled, flame gradient)
2. Top-right action cluster (absolute, over page content):
   search icon button, bell icon button (40px circular, subtle border),
   40px round avatar
3. Main content area: left margin = sidebar width, padding 24px,
   max-width ~1400px

Set up routes: /dashboard, /tasks, /groups, /groups/:id, /leaderboard, /profile.
Use mock data from src/mocks/ for now. After building, screenshot at
1536px width and compare the sidebar to the reference; iterate on differences.
```

---

## PROMPT 1 — Dashboard hero banner

```
Reference image attached. Build the Dashboard hero (top section of main screen).

LAYOUT: full-width banner ~200px tall, sitting behind/above the stat cards,
rounded top corners only where it meets the card edge.

BACKGROUND: sunset mountain landscape: dark purple (#1E1B3A) upper sky
fading to orange/pink (#F97316 → #EC4899 at ~30% opacity) near the horizon,
layered dark mountain silhouettes. On a peak at right-center: a silhouetted
person standing next to a flag. Use the image at src/assets/hero-mountains.png
if present; otherwise build it with layered SVG mountain paths + CSS gradient.
Add a bottom fade to bg-app so the stat cards blend in.

TEXT (left, vertically centered, ~48px left padding):
- Headline: "Consistency " in white + "wins." in orange→amber gradient text.
  Size ~64px, weight 800, tight letter-spacing (-0.02em)
- Subline (18px): "Turn your goals into streaks." in white semibold,
  followed by " Track, prove and compete with your friends." in text-secondary

QUOTE CARD (top-right, below the icon cluster):
- ~190px wide, bg rgba(15,21,34,0.8) with backdrop-blur, 1px border, 12px radius
- Text: "Small steps every day lead to big results." in curly quotes,
  18px, white, 3 lines
- Short 24px orange underline accent bar beneath the text
```

---

## PROMPT 2 — Stat cards row

```
Reference image attached. Build the 5-card stats row under the hero.

5 cards in one row (grid, equal gaps of 16px; the last card ~20% wider).
Each card: bg-card, border, 16px radius, ~84px tall, 20px padding,
icon on the left (40–48px), text stacked on the right.

1. Flame icon (orange gradient, large). "72" (28px bold) / "Total Streak Days"
2. Green filled circle with white check. "4/5" / "Tasks Done Today"
3. Blue/purple bar-chart icon (3 vertical rounded bars, gradient #6366F1→#3B5BFF).
   "62" / "Verified Days"
4. Gold trophy icon. "#3" / "In Your Group"
5. Current Streak card (wider): top label "Current Streak" (13px, secondary);
   below: flame icon + "28 days" (24px bold) + "Keep going! 🔥" (13px, secondary);
   a chevron-right circular button on the far right.

Number: 28px, weight 700, white. Label: 14px, text-secondary.
All values come from a `dashboardStats` mock object.
```

---

## PROMPT 3 — "Your Tasks" panel

```
Reference image attached. Build the "Your Tasks" card (left column,
~62% width, below the stat cards).

HEADER: "Your Tasks" (22px bold) left; "+ Add Task" primary button right.

FILTER PILLS (below header): All (5) [active: solid primary],
Today (4), Active (5), Completed (28) [inactive: bg-inset, secondary text].
Pills 32px tall, 14px text, 16px horizontal padding.

TASK ROWS (5 rows, each ~56px, bg-inset, 12px radius, 8px gap):
Columns left→right:
  a) 40px rounded-square icon tile (white bg with a colored logo)
  b) Title (16px semibold white) + source line below (13px, secondary,
     small icon + source name)
  c) Flame icon + streak number (18px bold) with "day streak" (12px) below
  d) Week grid: header letters M T W T F S S (11px, muted; today's letter
     bolder/white), below them 7 rounded 20px squares:
     completed = bright green #22C55E, partial/earlier = dim green #166534,
     missed/future = #1F2937
  e) Action button (right-aligned, fixed ~100px width):
     - Not done: primary blue "✓ Mark Done"
     - Done: success green "✓ Done Today"

MOCK DATA:
| Task                 | Source     | Icon         | Streak | Week (M→S)    | State      |
|----------------------|------------|--------------|--------|---------------|------------|
| Solve LeetCode problems | LeetCode | LeetCode logo | 28 | 1,1,1,1,1,0,0 | Mark Done  |
| Push code to GitHub  | GitHub     | GitHub logo  | 14     | 1,d,1,1,0,0,0 | Done Today |
| Read 20 pages        | Manual     | red book     | 7      | 1,1,1,1,0,0,0 | Mark Done  |
| Workout              | Manual     | red dumbbell | 12     | 1,1,0,1,1,0,0 | Mark Done  |
| Play Chess           | Chess.com  | chess pawn   | 21     | 1,1,1,1,0,0,0 | Done Today |
(1 = bright green, d = dim green, 0 = empty)

Clicking "Mark Done" should optimistically flip the row to "Done Today"
and fill today's square.
```

---

## PROMPT 4 — Activity Heatmap

```
Reference image attached. Build the "Activity Heatmap" card (right column,
top, ~38% width). Reuse/adapt the existing StreakCalendar component if it
exists in the repo, but match this visual exactly.

HEADER: "Activity Heatmap" (20px bold) left; dropdown "Last 90 days ▾"
right (bg-inset, border, 8px radius). Options: Last 30 / 90 / 180 days.

GRID:
- Month labels on top (Jun, Jul, Aug, Sep), 12px, muted
- Day labels on left: Mon, Wed, Fri only (rows 1, 3, 5), 12px, muted
- 7 rows × ~26 columns of 14px squares, 4px gap, 3px radius
- Color scale (4 levels): #1F2937 (none), #14532D, #16A34A, #22C55E (max)
- Today's cell: 2px gold (#F5B82E) outline
- Hover tooltip: "Aug 14 · 3 tasks completed"

LEGEND (bottom-center): "Less" [4 swatches] "More", 12px muted text.
```

---

## PROMPT 5 — Today's Progress card

```
Reference image attached. Build the "Today's Progress" card
(right column, below heatmap, ~60% of the remaining width).

Title: "Today's Progress" (20px bold).

LEFT: circular progress ring, ~110px diameter, 10px stroke:
track #1F2937, progress arc in success green with rounded caps, filled 80%.
Center text: "4/5" (24px bold) and "completed" (12px secondary) below.

RIGHT: checklist, 5 rows, 14px text, 8px gap:
- Completed: green filled circle-check icon + white text
- Pending: hollow grey square outline + secondary text
Items: Solve LeetCode problems ✓, Push code to GitHub ✓,
Read 20 pages ☐, Workout ✓, Play Chess ✓

Ring value must derive from the same task data as the Your Tasks panel.
```

---

## PROMPT 6 — Motivational quote tile

```
Reference image attached. Build the quote tile to the right of
Today's Progress (same height, ~40% of that row).

- 16px radius card with a full-bleed background image: sunset over
  mountains, person silhouette standing at bottom-right.
  Use src/assets/quote-sunset.png, or fall back to a warm gradient
  (#7C2D12 → #F97316 → #FDBA74) with an SVG silhouette.
- Dark overlay gradient on the left for legibility
- Text: "Discipline today creates a better you tomorrow." in curly quotes,
  20px, weight 600, white, 4 lines, left-aligned with 24px padding
- Quote rotates daily from a quotes array.
```

---

> **Phase note:** Prompts 7–9 are Phase 2 screens (Groups, Leaderboard, Group detail).
> Build them as static UI only. Do not wire backend or add schema until Phase 1 is complete.

## PROMPT 7 — Groups page

```
Reference image attached (bottom-left screen). Build /groups using the
existing app shell (Groups nav item active).

HEADER: "Groups" (28px bold) + subtitle "Join challenges, compete with
friends, and stay accountable." (14px secondary). "+ Create Group"
primary button on the right.

Search input below: full width minus button, search icon,
placeholder "Search groups...", bg-inset, 10px radius.

Tabs: "My Groups" (active, primary pill) | "Discover" (inactive).

GROUP CARDS: 2-column grid, 16px gap. Each card (16px radius, overflow hidden):
- Background: a themed image on the right half fading into bg-card on the left
- 48px avatar (group image) top-left, group name (18px bold) beside it,
  "👥 N members" (13px secondary) under the name
- Description (14px, 2 lines)
- Bottom row: tag chips (bg-inset, 12px text) left; "View" primary button right

Mock groups:
1. Grind Squad · 12 members · "Daily coding, DSA and more. Let's build
   together!" · [Coding, LeetCode] · bg: mountain dusk
2. IIT Batch 2026 · 48 members · "A place for our batch to stay
   productive 💪" · [Study, Placement] · bg: campus building
3. Fitness Friends · 18 members · "No excuses. Show up every day." ·
   [Fitness, Health] · bg: runner silhouette
4. 100 Days of Code · 203 members · "Code every day for 100 days. 🚀" ·
   [Coding, Challenge] · bg: laptop glow
```

---

## PROMPT 8 — Leaderboard page

```
Reference image attached (bottom-middle screen). Build /leaderboard
(Leaderboard nav item active).

HEADER: "Leaderboard" (28px bold) + "Top performers in your group.
Keep going!" (14px secondary). Group selector dropdown on the right:
"Grind Squad ▾".

TABS (pills): Streaks (active) | Total Completions | This Week | All Time

TABLE (inside a card):
Columns: # | User | Streak | Total Done
- Header row: 12px, muted, uppercase-ish, bottom border
- Rows 44px, row divider #1E2638
- Ranks 1–3: circular medal badges (gold / silver / bronze) instead of numbers
- User: 28px avatar + name
- Streak: orange flame icon + number
- Current user row (devansh): highlighted with primary-tinted bg
  (rgba(59,91,255,0.15)) and a 1px primary border, 8px radius

Data:
1 aryan 56 312 · 2 devansh 28 210 · 3 priya 24 184 · 4 rahul 21 160 ·
5 sneha 19 142 · 6 aditya 17 138 · 7 karan 14 120 · 8 ishita 12 98
```

---

## PROMPT 9 — Group detail page

```
Reference image attached (bottom-right screen). Build /groups/:id
(Grind Squad).

HEADER BANNER (~140px): mountain-sunset background image, back-arrow
button top-left, "Invite Friends" primary button + "⋯" icon button top-right.
Overlaid bottom-left: 64px group avatar, "Grind Squad" (26px bold),
"👥 12 members · 3 challenges" (13px secondary),
"Daily coding, DSA and more. Let's build together!" (14px).

TABS (pills): Overview (active) | Challenges | Members | Chat

TWO-COLUMN BODY (60/40):
LEFT: "Active Challenges" card, "View all →" link (primary) on the right.
  3 challenge rows (bg-inset, 12px radius, 64px tall):
  provider icon tile (40px) | name (14px semibold) + "N days left"
  (12px secondary) + thin green progress bar | "X/12 members" |
  flame icon + small chevron at the far right.
  - One LeetCode a Day · 28 days left · 8/12 members
  - GitHub Daily Push · 15 days left · 10/12 members
  - 30 Day Coding Challenge · 28 days left · 6/12 members (red icon)

RIGHT: "Group Chat" card:
  messages: 28px avatar, name (13px bold) + timestamp (11px muted)
  inline, message text (13px) below.
  - aryan · 2h ago · "Let's go! Keep the streaks alive 🔥"
  - priya · 1h ago · "Just solved a hard problem today 💪"
  - rahul · 1h ago · "Nice! Pushed my code as well."
  - sneha · 30m ago · "Anyone up for a contest this weekend?"
  Bottom: input "Type a message..." + square primary send button.
```

---

## Verification loop (append to any prompt)

```
When done: run the dev server, screenshot the page at 1536×1024,
compare side-by-side with the corresponding region of the reference
image, list the top 5 visual differences (spacing, color, size,
alignment), fix them, and repeat once more.
```
