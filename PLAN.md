# Buffer Commit: Plan (v2, two views)

Working product name: **Cadence** (placeholder, check it's free and doesn't imply Buffer affiliation). **One page, the Queue**, with two jobs that share one calendar:

- **Plan**: a week calendar (one dot per post, colored by tag, styled by status) with a details table underneath, plus Balance and Gaps panels.
- **Ship / Review**: a Review panel beside the calendar. Drafts (from GitHub releases/PRs, a pasted changelog, or written by hand) wait there with Approve, Skip and Edit. Pending drafts show as hollow dots on the calendar; approving one makes its dot solid and adds it to the Buffer queue.

There is no Plan/Ship navigation. "From GitHub" and "New post" are actions in the header. A user who never connects GitHub just uses the same page to write and schedule.

One-line pitch: *Never go quiet, and never ship without telling anyone.*

Design details are in [DESIGN.md](DESIGN.md). Sources: buffer.com/api/commit, /terms, developers.buffer.com guides (Oct 18, 2026).

---

## 0. Decisions and next actions (Oct 19)

**Product (final for the contest):** one page, the Queue. Design: https://claude.ai/artifact/3bhU1YaGoYHatUbYQKGtfC
- Calendar (channel rows × 7 days, one dot per post; colour = tag; style = status) with the day's events table directly under it.
- Review is a status, not a place: a draft is an event with status "Needs review". Click **Review** on its row → modal → edit, **Approve** (dot becomes solid, post goes to the Buffer queue) or **Skip and remove**.
- Chips above the calendar: **N to review** (filters the table), **N gaps** (modal with options, dismissible, "Fill from ideas"), **Balance** (modal, tag mix vs target).
- Header actions: **New post**, **From GitHub** (releases → merged PRs → CHANGELOG.md fallback; also "paste a changelog"), week navigation.
- Collapsible left rail: channel filters, tag counts, API budget.
- First column of the calendar is 160 px: brand icon + service name + handle on two lines, ellipsis on long handles. Checked with ten service names: all fit except "Google Business" (use "Google"); long handles truncate with a tooltip.

**API facts confirmed live (Oct 18):** date-range `posts` filter, `ideas` read, `postingSchedule`, `dailyPostingLimits`, status enum. **Still to verify Oct 28+:** `editPost` rescheduling, `createIdea` with tags, OAuth+PKCE end to end.

**Your actions before Oct 28 (I can't do these):**
1. Register for Buffer Commit at buffer.com/api/commit (registration is open until Nov 13).
2. Tell the recruiter/hiring manager you're entering and get a written OK (the terms don't cover candidates).
3. Create the OAuth **App Client** in Buffer Settings → API (needs HTTPS redirect URIs, even for localhost; pick the production domain now). Do not paste the client secret into chat.
4. Pick the product name and domain (placeholder "Cadence"). Don't use "Buffer" in the name.
5. Revoke the personal token you pasted into this chat, and keep the new one only in a local `.env.local`.
6. Add a couple of extra channels to your Buffer account (or a second test account) so the demo shows three channels. Your account has only LinkedIn.
7. Draft Build-in-Public post #1 (must disclose it's about the contest).

**What I do on Oct 28 (day 1):** initialise the repo (git history is the proof of new work), Next.js + Tailwind, OAuth+PKCE with a per-user refresh lock, typed Buffer client with a `RateLimit` header reader, and the Queue page shell using the design above with real data from `posts`, `channels` and `postingSchedule`.

**Build order (smallest demo first):**
1. Sign in → channels → real calendar + table (read-only). *First deploy by Oct 31.*
2. New post → `createPost` (queue / custom time / draft) → dot appears. *Oct 31.*
3. Review modal on drafts, Approve/Skip, tags. *Nov 3.*
4. From GitHub + paste changelog → drafts. *Nov 6 (cut line).*
5. Gaps (open slots, crowded days), Balance, Ideas fill. *Nov 9.*
6. Polish, first-run sample data for blank accounts, keyboard shortcuts, modal Esc and outside-click close, security pass. *Nov 10 freeze.*

