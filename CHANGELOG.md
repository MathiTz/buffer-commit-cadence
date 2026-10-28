# Changelog

## v0.1.0 (2026-10-28)

First day of the Buffer Commit build window. Cadence is one Queue page that combines planning (a week calendar) and shipping (turning ideas into posts you review).

### Added
- Sign in with Buffer: OAuth 2.0 with PKCE. Refresh tokens rotate, so refreshes are serialized per user.
- Queue page: a week calendar where one dot is one post (colour is the tag, style is the status), a details table underneath, and a collapsible sidebar.
- Your real Buffer data: channels, posting schedule, the week's posts and Ideas, with previous and next week navigation. Add `?sample=1` to the URL to see sample data.
- Gaps: open queue slots (a slot in your posting schedule with no post) and crowded days. The calendar marks open slots with a dashed dot.
- Tag balance against a target mix.
- Fill a gap from an Idea: it becomes a draft you review, then a confirm step before anything reaches Buffer. You can save it as a Buffer draft instead of scheduling, and Undo deletes it for 60 seconds.
- New idea: save an idea to your Buffer Ideas.
- LinkedIn: typing `@Buffer` becomes a tagged mention of Buffer's page. Quick-insert chips add `#BufferCommit`, `#buildinpublic` and `@Buffer`.

### Fixed
- Reloading the Queue page no longer spends Buffer API requests: snapshots are cached for 60 seconds, and a rate-limit error shows a message instead of looping.
- A stale session cookie no longer sends you back and forth between `/` and `/queue`.
- Dev sessions survive a server restart (tokens are kept in an encrypted, git-ignored local file).

### Known limits
- Not deployed yet; sign-in works on `https://localhost:3000` only.
- "From GitHub" (drafting posts from releases) is not built yet.
- Tokens live in a local file until the database store lands.

Built for the Buffer Commit contest on the Buffer API. Not an official Buffer product.
