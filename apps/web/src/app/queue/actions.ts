"use server";

import { BufferApiError, createIdea, createPost, createTag, deletePost, editPostTags, getTags } from "@cadence/buffer-client";
import { TAGS, isIsoDate, linkedInMentions, parseChangelog, type PublishMode, type Release, type Tag } from "@cadence/core";
import { cached, invalidate } from "@/lib/cache";
import { loadQueueData } from "@/lib/queue-data";
import { accessToken, currentSid } from "@/lib/session";

export type ActionResult<T> = { ok: true; value: T } | { ok: false; message: string };

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

async function session() {
  const [sid, token] = await Promise.all([currentSid(), accessToken()]);
  return sid && token ? { sid, token } : null;
}

const explain = (e: unknown) =>
  e instanceof BufferApiError && e.status === 429
    ? "Buffer's request limit is reached. Try again in a few minutes."
    : e instanceof Error ? e.message : "Something went wrong talking to Buffer.";

export interface ApproveInput {
  channelId: string;
  service: string; // the channel's Buffer service, which decides how mentions are written
  text: string;
  dueAt: string; // ISO 8601 UTC: the slot the post is scheduled for (ignored for "now")
  mode: PublishMode;
  tagIds?: string[];
  organizationId?: string | null;
  tag?: Tag; // picked in the confirm step; replaces tagIds. Created in Buffer if it does not exist yet.
}

