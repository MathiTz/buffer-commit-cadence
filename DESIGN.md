# Cadence: Design (draft 1)

Read with [PLAN.md](PLAN.md). Text wireframes here; visual mockups of Plan and Ship were shown in chat.

## 1. Principles

1. **Calm and fast.** Posting tools feel like chores. This should feel like a quiet checklist.
2. **Human approves everything.** Nothing publishes without an explicit action.
3. **Show the real thing.** Previews look like the platform. The queue shown is the real Buffer queue.
4. **Cheap on requests.** The UI always shows how many API calls remain today.
5. **Keyboard first, mobile OK.** Review inbox works one-handed on a phone.
6. **Honest.** No vanity streaks, no fake urgency, no hidden AI.

## 2. Information architecture (revised: one page)

```
Cadence (single page: Queue)
├─ Left rail: channels (filter toggles with counts), tags (counts), API budget, + Connect a channel
├─ Header: week navigation, From GitHub, New post
├─ Main
│   ├─ Calendar (channel rows × 7 days, one dot per post)
│   └─ Details table (selected day | whole week)
└─ Right panel (tabs)
    ├─ Review (drafts: Approve, Skip, Edit)
    ├─ Balance (tag mix vs target)
    └─ Gaps (suggestions)
```

Dot encoding: colour = tag. Style = status: solid scheduled, faded sent, hollow ring needs review, red ring failed. The table repeats status as text so colour is never the only signal.

Responsive: under ~900 px the rail stacks above the main area, the right panel drops below the table, and the calendar scrolls sideways inside its box.

## 3. Key flows

**First run (blank Buffer account, judge test):**
Landing → Sign in with Buffer → consent → "Pick channels" (preselects all) → "Try with a sample" button loads a built-in sample changelog and sample calendar, clearly labeled sample → user can approve a draft, which creates a real post only after an explicit confirm ("This adds a post to your Buffer queue").

**Ship loop:** Sources → "Find moments" → inbox → approve → "Add N posts to queue" → toast with "View in Plan" link.

**Plan loop:** open Plan → see gaps → click a gap card → drawer lists candidates (Ideas, unapproved Ship drafts, "write something") → choose → pick channel/time → Add to queue.

**Undo:** after publish, a 60-second "Undo" deletes just-created posts (the only delete the app does).

## 4. Calendar, table and panels (the Plan job)

```
┌ Cadence ── [Plan] [Ship] ──────────── API 34/100 ── ◉ ┐
│ Next 14 days     [Week|Month]   Channels: ☑X ☑LinkedIn ☑Bluesky
├──────────────────────────────────────┬─────────────────┤
│ Mon   Tue   Wed   Thu   Fri   Sat Sun│ Balance         │
│ ▮edu  ▮promo ▮edu  ·gap  ▮ship  ·    │ Educate  ████ 52%│
│ ▮ship ▮promo        ·gap             │ Promote  ██   28%│
│       ▮promo                         │ Personal █    10%│
│ (rows = channels, chips = posts,     │ Shipped  █    10%│
│  dashed = open slot / gap)           │ Target ▸ edit    │
│                                      ├─────────────────┤
│                                      │ Gaps (3)        │
│                                      │ LinkedIn quiet 9d│
│                                      │ Thu empty        │
│                                      │ 3 promos in a row│
└──────────────────────────────────────┴─────────────────┘
```

- **Dots, not names (changed after review):** each cell (channel × day) shows one dot per post, colored by tag, capped at 6 then "+N". The day header shows the total ("7 posts"). Seven posts on one day can never overflow a cell.
- **Details table underneath:** clicking any day or cell selects that day and fills a table with Day, Time, Channel, Tag (text pill, not color alone), Post text, Status. A toggle switches between "Selected day" and "Whole week". Row actions (open in Buffer, reschedule, delete if created in-session) are the next step.
- **Gaps:** dashed empty cells with the word "empty". Clicking opens the fill drawer.
- **Balance:** horizontal bars vs target tick marks. Under/over highlighted with text, not just color.
- **Audit rules (v1):** channel with no scheduled post in N days (default 5); weekday with no post in any channel; same tag 3+ times consecutively on one channel; share of a tag outside ±15 pts of target.
- **Empty state:** "Nothing scheduled yet. Add your first post" → opens Ship or fill drawer.
- **Data source:** one cached snapshot of posts for the next 14 days (+ last 7), refreshed by button or on open if older than 15 min. Never auto-poll.

## 5. Review panel (the Ship job)

```
┌ Moments ──────┬ v0.4.0: dark mode, faster sync ───────────┐
│ ▸ v0.4.0      │ X thread | LinkedIn | Bluesky (3 cards)   │
│   Dark mode   │ [Edit] [Skip]  ...                         │
│   Milestone   │ Tags: shipped, release                     │
│               │ [Save as idea]  [Add 3 posts to queue]     │
└───────────────┴────────────────────────────────────────────┘
```

- **Sources:** GitHub repo (owner/name, public) or a textarea "Paste your changelog". A date picker for "since".
- **Moment card:** title, source link, 1-line summary, count of PRs.
- **Draft card:** channel icon, character counter vs platform limit, editable inline, platform-styled preview.
- **Shortcuts:** `j/k` move, `a` approve, `e` edit, `s` skip, `i` save as idea, `Enter` publish approved.
- **Footer note:** "Drafted by AI from your release notes. You approve everything."
- **Errors:** inline per draft (e.g. channel disconnected, text too long) with the exact reason from the API.

## 6. Visual language

- Neutral surfaces, one accent (blue), tag colors from a fixed 8-hue palette, chosen to be distinguishable and with text labels (never color alone).
- Type: a single sans (Inter or system), 14 px base, 12 px metadata, tabular numbers for counters.
- Shape: 8 px radius controls, 12 px cards, hairline borders, no drop shadows.
- Dark mode from day one.
- Motion: 120–200 ms ease-out; approve gives a small check + chip flying to Plan tab (Delight). Respect `prefers-reduced-motion`.
- Accessibility: WCAG AA contrast, full keyboard use, aria-labels on icon buttons, calendar grid readable as a list on small screens.
- Responsive: Plan → list by day on phones. Ship inbox is single-column cards.

## 7. Copy (draft)

- Landing: "Never go quiet. Never ship without telling anyone."
- Sign in: "Sign in with Buffer"
- Empty Plan: "Nothing scheduled yet. Add your first post."
- Budget pill tooltip: "You've used 34 of your 100 Buffer API requests today."
- Rate limit: "You've reached today's Buffer limit. Plan and Ship will work again at 00:00 UTC." (verify reset behavior)
- Publish confirm: "Add 3 posts to your Buffer queue?"
- Footer: "Built on the Buffer API. Not an official Buffer product."

## 8. Delight-award touches

1. Real platform-styled previews.
2. Keyboard-driven review with a satisfying approve.
3. Gap cards that read like a helpful colleague, not a dashboard warning.
4. The balance bars animate toward target when you fill a gap.
5. A "week in review" screen on Friday: what you shipped and posted.

## 9. Open design questions

- The posting schedule is readable (`Channel.postingSchedule`), so gaps can be real empty slots. Decide: slots or days as the default definition of a gap.
- The visual design now lives in the Cadence design canvas (Plan and Ship boards): https://claude.ai/artifact/3bhU1YaGoYHatUbYQKGtfC
- Brand name and domain.
- Dark-only vs light+dark for the demo video (recommend light for contrast on video).