### OAuth spike result (Oct 19) and Day 1 checklist (Oct 28)

**Result:** Buffer OAuth 2.0 Authorization Code + PKCE works end to end with a *confidential* App Client (client ID + secret in the token exchange). Sign-in, consent screen and token exchange all succeeded from `spikes/oauth-pkce`. The generic "Could not connect to Buffer" page (`auth.buffer.com/error?kind=generic`, no detail, same page for any bad request) was most likely a wrong `client_id` (the shell had an old one exported). Lessons: load credentials from `.env`, not shell exports; log only the first 4 characters of the client ID. Kept from the debugging: scopes encoded as `%20`, `prompt=consent` as in Buffer's docs. **Confirmed with an OAuth token (Oct 19):** `account`, `channels` (with `postingSchedule`, `timezone`, `isQueuePaused`), `posts` with the `dueAt` range filter and `tags`, and `ideas` (with `content.tags`) all return data using only the read scopes `account:read posts:read ideas:read offline_access`. **Refresh works:** after `/refresh`, the same `/me` calls succeeded with the rotated token. Not yet checked: the exact `expires_in` (docs say about one hour) and that reusing an old refresh token revokes the grant (don't test that on a token we need). The real app must still serialize refreshes per user.

**Day 1 (Oct 28), in order:**
1. `git init` in `buffer-commit`; pnpm workspace; `apps/web` (Next.js + Tailwind), `packages/buffer-client`, `packages/core`. Commit the design files untouched so the "before" is clear.
2. Port the spike into `packages/buffer-client/auth`: PKCE + state helpers, token exchange, single-flight refresh lock, rotation-safe token store. Routes in `apps/web`: `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`.
3. Dev needs HTTPS (Buffer rejects http redirects): `next dev --experimental-https` on `https://localhost:3000/callback`. Register that and the production URL as separate redirect URIs on the App Client (up to five).
4. Session: encrypted httpOnly cookie holding a session id; refresh token stored encrypted server-side (Neon/Postgres), never in the browser.
5. First real data: `channels` with `postingSchedule` and `posts` for a week via `dueAt` range. Render the calendar from the design, read-only.
6. Deploy to Vercel or Fly the same day with the production redirect URI so OAuth is proven on the public URL before any feature work.
7. Rotate the client secret first (it was pasted into a chat on Oct 19).

## 1. Contest rules that shape the build

| Item | Rule |
|---|---|
| Registration | Oct 15 – Nov 13, 2026 (11:59 pm PT) |
| Build window | Oct 28 – Nov 13, 2026 (11:59 pm PT) |
| Judging | ~Nov 16–20. App must stay live and public |
| Winners | ~Dec 4–7 (reply to Buffer within 10 days) |
| Scoring | 3 judges, 1–5 each on **real usefulness**, **technical execution on the Buffer API**, **creativity/originality**. Winner needs ≥ 9/15. Tie-break = usefulness |
| Must have | Public hosted app, Buffer OAuth sign-in, ≥1 real API call, no malware, no needless personal data, obey API rate limits and third-party platform terms |
| Submit | ≤2 min demo video (live API, no slides), public URL, ~300-word summary (problem, audience, API surface, next steps), legal names + emails + handles, **App Client ID**, optional Build-in-Public trail (≤5 public posts since Oct 15, disclosing they promote the contest) |
| Existing code | Allowed, but only new work built in the window is judged. Mark it clearly |
| Naming | "Built on the Buffer API" is fine. Don't imply it's official or endorsed |
| Extra awards | Delight (UX, design team), Build-in-Public (content team) |
| Prize | ≥$1,600 cash per winner (up to 16), Essentials plan for a year, CEO session, cap for everyone |

