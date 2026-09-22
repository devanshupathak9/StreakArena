---
name: streakarena-ui
description: Design and restyle StreakArena's React frontend (dashboard, groups, leaderboards, profile, streak tiles). Use for any UI, styling, layout, component, or copy change in the StreakArena frontend, so it reads like a competitive arena for students, not a templated AI-generated SaaS dashboard.
---

# StreakArena UI

StreakArena is where students prove daily practice (LeetCode, Codeforces, GitHub, Chess.com, gym, reading) and race their batch. The UI should feel like a **contest standings board**: ranked, live, verifiable. It should not feel like a wellness app or a generic SaaS dashboard.

## Ground every screen in the subject

The visual language comes from the world users already live in: contest scoreboards (ICPC, Codeforces standings), judge verdicts (Accepted / Wrong Answer), sports tables, and GitHub contribution graphs. Before designing a screen, name:
- Who is looking at it (a student at 11pm checking if their streak is safe)
- Its one job (e.g. "tell me what I still owe today")
- The one element that should be memorable on it

## Colour carries meaning, never decoration

Every colour has exactly one job. Never use a colour outside its role.

| Role | Meaning | Rule |
|---|---|---|
| Flame orange | A live streak | Only the flame, the streak count, and today's outline |
| Verdict green | Verified completion | Tiles and the ✓ Verified badge; intensity = activity |
| Warning amber | Streak at risk today | Only when today is unmarked after the user's evening |
| Interactive blue | Clickable | Buttons, links, focus rings; nothing static |
| Ink + neutrals | Everything else | Text, borders, surfaces |

No gradients, no tinted glass, and no colour on a card just to fill space.

## Type

- One family with multiple widths (e.g. Archivo + Archivo Condensed or Narrow). Condensed width is for numbers and standings; the normal width is for everything else.
- Every number uses tabular figures (`font-variant-numeric: tabular-nums`) so ranks and streaks align in columns.
- The streak count is the display type of the app. It's big, condensed and orange. Nothing else competes with it in size.
- Sentence case everywhere. No all-caps eyebrow labels.

## Layout: standings first

- **Dashboard:** today's owed tasks at the top (what's left), then the tiles. It is not a grid of identical cards.
- **Group page:** the leaderboard is the page. Use a real table with rank, avatar, name, streak and this week's output. Highlight the current user's row. Animate rank changes (the one motion moment).
- **Tasks:** list rows, not cards. Rows are denser and scannable, like a problem list.
- Hierarchy comes from size, weight and spacing. Use borders only where they separate data (table rows), not around every block.
- Radius has meaning: small for inputs and tiles, none for table rows, pill only for status badges.

## Trust is visible

Verification is the product's differentiator, so every completion shows its source:
- **✓ Verified**: from a platform API (green, solid)
- **Proof**: photo or note attached (outlined)
- **Self-reported**: plain tick (neutral, no colour)

Leaderboards can show verified days separately. Never style a self-reported day like a verified one.

## Motion

Spend it in one place: **completing today's task** (tile fills, flame count ticks up) and **rank changes** on the leaderboard. No fade-slide-up on page sections, no hover lift on every card, no confetti on routine actions. Respect `prefers-reduced-motion`.

## Avoid these AI-generated tells

- Identical rounded cards with the same soft shadow for every block
- Gradient hero with a big number, small label and three stat cards
- Tracked-out ALL-CAPS labels above headings
- `A · B · C` meta strings, and `→` appended to every button
- Emoji as section icons
- Purple-to-blue gradients, glassmorphism
- Cream background with a serif display, or near-black with one neon accent
- Numbered markers (01/02/03) on content that isn't a sequence
- Generic empty states ("Nothing here yet ✨")

## Copy

- Say what happens: "Mark done", "Sync LeetCode", "Join group". Not "Submit" or "Get started".
- An action keeps its name through the flow: the "Sync" button produces a "Synced 3 days from LeetCode" toast.
- Urgency is specific: "Your 23-day streak ends at midnight" beats "Don't forget your tasks!"
- Empty states direct: "Link your LeetCode handle to start a verified streak" + the button.
- Errors say what broke and what to do: "LeetCode didn't respond. Your streak is safe; try Sync again in a few minutes."

## Process

1. Write a short plan first: a palette of 4–6 hex values mapped to the roles above, typefaces, an ASCII wireframe of the screen, and the one memorable element.
2. Review the plan: if any part is what you'd produce for any habit app, revise it and say why.
3. Build with tokens in `styles.css` (colour, type, space, radius scales). No hard-coded hex in components.
4. Quality floor: works at 360px wide, visible keyboard focus, AA contrast, tiles keyboard-accessible with a text label for screen readers ("Sep 21: verified, 4 submissions").
5. Critique with a screenshot if possible, then remove one thing.