/** The id of the Buffer tag for one of the four planning tags, creating it on first use. */
async function tagIdFor(token: string, organizationId: string, tag: Exclude<Tag, "untagged">): Promise<string> {
  const { name, color } = TAGS[tag];
  const { tags } = await getTags(token, organizationId);
  const found = tags.find((t) => t.name.trim().toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const made = await createTag(token, { organizationId, name, color });
  if (!made.ok) throw new Error(made.message);
  return made.value.id;
}

export interface SetTagInput {
  postId: string;
  organizationId: string | null;
  text: string; // the post's current text; Buffer needs it on every edit
  tag: Tag;
  keepIds: string[]; // the post's other tags, which stay as they are
}

/** Replaces the planning tag on an existing post. Only the tags change, never its text or time. */
export async function setPostTag(input: SetTagInput): Promise<ActionResult<null>> {
  const s = await session();
  if (!s) return fail("You're signed out. Sign in again.");
  if (!input.organizationId) return fail("No Buffer organization found.");
  if (!(input.tag in TAGS) || input.keepIds.length > 20) return fail("That tag isn't valid.");
  if (!input.text.trim()) return fail("This post has no text to keep.");
  try {
    const own = input.tag === "untagged" ? [] : [await tagIdFor(s.token, input.organizationId, input.tag)];
    const r = await editPostTags(s.token, input.postId, input.text, [...input.keepIds, ...own]);
    if (!r.ok) return fail(r.message);
    invalidate(`${s.sid}:queue`);
    return { ok: true, value: null };
  } catch (e) {
    return fail(explain(e));
  }
}

/** The one place a user's approval becomes a real Buffer post. Called only from the confirm step. */
export async function approvePost(input: ApproveInput): Promise<ActionResult<{ id: string }>> {
  const s = await session();
  if (!s) return fail("You're signed out. Sign in again.");
  const text = input.text.trim();
  if (!text || text.length > 10_000) return fail("The post text is empty or too long.");
  const due = new Date(input.dueAt);
  if (input.mode !== "now") {
    if (Number.isNaN(due.getTime())) return fail("That time isn't valid.");
    if (due.getTime() < Date.now() + 60_000) return fail("That slot has already passed. Choose Post now, or pick a later slot.");
  }

  let tagIds = input.tagIds;
  if (input.tag && input.tag !== "untagged") {
    if (!input.organizationId) return fail("No Buffer organization found.");
    try {
      tagIds = [await tagIdFor(s.token, input.organizationId, input.tag)];
    } catch (e) {
      return fail(explain(e));
    }
  }

  // "@Buffer" becomes a real, tagged LinkedIn mention; on other services it stays plain text.
  const mention = input.service === "linkedin" ? linkedInMentions(text) : { text, annotations: [] };
  try {
    const r = await createPost(s.token, {
      channelId: input.channelId, text: mention.text, tagIds,
      ...(input.mode === "now" ? { shareNow: true } : { dueAt: due.toISOString(), saveToDraft: input.mode === "draft" }),
      linkedInAnnotations: mention.annotations,
    });
    if (!r.ok) return fail(r.message);
    invalidate(`${s.sid}:queue`);
    return { ok: true, value: { id: r.value.id } };
  } catch (e) {
    return fail(explain(e));
  }
}

/** Undo: deletes a post this app just created. The only delete the app ever performs. */
export async function undoPost(id: string): Promise<ActionResult<null>> {
  const s = await session();
  if (!s) return fail("You're signed out. Sign in again.");
  try {
    const r = await deletePost(s.token, id);
    if (!r.ok) return fail(r.message);
    invalidate(`${s.sid}:queue`);
    return { ok: true, value: null };
  } catch (e) {
    return fail(explain(e));
  }
}

/** Saves an idea in Buffer's Ideas (not scheduled, not published). */
export async function saveIdea(input: { organizationId: string; title: string; text: string }): Promise<ActionResult<{ id: string }>> {
  const s = await session();
  if (!s) return fail("You're signed out. Sign in again.");
  const text = input.text.trim();
  if (!text || text.length > 10_000) return fail("The idea is empty or too long.");
  try {
    const r = await createIdea(s.token, { organizationId: input.organizationId, title: input.title.trim().slice(0, 200) || undefined, text });
    if (!r.ok) return fail(r.message);
    invalidate(`${s.sid}:queue`);
    return { ok: true, value: { id: r.value.id } };
  } catch (e) {
    return fail(explain(e));
  }
}

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GITHUB = { headers: { Accept: "application/vnd.github+json", "User-Agent": "cadence" }, cache: "no-store" as const };

// Public GitHub data only, no sign-in: published releases first, then CHANGELOG.md.
async function fetchReleases(repo: string): Promise<Release[]> {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=10`, GITHUB);
  if (res.status === 404) throw new Error("Couldn't find that repo. It has to be public.");
  if (res.status === 403 || res.status === 429) throw new Error("GitHub's rate limit is reached. Try again in a few minutes.");
  if (!res.ok) throw new Error(`GitHub returned ${res.status}.`);
  const list = (await res.json()) as { tag_name: string; name: string | null; body: string | null; html_url: string; published_at: string | null; draft: boolean }[];
  const releases: Release[] = list
    .filter((r) => !r.draft)
    .map((r) => ({
      tag: r.tag_name, title: r.name || r.tag_name, date: r.published_at?.slice(0, 10) ?? null,
      url: r.html_url, body: r.body ?? "", source: "release" as const,
    }));
  if (releases.length) return releases;

  const md = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/CHANGELOG.md`, GITHUB);
  if (md.ok) {
    const parsed = parseChangelog(await md.text(), `https://github.com/${repo}/blob/HEAD/CHANGELOG.md`);
    if (parsed.length) return parsed;
  }
  throw new Error(`${repo} has no published releases and no CHANGELOG.md with a "## v1.2.3" heading.`);
}

/** Lists a public repo's releases (newest first). Read-only; nothing is written anywhere. */
export async function loadReleases(input: string): Promise<ActionResult<{ repo: string; releases: Release[] }>> {
  if (!(await session())) return fail("You're signed out. Sign in again.");
  const repo = input.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/$/, "");
  if (!REPO.test(repo)) return fail("Enter a repo as owner/name, for example MathiTz/buffer-commit-cadence.");
  try {
    return { ok: true, value: { repo, releases: await cached(`gh:${repo}`, 5 * 60_000, () => fetchReleases(repo)) } };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't reach GitHub.");
  }
}

/**
 * Warms the server's snapshot of a week the user is hovering, so opening it is instant.
 * A workaround: it spends one API request per hovered week, so it stands down when the quota is low.
 */
export async function prefetchWeek(week: string): Promise<void> {
  if (!isIsoDate(week)) return;
  const s = await session();
  if (!s) return;
  try {
    const data = await cached(`${s.sid}:queue:${week}`, 60_000, () => loadQueueData(s.token, s.sid, week));
    void data;
  } catch {
    /* a failed prefetch just means the real load happens on click */
  }
}