Implications:
- Usefulness is judged on a realistic user's problem. Pick boring, real pain.
- Start real code on **Oct 28**. Before that: research, design, App Client registration, a throwaway OAuth spike.
- The demo video is how judges see the work. Design for a 2-minute story.
- Judges use Buffer test accounts. A fresh, empty account must work in 30 seconds.
- Hiring: confirm eligibility with the employer and Buffer in writing (terms don't cover candidates).

## 2. What the Buffer API gives us

GraphQL at `https://api.buffer.com`. Account → Organizations → Channels (posts attach to channels) + Ideas + Tags.

**OAuth (required):** Authorization Code + **PKCE (S256, mandatory)**.
- Authorize `https://auth.buffer.com/auth`, token `https://auth.buffer.com/token`.
- Scopes: `posts:read/write`, `ideas:read/write`, `account:read/write`, `snippets:read/write`, `offline_access`.
- Access token ~1 h. Refresh tokens are **single-use and rotate**. Reusing an old one revokes the grant, so serialize refreshes per user and store the new token before using it.
- App Client registered at publish.buffer.com/settings/api. Confidential client gets a secret; public client doesn't.

**Operations:** create/get/delete posts, create idea, get account/org/channels, tags (`tagsV2`, create/update/delete; early preview), `createPost` with `schedulingType` (`addToQueue` / `customScheduled` + `dueAt` UTC / `shareNow`), per-channel `metadata` (X threads, Instagram post types), post status (Scheduled/Sent/Error), cursor pagination, `tagIds` on posts.

**Platforms:** Instagram, Threads, LinkedIn, X, Facebook, Google Business, Mastodon, YouTube, Pinterest, Bluesky.

**Limits and gaps:**
- Rate limits are **per client** (key or app client), in three windows: 100 / 15 min, **250 / 24 h on Free and Essentials (500 on Team)**, 3,000 / 30 days on Free (7,500 Essentials, 15,000 Team). Earlier docs said 100/day on Free; the developer guide now says 250. **Batch, cache, never poll.** Limits are read from `RateLimit` / `RateLimit-Policy` response headers (`r` remaining, `t` seconds to reset, identify windows by `w` = 900, 86400, 2592000). HTTP 429 with `extensions.code = RATE_LIMIT_EXCEEDED` and `Retry-After`. A 429 does not consume quota.
- **No post metrics for OAuth apps.** "App Clients cannot read them." Plan's audit uses only schedule and tag data.
- Tags API and several other operations are marked preview/experimental and can change.
- Free plan: 3 tags max.
- Media is **not hosted by Buffer** (no upload endpoint). Image/video URLs must be public, direct, HTTPS and stable. Ship's release cards need our own storage (Cloudinary or R2).
- Redirect URIs must be **HTTPS even for localhost**; exact match.

**Answers to the nine unknowns (from docs, Oct 18; live calls still to confirm):**
1. **Date filter on posts: yes.** `PostsFiltersInput` has `dueAt` (`DateTimeComparator` with `start`/`end`), `startDate`, `endDate`, `status`, `channelIds`, `tagIds`, `tags`, `createdAt`, `dueAtPresence`, `postTypes`; sortable by `dueAt`. Plan can query a week at a time.
2. **Post fields:** `id, text, channelId, channelService, dueAt, sentAt, status, schedulingType, isCustomScheduled, tags (objects, not tagIds), assets, metadata, error, externalLink, ideaId, notes`. Enough for calendar chips and the details table.
3. **Assets:** `AssetInput` union: image (`url`, `thumbnailUrl`, `metadata.altText`), video (`url`, `metadata.thumbnailOffset`), document (`url`, `title`, `thumbnailUrl`), link (`url`, `title`, `description`, `thumbnailUrl`). Public HTTPS URLs only.
4. **Metadata:** per service object, e.g. `metadata: { twitter: { thread: [{ text }, ...] } }`. Swap `twitter` for `bluesky`, `threads`, `mastodon`. Every post including the first must be in `thread`, and top-level `text` should equal the first item.
5. **Ideas:** `createIdea` accepts `content.tags` (`TagInput`: id, name, color). The reference lists an `ideas` query (`IdeasInput` with `tagsFilter`), but the roadmap says Query Ideas is still a beta request. **Needs a live call.** If it fails, Plan's "fill from ideas" falls back to Ship drafts we store ourselves.
6. **Drafts: yes.** `createPost` with `saveToDraft: true` gives status `draft`. `needsApproval` also exists.
7. **Snippets:** scopes `snippets:read/write` and an `updateSnippet` mutation (name, text). No snippet query or create is documented. Not needed for the MVP.
8. **Errors:** HTTP 200 with a mutation union (`PostActionSuccess` | `MutationError`, plus `LimitReachedError`, `InvalidInputError`, `DuplicateError`) or top-level `errors` with codes `UNAUTHORIZED, FORBIDDEN, NOT_FOUND, UNEXPECTED, RATE_LIMIT_EXCEEDED`. Always request `... on MutationError { message }`.
9. **Queue slots: yes.** `Channel.postingSchedule` (`ScheduleV2`: day, paused, times HH:MM), `timezone`, `weeklyPostingLimit`, `isQueuePaused`. `dailyPostingLimits` query gives scheduled/sent/limit per channel per day. Plan can draw real open slots and warn before hitting a daily limit.

**Bigger changes from the docs:**
- **`editPost` exists** (all fields optional except `id`), and `movePostInQueue` (experimental). So Plan can reschedule without delete + create. This removes an earlier risk.
- `dailyPostingLimits` is a free source for "this channel is full today" warnings.

**Confirmed live on Oct 18 with a personal key (read-only probe, `scripts/probe_api.py`):**
- **Date filter works:** `posts(first, input:{organizationId, filter:{dueAt:{start,end}}, sort:[{field:dueAt,direction:asc}]})` returned posts with `id text status dueAt channelId channelService tags`. Sortable keys: `dueAt`, `createdAt`. Plan can load one week per request.
- **`PostStatus`** = `draft | error | needs_approval | scheduled | sending | sent`.
- **`ideas` read works** (`ideas(first, input:{organizationId})` → `edges.node.content { title text tags { id name } }`). Plan's "fill from ideas" is on. (Tested with a personal key; re-test with OAuth.)
- **`postingSchedule` works:** per channel, per weekday (`mon`..`sun`) with `paused` and `times: ["16:30"]`. Plan can draw real queue slots and treat a day with no times as "no slots by design".
- **`dailyPostingLimits` works:** `channelId isAtLimit limit scheduled sent` (limit was 50 on this channel).
- **`editPost` input:** `id, text, dueAt, mode, schedulingType, saveToDraft, assets, metadata, tagIds, ideaId, draftId, source, aiAssisted, approvalChange`. Reschedule via `dueAt` + `mode` still to test with a harmless draft.
- **Channels:** `id name service timezone isQueuePaused isDisconnected` (plus `displayName avatar`). Account timezone is returned too.
- From the earlier `buffer-api-explorer` project: `createPost` returns a union (`PostActionSuccess` | `NotFoundError`, `UnauthorizedError`, `UnexpectedError`, `RestProxyError` with `code`, `LimitReachedError`, `InvalidInputError`). `createPost` needs `assets: []` and `needsApproval: false` when empty.
- **Rate limits seen:** this key is on a 3,000 / 30-day window (r=2,780 remaining). Headers: `ratelimit: "3000-in-30days"; r=..; t=..` and `ratelimit-policy: ...; q=..; w=..`.
- This account has one channel (LinkedIn) and one organization, so Plan must handle a single channel gracefully and the demo will need more.

**Still unverified (all need a write or an App Client, so after Oct 28):**
- `editPost` actually moving a queued post's `dueAt`.
- `createIdea` with `content.tags`.
- ~~A fresh App Client completing OAuth+PKCE, and whether OAuth tokens read `ideas` and `posts`~~ Done Oct 19 (see the spike result above). Write scopes (`posts:write`, `ideas:write`) still need testing on Oct 28.
- `ideas` pagination shape (`pageInfo`) and whether Instagram/Threads metadata needs extra fields.

## 3. Concept and scope

**Audience:** (Plan) solo creators, small-business owners, small marketing teams on Buffer. (Ship) indie hackers, small dev teams, OSS maintainers.

**Shared core:** Buffer OAuth+PKCE, channels/org picker, tags, queue read/write client with request budgeting, token vault, first-run flow.

### Ship job: the Review panel (developer, minimal)
Moments (release, merged PR, milestone, pasted changelog) → drafts per channel → review inbox (approve/edit/skip/save as idea) → `createPost` to queue with tag `shipped`. Details in DESIGN.md §5.

### Plan job: calendar and table (marketing)
- **Calendar** (week and month) of scheduled + sent posts, by channel, colored by tag.
- **Balance audit:** tag mix vs a target mix the user sets (e.g. 50% educate, 30% promote, 20% personal); channels quiet for N days; empty days/slots; clumping (3 promos in a row).
- **Gap cards:** "Thursday has nothing on LinkedIn" → suggest filling from Ideas (and Ship drafts); one click to add to queue or custom time.
- **Pillars:** map tags to pillars; shows what's in the queue by pillar next 14 days.
- **Dots, not names, on the calendar.** Each channel/day cell shows one colored dot per post (capped, then "+N"), so seven posts on one day never overflow. The details live in a **table under the calendar** for the selected day (or the whole week): day, time, channel, tag, post text, status.
- Reschedule through `editPost` (to be confirmed live); deletes limited to undo for posts made in-session.

### The link
Ship publishes with tag `shipped` → appears on Plan as a pillar. Plan's gap-filler can offer unapproved Ship drafts and Ideas. Saves from Ship go to Ideas, which feed Plan.

## 4. Scope tiers

**Must (by Nov 10 feature freeze):**
- OAuth+PKCE with safe refresh rotation, sign-out, revocation note.
- Channel/org picker; cached.
- Ship: changelog paste + public GitHub repo input, moment detection, drafts, review inbox, publish to queue/custom time, tag, save as idea.
- Plan: read-only calendar of queued/sent posts, tag colors, quiet-channel + empty-day audit, fill-gap using Ideas.
- Request budget meter, friendly rate-limit errors.
- First-run sample data for blank accounts.
- Privacy: minimal storage, encrypted tokens, delete-my-data.
- Public deploy, landing page, accurate "built on the Buffer API" wording.

**Should:**
- Target mix editor and balance score.
- Per-platform live previews.
- Keyboard-first inbox.
- History view.
- Undo for just-published posts.

**Could:**
- Voice profile from past posts.
- Release image card.
- GitHub App for private repos.
- Weekly digest post.
- Bluesky/Mastodon-first mode.

**Cut line: Nov 6.** If Plan isn't solid by then, ship it as a simple read-only calendar + balance panel and keep Ship as the headline. Never cut first-run, rate-limit handling or the live-API proof.

**Out:** analytics, auto-publish without review, teams/roles, billing.

## 5. Architecture

**One monorepo, this folder (`buffer-commit`).** `git init` on Oct 28, so history proves what was built in the window. pnpm workspaces:

```
buffer-commit/
├─ apps/
│  └─ web/              Next.js app (the Queue page, OAuth routes, API routes)
├─ packages/
│  ├─ buffer-client/    typed GraphQL client, token refresh lock, RateLimit header reader
│  ├─ core/             pure, tested logic: gap rules, balance, moment detection, draft types
│  └─ ui/               shared components (dots, badges, modals) if they outgrow apps/web
├─ spikes/              throwaway experiments, never imported by apps or packages
│  └─ oauth-pkce/       Oct 19 spike (exists)
├─ scripts/             probe_api.py (read-only API probe)
├─ PLAN.md  DESIGN.md
```

Rules: `core` has no network or framework imports so the gap and balance rules are unit-testable with fixtures from the real API; `buffer-client` is the only place that talks to api.buffer.com and auth.buffer.com; secrets only in `.env.local` files that are git-ignored. The spike stays under `spikes/` and is deleted (or kept as a reference) after the real OAuth lands in `apps/web`.


- **Frontend:** Next.js (App Router) + Tailwind. Mobile-friendly review inbox. Calendar built by hand (week grid) to stay light.
- **Backend:** server routes. Token exchange and refresh server-side (confidential client). Encrypted httpOnly session cookie.
- **Storage:** Postgres (Neon/Supabase). Tables: `users`, `tokens` (encrypted, rotation version), `sources`, `moments`, `drafts`, `publications`, `post_cache` (planner snapshot), `target_mix`, `request_log`.
- **Buffer client:** typed GraphQL, one `bufferFetch` with backoff, per-user refresh mutex, request counter, snapshot cache with TTL and manual refresh.
- **LLM drafting:** Claude API with structured output per channel. Disclose AI drafting. Human approval always.
- **GitHub:** REST read-only, ETag conditional requests.
- **Hosting:** Vercel or Fly, live through Dec 7+.
- **Observability:** error log with token redaction.

## 6. Schedule

| Date | Goal |
|---|---|
| Oct 18–27 | Register for the contest. Create App Client. API Explorer session (§2 list). Finalize design. Name/domain. Build-in-Public post 1. |
| Oct 28 | Repo init (git history = proof of new work). OAuth+PKCE end to end. |
| Oct 29–31 | Channels, `createPost` to queue, errors, first deploy. |
| Nov 1–3 | Ship: sources, moment detection. |
| Nov 4–6 | Ship: drafts + review inbox + tags. **Cut line Nov 6.** |
| Nov 7–9 | Plan: calendar, tag colors, audit, fill-gap, budget meter. |
| Nov 10 | Polish, first-run flow, security pass. **Feature freeze.** |
| Nov 11 | Record demo, write 300-word summary, test on a fresh Buffer account. |
| Nov 12 | Ask any open questions in Buffer developer chat. **Submit a day early.** |
| Nov 13 | Slack. Blockers only. Deadline 11:59 pm PT. |
| Nov 16–Dec 7 | Keep live. No risky deploys. Respond to Buffer within 10 days. |

## 7. Demo video script (≤ 2:00)

- 0:00–0:12 Problem: "I shipped three things this week and posted none. My LinkedIn has been silent for 9 days."
- 0:12–0:25 Sign in with Buffer. Channels appear.
- 0:25–0:50 **Plan:** calendar shows gaps and an imbalance flag.
- 0:50–1:25 **Ship:** repo connected, release detected, review inbox, approve three drafts (show X thread vs LinkedIn).
- 1:25–1:45 Back to Plan: new `shipped` posts fill the gaps, balance improves.
- 1:45–1:55 Switch to Buffer: posts are in the real queue (live-API proof).
- 1:55–2:00 Pitch line.

## 8. 300-word summary skeleton

Problem → who it's for → Buffer API surface (OAuth+PKCE, channels, `createPost` queue/custom, metadata, tags, ideas, posts query) → what's built in the window → next steps.

## 9. Build-in-Public plan (≤5 counted posts, disclose contest)

1. Joining + the idea. 2. OAuth/PKCE refresh-rotation gotcha. 3. First post published through the app. 4. Rate-limit design for a calendar. 5. Demo + link. Schedule them with Buffer itself.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Two views dilute focus | Shared core, Nov 6 cut line, Ship is the headline |
| Date filter or `ideas` query misbehaves in practice | Docs say `dueAt` range filter exists; confirm live, else paginate and filter client-side |
| 250 req/day on Free blows up with a calendar | One week-query per refresh, snapshot cache, manual refresh, budget meter from `RateLimit` headers |
| `editPost` / `movePostInQueue` are new or experimental | Confirm live; fall back to delete + create for reschedule |
| Tags API preview changes; Free allows 3 tags | Wrap in one module; fall back to local pillar mapping |
| OAuth/App Client beta quirks | Spike early; developersupport@buffer.com |
| Refresh token reuse revokes grant | Per-user mutex; write new token before use |
| Generic LLM drafts | Voice profile, hard style rules, human review |
| Hiring outcome changes eligibility | Confirm in writing; build regardless |
| Third-party platform terms | Drafts only; user approves; no automation beyond Buffer |
